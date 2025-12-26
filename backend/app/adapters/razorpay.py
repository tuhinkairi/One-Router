import httpx
from typing import Dict, Any, Optional
from pybreaker import CircuitBreaker
from .base import BaseAdapter
from .razorpay_transformer import RazorpayTransformer, UnifiedPaymentResponse, UnifiedRefundResponse, UnifiedSubscriptionResponse, UnifiedErrorResponse
from decimal import Decimal

class RazorpayAdapter(BaseAdapter):
    """Razorpay payment service adapter"""
    
    # Circuit breakers for external API calls
    _order_breaker = CircuitBreaker(fail_max=5, reset_timeout=60, listeners=[])
    _verify_breaker = CircuitBreaker(fail_max=5, reset_timeout=60, listeners=[])
    _refund_breaker = CircuitBreaker(fail_max=5, reset_timeout=60, listeners=[])

    def __init__(self, credentials: Dict[str, str]):
        super().__init__(credentials)
        self.transformer = RazorpayTransformer()

    async def _get_base_url(self) -> str:
        """Return Razorpay API base URL"""
        # Always use production API, credentials determine test/live mode
        return "https://api.razorpay.com/v1"

    async def _get_auth_headers(self) -> Dict[str, str]:
        """Get auth headers for Razorpay API calls"""
        import base64
        auth_str = f"{self.credentials['RAZORPAY_KEY_ID']}:{self.credentials['RAZORPAY_KEY_SECRET']}"
        auth_bytes = base64.b64encode(auth_str.encode()).decode()

        return {
            "Authorization": f"Basic {auth_bytes}",
            "Content-Type": "application/json"
        }

    async def validate_credentials(self) -> bool:
        """Validate Razorpay credentials by creating a test order"""
        try:
            # Get the base URL
            base_url = await self._get_base_url()

            auth = (
                self.credentials["RAZORPAY_KEY_ID"],
                self.credentials["RAZORPAY_KEY_SECRET"]
            )

            # Try to create a minimal test order to validate credentials
            test_payload = {
                "amount": 100,  # 1 INR in paise (minimum amount)
                "currency": "INR",
                "payment_capture": 1
            }

            async with httpx.AsyncClient(auth=auth, timeout=10.0) as client:
                response = await client.post(f"{base_url}/orders", json=test_payload)

                # If we get a successful response (even if it's an error about amount),
                # it means credentials are valid
                return response.status_code in [200, 400, 422]  # Success or validation errors

        except Exception as e:
            print(f"Razorpay credential validation failed: {e}")
            return False

    async def create_order(self, amount: float, currency: str = "INR", **kwargs) -> Dict[str, Any]:
        """Create a Razorpay order"""
        try:
            return await self._order_breaker.call(self._create_order_impl, amount, currency, **kwargs)
        except Exception as e:
            logger = __import__('logging').getLogger(__name__)
            logger.error(f"Failed to create Razorpay order: {e}")
            raise

    async def _create_order_impl(self, amount: float, currency: str = "INR", **kwargs) -> Dict[str, Any]:
        """Implementation of order creation (protected by circuit breaker)"""
        try:
            # Create unified request object
            from .razorpay_transformer import UnifiedPaymentRequest
            unified_request = UnifiedPaymentRequest(
                amount=Decimal(str(amount)),
                currency=currency,
                receipt=kwargs.get("receipt"),
                notes=kwargs.get("notes")
            )

            # Add payment method parameters if provided
            if kwargs.get("method"):
                unified_request.method = kwargs["method"]
            if kwargs.get("upi_app"):
                unified_request.upi_app = kwargs["upi_app"]
            if kwargs.get("emi_plan"):
                unified_request.emi_plan = kwargs["emi_plan"]
            if kwargs.get("card_network"):
                unified_request.card_network = kwargs["card_network"]
            if kwargs.get("wallet_provider"):
                unified_request.wallet_provider = kwargs["wallet_provider"]
            if kwargs.get("bank_code"):
                unified_request.bank_code = kwargs["bank_code"]

            # Transform to Razorpay format
            payload = self.transformer.transform_create_order_request(unified_request)

            # Get the base URL
            base_url = await self._get_base_url()

            # Make API request with Basic Auth
            auth = (
                self.credentials["RAZORPAY_KEY_ID"],
                self.credentials["RAZORPAY_KEY_SECRET"]
            )

            async with httpx.AsyncClient(auth=auth, timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/orders",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                # Handle specific error codes
                if response.status_code == 401:
                    raise Exception("Invalid Razorpay credentials")
                elif response.status_code == 400:
                    error_data = response.json()
                    error_desc = error_data.get('error', {}).get('description', 'Unknown error')
                    raise Exception(f"Razorpay API error: {error_desc}")
                elif response.status_code == 429:
                    raise Exception("Razorpay rate limit exceeded")

                response.raise_for_status()
                order_data = response.json()

                # Transform response to unified format
                unified_response = self.transformer.transform_order_response(order_data)
                result = unified_response.dict()
                result["provider_data"] = order_data
                return result

        except httpx.TimeoutException:
            raise Exception("Razorpay API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"Razorpay API network error: {str(e)}")

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Fetch order details from Razorpay"""
        try:
            return await self._order_breaker.call(self._get_order_impl, order_id)
        except Exception as e:
            logger = __import__('logging').getLogger(__name__)
            logger.error(f"Failed to fetch Razorpay order: {e}")
            raise

    async def _get_order_impl(self, order_id: str) -> Dict[str, Any]:
        """Implementation of order fetch (protected by circuit breaker)"""
        try:
            # Get the base URL
            base_url = await self._get_base_url()

            auth = (
                self.credentials["RAZORPAY_KEY_ID"],
                self.credentials["RAZORPAY_KEY_SECRET"]
            )

            async with httpx.AsyncClient(auth=auth, timeout=10.0) as client:
                response = await client.get(f"{base_url}/orders/{order_id}")

                if response.status_code == 404:
                    raise Exception(f"Order {order_id} not found")
                elif response.status_code == 401:
                    raise Exception("Invalid Razorpay credentials")

                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            raise Exception(f"Razorpay API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to fetch Razorpay order: {str(e)}")

    async def capture_payment(self, payment_id: str, amount: float, currency: str = "INR"):
        """Capture a payment"""
        base_url = await self._get_base_url()
        auth = (self.credentials["RAZORPAY_KEY_ID"], self.credentials["RAZORPAY_KEY_SECRET"])

        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.post(
                f"{base_url}/payments/{payment_id}/capture",
                json={
                    "amount": int(amount * 100),  # Convert to paise
                    "currency": currency
                }
            )
            response.raise_for_status()
            return response.json()

    async def create_refund(self, payment_id: str, amount: float = None):
        """Create a refund (full or partial)"""
        try:
            # Create unified request object
            from .razorpay_transformer import UnifiedRefundRequest
            unified_request = UnifiedRefundRequest(
                payment_id=payment_id,
                amount=amount
            )

            # Transform to Razorpay format
            payload = self.transformer.transform_create_refund_request(unified_request)

            base_url = await self._get_base_url()
            auth = (self.credentials["RAZORPAY_KEY_ID"], self.credentials["RAZORPAY_KEY_SECRET"])

            async with httpx.AsyncClient(auth=auth, timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/payments/{payment_id}/refund",
                    json=payload
                )

                if response.status_code == 401:
                    raise Exception("Invalid Razorpay credentials")
                elif response.status_code == 400:
                    error_data = response.json()
                    error_desc = error_data.get('error', {}).get('description', 'Unknown error')
                    raise Exception(f"Razorpay refund error: {error_desc}")
                elif response.status_code == 404:
                    raise Exception(f"Payment {payment_id} not found")

                response.raise_for_status()
                refund_data = response.json()

                # Transform response to unified format
                unified_response = self.transformer.transform_refund_response(refund_data)
                result = unified_response.dict()
                result["provider_data"] = refund_data
                return result
        except httpx.TimeoutException:
            raise Exception("Razorpay API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"Razorpay API network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to create Razorpay refund: {str(e)}")

    async def create_payment_link(
        self,
        amount: float,
        description: str,
        customer_email: str = None,
        customer_phone: str = None
    ):
        """Create a payment link"""
        try:
            base_url = await self._get_base_url()
            auth = (self.credentials["RAZORPAY_KEY_ID"], self.credentials["RAZORPAY_KEY_SECRET"])

            payload = {
                "amount": int(amount * 100),
                "currency": "INR",
                "description": description
            }

            # Only add customer object if we have data
            if customer_email or customer_phone:
                payload["customer"] = {}
                if customer_email:
                    payload["customer"]["email"] = customer_email
                if customer_phone:
                    payload["customer"]["contact"] = customer_phone

            async with httpx.AsyncClient(auth=auth, timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/payment_links",
                    json=payload
                )

                if response.status_code == 401:
                    raise Exception("Invalid Razorpay credentials")
                elif response.status_code == 400:
                    error_data = response.json()
                    error_desc = error_data.get('error', {}).get('description', 'Unknown error')
                    raise Exception(f"Razorpay payment link error: {error_desc}")

                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            raise Exception("Razorpay API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"Razorpay API network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to create Razorpay payment link: {str(e)}")

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Razorpay webhook signature"""
        import hmac
        import hashlib

        webhook_secret = self.credentials.get("RAZORPAY_WEBHOOK_SECRET")
        if not webhook_secret:
            return False

        expected_signature = hmac.new(
            webhook_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)



    # Subscription Methods
    async def create_subscription(self, plan_id: str, customer_notify: bool = True, **kwargs):
        """Create subscription using transformer"""
        try:
            # Create unified request object
            from .razorpay_transformer import UnifiedSubscriptionRequest
            unified_request = UnifiedSubscriptionRequest(
                plan_id=plan_id,
                customer_notify=customer_notify,
                total_count=kwargs.get("total_count", 12),
                quantity=kwargs.get("quantity", 1),
                trial_days=kwargs.get("trial_days"),
                start_date=kwargs.get("start_date")
            )

            # Transform to Razorpay format
            payload = self.transformer.transform_create_subscription_request(unified_request)

            # Add any additional kwargs
            payload.update(kwargs)

            result = await self.call_api("/v1/subscriptions", method="POST", payload=payload)

            # Transform response to unified format
            unified_response = self.transformer.transform_subscription_response(result)
            response_dict = unified_response.dict()
            response_dict["provider_data"] = result
            return response_dict

        except Exception as e:
            raise Exception(f"Failed to create Razorpay subscription: {str(e)}")

    async def get_subscription(self, subscription_id: str):
        """Get subscription details"""
        return await self.call_api(f"/v1/subscriptions/{subscription_id}", method="GET")

    async def cancel_subscription(self, subscription_id: str, cancel_at_cycle_end: bool = False):
        """Cancel subscription"""
        payload = {"cancel_at_cycle_end": cancel_at_cycle_end}
        return await self.call_api(f"/v1/subscriptions/{subscription_id}/cancel", method="POST", payload=payload)

    async def pause_subscription(self, subscription_id: str, pause_at: str = "now"):
        """Pause subscription"""
        payload = {"pause_at": pause_at}
        return await self.call_api(f"/v1/subscriptions/{subscription_id}/pause", method="POST", payload=payload)

    async def resume_subscription(self, subscription_id: str, resume_at: str = "now"):
        """Resume subscription"""
        payload = {"resume_at": resume_at}
        return await self.call_api(f"/v1/subscriptions/{subscription_id}/resume", method="POST", payload=payload)

    async def change_plan(self, subscription_id: str, new_plan_id: str, prorate: bool = True):
        """Change subscription plan"""
        payload = {
            "plan_id": new_plan_id,
            "prorate": prorate
        }
        return await self.call_api(f"/v1/subscriptions/{subscription_id}", method="PATCH", payload=payload)