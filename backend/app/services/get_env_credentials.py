"""Get credentials with environment awareness"""
import logging
import os
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ServiceCredential
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Mapping of service names to their required environment variable patterns
SERVICE_ENV_PATTERNS = {
    "razorpay": {
        "required": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
        "optional": [],
        "prefix": "RAZORPAY_"
    },
    "paypal": {
        "required": ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
        "optional": ["PAYPAL_MODE", "PAYPAL_WEBHOOK_ID"],
        "prefix": "PAYPAL_"
    },
    "twilio": {
        "required": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
        "optional": ["TWILIO_PHONE_NUMBER", "TWILIO_MESSAGING_SERVICE_SID"],
        "prefix": "TWILIO_"
    },
    "aws_s3": {
        "required": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"],
        "optional": ["AWS_REGION", "AWS_ENDPOINT_URL"],
        "prefix": ""
    },
    "stripe": {
        "required": ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
        "optional": ["STRIPE_WEBHOOK_SECRET", "STRIPE_API_VERSION"],
        "prefix": "STRIPE_"
    },
    "resend": {
        "required": ["RESEND_API_KEY"],
        "optional": [],
        "prefix": "RESEND_"
    }
}

def get_credentials_from_env(service_name: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a service's credentials from environment variables when all required variables are present.
    
    Parameters:
        service_name (str): Service identifier matching an entry in SERVICE_ENV_PATTERNS (e.g., "razorpay", "paypal").
    
    Returns:
        credentials (dict[str, Any] | None): A dictionary of credential values keyed by environment variable name when every required variable for the service is present; `None` if the service is unsupported or any required variable is missing.
    """
    if service_name not in SERVICE_ENV_PATTERNS:
        logger.debug(f"Service {service_name} not supported for auto-provisioning")
        return None
    
    pattern = SERVICE_ENV_PATTERNS[service_name]
    credentials = {}
    missing_required = []
    
    # Collect required credentials
    for var_name in pattern["required"]:
        value = os.environ.get(var_name)
        if value:
            credentials[var_name] = value
        else:
            missing_required.append(var_name)
    
    # If any required credentials are missing, return None
    if missing_required:
        logger.debug(f"Missing required env vars for {service_name}: {missing_required}")
        return None
    
    # Collect optional credentials
    for var_name in pattern["optional"]:
        value = os.environ.get(var_name)
        if value:
            credentials[var_name] = value
    
    logger.info(f"Auto-provisioned credentials for {service_name} from environment variables")
    return credentials

def get_available_env_services() -> list:
    """
    Return the names of services with all required environment variables present.
    
    Returns:
        available_services (list): List of service name strings that have all required environment variables set.
    """
    available = []
    for service_name in SERVICE_ENV_PATTERNS:
        if get_credentials_from_env(service_name):
            available.append(service_name)
    return available

def get_env_service_status() -> Dict[str, Dict[str, Any]]:
    """
    Return a mapping of all known services to their environment-credential availability and details.
    
    Each mapping value is a dict with:
    - `available`: `true` if all required environment variables for the service are present, `false` otherwise.
    - `missing_required`: list of required environment variable names when `available` is `false`, otherwise an empty list.
    - `has_optional`: `true` if at least one optional environment variable for the service is set (only meaningful when `available` is `true`), `false` otherwise.
    
    Returns:
        Dict[str, Dict[str, Any]]: Mapping from service name to its status dictionary.
    """
    status = {}
    for service_name, pattern in SERVICE_ENV_PATTERNS.items():
        credentials = get_credentials_from_env(service_name)
        status[service_name] = {
            "available": credentials is not None,
            "missing_required": [] if credentials else pattern["required"],
            "has_optional": bool(credentials and any(
                os.environ.get(v) for v in pattern.get("optional", [])
            ))
        }
    return status

async def get_credentials(
    db: AsyncSession,
    user_id: str,
    provider_name: str,
    environment: str = "test"
) -> Optional[Dict[str, Any]]:
    """
    Retrieve and decrypt the active service credentials for a user in the specified environment.
    
    Searches for an active credential matching the given user, provider, and environment; if found, returns the decrypted credentials as a dictionary.
    
    Parameters:
        environment (str): Environment name such as "test" or "live". Defaults to "test".
    
    Returns:
        dict: Decrypted credentials keyed by provider-specific fields, or `None` if no active credential is found or an error occurs.
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
        encrypted_bytes = bytes(credential.encrypted_credential)
        decrypted = cred_manager.decrypt_credentials(encrypted_bytes)
        
        return decrypted
        
    except Exception as e:
        logger.error(f"Error retrieving credentials: {e}")
        return None