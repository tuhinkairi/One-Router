"""CSRF Protection Routes"""

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.csrf_manager import CSRFTokenManager
from app.exceptions import OneRouterException, ErrorCode

router = APIRouter(prefix="/api/csrf", tags=["security"])


class CSRFTokenResponse(BaseModel):
    """Response containing a CSRF token"""
    csrf_token: str


@router.get("/token")
async def get_csrf_token(request: Request) -> CSRFTokenResponse:
    """
    Get a CSRF token for the current session
    
    This endpoint generates a new CSRF token tied to the user's session.
    The token must be included in the X-CSRF-Token header for all
    state-changing operations (POST, PUT, DELETE).
    
    **Security Notes:**
    - Tokens expire after 24 hours
    - A new token can be requested at any time
    - Tokens are session-specific (tied to the user's authentication)
    
    Returns:
        CSRFTokenResponse with csrf_token field
    """
    # Get session ID from user context or create one
    # If user is authenticated, use user_id, otherwise use session cookie
    session_id = None
    
    # Try to extract from Clerk token first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import jwt
            token = auth_header.split(" ", 1)[1]
            # Decode without verification to extract sub claim
            payload = jwt.decode(token, options={"verify_signature": False})
            session_id = payload.get("sub")
        except Exception:
            pass
    
    # Fallback to session cookie
    if not session_id:
        session_id = request.cookies.get('session_id')
    
    # Generate a session ID if we don't have one
    if not session_id:
        import secrets
        session_id = secrets.token_urlsafe(32)
    
    # Generate and store token
    token = await CSRFTokenManager.create_token(session_id)
    
    response = CSRFTokenResponse(csrf_token=token)
    
    # Set session cookie if we generated a new session_id and there's no user auth
    if not auth_header.startswith("Bearer "):
        # Return response as JSONResponse to set cookie
        from fastapi.responses import JSONResponse
        json_response = JSONResponse(response.dict())
        json_response.set_cookie(
            key="session_id",
            value=session_id,
            max_age=24 * 60 * 60,  # 24 hours
            httponly=True,
            secure=False,  # Set to True in production
            samesite="lax"
        )
        return json_response
    
    return response


@router.post("/validate")
async def validate_csrf_token(request: Request, token: str) -> dict:
    """
    Validate a CSRF token
    
    This is primarily used for testing and debugging.
    In normal operation, CSRF validation happens automatically
    on protected endpoints.
    
    Args:
        token: The CSRF token to validate
        
    Returns:
        Dictionary with validation result
    """
    session_id = None
    
    if hasattr(request.state, 'user_id') and request.state.user_id:
        session_id = request.state.user_id
    
    if not session_id:
        session_id = request.cookies.get('session_id')
    
    if not session_id:
        raise OneRouterException(
            error_code=ErrorCode.INVALID_REQUEST_FORMAT,
            message="No session found for CSRF validation",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    is_valid = await CSRFTokenManager.validate_token(session_id, token)
    
    return {
        "valid": is_valid,
        "session_id": session_id if is_valid else None
    }
