import json
import logging
import secrets
import uuid
from typing import Dict, Any, Optional, List
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ServiceCredential
from ..config import settings

# Initialize logger for this module
logger = logging.getLogger(__name__)

from datetime import datetime

class CredentialManager:
    """
    Manages AES256-GCM encryption and storage of service credentials with key rotation.

    Notes on encryption key handling:
    - Uses AES256-GCM for authenticated encryption
    - Encryption key MUST be provided via ENCRYPTION_KEY env var
    - Keys are 32-byte (256-bit) AES keys, base64 encoded in env var
    - Key rotation: Keys are versioned and rotated automatically
    - Credentials stored as binary in database (BYTEA)
    """

    def __init__(self):
        """Initialize credential manager with AES256-GCM encryption."""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        import base64
        import os

        self.aesgcm = AESGCM
        self.current_key_version = 1
        self.encryption_keys = {}  # version -> key mapping

        # Use encryption key from settings (which handles dev key generation)
        self.encryption_key = settings.ENCRYPTION_KEY
        if not self.encryption_key:
            raise RuntimeError(
                "ENCRYPTION_KEY must be set in environment. "
                "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )

        # Decode the key
        try:
            key_bytes = base64.b64decode(self.encryption_key)
            if len(key_bytes) != 32:
                raise ValueError(f"Key must be 32 bytes, got {len(key_bytes)}")
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY: {e}")

        # Store key version with each encrypted credential
        # Format: {version:4bytes}{nonce:12bytes}{ciphertext}
        self.encryption_keys[self.current_key_version] = key_bytes

    def encrypt_credentials(self, credentials: Dict[str, Any]) -> bytes:
        """Encrypt credentials dictionary using AES256-GCM"""
        import os
        import base64

        # Serialize data
        data = json.dumps(credentials, sort_keys=True).encode('utf-8')

        # Generate random nonce (must be unique per encryption)
        nonce = os.urandom(12)  # 96-bit nonce for GCM

        # Get current encryption key
        key = self.encryption_keys[self.current_key_version]

        # Encrypt using AES256-GCM
        aesgcm = self.aesgcm(key)
        ciphertext = aesgcm.encrypt(nonce, data, None)  # None for associated data

        # Combine version + nonce + ciphertext
        version_bytes = self.current_key_version.to_bytes(4, 'big')
        combined = version_bytes + nonce + ciphertext

        return combined

    def decrypt_credentials(self, encrypted_data: bytes) -> Dict[str, Any]:
        """Decrypt credentials using AES256-GCM"""
        try:
            combined = encrypted_data

            # Check if this looks like AES256-GCM format (version + nonce + ciphertext)
            if len(combined) > 16:  # minimum: 4 (version) + 12 (nonce) + 1 (ciphertext)
                version = int.from_bytes(combined[:4], 'big')
                nonce = combined[4:16]
                ciphertext = combined[16:]

                if version in self.encryption_keys:
                    key = self.encryption_keys[version]
                    aesgcm = self.aesgcm(key)
                    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
                    return json.loads(plaintext.decode('utf-8'))

            raise ValueError("Could not decrypt data with available keys")

        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError(f"Failed to decrypt credentials: {e}")

    def rotate_encryption_key(self) -> int:
        """Rotate to a new encryption key. Returns the new key version."""
        import os

        # Generate new key
        new_key = os.urandom(32)
        self.current_key_version += 1
        self.encryption_keys[self.current_key_version] = new_key

        logger.info(f"Encryption key rotated to version {self.current_key_version}")
        logger.warning(
            "Key rotation is in-memory only. Rotated keys will be lost on restart. "
            "Ensure you persist the new key externally for production use."
        )
        return self.current_key_version

    def should_rotate_key(self, max_age_days: int = 90) -> bool:
        """Check if encryption key should be rotated based on age."""
        # For now, always return False (manual rotation only)
        # In production, track key creation dates and rotate automatically
        return False

    def cleanup_old_keys(self, keep_versions: int = 5) -> int:
        """Clean up old encryption keys, keeping only the most recent ones."""
        if len(self.encryption_keys) <= keep_versions:
            return 0

        # Keep only the most recent versions
        sorted_versions = sorted(self.encryption_keys.keys(), reverse=True)
        versions_to_remove = sorted_versions[keep_versions:]

        removed_count = 0
        for version in versions_to_remove:
            if version != self.current_key_version:  # Never remove current key
                del self.encryption_keys[version]
                removed_count += 1

        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} old encryption keys")

        return removed_count

    def get_key_info(self) -> Dict[str, Any]:
        """Get information about current encryption keys"""
        return {
            "current_version": self.current_key_version,
            "available_versions": list(self.encryption_keys.keys()),
            "algorithm": "AES256-GCM"
        }

    async def store_service_credentials(
    self,
    db: AsyncSession,
    user_id: str,
    service_name: str,
    credentials: Dict[str, str],
    features: Dict[str, bool],
    feature_metadata: Dict[str, Any] = {},  # NEW parameter
    environment: str = "test"
) -> ServiceCredential:
        """Store encrypted service credentials in database"""

        # Encrypt the credentials
        encrypted_creds = self.encrypt_credentials(credentials)

        # Create database record
        credential = ServiceCredential(
            user_id=user_id,
            provider_name=service_name,
            environment=environment,
            encrypted_credential=encrypted_creds,
            features_config=features,
            is_active=True
        )

        db.add(credential)
        await db.commit()
        await db.refresh(credential)

        return credential

    # API Key Management Methods
    async def generate_api_key(
        self,
        db: AsyncSession,
        user_id: str,
        key_name: str = "Default Key",
        key_environment: str = "test",  # New parameter for environment
        rate_limit_per_min: int = None,  # Make optional to use environment defaults
        rate_limit_per_day: int = None,  # Make optional to use environment defaults
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate a new API key for a user with environment support"""
        import secrets
        import hashlib
        from ..models import ApiKey

        # Set environment-specific rate limits if not provided
        if rate_limit_per_min is None:
            rate_limit_per_min = 1000 if key_environment == "test" else 100
        if rate_limit_per_day is None:
            rate_limit_per_day = 100000 if key_environment == "test" else 10000

        # Generate secure API key with environment prefix
        env_prefix = "unf_test" if key_environment == "test" else "unf_live"
        raw_key = f"{env_prefix}_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:12]  # First 12 chars as prefix (includes env indicator)

        # Create database record
        from datetime import datetime
        api_key_record = ApiKey(
            id=uuid.uuid4(),
            user_id=user_id,
            key_hash=key_hash,
            key_name=key_name,
            key_prefix=key_prefix,
            environment=key_environment,
            rate_limit_per_min=rate_limit_per_min,
            rate_limit_per_day=rate_limit_per_day,
            expires_at=expires_at,
            created_at=datetime.utcnow(),
            is_active=True
        )

        db.add(api_key_record)
        await db.commit()
        await db.refresh(api_key_record)

        return {
            "api_key": raw_key,
            "key_id": str(api_key_record.id),
            "key_name": key_name,
            "environment": key_environment,
            "created_at": api_key_record.created_at.isoformat() if api_key_record.created_at else None
        }

    async def get_user_api_keys(self, db: AsyncSession, user_id: str) -> List[Dict[str, Any]]:
        """Get all API keys for a user"""
        from ..models import ApiKey
        from sqlalchemy import select

        result = await db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id)
        )
        api_keys = result.scalars().all()

        return [{
            "id": str(key.id),
            "key_name": key.key_name,
            "key_prefix": key.key_prefix,
            "environment": key.environment,
            "is_active": key.is_active,
            "rate_limit_per_min": key.rate_limit_per_min,
            "rate_limit_per_day": key.rate_limit_per_day,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
            "expires_at": key.expires_at.isoformat() if key.expires_at else None,
            "created_at": key.created_at.isoformat() if key.created_at else None
        } for key in api_keys]

    async def validate_api_key(self, db: AsyncSession, api_key: str) -> Dict[str, Any]:
        """Validate API key and return user/key info"""
        import hashlib
        from ..models import ApiKey
        from sqlalchemy import select, update

        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        result = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash)
        )
        key_record = result.scalar_one_or_none()

        if not key_record:
            raise ValueError("Invalid API key")

        if not key_record.is_active:
            raise ValueError("API key is inactive")

        if key_record.expires_at and key_record.expires_at < datetime.utcnow():
            raise ValueError("API key has expired")

        # Update last used timestamp
        await db.execute(
            update(ApiKey)
            .where(ApiKey.id == key_record.id)
            .values(last_used_at=datetime.utcnow())
        )
        await db.commit()

        return {
            "user_id": str(key_record.user_id),
            "key_id": str(key_record.id),
            "key_name": key_record.key_name,
            "rate_limit_per_min": key_record.rate_limit_per_min,
            "rate_limit_per_day": key_record.rate_limit_per_day
        }

    async def get_api_key_usage(self, db: AsyncSession, key_id: str, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics for an API key"""
        from ..models import TransactionLog
        from sqlalchemy import select, func
        from datetime import timedelta

        since_date = datetime.utcnow() - timedelta(days=days)

        # Get total requests
        result = await db.execute(
            select(func.count(TransactionLog.id))
            .where(
                TransactionLog.api_key_id == key_id,
                TransactionLog.created_at >= since_date
            )
        )
        total_requests = result.scalar()

        # Get requests by day
        result = await db.execute(
            select(
                func.date(TransactionLog.created_at).label('date'),
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id == key_id,
                TransactionLog.created_at >= since_date
            )
            .group_by(func.date(TransactionLog.created_at))
            .order_by(func.date(TransactionLog.created_at))
        )
        daily_usage = [{"date": str(row.date), "count": row.count} for row in result]

        # Get requests by service
        result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id == key_id,
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
            .order_by(func.count(TransactionLog.id).desc())
        )
        service_usage = [{"service": row.service_name, "count": row.count} for row in result]

        return {
            "total_requests": total_requests,
            "daily_usage": daily_usage,
            "service_usage": service_usage,
            "period_days": days
        }

    async def get_user_credentials(
        self,
        db: AsyncSession,
        user_id: str,
        service_name: Optional[str] = None,
        environment: str = "test"
    ) -> list:
        """Get user's stored credentials (returns metadata, not decrypted data)"""
        from sqlalchemy import select

        query = select(ServiceCredential).where(
            ServiceCredential.user_id == user_id,
            ServiceCredential.environment == environment,
            ServiceCredential.is_active == True
        )

        if service_name:
            query = query.where(ServiceCredential.provider_name == service_name)

        result = await db.execute(query)
        credentials = result.scalars().all()

        return [{
            "id": str(cred.id),
            "service_name": cred.provider_name,
            "environment": cred.environment,
            "features": cred.features_config,
            "created_at": cred.created_at,
            "is_active": cred.is_active
        } for cred in credentials]

    async def get_credentials(
        self,
        db: AsyncSession,
        user_id: str,
        provider_name: str,
        environment: str = "test"
    ) -> Optional[Dict[str, Any]]:
        """
        Get decrypted credentials for a specific user, provider, and environment.
        
        Args:
            db: Database session
            user_id: User ID (UUID string)
            provider_name: Provider/service name (e.g., "razorpay", "paypal")
            environment: Environment name ("test" or "live")
        
        Returns:
            Decrypted credentials dictionary or None if not found
        """
        try:
            from sqlalchemy import select
            
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
            
            return self.decrypt_credentials(credential.encrypted_credential)
            
        except Exception as e:
            logger.error(f"Error retrieving credentials: {e}")
            return None

    def validate_credentials_format(self, service_name: str, credentials: Dict[str, str]) -> Dict[str, str]:
        """Validate credential format for a service"""
        errors = {}

        # Basic validation - check required fields exist and are not empty
        if service_name == "razorpay":
            if not credentials.get("RAZORPAY_KEY_ID"):
                errors["RAZORPAY_KEY_ID"] = "Required"
            if not credentials.get("RAZORPAY_KEY_SECRET"):
                errors["RAZORPAY_KEY_SECRET"] = "Required"

        elif service_name == "paypal":
            if not credentials.get("PAYPAL_CLIENT_ID"):
                errors["PAYPAL_CLIENT_ID"] = "Required"
            if not credentials.get("PAYPAL_CLIENT_SECRET"):
                errors["PAYPAL_CLIENT_SECRET"] = "Required"

        elif service_name == "stripe":
            if not credentials.get("STRIPE_SECRET_KEY"):
                errors["STRIPE_SECRET_KEY"] = "Required"

        elif service_name == "twilio":
            if not credentials.get("TWILIO_ACCOUNT_SID"):
                errors["TWILIO_ACCOUNT_SID"] = "Required"
            if not credentials.get("TWILIO_AUTH_TOKEN"):
                errors["TWILIO_AUTH_TOKEN"] = "Required"

        elif service_name == "aws_s3":
            if not credentials.get("AWS_ACCESS_KEY_ID"):
                errors["AWS_ACCESS_KEY_ID"] = "Required"
            if not credentials.get("AWS_SECRET_ACCESS_KEY"):
                errors["AWS_SECRET_ACCESS_KEY"] = "Required"
            if not credentials.get("AWS_S3_BUCKET"):
                errors["AWS_S3_BUCKET"] = "Required"

        return errors