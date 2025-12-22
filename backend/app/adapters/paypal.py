import httpx
import json
import logging
import time
from typing import Dict, Any, Optional
from .base import BaseAdapter

class PayPalAdapter(BaseAdapter):
    """PayPal payment service adapter"""

    logger = logging.getLogger(__name__)

    def __init__(self, credentials: Dict[str, str]):
        super().__init__(credentials)
        self.access_token = None
        self.token_expires = None

    async def _get_base_url(self) -> str:
        """Return PayPal API base URL"""
        mode = self.credentials.get("PAYPAL_MODE", "sandbox")
        if mode == "live":
            return "https://api-m.paypal.com"
        else:
            return "https://api-m.sandbox.paypal.com"

    async def _get_auth_headers(self) -> Dict[str, str]:
        """Get auth headers for PayPal API calls"""
        access_token = await self._get_access_token()
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    async def _get_access_token(self) -> str:
        """Get OAuth access token from PayPal"""
        # Check if token is still valid (with 5 min buffer)
        if self.access_token and self.token_expires and time.time() < (self.token_expires - 300):
            return self.access_token

        base_url = await self._get_base_url()
        token_url = base_url.replace("/v1", "/v1/oauth2/token")

        # Basic auth with client credentials
        auth = (
            self.credentials["PAYPAL_CLIENT_ID"],
            self.credentials["PAYPAL_CLIENT_SECRET"]
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                token_url,
                data={"grant_type": "client_credentials"},
                auth=auth,
                headers={"Accept": "application/json"}
            )

            if response.status_code != 200:
                error_msg = f"PayPal auth failed: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data.get('error_description', response.text)}"
                except json.JSONDecodeError:
                    error_msg += f" - {response.text or 'No response text'}"
                raise Exception(error_msg)
            data = response.json()
            self.access_token = data["access_token"]
            self.token_expires = time.time() + data["expires_in"]

            return self.access_token

    async def validate_credentials(self) -> bool:
        """Validate PayPal credentials by getting access token"""
        try:
            await self._get_access_token()
            return True
        except Exception as e:
            self.logger.error("PayPal credential validation failed")
            return False

    async def verify_webhook_signature(
        self,
        transmission_id: str,
        transmission_time: str,
        transmission_sig: str,
        auth_algo: str,
        cert_url: str,
        webhook_id: str,
        webhook_event: str
    ) -> bool:
        """Verify PayPal webhook signature"""
        try:
            payload = {
                "transmission_id": transmission_id,
                "transmission_time": transmission_time,
                "transmission_sig": transmission_sig,
                "auth_algo": auth_algo,
                "cert_url": cert_url,
                "webhook_id": webhook_id,
                "webhook_event": json.loads(webhook_event)  # PayPal expects the JSON object, not string
            }

            response = await self.call_api("/v1/notifications/verify-webhook-signature", method="POST", payload=payload)
            verification_status = response.get("verification_status")
            return verification_status == "SUCCESS"
        except Exception as e:
            self.logger.error(f"PayPal webhook verification failed: {e}")
            return False

    async def create_order(self, amount: float, currency: str = "USD", **kwargs) -> Dict[str, Any]:
        """Create a PayPal order using v2 API"""
        try:
            base_url = await self._get_base_url()
            access_token = await self._get_access_token()

            # v2 API format
            purchase_unit = {
                "amount": {
                    "currency_code": currency,
                    "value": f"{amount:.2f}"
                }
            }

            # Add custom_id for webhook identification (maps to user_id)
            if kwargs.get('custom_id'):
                purchase_unit["custom_id"] = kwargs['custom_id']

            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [purchase_unit]
            }

            # Optional: add return/cancel URLs for checkout flow
            if kwargs.get('return_url') or kwargs.get('cancel_url'):
                order_data["application_context"] = {
                    "return_url": kwargs.get('return_url', 'https://example.com/return'),
                    "cancel_url": kwargs.get('cancel_url', 'https://example.com/cancel')
                }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/v2/checkout/orders",
                    json=order_data,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )

                # Handle specific error codes
                if response.status_code == 400:
                    error_data = response.json()
                    raise Exception(f"PayPal bad request: {error_data}")
                elif response.status_code == 401:
                    raise Exception("Invalid PayPal credentials")
                elif response.status_code == 422:
                    error_data = response.json()
                    error_desc = error_data.get("details", [{}])[0].get("description", "Validation error")
                    raise Exception(f"PayPal validation error: {error_desc}")
                elif response.status_code == 429:
                    raise Exception("PayPal rate limit exceeded")

                response.raise_for_status()
                order_response = response.json()

                # Extract checkout URL from links (v2 API uses 'approve' rel)
                checkout_url = None
                for link in order_response.get("links", []):
                    if link.get("rel") == "approve":
                        checkout_url = link["href"]
                        break

                # Safely extract id
                id_val = order_response.get('id')
                if id_val:
                    transaction_id = f"unf_{id_val}"
                    provider_order_id = id_val
                else:
                    transaction_id = None
                    provider_order_id = None

                # Return normalized response
                return {
                    "transaction_id": transaction_id,
                    "provider": "paypal",
                    "provider_order_id": provider_order_id,
                    "amount": amount,
                    "currency": currency,
                    "status": "created",
                    "checkout_url": checkout_url,
                    "provider_data": order_response
                }

        except httpx.TimeoutException:
            raise Exception("PayPal API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"PayPal API network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to create PayPal order: {str(e)}")

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order details using v2 API"""
        try:
            base_url = await self._get_base_url()
            access_token = await self._get_access_token()

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{base_url}/v2/checkout/orders/{order_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                if response.status_code == 404:
                    raise Exception(f"Order {order_id} not found")
                elif response.status_code == 401:
                    raise Exception("Invalid PayPal credentials")

                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            raise Exception(f"PayPal API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to fetch PayPal order: {str(e)}")

    async def normalize_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Convert unified request to PayPal format"""
    async def normalize_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Convert PayPal response to unified format"""
        # Extract amount from purchase_units
        purchase_unit = response.get("purchase_units", [{}])[0]
        amount_data = purchase_unit.get("amount", {})

        # Extract checkout URL
        checkout_url = None
        for link in response.get("links", []):
            if link.get("rel") == "approve":
                checkout_url = link["href"]
                break

        # Handle both v1 and v2 API response formats
        status = response.get('status') or response.get('state', 'unknown')
        if isinstance(status, str):
            status = status.lower()

        # Safely extract id
        id_val = response.get('id')
        if id_val:
            transaction_id = f"unf_{id_val}"
            provider_order_id = id_val
        else:
            transaction_id = None
            provider_order_id = None

        return {
            "transaction_id": transaction_id,
            "provider": "paypal",
            "provider_order_id": provider_order_id,
            "amount": float(amount_data.get("value", 0)) if amount_data else 0.0,
            "currency": amount_data.get("currency_code", "USD") if amount_data else "USD",
            "status": status,
            "checkout_url": checkout_url,
            "provider_data": response
        }

    async def capture_order(self, order_id: str):
        """Capture payment for an order"""
        try:
            base_url = await self._get_base_url()
            access_token = await self._get_access_token()

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/v2/checkout/orders/{order_id}/capture",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if response.status_code == 404:
                    raise Exception(f"Order {order_id} not found")
                elif response.status_code == 401:
                    raise Exception("Invalid PayPal credentials")
                elif response.status_code == 422:
                    error_data = response.json()
                    error_desc = error_data.get("details", [{}])[0].get("description", "Validation error")
                    raise Exception(f"PayPal capture error: {error_desc}")
                
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            raise Exception("PayPal API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"PayPal API network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to capture PayPal order: {str(e)}")

    async def create_refund(self, capture_id: str, amount: float = None, currency: str = "USD"):
        """Create a refund (full or partial)"""
        try:
            base_url = await self._get_base_url()
            access_token = await self._get_access_token()

            payload = {}
            if amount is not None:  # Partial refund
                payload["amount"] = {
                    "value": f"{amount:.2f}",
                    "currency_code": currency
                }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/v2/payments/captures/{capture_id}/refund",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code == 404:
                    raise Exception(f"Capture {capture_id} not found")
                elif response.status_code == 401:
                    raise Exception("Invalid PayPal credentials")
                elif response.status_code == 422:
                    error_data = response.json()
                    error_desc = error_data.get("details", [{}])[0].get("description", "Validation error")
                    raise Exception(f"PayPal refund error: {error_desc}")

                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            raise Exception("PayPal API request timed out")
        except httpx.HTTPError as e:
            raise Exception(f"PayPal API network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to create PayPal refund: {str(e)}")

    # Subscription Methods (Pass-Through)
    async def create_subscription(self, plan_id: str, **kwargs):
        """Create subscription - direct pass-through to PayPal"""
        payload = {
            "plan_id": plan_id,
            **kwargs
        }

        return await self.call_api("/v1/billing/subscriptions", method="POST", payload=payload)

    async def get_subscription(self, subscription_id: str):
        """Get subscription details"""
        return await self.call_api(f"/v1/billing/subscriptions/{subscription_id}", method="GET")

    async def cancel_subscription(self, subscription_id: str, reason: str = ""):
        """Cancel subscription"""
        payload = {"reason": reason}
        return await self.call_api(f"/v1/billing/subscriptions/{subscription_id}/cancel", method="POST", payload=payload)

    async def suspend_subscription(self, subscription_id: str, reason: str = ""):
        """Suspend subscription"""
        payload = {"reason": reason}
        return await self.call_api(f"/v1/billing/subscriptions/{subscription_id}/suspend", method="POST", payload=payload)

    async def activate_subscription(self, subscription_id: str, reason: str = ""):
        """Activate subscription"""
        payload = {"reason": reason}
        return await self.call_api(f"/v1/billing/subscriptions/{subscription_id}/activate", method="POST", payload=payload)