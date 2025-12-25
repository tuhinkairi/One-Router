from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import ServiceCredential
from ..services.credential_manager import CredentialManager

class RequestRouter:
    """Routes requests to appropriate service adapters"""

    def __init__(self):
        self.credential_manager = CredentialManager()

    async def get_adapter(self, user_id: str, service: str, db: AsyncSession):
        """Get configured adapter for user"""

        # Get user's preferred environment for this service
        preferred_env = await self._get_user_preferred_environment(user_id, service, db)

        # Query the database for the credential in the preferred environment
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == service,
                ServiceCredential.is_active == True,
                ServiceCredential.environment == preferred_env
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise Exception(f"Service {service} not configured for user {user_id} in {preferred_env} environment")

    async def _get_user_preferred_environment(self, user_id: str, service: str, db: AsyncSession) -> str:
        """Get user's preferred environment for a service (defaults to 'test')"""
        from ..models import User

        result = await db.execute(
            select(User.preferences).where(User.id == user_id)
        )
        preferences = result.scalar_one_or_none()

        if preferences and "environments" in preferences and service in preferences["environments"]:  # type: ignore
            return preferences["environments"][service]  # type: ignore

        # Default to "test" if no preference set
        return "test"

    async def get_adapter(self, user_id: str, service: str, db: AsyncSession, target_environment: str = "test"):
        """Get configured adapter for user with explicit environment"""
        
        # Query the database for the credential in the target environment
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == service,
                ServiceCredential.is_active == True,
                ServiceCredential.environment == target_environment
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise Exception(f"Service {service} not configured for user {user_id} in {target_environment} environment")

        # Decrypt credentials using the correct field name: encrypted_credential
        credentials = self.credential_manager.decrypt_credentials(
            credential.encrypted_credential
        )

        # Create and return adapter based on service
        if service == "razorpay":
            from ..adapters.razorpay import RazorpayAdapter
            adapter = RazorpayAdapter()
            adapter.configure(credentials, target_environment)
            return adapter
        elif service == "paypal":
            from ..adapters.paypal import PayPalAdapter
            adapter = PayPalAdapter()
            adapter.configure(credentials, target_environment)
            return adapter
        else:
            raise Exception(f"Unsupported service: {service}")

    async def validate_service_config(self, user_id: str, service: str, db: AsyncSession) -> bool:
        """Validate that service is properly configured"""
        try:
            adapter = await self.get_adapter(user_id, service, db)
            return await adapter.validate_credentials()
        except Exception as e:
            print(f"Service validation failed for {service}: {e}")
            return False