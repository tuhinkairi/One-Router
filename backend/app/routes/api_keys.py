from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models import ApiKey
from ..services.credential_manager import CredentialManager
from pydantic import BaseModel

router = APIRouter(prefix="/api/keys", tags=["api-keys"])

# Request/Response Models
class CreateApiKeyRequest(BaseModel):
    key_name: str
    environment: str = "test"  # Add environment parameter with default
    rate_limit_per_min: Optional[int] = None  # Make optional for environment defaults
    rate_limit_per_day: Optional[int] = None  # Make optional for environment defaults

class UpdateApiKeyRequest(BaseModel):
    key_name: Optional[str] = None
    rate_limit_per_min: Optional[int] = None
    rate_limit_per_day: Optional[int] = None

class ApiKeyResponse(BaseModel):
    id: str
    key_name: str
    key_prefix: str
    environment: str
    is_active: bool
    rate_limit_per_min: int
    rate_limit_per_day: int
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str
    usage: Optional[Dict[str, Any]] = None

@router.get("")
async def list_api_keys(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """List all API keys for the current user"""
    try:
        credential_manager = CredentialManager()
        api_keys = await credential_manager.get_user_api_keys(db, user["id"])
        
        return {
            "success": True,
            "api_keys": api_keys,
            "count": len(api_keys)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("")
async def create_api_key(
    request: CreateApiKeyRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new API key for the current user"""
    try:
        credential_manager = CredentialManager()
        result = await credential_manager.generate_api_key(
            db=db,
            user_id=user["id"],
            key_name=request.key_name,
            key_environment=request.environment,
            rate_limit_per_min=request.rate_limit_per_min,
            rate_limit_per_day=request.rate_limit_per_day
        )
        
        return {
            "success": True,
            "api_key": result["api_key"],
            "key_id": result["key_id"],
            "key_name": result["key_name"],
            "environment": result["environment"],
            "created_at": result["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{key_id}")
async def get_api_key_details(
    key_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed information about a specific API key"""
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.id == uuid.UUID(key_id),
                ApiKey.user_id == uuid.UUID(user["id"])
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        credential_manager = CredentialManager()
        usage = await credential_manager.get_api_key_usage(db, key_id)
        
        return {
            "success": True,
            "id": str(api_key.id),
            "key_name": api_key.key_name,
            "key_prefix": api_key.key_prefix,
            "environment": api_key.environment,
            "is_active": api_key.is_active,
            "rate_limit_per_min": api_key.rate_limit_per_min,
            "rate_limit_per_day": api_key.rate_limit_per_day,
            "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
            "usage": usage
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key_id format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{key_id}")
async def update_api_key(
    key_id: str,
    request: UpdateApiKeyRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update an API key"""
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.id == uuid.UUID(key_id),
                ApiKey.user_id == uuid.UUID(user["id"])
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Update only provided fields
        update_data = {}
        if request.key_name is not None:
            update_data["key_name"] = request.key_name
        if request.rate_limit_per_min is not None:
            update_data["rate_limit_per_min"] = request.rate_limit_per_min
        if request.rate_limit_per_day is not None:
            update_data["rate_limit_per_day"] = request.rate_limit_per_day
        
        if update_data:
            await db.execute(
                update(ApiKey).where(ApiKey.id == uuid.UUID(key_id)).values(**update_data)
            )
            await db.commit()
        
        return {
            "success": True,
            "message": "API key updated successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key_id format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{key_id}/disable")
async def disable_api_key(
    key_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Disable an API key"""
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.id == uuid.UUID(key_id),
                ApiKey.user_id == uuid.UUID(user["id"])
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        await db.execute(
            update(ApiKey).where(ApiKey.id == uuid.UUID(key_id)).values(is_active=False)
        )
        await db.commit()
        
        return {
            "success": True,
            "message": "API key disabled successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key_id format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{key_id}/enable")
async def enable_api_key(
    key_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Enable an API key"""
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.id == uuid.UUID(key_id),
                ApiKey.user_id == uuid.UUID(user["id"])
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        await db.execute(
            update(ApiKey).where(ApiKey.id == uuid.UUID(key_id)).values(is_active=True)
        )
        await db.commit()
        
        return {
            "success": True,
            "message": "API key enabled successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key_id format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Delete an API key"""
    try:
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.id == uuid.UUID(key_id),
                ApiKey.user_id == uuid.UUID(user["id"])
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        await db.delete(api_key)
        await db.commit()
        
        return {
            "success": True,
            "message": "API key deleted successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid key_id format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
