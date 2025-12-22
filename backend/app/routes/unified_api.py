import logging
from decimal import Decimal, InvalidOperation
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, Annotated
from ..database import get_db
from ..services.request_router import RequestRouter
from ..auth.dependencies import get_current_user
from ..services.transaction_logger import TransactionLogger
from ..models import ServiceCredential

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
    
    @validator('amount', pre=True)
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
        
        exponent = v.as_tuple().exponent
        if isinstance(exponent, int) and exponent < -2:
            raise ValueError("Amount cannot have more than 2 decimal places")
        
        return v

class UnifiedPaymentResponse(BaseModel):
    transaction_id: str
    provider: str
    provider_order_id: str
    amount: Decimal
    currency: str
    status: str
    receipt: Optional[str] = None
    created_at: Optional[int] = None

    class Config:
        json_encoders = {
            Decimal: lambda v: str(v)
        }

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

        # Prepare notes with user_id for webhook identification
        notes = request.notes or {}
        notes["onerouter_user_id"] = str(user["id"])

        # Create order through adapter
        # Pass different parameters based on provider
        order_kwargs = {
            "amount": float(request.amount),
            "currency": request.currency,
            "receipt": request.receipt,
        }

        if provider == "razorpay":
            order_kwargs["notes"] = notes
        elif provider == "paypal":
            order_kwargs["custom_id"] = str(user["id"])

        result = await adapter.create_order(**order_kwargs)

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

@router.post("/payments/capture")
async def capture_payment(
    payment_id: str,
    amount: Optional[float] = None,
    provider: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Capture a payment (unified API)"""
    try:
        # Determine provider (default to Razorpay for now)
        provider = provider or "razorpay"

        # Route to appropriate adapter
        adapter = await request_router.get_adapter(user["id"], provider, db)
        try:
            result = await adapter.capture_payment(payment_id, amount or 0.0)
            return result
        except AttributeError:
            raise HTTPException(status_code=400, detail="Capture not supported for this provider")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/refund")
async def create_refund(
    payment_id: str,
    amount: Optional[float] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a refund (unified API)"""
    try:
        from ..models import TransactionLog

        # Resolve provider from stored transaction log
        result = await db.execute(
            select(TransactionLog).where(TransactionLog.transaction_id == payment_id)
        )
        log_entry = result.scalar_one_or_none()

        if log_entry:
            provider = log_entry.service_name
        else:
            # Fallback: try to parse from payment_id format "unf_{provider}_{providerOrderId}"
            if payment_id.startswith("unf_"):
                parts = payment_id.split("_")
                if len(parts) >= 3:
                    provider = parts[1]
                else:
                    provider = None
            else:
                provider = None

        # Use resolved provider or fall back to razorpay
        if not provider:
            provider = "razorpay"

        adapter = await request_router.get_adapter(user["id"], provider, db)
        result = await adapter.create_refund(payment_id, amount or 0.0)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# SUBSCRIPTION ROUTES (Pass-Through)
# ========================================

from pydantic import BaseModel

class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    provider: Optional[str] = None
    customer_notify: bool = True
    total_count: Optional[int] = 12
    quantity: Optional[int] = 1

@router.post("/subscriptions")
async def create_subscription(
    request: CreateSubscriptionRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create subscription (pass-through to gateway)

    POST /v1/subscriptions
    {
        "plan_id": "plan_monthly_99",
        "provider": "razorpay",  // optional, auto-detect
        "customer_notify": true,
        "total_count": 12,
        "quantity": 1
    }
    """
    try:
        # Auto-detect provider if not specified
        provider = request.provider
        plan_id = request.plan_id
        customer_notify = request.customer_notify
        
        if not provider:
            provider = await _detect_provider_from_plan(user["id"], plan_id, db)

        # Get adapter
        adapter = await request_router.get_adapter(user["id"], provider, db)

        # Pass-through to gateway
        result = await adapter.create_subscription(
            plan_id, 
            customer_notify, 
            total_count=request.total_count,
            quantity=request.quantity
        )

        # Log transaction
        await transaction_logger.log_request(
            db=db,
            user_id=user["id"],
            method="POST",
            endpoint="/subscriptions",
            request_data=request.dict(),
            provider=provider
        )

        return result

    except Exception as e:
        logger.exception(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions/{subscription_id}")
async def get_subscription(
    subscription_id: str,
    provider: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get subscription details (pass-through)"""
    try:
        if not provider:
            provider = _detect_provider_from_id(subscription_id)

        adapter = await request_router.get_adapter(user["id"], provider, db)
        result = await adapter.get_subscription(subscription_id)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    provider: Optional[str] = None,
    cancel_at_cycle_end: bool = False,
    reason: str = "",
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel subscription (pass-through)"""
    try:
        if not provider:
            provider = _detect_provider_from_id(subscription_id)

        adapter = await request_router.get_adapter(user["id"], provider, db)

        if provider == "razorpay":
            result = await adapter.cancel_subscription(subscription_id, cancel_at_cycle_end)
        else:  # paypal
            result = await adapter.cancel_subscription(subscription_id, reason or "")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions/{subscription_id}/pause")
async def pause_subscription(
    subscription_id: str,
    provider: Optional[str] = None,
    pause_at: str = "now",
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Pause subscription (Razorpay only)"""
    try:
        if not provider:
            provider = _detect_provider_from_id(subscription_id)

        if provider != "razorpay":
            raise HTTPException(status_code=400, detail="Pause is only supported for Razorpay")

        adapter = await request_router.get_adapter(user["id"], provider, db)
        if hasattr(adapter, 'pause_subscription'):
            result = await adapter.pause_subscription(subscription_id, pause_at)
        else:
            raise HTTPException(status_code=400, detail="Pause not supported for this provider")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# GENERIC PROXY ROUTE
# ========================================

@router.post("/proxy")
async def generic_proxy(
    provider: str,
    endpoint: str,
    method: str = "POST",
    payload: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generic proxy for ANY gateway endpoint

    POST /v1/proxy
    {
        "provider": "razorpay",
        "endpoint": "/v1/subscriptions/sub_123/pause",
        "method": "POST",
        "payload": {"pause_at": "now"}
    }

    This allows developers to call ANY gateway API through OneRouter
    """
    try:
        # Get adapter
        adapter = await request_router.get_adapter(user["id"], provider, db)

        # Call generic API proxy
        result = await adapter.call_api(endpoint, method, payload or {}, params or {})

        # Log transaction
        await transaction_logger.log_request(
            db=db,
            user_id=user["id"],
            method=method,
            endpoint=f"/proxy{endpoint}",
            request_data={"endpoint": endpoint, "payload": payload},
            provider=provider
        )

        return result

    except Exception as e:
        logger.exception(f"Error in generic proxy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# HELPER FUNCTIONS
# ========================================

async def _detect_provider_from_plan(user_id: str, plan_id: str, db: AsyncSession) -> str:
    """Detect provider from plan_id format"""
    # Razorpay plan IDs start with 'plan_'
    if plan_id.startswith("plan_"):
        return "razorpay"

    # PayPal plan IDs start with 'P-'
    if plan_id.startswith("P-"):
        return "paypal"

    # Fallback: check user's stored features_config
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user_id,
            ServiceCredential.is_active == True
        )
    )
    credentials = result.scalars().all()

    for cred in credentials:
        features_config = cred.features_config or {}
        metadata = features_config.get('metadata', {})
        subscription_plans = metadata.get('subscription_plans', [])

        for plan in subscription_plans:
            if plan['plan_id'] == plan_id:
                return cred.provider_name

    # Default to razorpay if can't detect
    return "razorpay"
def _detect_provider_from_id(subscription_id: str) -> str:
    """Detect provider from subscription_id format"""
    # Razorpay subscription IDs start with 'sub_'
    if subscription_id.startswith("sub_"):
        return "razorpay"

    # PayPal subscription IDs start with 'I-'
    if subscription_id.startswith("I-"):
        return "paypal"

    # Default
    return "razorpay"

@router.post("/payment-links")
async def create_payment_link(
    amount: float,
    description: str,
    customer_email: Optional[str] = None,
    provider: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create payment link (unified API)"""
    try:
        provider = provider or "razorpay"
        
        # Log transaction request
        await transaction_logger.log_request(
            db=db,
            user_id=user["id"],
            method="POST",
            endpoint="/payment-links",
            request_data={"amount": amount, "description": description, "customer_email": customer_email},
            provider=provider
        )
        
        adapter = await request_router.get_adapter(user["id"], provider, db)
        if hasattr(adapter, 'create_payment_link'):
            result = await adapter.create_payment_link(amount, description, customer_email)
        else:
            raise HTTPException(status_code=400, detail="Payment links not supported for this provider")
        
        # Log response
        await transaction_logger.log_response(
            db=db,
            transaction_id=result.get("id", "unknown"),
            response_data=result,
            status_code=200,
            response_time_ms=0
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))