import logging
import json
from decimal import Decimal, InvalidOperation
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, Annotated, List
from ..database import get_db
from ..services.request_router import RequestRouter
from ..auth.dependencies import get_current_user, get_api_user
from ..services.transaction_logger import TransactionLogger
from ..services.idempotency_service import IdempotencyService
from ..models import ServiceCredential
from ..exceptions import InvalidAmountException, CurrencyAmountMismatchException

logger = logging.getLogger(__name__)

router = APIRouter()
request_router = RequestRouter()
transaction_logger = TransactionLogger()

# Currency-specific validation rules
CURRENCY_RULES = {
    "JPY": {"decimals": 0, "min_amount": 1, "max_amount": 999999999},
    "INR": {"decimals": 2, "min_amount": 1, "max_amount": 10000000},
    "USD": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "EUR": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "GBP": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "AUD": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "CAD": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "SGD": {"decimals": 2, "min_amount": 0.01, "max_amount": 1000000},
    "BRL": {"decimals": 2, "min_amount": 0.01, "max_amount": 10000000},
}

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
    method: Optional[str] = None  # Payment method: 'upi', 'card', 'netbanking', 'wallet'
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None  # For idempotent request handling

    # Payment method specific options
    upi_app: Optional[str] = None  # UPI app preference
    emi_plan: Optional[str] = None  # EMI plan
    card_network: Optional[str] = None  # Preferred card network
    wallet_provider: Optional[str] = None  # Wallet provider
    bank_code: Optional[str] = None  # Net banking bank code
    
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
    
    @validator('amount')
    @classmethod
    def validate_amount_for_currency(cls, v, values):
        """Validate amount against currency-specific rules"""
        currency = values.get('currency', 'INR')
        
        # Get currency rules (use INR defaults for unknown currencies)
        rules = CURRENCY_RULES.get(currency, CURRENCY_RULES['INR'])
        
        # Check decimal places
        if rules['decimals'] == 0:
            if v % 1 != 0:
                raise ValueError(
                    f"{currency} does not support decimal amounts. "
                    f"Please provide an integer amount."
                )
        
        # Check minimum amount
        if v < Decimal(str(rules['min_amount'])):
            raise ValueError(
                f"Minimum amount for {currency} is {rules['min_amount']}. "
                f"You provided {v}."
            )
        
        # Check maximum amount
        if v > Decimal(str(rules['max_amount'])):
            raise ValueError(
                f"Maximum amount for {currency} is {rules['max_amount']}. "
                f"Amount {v} exceeds this limit."
            )
        
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
    auth_data = Depends(get_api_user),
    db: AsyncSession = Depends(get_db)
):
    """Create payment order (unified API) with proper transaction management and idempotency"""
    import time
    from ..models import TransactionLog
    from ..cache import cache_service
    import uuid

    # Safety check for auth_data
    if not auth_data:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Extract user information from auth_data
    user_id = auth_data["id"]
    api_key_obj = auth_data["api_key"]

    # Initialize idempotency service
    from ..services.idempotency_service import IdempotencyService
    idempotency_service = IdempotencyService()

    # Determine provider with smart selection based on payment method
    provider = request.provider
    if not provider and request.method:
        from ..services.payment_method_validator import ProviderCapabilities
        provider = ProviderCapabilities.get_preferred_provider(request.method, request.currency)

    # Default fallback
    provider = provider or "razorpay"
    start_time = time.time()

    # Generate or use provided idempotency key
    idempotency_key = request.idempotency_key or f"idempotency_{user_id}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    transaction_id = f"txn_{user_id}_{int(start_time)}_{uuid.uuid4().hex[:8]}"

    # Use actual API key ID from auth data
    api_key_id = str(api_key_obj.id)

    # Check if response is already cached in database
    try:
        cached_response = await idempotency_service.get_idempotency_response(api_key_id, idempotency_key)
        if cached_response:
            return UnifiedPaymentResponse(**cached_response['response_body'])
    except Exception as e:
        logger.warning(f"Idempotency check failed: {e}")

    # Acquire lock to prevent duplicate processing
    lock_acquired = await cache_service.acquire_idempotency_lock(idempotency_key)
    if not lock_acquired:
        raise HTTPException(
            status_code=409,
            detail="Duplicate request in progress. Please retry after a moment."
        )

    # Validate request hash if key exists
    request_body_str = json.dumps(request.dict(), sort_keys=True)
    try:
        is_valid = await idempotency_service.validate_request_hash(api_key_id, idempotency_key, request_body_str)
        if not is_valid:
            raise HTTPException(
                status_code=422,
                detail="Idempotency key already used with different request parameters"
            )
    except Exception as e:
        logger.warning(f"Request hash validation failed: {e}")

    # Create initial log entry within transaction
    log_entry = TransactionLog(
        user_id=user_id,
        api_key_id=api_key_obj.id,
        transaction_id=transaction_id,
        service_name=provider,
        endpoint="/payments/orders",
        http_method="POST",
        request_payload=request.dict(),
        status="pending",
        environment=auth_data.get("environment", "test")
    )

    try:
        # Start transaction block
        async with db.begin_nested():
            db.add(log_entry)
            await db.flush()

            # Get service adapter with proper environment
            adapter = await request_router.get_adapter(
                user_id,
                provider,
                db,
                target_environment=auth_data.get("environment", "test")
            )

            # Prepare notes with user_id for webhook identification
            notes = request.notes or {}
            notes["onerouter_user_id"] = str(user_id)

            # Create order through adapter
            order_kwargs = {
                "amount": float(request.amount),
                "currency": request.currency,
                "receipt": request.receipt,
            }

            # Validate payment method compatibility with provider
            if hasattr(request, 'method') and request.method:
                from ..services.payment_method_validator import ProviderCapabilities
                validation_result = ProviderCapabilities.validate_method_combination(
                    provider=provider,
                    method=request.method,
                    upi_app=getattr(request, 'upi_app', None),
                    card_network=getattr(request, 'card_network', None),
                    wallet_provider=getattr(request, 'wallet_provider', None)
                )

                if not validation_result["valid"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Payment method validation failed: {', '.join(validation_result['errors'])}"
                    )

            # Add payment method parameters if provided
            if hasattr(request, 'method') and request.method:
                order_kwargs["method"] = request.method
            if hasattr(request, 'upi_app') and request.upi_app:
                order_kwargs["upi_app"] = request.upi_app
            if hasattr(request, 'emi_plan') and request.emi_plan:
                order_kwargs["emi_plan"] = request.emi_plan
            if hasattr(request, 'card_network') and request.card_network:
                order_kwargs["card_network"] = request.card_network
            if hasattr(request, 'wallet_provider') and request.wallet_provider:
                order_kwargs["wallet_provider"] = request.wallet_provider
            if hasattr(request, 'bank_code') and request.bank_code:
                order_kwargs["bank_code"] = request.bank_code

            if provider == "razorpay":
                order_kwargs["notes"] = notes
            elif provider == "paypal":
                order_kwargs["custom_id"] = str(user_id)

            result = await adapter.create_order(**order_kwargs)

            # Enhance response with payment method information
            if hasattr(request, 'method') and request.method:
                result["payment_method"] = request.method

                method_details = {}
                if hasattr(request, 'upi_app') and request.upi_app:
                    method_details["upi_app"] = request.upi_app
                if hasattr(request, 'emi_plan') and request.emi_plan:
                    method_details["emi_plan"] = request.emi_plan
                if hasattr(request, 'card_network') and request.card_network:
                    method_details["card_network"] = request.card_network
                if hasattr(request, 'wallet_provider') and request.wallet_provider:
                    method_details["wallet_provider"] = request.wallet_provider
                if hasattr(request, 'bank_code') and request.bank_code:
                    method_details["bank_code"] = request.bank_code

                if method_details:
                    result["method_details"] = method_details

            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)

            # Update log entry with success
            log_entry.response_payload = result
            log_entry.response_status = 200
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "completed"
            log_entry.provider_txn_id = result.get("provider_order_id") or result.get("id")
            log_entry.idempotency_key = idempotency_key

        # Commit the transaction
        await db.commit()

        # Store the response for idempotent retrieval in database
        try:
            await idempotency_service.store_idempotency_response(
                db=db,
                api_key_id=api_key_id,
                idempotency_key=idempotency_key,
                endpoint="/payments/orders",
                request_body=request_body_str,
                response_body=result,
                response_status_code=200
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to store idempotency response: {e}")

        return UnifiedPaymentResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        # Calculate response time for failed request
        response_time_ms = int((time.time() - start_time) * 1000)

        # Log the exception
        logger.exception(f"Error creating payment order for user {user_id}: {str(e)}")

        # Update log entry with failure status
        try:
            log_entry.response_payload = {"error": str(e)}
            log_entry.response_status = 500
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "failed"
            log_entry.error_message = str(e)
            await db.commit()
        except Exception as log_err:
            logger.exception(f"Failed to log transaction failure: {str(log_err)}")
            await db.rollback()

        raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)}")
    finally:
        # Always release the lock
        await cache_service.release_idempotency_lock(idempotency_key)

@router.get("/payments/orders/{transaction_id}")
async def get_payment_order(
    transaction_id: str,
    auth_data = Depends(get_api_user),
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
            user_id=auth_data["id"],
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

class RefundRequest(BaseModel):
    payment_id: str
    amount: Optional[float] = None  # None for full refund
    reason: Optional[str] = None  # Refund reason
    speed: str = "normal"  # 'normal', 'optimum' (Razorpay)
    notes: Optional[Dict[str, Any]] = None  # Additional metadata


# =============================================================================
# MARKETPLACE ENDPOINTS
# =============================================================================

class SplitPaymentRequest(BaseModel):
    amount: float
    splits: List[Dict[str, Any]]
    currency: str = "INR"
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class VendorAccountRequest(BaseModel):
    vendor_id: str
    name: str
    account_details: Dict[str, Any]
    split_config: Optional[Dict[str, Any]] = None


@router.post("/marketplace/payments/split")
async def create_split_payment(
    request: SplitPaymentRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a payment with automatic splits to multiple parties"""
    try:
        import time
        from ..models import TransactionLog

        start_time = time.time()
        transaction_id = f"txn_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"

        # For now, default to Razorpay for marketplace features
        provider = "razorpay"
        adapter = await request_router.get_adapter(user["id"], provider, db)

        # Create the split payment
        result = await adapter.create_split_payment(
            amount=request.amount,
            currency=request.currency,
            splits=request.splits,
            description=request.description,
            metadata=request.metadata
        )

        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Log the transaction
        log_entry = TransactionLog(
            user_id=user["id"],
            transaction_id=transaction_id,
            service_name=provider,
            endpoint="/marketplace/payments/split",
            http_method="POST",
            request_payload=request.dict(),
            response_payload=result,
            response_status=200,
            response_time_ms=response_time_ms,
            status="completed"
        )
        db.add(log_entry)
        await db.commit()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marketplace/vendors")
async def add_vendor_account(
    request: VendorAccountRequest,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a vendor account for marketplace payouts"""
    try:
        # For now, store vendor info in user metadata or features_config
        # In a full implementation, this would create a vendor record

        # Get user's service credential to store vendor info
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user["id"],
                ServiceCredential.provider_name == "razorpay",  # Assume marketplace uses primary provider
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise HTTPException(status_code=404, detail="No active payment service found")

        # Store vendor info in features_config (simplified approach)
        current_vendors = credential.features_config.get("marketplace_vendors", [])
        current_vendors.append({
            "vendor_id": request.vendor_id,
            "name": request.name,
            "account_details": request.account_details,
            "split_config": request.split_config,
            "created_at": time.time()
        })

        credential.features_config["marketplace_vendors"] = current_vendors
        await db.commit()

        return {
            "vendor_id": request.vendor_id,
            "status": "added",
            "message": f"Vendor {request.name} added successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marketplace/vendors")
async def list_vendor_accounts(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all connected vendor accounts"""
    try:
        result = await db.execute(
            select(ServiceCredential).where(
                ServiceCredential.user_id == user["id"],
                ServiceCredential.provider_name == "razorpay",
                ServiceCredential.is_active == True
            )
        )
        credential = result.scalar_one_or_none()

        if not credential:
            return {"vendors": []}

        vendors = credential.features_config.get("marketplace_vendors", [])
        return {"vendors": vendors}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    provider: Optional[str] = None
    customer_notify: bool = True
    total_count: Optional[int] = 12
    quantity: Optional[int] = 1
    trial_days: Optional[int] = None  # Number of trial days
    start_date: Optional[str] = None  # ISO format start date
    idempotency_key: Optional[str] = None  # For idempotent request handling


@router.get("/subscriptions")
async def list_subscriptions(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's subscriptions

    GET /v1/subscriptions

    Note: Since subscriptions are managed by payment providers and not stored locally,
    this endpoint currently returns an empty list. Users should track their subscription
    IDs from creation responses and use the individual subscription endpoints.
    """
    # TODO: Implement subscription listing from payment providers
    # For now, return empty list since subscriptions are not stored locally
    # and payment providers don't provide list APIs
    return {
        "subscriptions": [],
        "message": "Subscription listing is not yet implemented. Please track subscription IDs from creation responses."
    }


@router.post("/subscriptions")
async def create_subscription(
    request: CreateSubscriptionRequest,
    auth_data = Depends(get_api_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create subscription (pass-through to gateway) with proper transaction management and idempotency

    POST /v1/subscriptions
    {
        "plan_id": "plan_monthly_99",
        "provider": "razorpay",  // optional, auto-detect
        "customer_notify": true,
        "total_count": 12,
        "quantity": 1,
        "idempotency_key": "optional-idempotency-key"
    }
    """
    import time
    from ..models import TransactionLog
    from ..cache import cache_service
    import uuid
    
    start_time = time.time()
    transaction_id = f"txn_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Generate or use provided idempotency key
    idempotency_key = request.idempotency_key or f"idempotency_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Check if response is already cached
    cached_response = await cache_service.get_idempotent_response(user["id"], idempotency_key)
    if cached_response:
        return cached_response
    
    # Acquire lock to prevent duplicate processing
    lock_acquired = await cache_service.acquire_idempotency_lock(idempotency_key)
    if not lock_acquired:
        raise HTTPException(
            status_code=409,
            detail="Duplicate request in progress. Please retry after a moment."
        )
    
    # Auto-detect provider if not specified
    provider = request.provider
    plan_id = request.plan_id
    customer_notify = request.customer_notify
    
    if not provider:
        provider = await _detect_provider_from_plan(user["id"], plan_id, db)
    
    # Create initial log entry
    log_entry = TransactionLog(
        user_id=user["id"],
        transaction_id=transaction_id,
        service_name=provider,
        endpoint="/subscriptions",
        http_method="POST",
        request_payload=request.dict(),
        status="pending",
        environment=user.get("environment", "development")
    )
    
    try:
        async with db.begin_nested():
            db.add(log_entry)
            await db.flush()
            
            # Get adapter
            adapter = await request_router.get_adapter(user["id"], provider, db)

            # Pass-through to gateway
            result = await adapter.create_subscription(
                plan_id,
                customer_notify,
                total_count=request.total_count,
                quantity=request.quantity,
                trial_days=request.trial_days,
                start_date=request.start_date
            )
            
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Update log entry with success
            log_entry.response_payload = result
            log_entry.response_status = 200
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "completed"
        
        await db.commit()
        
        # Cache the response for idempotent retrieval
        await cache_service.cache_idempotent_response(user["id"], idempotency_key, result)
        
        return result

    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        logger.exception(f"Error creating subscription: {str(e)}")
        
        try:
            log_entry.response_payload = {"error": str(e)}
            log_entry.response_status = 500
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "failed"
            await db.commit()
        except Exception:
            await db.rollback()
        
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always release the lock
        await cache_service.release_idempotency_lock(idempotency_key)

@router.get("/subscriptions/{subscription_id}")
async def get_subscription(
    subscription_id: str,
    provider: Optional[str] = None,
    auth_data = Depends(get_api_user),
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

@router.post("/subscriptions/{subscription_id}/resume")
async def resume_subscription(
    subscription_id: str,
    provider: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Resume paused subscription (Razorpay only)"""
    try:
        if not provider:
            provider = _detect_provider_from_id(subscription_id)

        if provider != "razorpay":
            raise HTTPException(status_code=400, detail="Resume is only supported for Razorpay")

        adapter = await request_router.get_adapter(user["id"], provider, db)
        if hasattr(adapter, 'resume_subscription'):
            result = await adapter.resume_subscription(subscription_id)
        else:
            raise HTTPException(status_code=400, detail="Resume not supported for this provider")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions/{subscription_id}/change_plan")
async def change_subscription_plan(
    subscription_id: str,
    new_plan_id: str,
    prorate: bool = True,
    provider: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change subscription plan (Razorpay only)"""
    try:
        if not provider:
            provider = _detect_provider_from_id(subscription_id)

        if provider != "razorpay":
            raise HTTPException(status_code=400, detail="Plan changes are only supported for Razorpay")

        adapter = await request_router.get_adapter(user["id"], provider, db)
        if hasattr(adapter, 'change_plan'):
            result = await adapter.change_plan(subscription_id, new_plan_id, prorate)
        else:
            raise HTTPException(status_code=400, detail="Plan changes not supported for this provider")

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
    idempotency_key: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generic proxy for ANY gateway endpoint with proper transaction management and idempotency

    POST /v1/proxy
    {
        "provider": "razorpay",
        "endpoint": "/v1/subscriptions/sub_123/pause",
        "method": "POST",
        "payload": {"pause_at": "now"},
        "idempotency_key": "optional-key"
    }

    This allows developers to call ANY gateway API through OneRouter
    """
    import time
    from ..models import TransactionLog
    from ..cache import cache_service
    import uuid
    
    start_time = time.time()
    transaction_id = f"txn_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Generate or use provided idempotency key
    idempotency_key = idempotency_key or f"idempotency_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Check if response is already cached
    cached_response = await cache_service.get_idempotent_response(user["id"], idempotency_key)
    if cached_response:
        return cached_response
    
    # Acquire lock to prevent duplicate processing
    lock_acquired = await cache_service.acquire_idempotency_lock(idempotency_key)
    if not lock_acquired:
        raise HTTPException(
            status_code=409,
            detail="Duplicate request in progress. Please retry after a moment."
        )
    
    log_entry = TransactionLog(
        user_id=user["id"],
        transaction_id=transaction_id,
        service_name=provider,
        endpoint=f"/proxy{endpoint}",
        http_method=method,
        request_payload={"endpoint": endpoint, "payload": payload},
        status="pending",
        environment=user.get("environment", "development")
    )
    
    try:
        async with db.begin_nested():
            db.add(log_entry)
            await db.flush()
            
            # Get adapter
            adapter = await request_router.get_adapter(user["id"], provider, db)

            # Call generic API proxy
            result = await adapter.call_api(endpoint, method, payload or {}, params or {})
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            log_entry.response_payload = result
            log_entry.response_status = 200
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "completed"
        
        await db.commit()
        
        # Cache the response for idempotent retrieval
        await cache_service.cache_idempotent_response(user["id"], idempotency_key, result)
        
        return result

    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        logger.exception(f"Error in generic proxy: {str(e)}")
        
        try:
            log_entry.response_payload = {"error": str(e)}
            log_entry.response_status = 500
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "failed"
            await db.commit()
        except Exception:
            await db.rollback()
        
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always release the lock
        await cache_service.release_idempotency_lock(idempotency_key)

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
    idempotency_key: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create payment link (unified API) with proper transaction management and idempotency"""
    import time
    from ..models import TransactionLog
    from ..cache import cache_service
    import uuid
    
    provider = provider or "razorpay"
    start_time = time.time()
    transaction_id = f"txn_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Generate or use provided idempotency key
    idempotency_key = idempotency_key or f"idempotency_{user['id']}_{int(start_time)}_{uuid.uuid4().hex[:8]}"
    
    # Check if response is already cached
    cached_response = await cache_service.get_idempotent_response(user["id"], idempotency_key)
    if cached_response:
        return cached_response
    
    # Acquire lock to prevent duplicate processing
    lock_acquired = await cache_service.acquire_idempotency_lock(idempotency_key)
    if not lock_acquired:
        raise HTTPException(
            status_code=409,
            detail="Duplicate request in progress. Please retry after a moment."
        )
    
    log_entry = TransactionLog(
        user_id=user["id"],
        transaction_id=transaction_id,
        service_name=provider,
        endpoint="/payment-links",
        http_method="POST",
        request_payload={"amount": amount, "description": description, "customer_email": customer_email},
        status="pending",
        environment=user.get("environment", "development")
    )
    
    try:
        async with db.begin_nested():
            db.add(log_entry)
            await db.flush()
            
            adapter = await request_router.get_adapter(user["id"], provider, db)
            if not hasattr(adapter, 'create_payment_link'):
                raise HTTPException(status_code=400, detail="Payment links not supported for this provider")
            
            result = await adapter.create_payment_link(amount, description, customer_email)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            log_entry.response_payload = result
            log_entry.response_status = 200
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "completed"
        
        await db.commit()
        
        # Cache the response for idempotent retrieval
        await cache_service.cache_idempotent_response(user["id"], idempotency_key, result)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        
        try:
            log_entry.response_payload = {"error": str(e)}
            log_entry.response_status = 500
            log_entry.response_time_ms = response_time_ms
            log_entry.status = "failed"
            await db.commit()
        except Exception:
            await db.rollback()
        
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always release the lock
        await cache_service.release_idempotency_lock(idempotency_key)