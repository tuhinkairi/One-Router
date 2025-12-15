import hashlib
import secrets
from fastapi import HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..models import User
from .clerk import clerk_auth

# API Key Authentication (for SDK users)
class APIKeyAuth:
    def __init__(self):
        # In production, this would be stored in database
        # For demo purposes, using in-memory store
        self.api_keys = {
            # Example: hash("unf_live_demo_key") -> user_id mapping
            "hashed_demo_key": {
                "user_id": "demo_user_123",
                "is_active": True,
                "rate_limit_per_min": 100,
                "rate_limit_per_day": 10000,
            }
        }

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
async def get_api_user(x_platform_key: str = Header(..., alias="X-Platform-Key")) -> dict:
    """Get user from API key for SDK calls"""
    return await api_key_auth.validate_api_key(x_platform_key)

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