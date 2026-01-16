from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import ServiceCredential, User
from ..services.credential_manager import CredentialManager
from ..exceptions import ProviderNotConfiguredException

class RequestRouter:
    """Routes requests to appropriate service adapters with cross-environment fallback"""

    def __init__(self):
        """
        Initialize the router and create its CredentialManager.
        
        Creates a CredentialManager instance and assigns it to self.credential_manager for managing service credentials.
        """
        self.credential_manager = CredentialManager()

    async def _get_user_preferred_environment(self, user_id: str, service: str, db: AsyncSession) -> str:
        """
        Return the user's preferred environment for a given service, defaulting to "test" if none is set.
        
        Returns:
            environment (str): The preferred environment name for the service (for example, "test" or "live").
        """
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
        Return the user's service credential by searching the preferred environment then a cross-environment fallback.
        
        Searches the preferred environment first, then the opposite environment ("test" ↔ "live"), and returns the first active ServiceCredential found.
        
        Returns:
            ServiceCredential: The matching active credential if found, `None` otherwise.
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
        """
        Obtain a configured service adapter for a user, using cross-environment credential fallback and optional auto-provisioning.
        
        Determines the environment (using target_environment if provided, otherwise the user's preference), resolves credentials with cross-environment fallback, attempts auto-provisioning from environment variables if no stored credentials exist, decrypts the credential material, and returns an adapter instance configured for the requested service.
        
        Parameters:
            user_id (str): Identifier of the user for whom the adapter is requested.
            service (str): Name of the service provider (e.g., "razorpay", "paypal").
            db (AsyncSession): Database session used to read/store credentials.
            target_environment (Optional[str]): If provided, overrides the user's preferred environment.
        
        Returns:
            adapter: An adapter instance configured with the decrypted credentials for the requested service.
        
        Raises:
            ProviderNotConfiguredException: If no credentials can be found or provisioned for the user and service.
            Exception: If the requested service is not supported.
        """

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
        """
        Check whether a service is configured for a user and return a detailed status report.
        
        Returns:
            dict: A status dictionary with the following keys:
                - service (str): The service name passed in.
                - user_id (str): The user id passed in.
                - configured (bool): `true` if valid credentials are available and pass validation, `false` otherwise.
                - environment (str|None): The resolved environment used for the check (e.g., "test" or "live"), or `None` if not determined.
                - source (str|None): Where the configuration was sourced (e.g., "database"), or `None` if not applicable.
                - error (str|None): Error message when validation or adapter resolution failed, or `None` on success.
                - remediation (str|None): Optional remediation guidance when the provider is not configured, or `None`.
        """
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