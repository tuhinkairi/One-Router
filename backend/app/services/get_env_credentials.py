"""Get credentials with environment awareness"""
import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ServiceCredential
from sqlalchemy import select

logger = logging.getLogger(__name__)

async def get_credentials(
    db: AsyncSession,
    user_id: str,
    provider_name: str,
    environment: str = "test"
) -> Optional[Dict[str, Any]]:
    """
    Get credentials for a specific user, provider, and environment.
    
    Args:
        db: Database session
        user_id: User ID
        provider_name: Provider/service name (e.g., "razorpay", "paypal")
        environment: Environment name (e.g., "test", "live")
    
    Returns:
        Decrypted credentials dictionary or None if not found
    """
    try:
        from .credential_manager import CredentialManager
        
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == provider_name,
                ServiceCredential.environment == environment,
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()
        
        if not credential:
            logger.warning(f"No active credentials found for user {user_id}, provider {provider_name}, environment {environment}")
            return None
        
        # Decrypt the credentials
        cred_manager = CredentialManager()
        decrypted = cred_manager.decrypt_credentials(credential.encrypted_credential)
        
        return decrypted
        
    except Exception as e:
        logger.error(f"Error retrieving credentials: {e}")
        return None