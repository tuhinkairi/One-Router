import os
import base64
from typing import Optional
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

class Settings:
    """Application settings"""

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Clerk Authentication
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")

    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate Limiting
    DEFAULT_RATE_LIMIT_MINUTE: int = 60
    DEFAULT_RATE_LIMIT_DAY: int = 10000

    # Admin Configuration
    ADMIN_USER_IDS: list = []  # Will be populated from env var

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".env", ".txt"}

    def __init__(self):
        """Initialize settings and validate/generate encryption key"""
        # Load admin user IDs from environment variable (comma-separated)
        admin_ids_env = os.getenv("ADMIN_USER_IDS", "")
        self.ADMIN_USER_IDS = [uid.strip() for uid in admin_ids_env.split(",") if uid.strip()]
        
        self._validate_and_setup_encryption_key()

    def _validate_and_setup_encryption_key(self):
        """Validate or generate encryption key based on environment"""
        if not self.ENCRYPTION_KEY:
            if self.ENVIRONMENT == "development":
                # Generate a new AES256 key for development
                import base64
                import os
                key_bytes = os.urandom(32)
                self.ENCRYPTION_KEY = base64.b64encode(key_bytes).decode('utf-8')
                print(f"Generated development AES256 encryption key")
            else:
                raise RuntimeError(
                    "ENCRYPTION_KEY environment variable is required for production. "
                    "Generate a key using: import base64, os; print(base64.b64encode(os.urandom(32)).decode())"
                )
        else:
            # Validate provided key
            try:
                # Try to decode from base64
                key_bytes = base64.urlsafe_b64decode(self.ENCRYPTION_KEY)
                if len(key_bytes) != 32:
                    raise ValueError(
                        f"Invalid encryption key: must be 32 bytes (base64 encoded). "
                        f"Got {len(key_bytes)} bytes. Generate a valid key using: "
                        f"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
                    )
                # Verify it's a valid Fernet key by testing it
                Fernet(self.ENCRYPTION_KEY.encode() if isinstance(self.ENCRYPTION_KEY, str) else self.ENCRYPTION_KEY)
            except Exception as e:
                raise ValueError(
                    f"Invalid ENCRYPTION_KEY format: {str(e)}. "
                    f"Must be a valid base64-encoded Fernet key. Generate one using: "
                    f"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
                )

    def validate(self):
        """Validate required settings"""
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is required")

        if not self.CLERK_SECRET_KEY:
            raise ValueError("CLERK_SECRET_KEY is required")

        if not self.ENCRYPTION_KEY:
            raise ValueError("ENCRYPTION_KEY is required")

        return True

# Global settings instance
settings = Settings()