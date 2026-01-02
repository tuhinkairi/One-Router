from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from .config import settings
from .database import get_db, engine
from .auth.dependencies import get_current_user, get_api_user, api_key_auth
from .models import User
from .routes.onboarding import router as onboarding_router
from .routes.unified_api import router as unified_api_router
from .routes.services import router as services_router
from .routes.service_discovery import router as service_discovery_router
from .cache import init_redis, close_redis, cache_service
from .exceptions import OneRouterException, ErrorResponse, ErrorDetail, ErrorCode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

# Initialize database tables
async def init_db():
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they're registered
            from . import models
            await conn.run_sync(User.metadata.create_all)
        print("Database tables initialized successfully")

        # Test database connection health
        from .database import check_connection_health
        db_healthy = await check_connection_health()
        if not db_healthy:
            print("WARNING: Database connection health check failed")

        # Migrate sessions from file to Redis if needed
        from .routes.onboarding import migrate_file_sessions_to_redis
        await migrate_file_sessions_to_redis()

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

# Build CORS allow_origins list based on environment
cors_allow_origins = [settings.FRONTEND_URL]
is_dev = settings.DEBUG or settings.ENVIRONMENT == "development"

if is_dev:
    # Include localhost origins only in development
    cors_allow_origins.extend(["http://localhost:3000", "http://localhost:3001"])

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=is_dev,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request ID tracking (helps debugging)
@app.middleware("http")
async def add_request_id(request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response

# Add security headers (skip for OPTIONS requests)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)

    # Skip security headers for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return response

    # Add API versioning header
    response.headers["X-API-Version"] = "1.0.0"

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """Simplified rate limiting - only for API endpoints"""
    path = request.url.path

    # Skip rate limiting for health checks and docs
    if path in ["/", "/docs", "/redoc", "/api/health", "/openapi.json"]:
        response = await call_next(request)
        return response

    # Only rate limit API endpoints
    if not path.startswith("/v1/") and not path.startswith("/api/"):
        response = await call_next(request)
        return response

    # Extract API key or use IP
    api_key_id = None
    limit_per_minute = 30  # Default for unauthenticated

    # Try to get API key
    auth_header = request.headers.get("Authorization", "")
    platform_key = request.headers.get("X-Platform-Key", "")

    if auth_header.startswith("Bearer ") or platform_key:
        api_key = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else platform_key
        import hashlib
        api_key_id = hashlib.sha256(api_key.encode()).hexdigest()[:16]
        limit_per_minute = 100  # Higher limit for authenticated
    else:
        # Use IP for anonymous requests
        client_ip = request.client.host if request.client else "unknown"
        api_key_id = f"ip_{client_ip}"

    # Check rate limit
    try:
        is_allowed, remaining, reset_at = await cache_service.check_rate_limit(
            api_key_id=api_key_id,
            limit_per_minute=limit_per_minute
        )

        if not is_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": max(1, reset_at - int(__import__('time').time()))
                },
                headers={
                    "X-RateLimit-Limit": str(limit_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                    "Retry-After": str(max(1, reset_at - int(__import__('time').time())))
                }
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)

        return response

    except Exception as e:
        # Fail open on error
        import logging
        logging.exception(f"Rate limiting error: {e}")
        response = await call_next(request)
        return response

# API version negotiation middleware
@app.middleware("http")
async def api_version_middleware(request: Request, call_next):
    """
    Handle API version negotiation via X-API-Version header.
    Stores version in request state for routing decisions.
    Adds version and deprecation headers to response.
    """
    api_version = request.headers.get("X-API-Version", "1.0")
    request.state.api_version = api_version
    
    response = await call_next(request)
    response.headers["X-API-Version"] = api_version
    response.headers["X-API-Deprecated"] = "false"
    
    # Add deprecation notice for older versions (for future compatibility)
    if api_version.startswith("1."):
        response.headers["X-API-Deprecation-Date"] = "2026-01-01"
    
    return response

# CSRF token validation middleware
@app.middleware("http")
async def csrf_validation_middleware(request: Request, call_next):
    """
    CSRF validation - ONLY for browser-based requests, NOT API endpoints
    """
    method = request.method
    path = request.url.path

    # Skip CSRF for safe methods
    if method in ["GET", "HEAD", "OPTIONS"]:
        return await call_next(request)

    # Skip CSRF for ALL API endpoints (they use API key auth instead)
    api_paths = [
        "/v1/",           # All unified API endpoints
        "/api/keys",      # API key management
        "/webhooks/",     # Webhook receivers
    ]

    if any(path.startswith(api_path) for api_path in api_paths):
        return await call_next(request)

    # Skip CSRF for routes with API key in header
    if request.headers.get("Authorization") or request.headers.get("X-Platform-Key"):
        return await call_next(request)

    # Only validate CSRF for browser-based dashboard requests
    skip_paths = [
        "/api/csrf/",
        "/api/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    if any(path.startswith(skip_path) for skip_path in skip_paths):
        return await call_next(request)

    # Now check CSRF token for browser requests
    csrf_token = request.headers.get("X-CSRF-Token", "")

    if not csrf_token:
        from .exceptions import ErrorCode, ErrorDetail, ErrorResponse
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))

        return JSONResponse(
            status_code=403,
            content=ErrorResponse(
                error=ErrorDetail(
                    code=ErrorCode.INVALID_REQUEST_FORMAT,
                    message="CSRF token missing. This endpoint requires CSRF protection for browser requests.",
                    details={"hint": "Use API key authentication for programmatic access"}
                ),
                request_id=request_id,
                timestamp=datetime.utcnow().isoformat()
            ).dict()
        )

    # Validate token (existing logic)
    session_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt
            token = auth_header.split(" ", 1)[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            session_id = payload.get("sub")
        except Exception:
            pass

    if not session_id:
        session_id = request.cookies.get("session_id")

    if not session_id:
        import secrets
        session_id = secrets.token_urlsafe(32)

    from app.services.csrf_manager import CSRFTokenManager
    is_valid = await CSRFTokenManager.validate_token(session_id, csrf_token)

    if not is_valid:
        from .exceptions import ErrorCode, ErrorDetail, ErrorResponse
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))

        return JSONResponse(
            status_code=403,
            content=ErrorResponse(
                error=ErrorDetail(
                    code=ErrorCode.INVALID_REQUEST_FORMAT,
                    message="CSRF token validation failed",
                    details={"reason": "token_mismatch_or_expired"}
                ),
                request_id=request_id,
                timestamp=datetime.utcnow().isoformat()
            ).dict()
        )

    request.state.csrf_validated = True
    return await call_next(request)

# Global exception handler for OneRouterException
@app.exception_handler(OneRouterException)
async def onerouter_exception_handler(request: Request, exc: OneRouterException):
    """Handle custom OneRouter exceptions with standardized error response"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
    
    error_response = ErrorResponse(
        error=ErrorDetail(
            code=exc.error_code,
            message=exc.message,
            details=exc.details
        ),
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict(),
        headers={"X-Request-ID": request_id}
    )

# Global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with standardized format"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
    
    # Extract validation error details
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    error_response = ErrorResponse(
        error=ErrorDetail(
            code=ErrorCode.INVALID_REQUEST_FORMAT,
            message="Request validation failed",
            details={"validation_errors": errors}
        ),
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=400,
        content=error_response.dict(),
        headers={"X-Request-ID": request_id}
    )

# Global exception handler for generic exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with sanitized error response"""
    request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
    
    import logging
    logger = logging.getLogger(__name__)
    logger.exception(f"Unhandled exception in request {request_id}: {exc}")
    
    # In production, don't leak stack traces or sensitive info
    error_message = "An unexpected error occurred"
    if settings.DEBUG:
        error_message = f"Internal server error: {str(exc)}"
    
    error_response = ErrorResponse(
        error=ErrorDetail(
            code=ErrorCode.INTERNAL_ERROR,
            message=error_message,
            details={"request_id": request_id} if settings.DEBUG else None
        ),
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response.dict(),
        headers={"X-Request-ID": request_id}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and Redis on startup"""
    await init_db()
    await init_redis()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await close_redis()

# Include routers
app.include_router(onboarding_router, prefix="/api/onboarding", tags=["onboarding"])

# Import and include environments router (before services router to avoid conflicts)
from .routes.environments import router as environments_router
app.include_router(environments_router, tags=["environments"])

app.include_router(services_router, prefix="/api", tags=["services"])
app.include_router(unified_api_router, prefix="/v1", tags=["unified-api"])

# Import and include webhook router
from .routes.webhooks import router as webhooks_router
app.include_router(webhooks_router, tags=["webhooks"])

# Import and include analytics router
from .routes.analytics import router as analytics_router
app.include_router(analytics_router, tags=["analytics"])

# Import and include API keys router
from .routes.api_keys import router as api_keys_router
app.include_router(api_keys_router, tags=["api-keys"])

# Import and include CSRF router
from .routes.csrf import router as csrf_router
app.include_router(csrf_router, tags=["security"])

# Import and include service discovery router
app.include_router(service_discovery_router, prefix="/v1", tags=["service-discovery"])

# Import and include communications router
from .routes.communications import router as communications_router
app.include_router(communications_router, prefix="/v1", tags=["communications"])

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to OneRouter API",
        "status": "running"
    }

@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check including database and Redis status"""
    health_status: Dict[str, Any] = {
        "status": "healthy",
        "message": "API is running",
        "timestamp": datetime.utcnow().isoformat()
    }

    try:
        # Test database connection
        result = await db.execute(text("SELECT 1 as test"))
        db_test = result.scalar() == 1
        health_status["database"] = "connected" if db_test else "error"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # Test Redis connection and session storage
    try:
        redis_status = await cache_service.ping()
        health_status["redis"] = "connected" if redis_status else "disconnected"

        # Test session storage
        from app.routes.onboarding import get_session_manager
        session_manager = await get_session_manager()
        session_count = await session_manager.get_session_count()
        health_status["sessions"] = {
            "status": "operational",
            "active_sessions": session_count
        }

    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["sessions"] = f"error: {str(e)}"

    return health_status

@app.get("/api/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Detailed health check that tests all components"""
    from .cache import check_redis_connection

    health_status = {
        "api": {
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        },
        "database": await check_db_connection(db),
        "redis": await check_redis_connection(),
        "services": {
            "status": "operational",
            "checked_at": datetime.utcnow().isoformat()
        }
    }

    # Determine overall status
    components = [health_status["database"], health_status["redis"]]
    if any(comp.get("status") != "healthy" for comp in components):
        health_status["overall_status"] = "degraded"
    else:
        health_status["overall_status"] = "healthy"

    return health_status

async def check_db_connection(db: AsyncSession) -> Dict[str, Any]:
    """Test database connection health"""
    try:
        result = await db.execute(text("SELECT 1 as test, version() as version"))
        row = result.first()
        if row and row.test == 1:
            return {
                "status": "healthy",
                "connection": "established",
                "version": row.version[:50] + "..." if row.version and len(row.version) > 50 else row.version
            }
        else:
            return {"status": "error", "message": "Database query failed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Admin authorization dependency
async def get_admin_user(user = Depends(get_current_user)):
    """Verify user is authenticated and has admin role"""
    # Admin check: verify user ID against ADMIN_USER_IDS env var or hardcoded list
    admin_user_ids = settings.ADMIN_USER_IDS if hasattr(settings, 'ADMIN_USER_IDS') else []
    user_id = user.get("id")
    
    if not user_id or user_id not in admin_user_ids:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return user

# Encryption Key Management (Admin only)
@app.post("/api/admin/rotate-encryption-key")
async def rotate_encryption_key(user = Depends(get_admin_user)):
    """Rotate the encryption key (admin only)"""
    from app.services.credential_manager import CredentialManager

    try:
        cred_manager = CredentialManager()
        new_version = cred_manager.rotate_encryption_key()

        return {
            "message": f"Encryption key rotated successfully to version {new_version}",
            "new_version": new_version,
            "warning": "Rotated keys are in-memory only. Backup the new key for production."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key rotation failed: {str(e)}")

@app.get("/api/admin/encryption-status")
async def get_encryption_status(user = Depends(get_admin_user)):
    """Get encryption system status (admin only)"""
    from app.services.credential_manager import CredentialManager

    try:
        cred_manager = CredentialManager()
        key_info = cred_manager.get_key_info()

        return {
            "encryption_algorithm": key_info["algorithm"],
            "current_key_version": key_info["current_version"],
            "available_key_versions": key_info["available_versions"],
            "total_keys": len(key_info["available_versions"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get encryption status: {str(e)}")

@app.get("/api/debug/redis")
async def debug_redis(user = Depends(get_current_user)):
    """Debug Redis connection and keys"""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    try:
        redis_connected = await cache_service.ping()
        
        if not redis_connected:
            return {
                "status": "error",
                "message": "Redis is not connected",
                "connected": False
            }
        
        # Test write/read
        test_key = f"test:{uuid.uuid4().hex[:8]}"
        redis = await cache_service._get_redis()
        
        await redis.set(test_key, "test_value", ex=60)
        test_value = await redis.get(test_key)
        await redis.delete(test_key)
        
        # Get info
        info = await redis.info()
        
        return {
            "status": "success",
            "connected": True,
            "test_write_read": test_value == "test_value",
            "redis_version": info.get("redis_version"),
            "used_memory_human": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "total_commands_processed": info.get("total_commands_processed")
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
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
async def generate_api_key(
    key_name: str = "My API Key",
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Generate a new API key for the authenticated user"""
    from app.services.credential_manager import CredentialManager

    # Verify user has a valid ID
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in authentication token")
    
    cred_manager = CredentialManager()
    user_id = str(user_id)

    result = await cred_manager.generate_api_key(
        db=db,
        user_id=user_id,
        key_name=key_name
    )

    return {
        "api_key": result["api_key"],
        "key_id": result["key_id"],
        "key_name": result["key_name"],
        "message": "API key generated successfully. Store this key securely - it cannot be retrieved again.",
        "warning": "This API key will only be shown once. Make sure to copy it now."
    }

@app.get("/api/keys")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """List API keys for the authenticated user"""
    from app.services.credential_manager import CredentialManager

    # Verify user has a valid ID
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in authentication token")
    
    cred_manager = CredentialManager()
    user_id = str(user_id)

    api_keys = await cred_manager.get_user_api_keys(db, user_id)

    return {
        "api_keys": api_keys,
        "count": len(api_keys)
    }

@app.get("/api/keys/{key_id}/usage")
async def get_api_key_usage(
    key_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get usage statistics for a specific API key"""
    from app.services.credential_manager import CredentialManager
    from uuid import UUID

    # Verify user has a valid ID
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in authentication token")
    
    cred_manager = CredentialManager()
    user_id = str(user_id)

    # Verify the API key belongs to the user
    try:
        key_uuid = UUID(key_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key ID format")

    # Check if the key belongs to the user
    api_keys = await cred_manager.get_user_api_keys(db, user_id)
    key_info = next((k for k in api_keys if k["id"] == key_id), None)

    if not key_info:
        raise HTTPException(status_code=404, detail="API key not found")

    usage_stats = await cred_manager.get_api_key_usage(db, key_id, days)

    return {
        "key_id": key_id,
        "key_name": key_info["key_name"],
        "usage": usage_stats
    }

# Usage Analytics Dashboard
@app.get("/api/analytics/usage")
async def get_usage_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get comprehensive usage analytics for the user"""
    from app.models import TransactionLog, ApiKey
    from sqlalchemy import select, func, desc
    from datetime import timedelta

    user_id = str(user.get("id") or "unknown_user")
    since_date = datetime.utcnow() - timedelta(days=days)

    try:
        # Get user's API keys
        api_keys_result = await db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id)
        )
        user_api_keys = api_keys_result.scalars().all()
        api_key_ids = [str(key.id) for key in user_api_keys]

        if not api_key_ids:
            return {
                "period_days": days,
                "total_requests": 0,
                "api_keys_count": 0,
                "daily_usage": [],
                "service_usage": [],
                "top_endpoints": [],
                "rate_limit_status": {}
            }

        # Total requests across all user's API keys
        total_result = await db.execute(
            select(func.count(TransactionLog.id))
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
        )
        total_requests = total_result.scalar()

        # Daily usage
        daily_result = await db.execute(
            select(
                func.date(TransactionLog.created_at).label('date'),
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(func.date(TransactionLog.created_at))
            .order_by(func.date(TransactionLog.created_at))
        )
        daily_usage = [{"date": str(row.date), "requests": row.count} for row in daily_result]

        # Service usage
        service_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.service_name)
            .order_by(func.count(TransactionLog.id).desc())
        )
        service_usage = [{"service": row.service_name, "requests": row.count} for row in service_result]

        # Top endpoints
        endpoint_result = await db.execute(
            select(
                TransactionLog.endpoint,
                func.count(TransactionLog.id).label('count')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= since_date
            )
            .group_by(TransactionLog.endpoint)
            .order_by(func.count(TransactionLog.id).desc())
            .limit(10)
        )
        top_endpoints = [{"endpoint": row.endpoint, "requests": row.count} for row in endpoint_result]

        # API key status and rate limits
        rate_limit_status = {}
        for key in user_api_keys:
            rate_limit_status[str(key.id)] = {
                "name": key.key_name,
                "is_active": key.is_active,
                "rate_limit_min": key.rate_limit_per_min,
                "rate_limit_day": key.rate_limit_per_day,
                "last_used": key.last_used_at.isoformat() if key.last_used_at else None,
                "expires_at": key.expires_at.isoformat() if key.expires_at else None
            }

        return {
            "period_days": days,
            "total_requests": total_requests,
            "api_keys_count": len(api_key_ids),
            "daily_usage": daily_usage,
            "service_usage": service_usage,
            "top_endpoints": top_endpoints,
            "rate_limit_status": rate_limit_status
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")

@app.get("/api/analytics/billing")
async def get_billing_analytics(
    month: Optional[str] = None,  # Format: YYYY-MM
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get billing analytics (usage-based pricing)"""
    from app.models import TransactionLog, ApiKey
    from sqlalchemy import select, func, extract
    from datetime import datetime
    import calendar

    # Verify user has a valid ID
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in authentication token")
    
    user_id = str(user_id)

    # Default to current month if not specified
    if not month:
        now = datetime.utcnow()
        month = f"{now.year:04d}-{now.month:02d}"

    try:
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1)
        end_date = datetime(year, month_num, calendar.monthrange(year, month_num)[1], 23, 59, 59)

        # Get user's API keys
        api_keys_result = await db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id)
        )
        user_api_keys = api_keys_result.scalars().all()
        api_key_ids = [str(key.id) for key in user_api_keys]

        if not api_key_ids:
            return {
                "billing_period": month,
                "total_requests": 0,
                "estimated_cost": 0,
                "breakdown": {}
            }

        # Calculate usage by service for billing
        billing_result = await db.execute(
            select(
                TransactionLog.service_name,
                func.count(TransactionLog.id).label('requests')
            )
            .where(
                TransactionLog.api_key_id.in_(api_key_ids),
                TransactionLog.created_at >= start_date,
                TransactionLog.created_at <= end_date
            )
            .group_by(TransactionLog.service_name)
        )

        # Simple pricing model (customize based on your needs)
        pricing = {
            "razorpay": 0.001,  # $0.001 per request
            "paypal": 0.0015,   # $0.0015 per request
            "default": 0.001    # $0.001 per request for others
        }

        total_requests = 0
        total_cost = 0
        breakdown = {}

        for row in billing_result:
            service = row.service_name
            requests = row.requests
            cost_per_request = pricing.get(service, pricing["default"])
            cost = requests * cost_per_request

            breakdown[service] = {
                "requests": requests,
                "cost_per_request": cost_per_request,
                "total_cost": round(cost, 4)
            }

            total_requests += requests
            total_cost += cost

        return {
            "billing_period": month,
            "total_requests": total_requests,
            "estimated_cost": round(total_cost, 4),
            "currency": "USD",
            "breakdown": breakdown,
            "pricing_note": "Sample pricing - customize based on your business model"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Billing analytics error: {str(e)}")

# Debug endpoints
@app.get("/api/debug/db")
async def debug_database(db: AsyncSession = Depends(get_db)):
    """Debug database connection and data"""
    try:
        # Get table list
        tables_result = await db.execute(text("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = :schema
            ORDER BY tablename
        """), {"schema": "public"})
        table_list = [row[0] for row in tables_result.fetchall()]

        # Get user count
        user_count_result = await db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = user_count_result.scalar()

        # Get all users (for debugging)
        users_result = await db.execute(text("""
            SELECT id, clerk_user_id, email, name, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        """))
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

