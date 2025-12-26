"""
Razorpay Request/Response Transformers for OneRouter

Handles normalization between OneRouter unified format and Razorpay-specific API formats.
"""

from typing import Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# UNIFIED REQUEST/RESPONSE MODELS
# =============================================================================

class UnifiedPaymentRequest(BaseModel):
    """Unified payment order request"""
    amount: Decimal = Field(..., gt=0)
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None

    # Payment method parameters
    method: Optional[str] = None
    upi_app: Optional[str] = None
    emi_plan: Optional[str] = None
    card_network: Optional[str] = None
    wallet_provider: Optional[str] = None
    bank_code: Optional[str] = None


class UnifiedRefundRequest(BaseModel):
    """Unified refund request"""
    payment_id: str
    amount: Optional[float] = Field(None, gt=0)
    notes: Optional[Dict[str, Any]] = None


class UnifiedSubscriptionRequest(BaseModel):
    """Unified subscription request"""
    plan_id: str
    customer_notify: bool = True
    total_count: int = Field(..., gt=0)
    quantity: int = Field(1, gt=0)
    trial_days: Optional[int] = None
    start_date: Optional[str] = None
    idempotency_key: Optional[str] = None


class UnifiedPaymentResponse(BaseModel):
    """Unified payment response"""
    transaction_id: str
    provider: str = "razorpay"
    provider_order_id: str
    amount: Decimal
    currency: str
    status: str  # normalized status
    receipt: Optional[str] = None
    created_at: Optional[int] = None

    # Payment method information (Phase 2 enhancement)
    payment_method: Optional[str] = None  # 'upi', 'card', 'netbanking', etc.
    method_details: Optional[Dict[str, Any]] = None  # Provider-specific method details

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class UnifiedRefundResponse(BaseModel):
    """Unified refund response"""
    refund_id: str
    payment_id: str
    amount: Decimal
    currency: str
    status: str  # normalized status
    created_at: Optional[int] = None

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class UnifiedSubscriptionResponse(BaseModel):
    """Unified subscription response"""
    subscription_id: str
    plan_id: str
    status: str  # normalized status
    total_count: int
    quantity: int
    current_start: Optional[int] = None
    current_end: Optional[int] = None
    remaining_count: Optional[int] = None
    created_at: Optional[int] = None


class UnifiedErrorResponse(BaseModel):
    """Unified error response"""
    error_code: str
    message: str
    provider_error: Optional[Dict[str, Any]] = None


# =============================================================================
# RAZORPAY API MODELS
# =============================================================================

class RazorpayCreateOrderRequest(BaseModel):
    """Razorpay create order request"""
    amount: int = Field(..., description="Amount in paise")
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    payment_capture: int = Field(1, description="Auto-capture payments")


class RazorpayCreateRefundRequest(BaseModel):
    """Razorpay create refund request"""
    amount: Optional[int] = Field(None, description="Amount in paise, None for full refund")
    speed: Optional[str] = Field("normal", pattern="^(normal|optimum)$")
    notes: Optional[Dict[str, Any]] = None
    receipt: Optional[str] = None


class RazorpayCreateSubscriptionRequest(BaseModel):
    """Razorpay create subscription request"""
    plan_id: str
    total_count: int
    quantity: int = 1
    customer_notify: bool = True
    start_at: Optional[int] = None
    expire_by: Optional[int] = None
    addons: Optional[list] = None
    offer_id: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None


class RazorpayOrderResponse(BaseModel):
    """Razorpay order response"""
    id: str
    amount: int
    currency: str
    status: str
    receipt: Optional[str] = None
    created_at: int
    amount_paid: int = 0
    amount_due: int = 0
    attempts: int = 0
    notes: Optional[Dict[str, Any]] = None


class RazorpayRefundResponse(BaseModel):
    """Razorpay refund response"""
    id: str
    payment_id: str
    amount: int
    currency: str
    status: str
    created_at: int
    speed_processed: Optional[str] = None
    speed_requested: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    receipt: Optional[str] = None


class RazorpaySubscriptionResponse(BaseModel):
    """Razorpay subscription response"""
    id: str
    plan_id: str
    status: str
    total_count: int
    quantity: int
    current_start: Optional[int] = None
    current_end: Optional[int] = None
    ended_at: Optional[int] = None
    charge_at: Optional[int] = None
    start_at: Optional[int] = None
    end_at: Optional[int] = None
    auth_attempts: int = 0
    paid_count: int = 0
    customer_notify: bool = True
    created_at: int
    expire_by: Optional[int] = None
    remaining_count: Optional[int] = None
    notes: Optional[Dict[str, Any]] = None


# =============================================================================
# TRANSFORMER CLASS
# =============================================================================

class RazorpayTransformer:
    """Transforms between OneRouter unified format and Razorpay API format"""

    # Status mapping dictionaries
    ORDER_STATUS_MAP = {
        "created": "created",
        "attempted": "pending",
        "paid": "completed"
    }

    REFUND_STATUS_MAP = {
        "pending": "pending",
        "processed": "completed",
        "failed": "failed"
    }

    SUBSCRIPTION_STATUS_MAP = {
        "created": "created",
        "authenticated": "authenticated",
        "active": "active",
        "pending": "pending",
        "halted": "suspended",
        "cancelled": "cancelled",
        "completed": "completed",
        "expired": "expired"
    }

    @staticmethod
    def amount_to_paise(amount: Decimal) -> int:
        """Convert Decimal amount to paise (integer)"""
        return int(amount * 100)

    @staticmethod
    def paise_to_amount(paise: int) -> Decimal:
        """Convert paise (integer) to Decimal amount"""
        return Decimal(paise) / 100

    @classmethod
    def transform_create_order_request(cls, unified: UnifiedPaymentRequest) -> Dict[str, Any]:
        """Transform unified payment request to Razorpay order request"""
        return {
            "amount": cls.amount_to_paise(unified.amount),
            "currency": unified.currency,
            "receipt": unified.receipt,
            "notes": unified.notes,
            "payment_capture": 1
        }

    @classmethod
    def transform_create_refund_request(cls, unified: UnifiedRefundRequest) -> Dict[str, Any]:
        """Transform unified refund request to Razorpay refund request"""
        request_data: Dict[str, Any] = {
            "speed": "normal"
        }

        if unified.amount is not None:
            request_data["amount"] = cls.amount_to_paise(Decimal(str(unified.amount)))

        if unified.notes:
            request_data["notes"] = unified.notes

        return request_data

    @classmethod
    def transform_create_subscription_request(cls, unified: UnifiedSubscriptionRequest) -> Dict[str, Any]:
        """Transform unified subscription request to Razorpay subscription request"""
        return {
            "plan_id": unified.plan_id,
            "total_count": unified.total_count,
            "quantity": unified.quantity,
            "customer_notify": unified.customer_notify
        }

    @classmethod
    def transform_order_response(cls, razorpay: Dict[str, Any]) -> UnifiedPaymentResponse:
        """Transform Razorpay order response to unified format"""
        try:
            normalized_status = cls.ORDER_STATUS_MAP.get(razorpay["status"], "unknown")

            return UnifiedPaymentResponse(
                transaction_id=f"unf_{razorpay['id']}",
                provider="razorpay",
                provider_order_id=razorpay["id"],
                amount=cls.paise_to_amount(razorpay["amount"]),
                currency=razorpay["currency"],
                status=normalized_status,
                receipt=razorpay.get("receipt"),
                created_at=razorpay.get("created_at")
            )
        except KeyError as e:
            logger.error(f"Missing required field in Razorpay order response: {e}")
            raise ValueError(f"Invalid Razorpay order response: missing {e}")

    @classmethod
    def transform_refund_response(cls, razorpay: Dict[str, Any]) -> UnifiedRefundResponse:
        """Transform Razorpay refund response to unified format"""
        try:
            normalized_status = cls.REFUND_STATUS_MAP.get(razorpay["status"], "unknown")

            return UnifiedRefundResponse(
                refund_id=razorpay["id"],
                payment_id=razorpay["payment_id"],
                amount=cls.paise_to_amount(razorpay["amount"]),
                currency=razorpay["currency"],
                status=normalized_status,
                created_at=razorpay.get("created_at")
            )
        except KeyError as e:
            logger.error(f"Missing required field in Razorpay refund response: {e}")
            raise ValueError(f"Invalid Razorpay refund response: missing {e}")

    @classmethod
    def transform_subscription_response(cls, razorpay: Dict[str, Any]) -> UnifiedSubscriptionResponse:
        """Transform Razorpay subscription response to unified format"""
        try:
            normalized_status = cls.SUBSCRIPTION_STATUS_MAP.get(razorpay["status"], "unknown")

            return UnifiedSubscriptionResponse(
                subscription_id=razorpay["id"],
                plan_id=razorpay["plan_id"],
                status=normalized_status,
                total_count=razorpay["total_count"],
                quantity=razorpay["quantity"],
                current_start=razorpay.get("current_start"),
                current_end=razorpay.get("current_end"),
                remaining_count=razorpay.get("remaining_count"),
                created_at=razorpay.get("created_at")
            )
        except KeyError as e:
            logger.error(f"Missing required field in Razorpay subscription response: {e}")
            raise ValueError(f"Invalid Razorpay subscription response: missing {e}")

    @classmethod
    def transform_error_response(cls, error: Dict[str, Any]) -> UnifiedErrorResponse:
        """Transform Razorpay error response to unified format"""
        try:
            # Extract error details from Razorpay error format
            error_data = error.get("error", {})
            error_code = error_data.get("code", "UNKNOWN_ERROR")
            description = error_data.get("description", "Unknown error occurred")

            return UnifiedErrorResponse(
                error_code=error_code,
                message=description,
                provider_error=error
            )
        except Exception as e:
            logger.error(f"Failed to transform Razorpay error response: {e}")
            return UnifiedErrorResponse(
                error_code="TRANSFORMATION_ERROR",
                message="Failed to parse provider error response",
                provider_error=error
            )