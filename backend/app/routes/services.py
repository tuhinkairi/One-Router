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


class SwitchAllEnvironmentsRequest(BaseModel):
    """Request to atomically switch all services to a target environment"""
    environment: str
    service_ids: List[str] = []


class VerifyEnvironmentRequest(BaseModel):
    """Request to verify environment switch success"""
    expected: str


class VerifyEnvironmentResponse(BaseModel):
    """Response indicating whether all services switched correctly"""
    all_switched: bool
    switched_count: int
    failed_count: int
    services: List[Dict[str, Any]]


@router.post("/services/switch-all-environments")
async def switch_all_environments_atomic(
    request: SwitchAllEnvironmentsRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Atomically switch all (or specified) services to target environment.
    
    Uses database transaction to ensure all-or-nothing semantics:
    - If any service update fails, entire transaction rolls back
    - Prevents partial updates that could cause inconsistent state
    - Faster than sequential updates (single roundtrip)
    
    Args:
        request.environment: "test" or "live"
        request.service_ids: Optional list of service IDs to switch (empty = all)
    
    Returns:
        {
            "status": "switched",
            "environment": "live",
            "count": 5,
            "timestamp": "2025-12-25T10:30:00"
        }
    """
    try:
        user_id = str(user.get("id"))
        target_env = request.environment
        
        # Validate environment
        if target_env not in ["test", "live"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid environment. Must be 'test' or 'live'"
            )
        
        # Use database transaction for atomicity
        async with db.begin_nested() as nested_transaction:
            # Build query for services to update
            query = select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.is_active == True
            )
            
            # Filter by specific service IDs if provided
            if request.service_ids:
                query = query.where(
                    ServiceCredential.id.in_(request.service_ids)
                )
            
            # Fetch all matching services
            result = await db.execute(query)
            services_to_update = result.scalars().all()
            
            if not services_to_update:
                raise HTTPException(
                    status_code=404,
                    detail="No active services found to update"
                )
            
            # Update all services in a single query for efficiency
            update_query = update(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.is_active == True
            )
            
            if request.service_ids:
                update_query = update_query.where(
                    ServiceCredential.id.in_(request.service_ids)
                )
            
            update_query = update_query.values(
                environment=target_env,
                updated_at=datetime.utcnow()
            )
            
            result = await db.execute(update_query)
            updated_count = result.rowcount
        
        # Commit the transaction
        await db.commit()
        
        return {
            "status": "switched",
            "environment": target_env,
            "count": updated_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error switching all environments: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to switch environments: {str(e)}"
        )


@router.post("/services/verify-environment", response_model=VerifyEnvironmentResponse)
async def verify_environment_switch(
    request: VerifyEnvironmentRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify that all services are in the expected environment.
    
    Called after environment switch to confirm atomicity.
    If any service is in a different environment, returns failure.
    
    Args:
        request.expected: Expected environment ("test" or "live")
    
    Returns:
        {
            "all_switched": true/false,
            "switched_count": 5,
            "failed_count": 0,
            "services": [
                {"name": "razorpay", "environment": "live", "switched": true},
                ...
            ]
        }
    """
    try:
        user_id = str(user.get("id"))
        expected_env = request.expected
        
        # Fetch all active services for user
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user_id,
                ServiceCredential.is_active == True
            )
        )
        services = result.scalars().all()
        
        if not services:
            return VerifyEnvironmentResponse(
                all_switched=True,
                switched_count=0,
                failed_count=0,
                services=[]
            )
        
        # Check each service
        switched_count = 0
        failed_count = 0
        service_details = []
        
        for service in services:
            is_switched = service.environment == expected_env
            if is_switched:
                switched_count += 1
            else:
                failed_count += 1
            
            service_details.append({
                "id": str(service.id),
                "name": service.provider_name,
                "environment": service.environment,
                "switched": is_switched
            })
        
        all_switched = failed_count == 0
        
        return VerifyEnvironmentResponse(
            all_switched=all_switched,
            switched_count=switched_count,
            failed_count=failed_count,
            services=service_details
        )
        
    except Exception as e:
        print(f"Error verifying environment switch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify environment: {str(e)}"
        )