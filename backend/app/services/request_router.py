from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import ServiceCredential, User
from ..services.credential_manager import CredentialManager
from ..exceptions import ProviderNotConfiguredException

class RequestRouter:
    """Routes requests to appropriate service adapters with cross-environment fallback"""

    def __init__(self):
        self.credential_manager = CredentialManager()

    async def _get_user_preferred_environment(self, user_id: str, service: str, db: AsyncSession) -> str:
        """Get user's preferred environment for a service (defaults to 'test')"""
        result = await db.execute(
            select(User.preferences).where(User.id == user_id)
        )
        preferences = result.scalar_one_or_none()

        if preferences and "environments" in preferences and service in preferences["environments"]:
            return preferences["environments"][service]

        # Default to "test" if no preference set
        return "test"

    async def _get_credentials_with_fallback(
        self, 
        user_id: str, 
        service: str, 
        db: AsyncSession,
        preferred_environment: str
    ) -> Optional[ServiceCredential]:
        """
        Get credentials with cross-environment fallback.
        
        Fallback order:
        1. Preferred environment (from user preferences or API key)
        2. Same environment for test/live
        3. Auto-provision from environment variables (if available)
        """
        environments_to_try = []
        
        # Build fallback chain based on preferred environment
        if preferred_environment == "test":
            environments_to_try = ["test", "live"]
        else:  # live
            environments_to_try = ["live", "test"]
        
        # Try each environment in order
        for environment in environments_to_try:
            result = await db.execute(
                select(ServiceCredential).where(
                    ServiceCredential.user_id == user_id,
                    ServiceCredential.provider_name == service,
                    ServiceCredential.is_active == True,
                    ServiceCredential.environment == environment
                )
            )
            credential = result.scalar_one_or_none()
            if credential:
                return credential
        
        return None

    async def get_adapter(self, user_id: str, service: str, db: AsyncSession, target_environment: Optional[str] = None):
        """Get configured adapter for user with cross-environment fallback and auto-provisioning"""

        # Determine environment - use target_environment if provided, otherwise get user preference
        if target_environment is None:
            environment = await self._get_user_preferred_environment(user_id, service, db)
        else:
            environment = target_environment

        # Try to get credentials with fallback
        credential = await self._get_credentials_with_fallback(
            user_id=user_id,
            service=service,
            db=db,
            preferred_environment=environment
        )

        if not credential:
            # Try auto-provisioning from environment variables as last resort
            from ..services.get_env_credentials import get_credentials_from_env
            env_creds = get_credentials_from_env(service)
            
            if env_creds:
                # Store the auto-provisioned credentials
                try:
                    credential = await self.credential_manager.store_service_credentials(
                        db=db,
                        user_id=user_id,
                        service_name=service,
                        credentials=env_creds,
                        features={"auto_provisioned": True},
                        environment=environment
                    )
                except Exception as e:
                    # If auto-provisioning fails, continue to raise the configuration error
                    pass

        if not credential:
            # Build helpful error message with remediation steps
            error_details = {
                "service": service,
                "user_id": user_id,
                "environment": environment,
                "remediation": {
                    "step_1": f"Configure {service} credentials via dashboard or /onboarding/configure endpoint",
                    "step_2": "Or set environment variables (see documentation for required variables)",
                    "step_3": "Required credentials vary by service (e.g., razorpay needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)"
                },
                "supported_services": ["razorpay", "paypal", "twilio", "aws_s3"]
            }
            raise ProviderNotConfiguredException(provider=service)

        # Decrypt credentials
        # noinspection PyTypeChecker
        encrypted_bytes = bytes(credential.encrypted_credential)
        credentials = self.credential_manager.decrypt_credentials(encrypted_bytes)

        # Create and return adapter based on service
        if service == "razorpay":
            from ..adapters.razorpay import RazorpayAdapter
            return RazorpayAdapter(credentials)
        elif service == "paypal":
            from ..adapters.paypal import PayPalAdapter
            return PayPalAdapter(credentials)
        else:
            raise Exception(f"Unsupported service: {service}")

    async def validate_service_config(self, user_id: str, service: str, db: AsyncSession) -> dict:
        """Validate that service is properly configured and return detailed status"""
        result = {
            "service": service,
            "user_id": user_id,
            "configured": False,
            "environment": None,
            "source": None,
            "error": None
        }
        
        try:
            # Check preferred environment first
            environment = await self._get_user_preferred_environment(user_id, service, db)
            
            # Try to get adapter
            adapter = await self.get_adapter(user_id, service, db)
            
            # Validate credentials
            is_valid = await adapter.validate_credentials()
            
            result["configured"] = is_valid
            result["environment"] = environment
            result["source"] = "database"
            
        except ProviderNotConfiguredException as e:
            result["error"] = str(e.details.get("message", str(e))) if e.details else str(e)
            result["remediation"] = e.details.get("remediation") if e.details else None
        except Exception as e:
            result["error"] = str(e)
        
        return result