# backend/app/routes/environments.py
"""
Environment management - Test/Live mode switching
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm.attributes import flag_modified
from typing import Dict, Any
from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models import ServiceCredential, User

router = APIRouter()


@router.get("/api/services/{service_name}/environments")
async def get_service_environments(
    service_name: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get environment status for a service (test/live credentials)
    """
    try:
        user_id = str(user.get("id"))
        print(f"Getting environments for user {user_id}, service {service_name}")

        # Get all credentials for this service and user
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == service_name,
                ServiceCredential.is_active == True
            )
        )
        credentials = result.scalars().all()

        print(f"Found {len(credentials)} credentials for service {service_name}")

        # Build environment status
        environments = {
            "test": {"configured": False, "last_used": None},
            "live": {"configured": False, "last_used": None}
        }

        for cred in credentials:
            env = cred.environment  # type: ignore
            if env in environments:
                environments[env]["configured"] = True  # type: ignore
                environments[env]["last_used"] = cred.updated_at.isoformat() if cred.updated_at is not None else None  # type: ignore

        print(f"Returning environments: {environments}")
        return environments

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get environment status: {str(e)}")


@router.post("/api/services/{service_name}/switch-environment")
async def switch_environment(
    service_name: str,
    body: Dict[str, str] = Body(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Switch active environment for a service

    Updates user preferences to use the specified environment for this service
    
    Body:
        {
            "environment": "test" or "live"
        }
    """
    try:
        environment = body.get("environment")
        if not environment or environment not in ["test", "live"]:
            raise HTTPException(status_code=400, detail="Environment must be 'test' or 'live'")

        user_id = str(user.get("id"))

        # Get user preferences
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user_obj = result.scalar_one_or_none()

        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")

        # Update user preferences
        if user_obj.preferences is None:
            user_obj.preferences = {}  # type: ignore

        if "environments" not in user_obj.preferences:  # type: ignore
            user_obj.preferences["environments"] = {}  # type: ignore

        user_obj.preferences["environments"][service_name] = environment  # type: ignore
        flag_modified(user_obj, "preferences")

        await db.commit()

        return {
            "status": "switched",
            "service": service_name,
            "environment": environment,
            "message": f"Successfully switched {service_name} to {environment} environment"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to switch environment: {str(e)}")


@router.get("/api/user/environment-preferences")
async def get_environment_preferences(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's environment preferences for all services

    Returns:
    {
      "environments": {
        "razorpay": "test",
        "paypal": "live"
      }
    }
    """
    try:
        user_id = str(user.get("id"))

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user_obj = result.scalar_one_or_none()

        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")

        preferences = user_obj.preferences or {}  # type: ignore
        environments = preferences.get("environments", {})

        return {
            "environments": environments
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")