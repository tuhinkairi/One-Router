import logging
from decimal import Decimal, InvalidOperation
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Dict, Any, Annotated
from ..database import get_db
from ..auth.dependencies import get_current_user
from ..services.request_router import RequestRouter
from ..services.transaction_logger import TransactionLogger

logger = logging.getLogger(__name__)

router = APIRouter()
request_router = RequestRouter()
transaction_logger = TransactionLogger()

class PaymentOrderRequest(BaseModel):
    amount: Annotated[Decimal, Field(
        gt=0,
        decimal_places=2,
        max_digits=15,
        description="Amount must be positive with max 2 decimal places"
    )]
    currency: Annotated[str, Field(
        pattern=r"^[A-Z]{3}$",
        description="ISO 4217 currency code (3 uppercase letters)"
    )] = "INR"
    provider: Optional[str] = None  # Auto-select if not specified
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    
    @field_validator('amount', mode='before')
    @classmethod
    def validate_amount(cls, v):
        """Coerce numeric strings to Decimal and validate"""
        if isinstance(v, str):
            try:
                v = Decimal(v)
            except (InvalidOperation, ValueError) as e:
                raise ValueError(f"Invalid amount format: must be a valid decimal number, got '{v}'")
        elif isinstance(v, (int, float)):
            v = Decimal(str(v))
        
        if not isinstance(v, Decimal):
            raise ValueError(f"Amount must be a number, got {type(v).__name__}")
        
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        
        if v.as_tuple().exponent < -2:
            raise ValueError("Amount cannot have more than 2 decimal places")
        
        return v

class UnifiedPaymentResponse(BaseModel):
    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: str(v)
        }
    )
    transaction_id: str
    provider: str
    provider_order_id: str
    amount: Decimal
    currency: str
    status: str
    receipt: Optional[str] = None
    created_at: Optional[int] = None

@router.post("/payments/orders", response_model=UnifiedPaymentResponse)
async def create_payment_order(
    request: PaymentOrderRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create payment order (unified API)"""
    try:
        # Determine provider (default to Razorpay for now)
        provider = request.provider or "razorpay"

        # Log transaction request
        await transaction_logger.log_request(
            db=db,
            user_id=user["id"],
            method="POST",
            endpoint="/payments/orders",
            request_data=request.dict(),
            provider=provider
        )

        # Get service adapter
        adapter = await request_router.get_adapter(user["id"], provider, db)

        # Create order through adapter
        result = await adapter.create_order(
            amount=request.amount,
            currency=request.currency,
            receipt=request.receipt,
            notes=request.notes
        )

        await transaction_logger.log_response(
            db=db,
            transaction_id=result["transaction_id"],
            response_data=result,
            status_code=200,
            response_time_ms=0  # TODO: measure actual response time
        )

        return UnifiedPaymentResponse(**result)

    except Exception as log_err:
        # Log the exception with full traceback
        logger.exception(f"Error creating payment order for user {user['id']}: {str(log_err)}")
        
        # Try to record transaction log entry for failed request
        try:
            await transaction_logger.log_request(
                db=db,
                user_id=user["id"],
                method="POST",
                endpoint="/payments/orders",
                request_data=request.dict(),
                provider=request.provider or "razorpay"
            )
        except Exception as log_err_tx:
            logger.exception(f"Failed to log transaction for failed request: {str(log_err_tx)}")
        
        # Return generic error to client
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/payments/orders/{transaction_id}")
async def get_payment_order(
    transaction_id: str,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment order details"""
    import time
    from ..models import TransactionLog
    from datetime import datetime
    
    provider = None
    try:
        # Log the incoming request
        await transaction_logger.log_request(
            db=db,
            user_id=user["id"],
            method="GET",
            endpoint=f"/payments/orders/{transaction_id}",
            request_data={"transaction_id": transaction_id},
            provider="unknown"  # Will be updated once provider is resolved
        )

        # Resolve provider from stored transaction log
        result = await db.execute(
            select(TransactionLog).where(TransactionLog.transaction_id == transaction_id)
        )
        log_entry = result.scalar_one_or_none()

        if log_entry:
            provider = log_entry.service_name
            print(f"✓ Provider resolved from DB: {provider}")
        else:
            # Fallback: try to parse from transaction_id format "unf_{provider}_{providerOrderId}"
            if transaction_id.startswith("unf_"):
                parts = transaction_id.split("_")
                if len(parts) >= 3:
                    provider = parts[1]
                    print(f"✓ Provider parsed from transaction_id format: {provider}")
                else:
                    print(f"⚠ Could not parse provider from transaction_id: {transaction_id}")
            else:
                print(f"⚠ Transaction ID does not match expected formats: {transaction_id}")

        # Use resolved provider or fall back to razorpay
        if not provider:
            provider = "razorpay"
            print(f"⚠ Using default provider fallback: {provider}")

        # Extract order ID from transaction_id
        if transaction_id.startswith("unf_"):
            provider_order_id = transaction_id[4:]  # Remove "unf_" prefix
        else:
            provider_order_id = transaction_id

        # Get adapter using resolved provider
        adapter = await request_router.get_adapter(user["id"], provider, db)
        order_data = await adapter.get_order(provider_order_id)

        return adapter.normalize_response(order_data)

    except Exception as e:
        print(f"✗ Error retrieving payment order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))