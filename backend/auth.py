import os
import httpx
from fastapi import HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
from cryptography.hazmat.primitives import serialization
import base64
import hashlib
import secrets
from fastapi import Request

security = HTTPBearer()

class ClerkAuth:
    def __init__(self):
        self.secret_key = os.getenv("CLERK_SECRET_KEY", "")
        self._initialized = False
        # Don't validate here - defer to when auth is actually used

        # Clerk's public key endpoint
        self.jwks_url = "https://api.clerk.com/v1/jwks"

    def _validate(self):
        """Validate that Clerk secret key is configured (called when auth is actually used)"""
        if self._initialized:
            return
        
        if not self.secret_key or self.secret_key.startswith("sk_test_placeholder"):
            raise ValueError(
                "CLERK_SECRET_KEY is not properly configured. "
                "Please set a valid Clerk secret key in your .env file. "
                "Get your key from: https://dashboard.clerk.com/"
            )
        self._initialized = True

    async def get_public_key(self, kid: str) -> str:
        """Fetch the public key from Clerk's JWKS endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            jwks = response.json()

        for key in jwks["keys"]:
            if key["kid"] == kid:
                # Convert JWK to PEM format
                n = base64.urlsafe_b64decode(key["n"] + "==")
                e = base64.urlsafe_b64decode(key["e"] + "==")

                from jwt.algorithms import RSAAlgorithm
                public_key = RSAAlgorithm.from_jwk(key)
                return public_key

        raise ValueError(f"Public key with kid {kid} not found")

    async def verify_token(self, token: str) -> dict:
        """Verify and decode a Clerk JWT token"""
        self._validate()  # Validate on first actual use

        if not token:
            raise HTTPException(status_code=401, detail="No token provided")

        try:
            # For development: decode without verification if using test/placeholder key
            if self.secret_key.startswith("sk_test_") or "your_secret_key_here" in self.secret_key:
                try:
                    # Just decode without verification in development with test keys
                    payload = jwt.decode(token, options={"verify_signature": False})
                    print(f"DEBUG: Decoded token payload: {payload}")
                    return payload
                except jwt.DecodeError as e:
                    print(f"DEBUG: JWT decode error: {e}")
                    raise HTTPException(status_code=401, detail=f"Invalid token format: {str(e)}")

            # For production: verify with Clerk's public keys
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")

            if not kid:
                raise HTTPException(status_code=401, detail="Invalid token: missing kid")

            # Get public key
            public_key = await self.get_public_key(kid)

            # Verify and decode token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.secret_key,
                issuer="https://clerk.your-domain.com"
            )

            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Dependency to get current authenticated user from JWT"""
        if not credentials:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        token = credentials.credentials
        return await self.verify_token(token)

# Global auth instance
clerk_auth = ClerkAuth()

# Dependency for protected routes
async def get_current_user(request: Request) -> dict:
    """Get current authenticated user"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")

    token = auth_header.split(" ")[1]
    print(f"DEBUG: Received token: {token[:50]}...")

    user = await clerk_auth.verify_token(token)
    print(f"DEBUG: Authenticated user: {user}")
    return user


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