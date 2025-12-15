from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from .config import settings
from .database import get_db, engine
from .auth.dependencies import get_current_user, get_api_user, api_key_auth
from .models import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Initialize database tables
async def init_db():
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they're registered
            from . import models
            await conn.run_sync(User.metadata.create_all)
        print("Database tables initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")

# Create FastAPI app
app = FastAPI(
    title="OneRouter API",
    description="Unified API Gateway for Payment Services",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()

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
        "timestamp": datetime.utcnow().isoformat()
    }

# Protected endpoint example
@app.get("/api/user/profile")
async def get_user_profile(user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user's profile (protected route)"""
    clerk_id = user.get("clerk_user_id")
    if not clerk_id:
        raise HTTPException(status_code=400, detail="Invalid user token")

    # User should already exist from the get_current_user dependency
    return {
        "id": user.get("id"),
        "clerk_user_id": user.get("clerk_user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "created_at": user.get("created_at")
    }

# API Key Management (Clerk JWT protected)
@app.post("/api/keys")
async def generate_api_key(user = Depends(get_current_user)):
    """Generate a new API key for the authenticated user"""
    user_id = user.get("id") or "unknown_user"
    api_key = api_key_auth.generate_api_key(user_id)

    return {
        "api_key": api_key,
        "message": "API key generated successfully",
        "user_id": user_id
    }

@app.get("/api/keys")
async def list_api_keys(user = Depends(get_current_user)):
    """List API keys for the authenticated user"""
    # This is a simplified version - in production you'd query the database
    return {
        "api_keys": [],
        "message": "API key listing not yet implemented"
    }

# Debug endpoints
@app.get("/api/debug/db")
async def debug_database(db: AsyncSession = Depends(get_db)):
    """Debug database connection and data"""
    try:
        # Get table list
        tables_result = await db.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        table_list = [row[0] for row in tables_result.fetchall()]

        # Get user count
        user_count_result = await db.execute("SELECT COUNT(*) FROM users")
        user_count = user_count_result.scalar()

        # Get all users (for debugging)
        users_result = await db.execute("""
            SELECT id, clerk_user_id, email, name, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        """)
        users = []
        for row in users_result.fetchall():
            users.append({
                "id": str(row[0]),
                "clerk_user_id": row[1],
                "email": row[2],
                "name": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            })

        return {
            "status": "success",
            "database_url": settings.DATABASE_URL.replace(settings.DATABASE_URL.split('@')[0].split('//')[1], '***:***'),
            "tables": table_list,
            "user_count": user_count,
            "users": users
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

@app.post("/api/debug/create-test-user")
async def create_test_user(db: AsyncSession = Depends(get_db)):
    """Create a test user directly (no auth required) - FOR TESTING ONLY"""
    import uuid

    test_clerk_id = f"test_user_{uuid.uuid4().hex[:8]}"

    try:
        # Check if test user already exists
        result = await db.execute(
            select(User).where(User.clerk_user_id == test_clerk_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            return {
                "status": "exists",
                "user_id": str(existing.id),
                "clerk_user_id": existing.clerk_user_id
            }

        # Create test user
        test_user = User(
            id=uuid.uuid4(),
            clerk_user_id=test_clerk_id,
            email=f"test_{uuid.uuid4().hex[:8]}@example.com",
            name="Test User",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(test_user)
        await db.commit()
        await db.refresh(test_user)

        return {
            "status": "created",
            "user_id": str(test_user.id),
            "clerk_user_id": test_user.clerk_user_id,
            "email": test_user.email,
            "created_at": test_user.created_at.isoformat() if test_user.created_at else None,
            "message": "Test user created successfully!"
        }

    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

# Unified API routes (API Key Auth)
class PaymentOrder(BaseModel):
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    currency: str = Field(default="INR", min_length=3, max_length=3)
    description: str = Field(default="", max_length=255)

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
        "currency": order.currency,
        "description": order.description
    }