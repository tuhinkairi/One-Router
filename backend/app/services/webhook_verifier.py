"""
Webhook signature verification service
Handles secure verification of incoming webhooks from payment gateways and Twilio
"""

import hmac
import hashlib
import time
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import WebhookEvent, ServiceCredential
from ..adapters.paypal import PayPalAdapter
from ..services.credential_manager import CredentialManager

logger = logging.getLogger(__name__)


class WebhookVerifier:
    """Handles webhook signature verification for multiple providers"""

    def __init__(self):
        self.cred_manager = CredentialManager()

    async def verify_razorpay_signature(
        self,
        body: bytes,
        signature: str,
        webhook_secret: str
    ) -> bool:
        """
        Verify Razorpay webhook signature using HMAC-SHA256

        Args:
            body: Raw request body bytes
            signature: X-Razorpay-Signature header value
            webhook_secret: Razorpay webhook secret

        Returns:
            bool: True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                webhook_secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Razorpay signature verification failed: {e}")
            return False

    async def verify_paypal_signature(
        self,
        headers: Dict[str, str],
        body: str,
        webhook_id: str,
        adapter: PayPalAdapter
    ) -> bool:
        """
        Verify PayPal webhook signature using certificate-based verification

        Args:
            headers: Request headers containing PayPal signature data
            body: Request body as string
            webhook_id: PayPal webhook ID
            adapter: PayPalAdapter instance

        Returns:
            bool: True if signature is valid and replay checks pass
        """
        try:
            # Extract PayPal headers
            transmission_id = headers.get("paypal-transmission-id")
            transmission_time = headers.get("paypal-transmission-time")
            cert_url = headers.get("paypal-cert-url")
            auth_algo = headers.get("paypal-auth-algo")
            transmission_sig = headers.get("paypal-transmission-sig")

            if not all([transmission_id, transmission_time, cert_url, transmission_sig]):
                logger.warning("Missing PayPal webhook headers")
                return False

            # Check replay protection
            if not await self._check_paypal_replay_protection(transmission_id or "", transmission_time or ""):
                logger.warning(f"PayPal replay protection failed for transmission_id: {transmission_id}")
                return False

            # Verify signature using PayPal API
            is_verified = await adapter.verify_webhook_signature(
                transmission_id=transmission_id or "",
                transmission_time=transmission_time or "",
                transmission_sig=transmission_sig or "",
                auth_algo=auth_algo or "",
                cert_url=cert_url or "",
                webhook_id=webhook_id,
                webhook_event=body
            )

            return is_verified
        except Exception as e:
            logger.error(f"PayPal signature verification failed: {e}")
            return False

    async def verify_twilio_signature(
        self,
        request_url: str,
        params: Dict[str, Any],
        body: str,
        signature: str,
        auth_token: str
    ) -> bool:
        """
        Verify Twilio webhook signature using HMAC-SHA1

        Args:
            request_url: Full request URL
            params: Request parameters
            body: Request body
            signature: X-Twilio-Signature header value
            auth_token: Twilio auth token

        Returns:
            bool: True if signature is valid
        """
        try:
            # Construct the string to sign: URL + sorted params + body
            parsed_url = urlparse(request_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"

            # Sort parameters alphabetically
            sorted_params = []
            for key in sorted(params.keys()):
                sorted_params.append(f"{key}={params[key]}")

            param_string = "&".join(sorted_params) if sorted_params else ""

            # Construct auth string
            auth_string = base_url
            if param_string:
                auth_string += "?" + param_string
            auth_string += body

            # Compute HMAC-SHA1
            expected_signature = hmac.new(
                auth_token.encode(),
                auth_string.encode(),
                hashlib.sha1
            ).hexdigest()

            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Twilio signature verification failed: {e}")
            return False

    async def _check_paypal_replay_protection(
        self,
        transmission_id: str,
        transmission_time: str
    ) -> bool:
        """
        Check PayPal webhook replay protection

        Args:
            transmission_id: PayPal transmission ID
            transmission_time: PayPal transmission timestamp

        Returns:
            bool: True if replay checks pass
        """
        try:
            # Check if transmission_id has been used before
            db = await get_db().__anext__()  # Get database session
            existing_event = await db.execute(
                select(WebhookEvent).where(
                    WebhookEvent.service_name == "paypal",
                    WebhookEvent.signature == transmission_id  # Store transmission_id in signature field
                )
            )
            if existing_event.scalar_one_or_none():
                logger.warning(f"PayPal transmission_id already used: {transmission_id}")
                return False

            # Check timestamp (within 5 minutes)
            try:
                transmission_timestamp = datetime.fromisoformat(transmission_time.replace('Z', '+00:00'))
                now = datetime.now(transmission_timestamp.tzinfo)
                time_diff = abs((now - transmission_timestamp).total_seconds())

                if time_diff > 300:  # 5 minutes
                    logger.warning(f"PayPal transmission timestamp too old: {transmission_time}")
                    return False
            except ValueError:
                logger.warning(f"Invalid PayPal transmission timestamp: {transmission_time}")
                return False

            return True
        except Exception as e:
            logger.error(f"PayPal replay protection check failed: {e}")
            return False

    async def get_user_credentials(
        self,
        user_id: str,
        service_name: str,
        db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """
        Get decrypted user credentials for webhook verification

        Args:
            user_id: User identifier
            service_name: Service name (razorpay, paypal, twilio)
            db: Database session

        Returns:
            Dict containing decrypted credentials or None if not found
        """
        try:
            result = await db.execute(
                select(ServiceCredential).where(
                    ServiceCredential.user_id == user_id,
                    ServiceCredential.provider_name == service_name,
                    ServiceCredential.is_active == True
                )
            )
            credential = result.scalar_one_or_none()

            if not credential:
                return None

            return self.cred_manager.decrypt_credentials(credential.encrypted_credential)
        except Exception as e:
            logger.error(f"Failed to get user credentials for {service_name}: {e}")
            return None