# backend/app/routes/webhooks.py
"""
Webhook forwarding system
Receives webhooks from payment gateways → forwards to developer's webhook URL
"""

from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.sql import func
import httpx
import hashlib
import hmac
import json
import os
import logging
from typing import Optional
from ..database import get_db
from ..models import WebhookEvent, User, ServiceCredential
from ..services.request_router import RequestRouter
from ..auth.dependencies import get_current_user

router = APIRouter()
request_router = RequestRouter()
logger = logging.getLogger(__name__)


async def forward_webhook_to_developer(
    user_webhook_url: str,
    event_data: dict,
    original_signature: str,
    service_name: str
):
    """Forward webhook to developer's URL in background"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                user_webhook_url,
                json={
                    "service": service_name,
                    "event": event_data,
                    "original_signature": original_signature,
                    "forwarded_by": "onerouter"
                },
                headers={
                    "Content-Type": "application/json",
                    "X-OneRouter-Signature": original_signature,
                    "X-OneRouter-Service": service_name
                }
            )
            print(f"✓ Forwarded webhook to {user_webhook_url}: {response.status_code}")
            return response.status_code
    except Exception as e:
        print(f"✗ Failed to forward webhook: {e}")
        return None


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive Razorpay webhook → verify signature → forward to developer
    
    Flow:
    1. Razorpay sends webhook to: https://api.onerouter.com/webhooks/razorpay
    2. We verify the signature with user's webhook secret
    3. We forward the event to developer's webhook URL
    4. We log the event in our database
    """
    
    # Get raw body and signature
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header")
    
    # Parse webhook event
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Extract user identifier from webhook payload
    # Razorpay sends notes in payload - we can add user_id there during order creation
    user_id = None
    
    # Try to get user_id from event payload
    if event.get("payload"):
        entity = event["payload"].get("payment", {}).get("entity") or \
                 event["payload"].get("order", {}).get("entity") or \
                 event["payload"].get("subscription", {}).get("entity")
        
        if entity and entity.get("notes"):
            user_id = entity["notes"].get("onerouter_user_id")
    
    if not user_id:
        # Fallback: try to match by order_id/payment_id in our transaction logs
        # This requires querying transaction_logs table
        raise HTTPException(
            status_code=400, 
            detail="Cannot identify user. Add 'onerouter_user_id' in notes when creating orders."
        )
    
    # Get user's Razorpay credentials to verify signature
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user_id,
            ServiceCredential.provider_name == "razorpay",
            ServiceCredential.is_active == True
        )
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=400, detail="Invalid webhook request")
    
    # Verify webhook signature using the webhook verifier service
    from ..services.webhook_verifier import WebhookVerifier
    verifier = WebhookVerifier()

    creds = await verifier.get_user_credentials(user_id, "razorpay", db)
    if not creds:
        raise HTTPException(status_code=400, detail="Invalid webhook request")

    webhook_secret = creds.get("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=400, detail="Invalid webhook request")

    if not await verifier.verify_razorpay_signature(body, signature, webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid webhook request")
    
    # Log webhook event
    webhook_event = WebhookEvent(
        user_id=user_id,
        service_name="razorpay",
        event_type=event.get("event"),
        payload=event,
        signature=signature,
        processed=False
    )
    db.add(webhook_event)
    await db.commit()

    # Get user's webhook URL from their settings
    # For now, we'll assume it's stored in user's metadata or config
    # You'll need to add a webhook_url field to User table or ServiceCredential
    
    # Example: Forward to user's webhook URL
    user_webhook_url = credential.features_config.get("webhook_url")
    
    if user_webhook_url:
        background_tasks.add_task(
            forward_webhook_to_developer,
            user_webhook_url,
            event,
            signature,
            "razorpay"
        )
    
    # Mark as processed
    await db.execute(
        update(WebhookEvent)
        .where(WebhookEvent.id == webhook_event.id)
        .values(processed=True, processed_at=func.now())
    )
    await db.commit()
    
    return {"status": "received", "event_id": str(webhook_event.id)}


@router.post("/webhooks/paypal")
async def paypal_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive PayPal webhook → verify signature → forward to developer
    
    PayPal webhook verification is more complex - requires calling PayPal API
    """
    
    body = await request.body()
    headers = dict(request.headers)
    
    # PayPal signature headers
    transmission_id = headers.get("paypal-transmission-id")
    transmission_time = headers.get("paypal-transmission-time")
    cert_url = headers.get("paypal-cert-url")
    auth_algo = headers.get("paypal-auth-algo")
    transmission_sig = headers.get("paypal-transmission-sig")
    
    if not all([transmission_id, transmission_time, cert_url, transmission_sig]):
        raise HTTPException(status_code=400, detail="Missing PayPal webhook headers")
    
    # Parse event
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Extract user_id from event
    # PayPal events include custom_id which we set during order creation
    user_id = event.get("resource", {}).get("custom_id")
    
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot identify user. Add 'custom_id' when creating PayPal orders."
        )
    
    # Get user's PayPal credentials
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user_id,
            ServiceCredential.provider_name == "paypal",
            ServiceCredential.is_active == True
        )
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=404, detail="User credentials not found")
    
    # Verify webhook using webhook verifier service
    from ..services.webhook_verifier import WebhookVerifier
    from ..adapters.paypal import PayPalAdapter
    verifier = WebhookVerifier()

    creds = await verifier.get_user_credentials(user_id, "paypal", db)
    if not creds:
        raise HTTPException(status_code=404, detail="User credentials not found")

    # Get webhook_id from credential config
    webhook_id = credential.features_config.get("paypal_webhook_id")
    if not webhook_id:
        raise HTTPException(status_code=400, detail="PayPal webhook ID not configured")

    # Create PayPal adapter for verification
    adapter = PayPalAdapter(creds)

    # Verify webhook signature with replay protection
    raw_body_str = body.decode('utf-8')
    if not await verifier.verify_paypal_signature(headers, raw_body_str, webhook_id, adapter):
        logger.warning(f"PayPal webhook signature verification failed for user {user_id}")
        raise HTTPException(status_code=401, detail="Webhook signature verification failed")
    # Log webhook event
    webhook_event = WebhookEvent(
        user_id=user_id,
        service_name="paypal",
        event_type=event.get("event_type"),
        payload=event,
        signature=transmission_sig,
        processed=False
    )
    db.add(webhook_event)
    await db.commit()

    # Forward to user's webhook URL
    user_webhook_url = credential.features_config.get("webhook_url")

    if user_webhook_url:
        background_tasks.add_task(
            forward_webhook_to_developer,
            user_webhook_url,
            event,
            transmission_sig or "",
            "paypal"
        )

    # Mark as processed
    await db.execute(
        update(WebhookEvent)
        .where(WebhookEvent.id == webhook_event.id)
        .values(processed=True, processed_at=func.now())
    )
    await db.commit()
    
    return {"status": "received", "event_id": str(webhook_event.id)}


@router.post("/webhooks/twilio")
async def twilio_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive Twilio webhook → verify signature → forward to developer

    Twilio webhooks use HMAC-SHA1 signature verification
    """

    # Get request data
    body = await request.body()
    headers = dict(request.headers)
    params = dict(request.query_params)

    # Twilio signature header
    signature = headers.get("x-twilio-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Twilio-Signature header")

    # Parse webhook event
    try:
        body_str = body.decode('utf-8')
        event = json.loads(body_str) if body_str else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request payload")

    # Extract user identifier from webhook payload
    # For Twilio, we need to identify the user somehow - this could be in the payload
    # or we might need to use account SID to map to users
    account_sid = event.get("AccountSid")
    if not account_sid:
        raise HTTPException(
            status_code=400,
            detail="Cannot identify Twilio account. AccountSid missing from payload."
        )

    # Find user by Twilio account SID in their credentials
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.provider_name == "twilio",
            ServiceCredential.is_active == True
        )
    )
    credentials = result.scalars().all()

    user_id = None
    creds = None
    for credential in credentials:
        from ..services.webhook_verifier import WebhookVerifier
        verifier = WebhookVerifier()
        decrypted_creds = await verifier.get_user_credentials(credential.user_id, "twilio", db)
        if decrypted_creds and decrypted_creds.get("TWILIO_ACCOUNT_SID") == account_sid:
            user_id = credential.user_id
            creds = decrypted_creds
            break

    if not user_id or not creds:
        raise HTTPException(status_code=400, detail="Invalid webhook request - account not found")

    # Verify webhook signature
    auth_token = creds.get("TWILIO_AUTH_TOKEN")
    if not auth_token:
        raise HTTPException(status_code=400, detail="Invalid webhook request - auth token missing")

    if not await verifier.verify_twilio_signature(str(request.url), params, body_str, signature, auth_token):
        raise HTTPException(status_code=400, detail="Invalid webhook request")

    # Log webhook event
    webhook_event = WebhookEvent(
        user_id=user_id,
        service_name="twilio",
        event_type=event.get("EventType", "unknown"),
        payload=event,
        signature=signature,
        processed=False
    )
    db.add(webhook_event)
    await db.commit()

    # Get user's webhook URL from their settings
    credential_result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user_id,
            ServiceCredential.provider_name == "twilio",
            ServiceCredential.is_active == True
        )
    )
    credential = credential_result.scalar_one_or_none()
    user_webhook_url = credential.features_config.get("webhook_url") if credential else None

    if user_webhook_url:
        background_tasks.add_task(
            forward_webhook_to_developer,
            user_webhook_url,
            event,
            signature,
            "twilio"
        )

    # Mark as processed
    await db.execute(
        update(WebhookEvent)
        .where(WebhookEvent.id == webhook_event.id)
        .values(processed=True, processed_at=func.now())
    )
    await db.commit()

    return {"status": "received", "event_id": str(webhook_event.id)}


# ============================================
# WEBHOOK CONFIGURATION API
# ============================================

from pydantic import BaseModel
from typing import List


class WebhookConfig(BaseModel):
    webhook_url: str
    events: List[str] = []  # Which events to forward
    enabled: bool = True


@router.get("/api/webhooks/configure")
async def get_webhook_config(
    service_name: Optional[str] = None,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's webhook configuration for all services or specific service

    GET /api/webhooks/configure?service_name=razorpay
    """
    query = select(ServiceCredential).where(
        ServiceCredential.user_id == user["id"],
        ServiceCredential.is_active == True
    )

    if service_name:
        query = query.where(ServiceCredential.provider_name == service_name)

    result = await db.execute(query)
    credentials = result.scalars().all()

    config = {}
    for cred in credentials:
        service_config = cred.features_config or {}
        config[cred.provider_name] = {
            "webhook_url": service_config.get("webhook_url"),
            "events": service_config.get("events", []),
            "enabled": service_config.get("enabled", False),
            "onerouter_webhook_url": f"https://api.onerouter.com/webhooks/{cred.provider_name}",
            "last_configured": cred.updated_at.isoformat() if cred.updated_at is not None else None
        }

    return config


@router.put("/api/webhooks/configure")
async def update_webhook_config(
    service_name: str,
    config: WebhookConfig,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update webhook configuration for a service

    PUT /api/webhooks/configure
    {
        "service_name": "razorpay",
        "webhook_url": "https://myapp.com/webhooks/payments",
        "events": ["payment.success", "payment.failed"],
        "enabled": true
    }
    """

    # Validate webhook URL (must be HTTPS in production)
    if config.webhook_url:
        from urllib.parse import urlparse
        parsed = urlparse(config.webhook_url)
        if parsed.scheme != "https" and os.getenv("ENVIRONMENT") == "production":
            raise HTTPException(status_code=400, detail="Webhook URL must use HTTPS in production")

    # Update service credential with webhook config
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user["id"],
            ServiceCredential.provider_name == service_name,
            ServiceCredential.is_active == True
        )
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(status_code=404, detail="Service not configured")

    # Update features_config with webhook settings
    if credential.features_config is None:
        credential.features_config = {}  # type: ignore

    credential.features_config["webhook_url"] = config.webhook_url  # type: ignore
    credential.features_config["events"] = config.events  # type: ignore
    credential.features_config["enabled"] = config.enabled  # type: ignore

    flag_modified(credential, "features_config")

    flag_modified(credential, "features_config")
    await db.commit()

    return {
        "status": "configured",
        "service": service_name,
        "config": credential.features_config,
        "onerouter_webhook_url": f"https://api.onerouter.com/webhooks/{service_name}"
    }


@router.post("/api/webhooks/test")
async def test_webhook(
    service_name: str,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send test webhook to user's endpoint

    POST /api/webhooks/test
    {
        "service_name": "razorpay"
    }
    """
    # Get webhook config
    result = await db.execute(
        select(ServiceCredential).where(
            ServiceCredential.user_id == user["id"],
            ServiceCredential.provider_name == service_name,
            ServiceCredential.is_active == True
        )
    )
    credential = result.scalar_one_or_none()

    if not credential:
        raise HTTPException(status_code=404, detail="Service not configured")

    webhook_url = credential.features_config.get("webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Webhook URL not configured")

    # Create test event
    test_event = {
        "event": "test.webhook",
        "service": service_name,
        "timestamp": "2025-01-01T00:00:00Z",
        "test": True,
        "message": "This is a test webhook from OneRouter"
    }

    # Send test webhook
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook_url,
                json=test_event,
                headers={
                    "Content-Type": "application/json",
                    "X-OneRouter-Test": "true",
                    "X-OneRouter-Service": service_name
                }
            )

            return {
                "status": "sent",
                "webhook_url": webhook_url,
                "response_code": response.status_code,
                "response_body": response.text[:500]  # Limit response size
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test webhook: {str(e)}")


@router.get("/api/webhooks/logs")
async def get_webhook_logs(
    service_name: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get webhook event history

    GET /api/webhooks/logs?service_name=razorpay&limit=50
    """
    from sqlalchemy import desc

    query = select(WebhookEvent).where(WebhookEvent.user_id == user["id"])

    if service_name:
        query = query.where(WebhookEvent.service_name == service_name)

    query = query.order_by(desc(WebhookEvent.created_at)).limit(limit).offset(offset)

    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "events": [
            {
                "id": str(event.id),
                "service_name": event.service_name,
                "event_type": event.event_type,
                "processed": event.processed,
                "processed_at": event.processed_at.isoformat() if event.processed_at is not None else None,
                "created_at": event.created_at.isoformat(),
                "payload_size": len(str(event.payload)) if event.payload is not None else 0
            }
            for event in events
        ],
        "total": len(events),
        "limit": limit,
        "offset": offset
    }