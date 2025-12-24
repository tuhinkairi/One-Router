from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models import ServiceCredential
from ..services.credential_manager import CredentialManager

router = APIRouter()

class ServiceInfo(BaseModel):
    """Information about a connected service"""
    id: str
    service_name: str
    environment: str
    features: dict
    is_active: bool
    created_at: str

class ServicesResponse(BaseModel):
    """Response with all user's services"""
    services: List[ServiceInfo]
    has_services: bool
    total_count: int

class UpdateCredentialsRequest(BaseModel):
    """Request to update service credentials"""
    credentials: Dict[str, str]
    environment: str = "test"

@router.get("/services", response_model=ServicesResponse)
async def get_user_services(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all services connected by the user
    
    This endpoint is called by the dashboard to check:
    1. Does user have ANY services? (show onboarding vs dashboard)
    2. Which services are connected? (display service cards)
    3. What features are enabled? (show feature toggles)
    """
    try:
        # Query all active services for this user
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user["id"],
                ServiceCredential.is_active
            )
        )
        credentials = result.scalars().all()
        
        # Convert to response format
        services = []
        for cred in credentials:
            services.append(ServiceInfo(
                id=str(cred.id),
                service_name=cred.provider_name,
                environment=cred.environment,
                features=cred.features_config or {},
                is_active=cred.is_active,
                created_at=cred.created_at.isoformat() if cred.created_at else ""
            ))
        
        return ServicesResponse(
            services=services,
            has_services=len(services) > 0,
            total_count=len(services)
        )
        
    except Exception as e:
        print(f"Error fetching user services: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch services: {str(e)}")


@router.get("/services/{service_name}/status")
async def get_service_status(
    service_name: str,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a specific service is connected
    
    Returns:
        {
            "connected": true/false,
            "environment": "test",
            "features": {...}
        }
    """
    try:
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user["id"],
                ServiceCredential.provider_name == service_name,
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()
        
        if not credential:
            return {
                "connected": False,
                "service_name": service_name
            }
        
        return {
            "connected": True,
            "service_name": service_name,
            "environment": credential.environment,
            "features": credential.features_config or {},
            "created_at": credential.created_at.isoformat() if credential.created_at else ""
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/services/{service_name}/credentials")
async def update_service_credentials(
    service_name: str,
    request: UpdateCredentialsRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update credentials for a specific service

    This allows users to update their API keys and credentials for connected services.
    """
    try:
        user_id = str(user.get("id"))

        # Find the existing credential for this service and user
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.provider_name == service_name,
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise HTTPException(status_code=404, detail=f"No active credentials found for {service_name}")

        # Validate the new credentials
        cred_manager = CredentialManager()
        validation_errors = cred_manager.validate_credentials_format(service_name, request.credentials)
        if validation_errors:
            raise HTTPException(status_code=400, detail=f"Invalid credentials: {validation_errors}")

        # Encrypt and update the credentials
        encrypted_creds = cred_manager.encrypt_credentials(request.credentials)

        # Update the credential record
        await db.execute(
            update(ServiceCredential).where(
                ServiceCredential.id == credential.id
            ).values(
                encrypted_credential=encrypted_creds,
                environment=request.environment,
                updated_at=datetime.utcnow()
            )
        )

        await db.commit()

        return {
            "status": "updated",
            "service_name": service_name,
            "environment": request.environment,
            "message": f"Credentials for {service_name} updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating credentials for {service_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update credentials: {str(e)}")