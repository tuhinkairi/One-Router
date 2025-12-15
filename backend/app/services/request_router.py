from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import ServiceCredential
from ..services.credential_manager import CredentialManager
# Import will be done dynamically to avoid circular imports

class RequestRouter:
    """Routes requests to appropriate service adapters"""

    def __init__(self):
        self.credential_manager = CredentialManager()

    async def get_adapter(self, user_id: str, service: str, db: AsyncSession):
        """Get configured adapter for user"""

        # Get stored credentials
        credentials_list = await self.credential_manager.get_user_credentials(
            db, user_id, service
        )

        if not credentials_list:
            raise Exception(f"Service {service} not configured for user {user_id}")

        # Decrypt credentials
        encrypted_creds = credentials_list[0]['encrypted_creds']
        credentials = self.credential_manager.decrypt_credentials(encrypted_creds)

        # Create and return adapter
        if service == "razorpay":
            from ..adapters.razorpay import RazorpayAdapter
            return RazorpayAdapter(credentials)
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