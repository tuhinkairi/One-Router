import hashlib
import secrets
from fastapi import HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import uuid4

from ..database import get_db
from ..models import User
from .clerk import clerk_auth

# API Key Authentication (for SDK users)
class APIKeyAuth:
    def __init__(self):
        # In production, API keys are stored in database
        # In-memory store is only used as cache (Redis preferred)
        self.api_keys = {}

    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage/lookup"""
        return hashlib.sha256(api_key.encode()).hexdigest()

    def generate_api_key(self, user_id: str) -> str:
        """Generate a new API key for a user"""
        # Generate a secure random key
        key = f"unf_live_{secrets.token_urlsafe(32)}"
        key_hash = self.hash_api_key(key)

        # Store in our "database"
        self.api_keys[key_hash] = {
            "user_id": user_id,
            "is_active": True,
            "rate_limit_per_min": 100,
            "rate_limit_per_day": 10000,
        }

        return key

    async def validate_api_key(self, api_key: str) -> dict:
        """Validate API key and return user info"""
        key_hash = self.hash_api_key(api_key)

        if key_hash not in self.api_keys:
            raise HTTPException(status_code=401, detail="Invalid API key")

        key_data = self.api_keys[key_hash]
        if not key_data["is_active"]:
            raise HTTPException(status_code=401, detail="API key is inactive")

        return key_data

# Global API key auth instance
api_key_auth = APIKeyAuth()

# Dependency for API key protected routes
async def get_api_user(authorization: Optional[str] = Header(None, alias="Authorization"), platform_key: Optional[str] = Header(None, alias="X-Platform-Key"), db: AsyncSession = Depends(get_db)) -> dict:
    """Get user and API key from API key for SDK calls"""
    print(f"DEBUG: get_api_user called with authorization={authorization[:10] if authorization else None}, platform_key={platform_key[:10] if platform_key else None}")
    api_key = None

    # Try Authorization header first (Bearer token format)
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ", 1)[1]
    # Fallback to X-Platform-Key header (SDK format)
    elif platform_key:
        api_key = platform_key
    else:
        print("DEBUG: No API key provided")
        raise HTTPException(status_code=401, detail="Authorization header (Bearer token) or X-Platform-Key header required")

    print(f"DEBUG: API key extracted: {api_key[:10]}...")

    # Hash the API key
    import hashlib
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    print(f"DEBUG: Key hash: {key_hash[:10]}...")

    # Look up API key in database
    from ..models import ApiKey, User
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active == True
            )
        )
        api_key_obj = result.scalar_one_or_none()
        print(f"DEBUG: API key obj found: {api_key_obj is not None}")
    except Exception as e:
        print(f"DEBUG: Error looking up API key: {e}")
        raise

    if not api_key_obj:
        print("DEBUG: API key not found or inactive")
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    # Update last_used_at timestamp
    api_key_obj.last_used_at = datetime.utcnow()
    await db.commit()

    # Get user
    try:
        result = await db.execute(select(User).where(User.id == api_key_obj.user_id))
        user = result.scalar_one_or_none()
        print(f"DEBUG: User found: {user is not None}")
    except Exception as e:
        print(f"DEBUG: Error looking up user: {e}")
        raise

    if not user:
        print("DEBUG: User not found for API key")
        raise HTTPException(status_code=401, detail="User not found for API key")

    result_dict = {
        "id": str(user.id),
        "clerk_user_id": user.clerk_user_id,
        "email": user.email,
        "name": user.name,
        "api_key": api_key_obj,
        "environment": api_key_obj.environment  # Include environment from API key
    }
    print(f"DEBUG: Returning auth data for user {user.id}")
    return result_dict

# Dependency for protected routes
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current authenticated user and ensure they exist in database"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")

    token = auth_header.split(" ")[1]
    print(f"DEBUG: Received token: {token[:50]}...")

    # Verify token with Clerk
    token_payload = await clerk_auth.verify_token(token)
    print(f"DEBUG: Authenticated user: {token_payload}")

    # Extract user info from token
    clerk_user_id = token_payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

    # Check if user exists in database, create if not
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    db_user = result.scalar_one_or_none()

    if not db_user:
        # Fetch full user profile from Clerk API
        try:
            profile = await clerk_auth.get_user_profile(clerk_user_id)
            email = profile.get("email") or f"{clerk_user_id}@clerk.local"
            name = profile.get("name") or f"User {clerk_user_id[-8:]}"
        except Exception as e:
            print(f"⚠️  Failed to fetch profile from Clerk API: {e}")
            email = f"{clerk_user_id}@clerk.local"
            name = f"User {clerk_user_id[-8:]}"

        # Set timestamps explicitly (naive UTC datetime for PostgreSQL)
        now = datetime.utcnow()

        new_user = User(
            id=uuid4(),
            clerk_user_id=clerk_user_id,
            email=email,
            name=name,
            created_at=now,
            updated_at=now
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        db_user = new_user
        print(f"✅ Created new user: {db_user.id} with email: {email}, name: {name}")

    return {
        "id": str(db_user.id),
        "clerk_user_id": db_user.clerk_user_id,
        "email": db_user.email,
        "name": db_user.name,
        "created_at": db_user.created_at
    }