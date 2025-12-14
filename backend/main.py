from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from dotenv import load_dotenv
import os
from auth import get_current_user, get_api_user, api_key_auth

# Load environment variables
load_dotenv()

# Security configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Validate required environment variables
CLERK_SECRET = os.getenv("CLERK_SECRET_KEY")
if not CLERK_SECRET or CLERK_SECRET == "sk_test_bFhW0ISjDJ96RsI77Rcp7GfnRSnntvHlI3a8bPGDjA":
    if ENVIRONMENT == "production":
        raise ValueError(
            "CRITICAL: CLERK_SECRET_KEY must be set to a valid production key. "
            "Check your environment variables."
        )
    else:
        print("WARNING: Using placeholder Clerk key. Set CLERK_SECRET_KEY for development.")

# Configure CORS based on environment
if ENVIRONMENT == "production":
    allowed_origins = [FRONTEND_URL]
    allowed_hosts = [FRONTEND_URL.replace("http://", "").replace("https://", "")]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:8000",
    ]
    allowed_hosts = [
        "localhost:3000",
        "localhost:3002",
        "localhost:8000",
        "127.0.0.1:3000",
        "127.0.0.1:3002",
        "127.0.0.1:8000",
        "localhost",
        "127.0.0.1",
    ]

# Create FastAPI app
app = FastAPI(
    title="OneRouter API",
    description="Backend API for OneRouter",
    version="0.1.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)

# Add security middleware (only in production)
if ENVIRONMENT == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Add security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to OneRouter API",
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "API is running"
    }


# Example endpoint
@app.get("/api/example")
async def example():
    return {
        "data": "This is example data from the backend",
        "timestamp": "2025-12-14"
    }


# Protected endpoint example
@app.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile (protected route)"""
    return {
        "user_id": user.get("sub"),
        "email": user.get("email"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "profile": user
    }


# API Key Management (Clerk JWT protected)
@app.post("/api/keys")
async def generate_api_key(user: dict = Depends(get_current_user)):
    """Generate a new API key for the authenticated user"""
    user_id = user.get("sub") or "unknown_user"
    api_key = api_key_auth.generate_api_key(user_id)

    return {
        "api_key": api_key,
        "message": "API key generated successfully. Store this key securely - it won't be shown again.",
        "user_id": user_id
    }


@app.get("/api/keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    """List API keys for the authenticated user"""
    user_id = user.get("sub")

    # In production, query database for user's keys
    # For demo, return mock data
    return {
        "api_keys": [
            {
                "id": "key_123",
                "name": "Production Key",
                "prefix": "unf_live_",
                "created_at": "2025-01-01T00:00:00Z",
                "last_used": None,
                "is_active": True
            }
        ]
    }


# Unified API endpoints (API Key protected)
@app.get("/v1/health")
async def unified_health(api_user: dict = Depends(get_api_user)):
    """Health check for unified API"""
    return {
        "status": "healthy",
        "message": "OneRouter unified API is running",
        "user_id": api_user["user_id"]
    }




class PaymentOrder(BaseModel):
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    currency: str = Field(default="INR", min_length=3, max_length=3)
    description: Optional[str] = Field(None, max_length=255)


@app.post("/v1/payments/orders")
async def create_payment_order(order: PaymentOrder, api_user: dict = Depends(get_api_user)):
    """Create a payment order (unified API)"""
    # Validate amount
    if order.amount > 10000000:  # Max reasonable amount
        return JSONResponse(status_code=400, content={"error": "Amount exceeds maximum limit"})
    
    # This would route to the appropriate payment provider
    return {
        "transaction_id": f"txn_{api_user['user_id']}_123",
        "provider": "razorpay",  # Would be determined by routing logic
        "status": "created",
        "amount": order.amount,
        "currency": order.currency
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
