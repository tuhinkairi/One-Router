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


@router.get("/{service_name}/environments")
async def get_service_environments(
    service_name: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve configuration status and last-used timestamps for a service's test and live environments for the current user.
    
    Parameters:
    	service_name (str): The provider/service name to inspect.
    
    Returns:
    	environments (dict): Mapping with keys "test" and "live". Each value is a dict with:
    		- configured (bool): True if credentials exist for that environment.
    		- last_used (str | None): ISO 8601 timestamp of the credential's last update, or None.
    
    Raises:
    	HTTPException: If querying the database or building the environment status fails.
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


@router.post("/{service_name}/switch-environment")
async def switch_environment(
    service_name: str,
    body: Dict[str, str] = Body(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Switch the active environment ("test" or "live") for the named service and persist that choice to the user's preferences.
    
    Parameters:
        body (Dict[str, str]): Request body containing the key "environment" with value "test" or "live".
    
    Returns:
        dict: A payload with keys "status", "service", "environment", and "message" describing the outcome.
    
    Raises:
        HTTPException: If the environment value is invalid, no active credential exists for the service, or an internal error occurs.
    """
    try:
        print(f"Switch environment request: service={service_name}, body={body}")
        environment = body.get("environment")
        if not environment or environment not in ["test", "live"]:
            raise HTTPException(status_code=400, detail="Environment must be 'test' or 'live'")

        user_id = str(user.get("id"))
        print(f"User ID: {user_id}, Target environment: {environment}")

        # First, find the active service credential for this user and service
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == service_name,
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise HTTPException(status_code=404, detail=f"No active credential found for {service_name}")

        # Update the service credential environment
        print(f"Updating credential {credential.id} for service {service_name} to environment {environment}")

        stmt = (
            update(ServiceCredential)
            .where(ServiceCredential.id == credential.id)
            .values(environment=environment)
        )
        result = await db.execute(stmt)
        await db.commit()

        print(f"Environment switch completed for {service_name}: {environment}")

        # Also update user preferences for consistency
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user_obj = result.scalar_one_or_none()

        if user_obj:
            # Update user preferences
            if user_obj.preferences is None:
                user_obj.preferences = {}  # type: ignore

            if "environments" not in user_obj.preferences:  # type: ignore
                user_obj.preferences["environments"] = {}  # type: ignore

            user_obj.preferences["environments"][service_name] = environment  # type: ignore
            flag_modified(user_obj, "preferences")

            await db.commit()

        # Verify the update worked
        result = await db.execute(
            select(ServiceCredential).where(ServiceCredential.id == credential.id)
        )
        updated_credential = result.scalar_one_or_none()
        print(f"Verification: {service_name} environment is now {updated_credential.environment if updated_credential else 'UNKNOWN'}")

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


@router.get("/debug/service-environments")
async def debug_service_environments(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Debug endpoint to check current service environments"""
    try:
        user_id = str(user.get("id"))

        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.is_active == True
            )
        )
        credentials = result.scalars().all()

        services = []
        for cred in credentials:
            services.append({
                "id": str(cred.id),
                "service_name": cred.provider_name,
                "environment": cred.environment,
                "created_at": cred.created_at.isoformat() if cred.created_at else None
            })

        return {
            "user_id": user_id,
            "services": services
        }

    except Exception as e:
        return {"error": str(e)}

@router.get("/user/environment-preferences")
async def get_environment_preferences(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the current user's environment preferences across services.
    
    Returns:
        A dictionary with an "environments" key mapping service names (e.g., "razorpay") to their selected environment ("test" or "live").
    
    Raises:
        HTTPException: 404 if the user record is not found.
        HTTPException: 500 if preferences cannot be retrieved due to an internal error.
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