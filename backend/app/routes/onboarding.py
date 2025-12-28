from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
import logging
import hashlib

logger = logging.getLogger(__name__)

from ..database import get_db
from ..auth.dependencies import get_current_user
from ..services.env_parser import EnvParserService, ServiceDetection
from ..services.credential_manager import CredentialManager
from ..config import settings
from ..cache import cache_service
import secrets
import time
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

class SecureSessionManager:
    """Production-grade session management with Redis, encryption, and fingerprinting"""

    def __init__(self, redis_client, encryption_key: bytes):
        self.redis = redis_client
        self.aesgcm = AESGCM(encryption_key)

    def _generate_fingerprint(self, request_fingerprint: str) -> str:
        """Generate SHA256 hash of request fingerprint"""
        return hashlib.sha256(request_fingerprint.encode()).hexdigest()

    async def create_session(
        self, 
        user_id: str, 
        env_vars: dict, 
        request_fingerprint: str,
        ttl: int = 3600
    ) -> str:
        """Create encrypted session in Redis with fingerprinting"""
        session_id = secrets.token_urlsafe(16)
        session_key = "env_session:{}".format(session_id)

        session_data = {
            'user_id': user_id,
            'env_vars': env_vars,
            'fingerprint': self._generate_fingerprint(request_fingerprint),
            'created_at': time.time(),
            'expires_at': time.time() + ttl
        }

        # Encrypt session data
        encrypted_data = self._encrypt_session_data(session_data)

        # Store in Redis with TTL
        await self.redis.setex(session_key, ttl, encrypted_data)

        return session_id

    async def get_session(
        self, 
        session_id: str, 
        user_id: str,
        request_fingerprint: str
    ) -> Optional[dict]:
        """Retrieve and decrypt session with ownership and fingerprint validation"""
        session_key = "env_session:{}".format(session_id)
        encrypted_data = await self.redis.get(session_key)

        if not encrypted_data:
            return None

        try:
            # Decrypt session data
            session_data = self._decrypt_session_data(encrypted_data)

            # Verify ownership
            if session_data['user_id'] != user_id:
                logger.warning(f"Security: User {user_id} attempted to access session owned by {session_data['user_id']}")
                return None

            # Verify fingerprint to detect session hijacking
            current_fingerprint = self._generate_fingerprint(request_fingerprint)
            if session_data.get('fingerprint') != current_fingerprint:
                logger.error(f"Security: Session hijacking detected for session {session_id}. Fingerprint mismatch.")
                # Delete compromised session immediately
                await self.redis.delete(session_key)
                raise HTTPException(status_code=401, detail="Session hijacking detected")

            # Check expiration
            if time.time() > session_data['expires_at']:
                await self.redis.delete(session_key)
                return None

            return session_data['env_vars']

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error decrypting session {session_id}: {e}")
            # Clean up corrupted session
            await self.redis.delete(session_key)
            return None

    async def delete_session(self, session_id: str):
        """Delete session from Redis"""
        session_key = "env_session:{}".format(session_id)
        await self.redis.delete(session_key)

    async def get_session_count(self) -> int:
        """Get count of active sessions for monitoring"""
        try:
            keys = await self.redis.keys("env_session:*")
            return len(keys)
        except Exception:
            return 0

    def _encrypt_session_data(self, data: dict) -> str:
        """AES256-GCM encryption for session data"""
        import os

        plaintext = json.dumps(data, sort_keys=True).encode('utf-8')
        nonce = os.urandom(12)  # 96-bit nonce

        ciphertext = self.aesgcm.encrypt(nonce, plaintext, None)

        # Combine version(4) + nonce(12) + ciphertext and base64 encode
        version_bytes = (1).to_bytes(4, 'big')  # Version 1
        combined = version_bytes + nonce + ciphertext

        return base64.b64encode(combined).decode('utf-8')

    def _decrypt_session_data(self, encrypted: str) -> dict:
        """AES256-GCM decryption for session data"""
        combined = base64.b64decode(encrypted)

        # Extract components
        version = int.from_bytes(combined[:4], 'big')
        nonce = combined[4:16]
        ciphertext = combined[16:]

        # Decrypt
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode('utf-8'))

# Initialize session manager
_session_manager = None

async def get_session_manager() -> SecureSessionManager:
    """Get or create session manager instance with persistent encryption key"""
    global _session_manager
    if _session_manager is None:
        # Use SESSION_ENCRYPTION_KEY from environment (same approach as API_KEY_ENCRYPTION_KEY)
        encryption_key_env = os.getenv("SESSION_ENCRYPTION_KEY")
        
        if not encryption_key_env:
            # Fallback to credential manager for backward compatibility, but warn
            logger.warning("SESSION_ENCRYPTION_KEY not found in environment. Using credential manager key.")
            from ..services.credential_manager import CredentialManager
            cred_manager = CredentialManager()
            encryption_key = list(cred_manager.encryption_keys.values())[0]
        else:
            # Use persistent encryption key from environment
            try:
                encryption_key = base64.b64decode(encryption_key_env)
                if len(encryption_key) != 32:
                    raise ValueError(f"SESSION_ENCRYPTION_KEY must be 256-bit (32 bytes), got {len(encryption_key)}")
            except Exception as e:
                logger.error(f"Failed to decode SESSION_ENCRYPTION_KEY: {e}")
                raise

        redis_client = await cache_service._get_redis()
        _session_manager = SecureSessionManager(redis_client, encryption_key)

    return _session_manager

# Migration function for existing file-based sessions
async def migrate_file_sessions_to_redis():
    """One-time migration from parsed_sessions.json to Redis with secure cleanup"""
    sessions_file = Path("parsed_sessions.json")

    if not sessions_file.exists():
        return  # No migration needed

    logger.info("🔄 Migrating sessions from file to Redis...")

    temp_backup = None
    try:
        # Load existing sessions
        with open(sessions_file, 'r') as f:
            old_sessions = json.load(f)

        if not old_sessions:
            logger.info("No sessions to migrate")
            # Securely delete the file (overwrite with random data first)
            _secure_delete_file(sessions_file)
            return

        # Get session manager
        session_manager = await get_session_manager()

        migrated_count = 0
        for session_id, session_data in old_sessions.items():
            try:
                # Calculate remaining TTL
                expires_at = session_data.get('expires_at', 0)
                remaining_ttl = max(0, int(expires_at - time.time()))

                if remaining_ttl > 0:
                    # Create new Redis session with default fingerprint for migration
                    # (in production, this should be re-verified by user)
                    await session_manager.create_session(
                        user_id=session_data['user_id'],
                        env_vars=session_data['env_vars'],
                        request_fingerprint="migration",
                        ttl=remaining_ttl
                    )
                    migrated_count += 1
                else:
                    logger.debug(f"Skipping expired session {session_id}")

            except Exception as e:
                logger.error(f"Error migrating session {session_id}: {e}")

        # Securely delete old file with overwrite
        _secure_delete_file(sessions_file)
        logger.info(f"✅ Migrated {migrated_count} sessions from file to Redis")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()


def _secure_delete_file(file_path: Path):
    """Securely delete a file by overwriting with random data before removal"""
    try:
        # Get file size
        file_size = file_path.stat().st_size
        
        # Overwrite with random data 3 times (DoD standard)
        for _ in range(3):
            with open(file_path, 'wb') as f:
                f.write(os.urandom(file_size))
        
        # Delete the file
        file_path.unlink()
        logger.info(f"Securely deleted {file_path}")
    except Exception as e:
        logger.error(f"Failed to securely delete {file_path}: {e}")
        # Still try to delete even if overwrite fails
        try:
            file_path.unlink()
        except:
            pass

# Sessions now loaded from Redis on demand

router = APIRouter()
env_parser = EnvParserService()
credential_manager = CredentialManager()


def _generate_request_fingerprint(request: Request, user_id: str) -> str:
    """Generate fingerprint from request characteristics to prevent session hijacking"""
    # Combine user_id + user agent + client ip for fingerprint
    user_agent = request.headers.get("user-agent", "")
    client_ip = request.client.host if request.client else "unknown"
    
    fingerprint_data = f"{user_id}:{user_agent}:{client_ip}"
    return fingerprint_data

# Pydantic models for API requests/responses
class ParseResponse(BaseModel):
    detected_services: List[ServiceDetection]
    parsed_variables: int
    status: str
    errors: Optional[dict] = None
    session_id: Optional[str] = None

class ServiceConfig(BaseModel):
    service_name: str
    credentials: dict
    features: dict
    feature_metadata: Optional[dict] = {}

class ConfigureRequest(BaseModel):
    services: List[ServiceConfig]
    session_id: Optional[str] = None

class StoredService(BaseModel):
    service_name: str
    status: str
    credential_id: str

class ConfigureResponse(BaseModel):
    stored_services: List[StoredService]
    message: str

@router.post("/parse", response_model=ParseResponse)
async def parse_env_file(
    file: UploadFile = File(...),
    user = Depends(get_current_user),
    request: Request = None
) -> ParseResponse:
    
    """Parse uploaded .env file and detect services"""
    try:
        # Validate file type
        if not file.filename or not file.filename.endswith(('.env', '.txt')):
            raise HTTPException(status_code=400, detail="Only .env or .txt files are allowed")

        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')

        # Check file size
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE} bytes")

        # Validate .env syntax
        syntax_errors = env_parser.validate_env_syntax(content_str)
        if syntax_errors:
            return ParseResponse(
                detected_services=[],
                parsed_variables=0,
                status="error",
                errors=syntax_errors
            )

        # Parse environment variables
        env_vars = env_parser.parse_env_content(content_str)

        # Detect services
        detections = env_parser.detect_services(env_vars)

        # Generate request fingerprint for session hijacking detection
        request_fingerprint = _generate_request_fingerprint(request, user["id"])

        # Store parsed env_vars securely in Redis with fingerprinting
        session_manager = await get_session_manager()
        session_id = await session_manager.create_session(
            user_id=user["id"],
            env_vars=env_vars,
            request_fingerprint=request_fingerprint,
            ttl=settings.SESSION_TTL_SECONDS
        )

        return ParseResponse(
            detected_services=detections,
            parsed_variables=len(env_vars),
            status="success",
            session_id=session_id
        )

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")





@router.post("/configure", response_model=ConfigureResponse)
async def configure_services(
    config: ConfigureRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
) -> ConfigureResponse:
    """Store selected service credentials WITH feature metadata"""

    try:
        # Get env_vars from secure session if session_id provided
        env_vars = {}
        if config.session_id:
            session_manager = await get_session_manager()
            # Generate request fingerprint for session hijacking detection
            request_fingerprint = _generate_request_fingerprint(request, user["id"])
            env_vars = await session_manager.get_session(
                session_id=config.session_id,
                user_id=user["id"],
                request_fingerprint=request_fingerprint
            )
            if env_vars is None:
                raise HTTPException(status_code=400, detail="Invalid or expired session")

        stored_services = []

        for service_config in config.services:
            service_name = service_config.service_name
            features = service_config.features

            # Get credentials from env_vars if available, otherwise use provided credentials
            credentials = service_config.credentials
            if not credentials and env_vars:
                # Extract credentials for this service from env_vars
                credentials = {}
                service_prefixes = {
                    'razorpay': ['RAZORPAY_'],
                    'paypal': ['PAYPAL_'],
                    'twilio': ['TWILIO_'],
                    'aws_s3': ['AWS_']
                }
                prefixes = service_prefixes.get(service_name, [service_name.upper() + '_'])
                for key, value in env_vars.items():
                    for prefix in prefixes:
                        if key.startswith(prefix):
                            credentials[key] = value
                            break

            # Validate credentials format
            if not credentials:
                logger.error(f"No credentials found for {service_name}. Session may have expired or credentials not provided.")
                continue

            validation_errors = credential_manager.validate_credentials_format(service_name, credentials)
            if validation_errors:
                # Skip this service but continue with others
                logger.error(f"Error storing credentials for {service_name}: {validation_errors}")
                continue

            # Store credentials
            try:
                feature_metadata = getattr(service_config, 'feature_metadata', {})
                credential = await credential_manager.store_service_credentials(
                    db=db,
                    user_id=user["id"],
                    service_name=service_name,
                    credentials=credentials,
                    features=features,
                    feature_metadata=feature_metadata,
                    environment="test"
                )

                stored_services.append(StoredService(
                    service_name=service_name,
                    status="connected",
                    credential_id=str(credential.id)
                ))

            except Exception as e:
                logger.error(f"Error storing credentials for {service_name}: {e}")
                continue

        if not stored_services:
            return ConfigureResponse(
                stored_services=[],
                message="No services were configured. Please check that your .env file contains valid credentials and try again."
            )

        # Clean up session
        if config.session_id:
            session_manager = await get_session_manager()
            await session_manager.delete_session(config.session_id)

        return ConfigureResponse(
            stored_services=stored_services,
            message=f"Successfully connected {len(stored_services)} services"
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error configuring services: {str(e)}")

@router.get("/services")
async def get_user_services(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's configured services"""

    try:
        services = await credential_manager.get_user_credentials(
            db=db,
            user_id=user["id"],
            environment="test"
        )

        return {
            "services": services,
            "count": len(services)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching services: {str(e)}")