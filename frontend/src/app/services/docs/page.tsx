# OneRouter API Documentation

Complete guide to integrate with OneRouter backend service.

## Table of Contents

- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Communications](#communications)
  - [Payments](#payments)
  - [Subscriptions](#subscriptions)
  - [Service Discovery](#service-discovery)
  - [Marketplace](#marketplace)
- [SDK Integration](#sdk-integration)
- [Edge Cases](#edge-cases)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Get API Key

```bash
curl -X POST http://localhost:8000/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "key_name": "My App",
    "environment": "production"
  }'
```

### 2. Configure Service Credentials

Add provider credentials in dashboard:

```bash
curl -X POST http://localhost:8000/v1/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "provider_name": "twilio",
    "credentials": {
      "account_sid": "ACxxx",
      "auth_token": "xxx",
      "from_number": "+1234567890"
    },
    "environment": "production"
  }'
```

### 3. Use SDK or REST API

**Using Python SDK:**
```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")
```

**Using REST API:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8000/v1/...
```

---

## API Endpoints

### Authentication

#### Create API Key

```http
POST /v1/auth/api-keys
Authorization: Bearer YOUR_CLERK_TOKEN
Content-Type: application/json

{
  "key_name": "My App",
  "environment": "production",
  "rate_limit_per_min": 100
}

Response:
{
  "id": "uuid",
  "key_hash": "hash",
  "key_prefix": "unf_live",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Get API Key

```http
GET /v1/auth/api-keys
Authorization: Bearer YOUR_API_KEY

Response:
{
  "id": "uuid",
  "key_name": "My App",
  "is_active": true,
  "environment": "production",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### Communications

#### Send SMS

```http
POST /v1/sms
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "to": "+1234567890",
  "body": "Hello from OneRouter!",
  "from_number": "+0987654321",  # Optional
  "idempotency_key": "unique-key-123"  # Optional - prevents duplicates
}

Response (201):
{
  "message_id": "SM1234567890",
  "status": "sent",
  "service": "twilio",
  "cost": 0.0079,
  "currency": "USD",
  "created_at": "2025-01-01T12:00:00Z"
}

Error Response:
{
  "detail": "Failed to send SMS: Service not configured"
}
```

#### Send Email

```http
POST /v1/email
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html_body": "<h1>Hello!</h1>",  # OR
  "text_body": "Plain text email",   # OR
  "idempotency_key": "unique-key-456"
}

Response (201):
{
  "email_id": "email_123",
  "status": "sent",
  "service": "resend",
  "cost": 0.0001,
  "currency": "USD",
  "created_at": "2025-01-01T12:00:00Z"
}
```

#### Get SMS Status

```http
GET /v1/sms/{message_id}
Authorization: Bearer YOUR_API_KEY

Response:
{
  "message_id": "SM123",
  "status": "sent",
  "to": "+1234567890",
  "body": "Hello!",
  "created_at": "2025-01-01T12:00:00Z"
}
```

#### Get Email Status

```http
GET /v1/email/{email_id}
Authorization: Bearer YOUR_API_KEY

Response:
{
  "email_id": "email_123",
  "status": "sent",
  "to": "user@example.com",
  "subject": "Test",
  "created_at": "2025-01-01T12:00:00Z"
}
```

---

### Payments

#### Create Payment

```http
POST /v1/payments
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "amount": 1000,
  "currency": "INR",
  "customer_id": "cust_123",
  "payment_method": {
    "type": "upi",
    "upi": {
      "vpa": "customer@upi",
      "phone": "+91987654321"
    }
  },
  "idempotency_key": "unique-pay-123"
}

Response (201):
{
  "transaction_id": "txn_123",
  "status": "pending",
  "amount": 1000,
  "currency": "INR",
  "checkout_url": "https://rzp.io/checkout/xxx",
  "provider": "razorpay"
}
```

#### Get Payment Status

```http
GET /v1/payments/{transaction_id}
Authorization: Bearer YOUR_API_KEY

Response:
{
  "transaction_id": "txn_123",
  "status": "completed",
  "amount": 1000,
  "currency": "INR",
  "provider_txn_id": "pay_xyz",
  "created_at": "2025-01-01T12:00:00Z"
}
```

#### Refund Payment

```http
POST /v1/payments/{transaction_id}/refund
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "amount": 500,  # Partial refund amount
  "reason": "Customer requested refund"
}

Response (200):
{
  "refund_id": "ref_123",
  "status": "processed",
  "amount": 500,
  "currency": "INR"
}
```

---

### Subscriptions

#### Create Subscription

```http
POST /v1/subscriptions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "plan_id": "plan_monthly_99",
  "customer_id": "cust_123",
  "trial_days": 14,
  "payment_method_id": "pm_123"
}

Response (201):
{
  "subscription_id": "sub_123",
  "status": "trial",
  "trial_end": "2025-01-15T12:00:00Z",
  "amount": 999,
  "currency": "INR"
}
```

#### Pause Subscription

```http
POST /v1/subscriptions/{subscription_id}/pause
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "pause_at": "cycle_end"
}

Response (200):
{
  "subscription_id": "sub_123",
  "status": "paused",
  "resume_at": "2025-02-01T00:00:00Z"
}
```

#### Cancel Subscription

```http
DELETE /v1/subscriptions/{subscription_id}
Authorization: Bearer YOUR_API_KEY

Response (204): No content
```

---

### Service Discovery

#### List All Services

```http
GET /v1/services
Authorization: Bearer YOUR_API_KEY

Response:
{
  "services": [
    {
      "name": "twilio",
      "category": "communications",
      "subcategory": "sms",
      "features": ["send_sms", "get_sms"],
      "pricing": {
        "send_sms": {
          "base": 0.0079,
          "unit": "per_message",
          "currency": "USD"
        }
      }
    },
    {
      "name": "resend",
      "category": "communications",
      "subcategory": "email",
      "features": ["send_email"],
      "pricing": {
        "send_email": {
          "base": 0.0001,
          "unit": "per_email",
          "currency": "USD"
        }
      }
    },
    {
      "name": "razorpay",
      "category": "payments",
      "subcategory": "payment_gateway",
      "features": ["create_order", "capture_payment", "refund_payment"],
      "pricing": {
        "create_order": {
          "base": 0.02,
          "unit": "per_transaction",
          "currency": "USD"
        }
      }
    }
  ]
}
```

#### Get Service Schema

```http
GET /v1/services/{service_name}/schema

Example: GET /v1/services/twilio/schema

Response:
{
  "service_name": "twilio",
  "credentials_required": {
    "account_sid": {
      "type": "string",
      "required": true,
      "secret": true
    },
    "auth_token": {
      "type": "string",
      "required": true,
      "secret": true
    },
    "from_number": {
      "type": "phone",
      "required": true
    }
  },
  "endpoints": {
    "send_sms": {
      "method": "POST",
      "path": "/Accounts/{account_sid}/Messages.json",
      "params": {
        "To": {"type": "string"},
        "Body": {"type": "string"},
        "From": {"type": "string"}
      }
    }
  },
  "rate_limits": {
    "requests_per_second": 10,
    "requests_per_minute": 100
  }
}
```

#### Get Service Features

```http
GET /v1/services/{service_name}/features

Example: GET /v1/services/twilio/features

Response:
{
  "service": "twilio",
  "features": [
    {
      "name": "send_sms",
      "description": "Send SMS messages",
      "method": "POST",
      "path": "/Messages.json",
      "rate_limit": 10
    },
    {
      "name": "get_sms",
      "description": "Get SMS message details",
      "method": "GET",
      "path": "/Messages/{MessageSid}.json",
      "rate_limit": 10
    }
  ]
}
```

---

### Marketplace

#### Create Vendor Account

```http
POST /v1/marketplace/vendors
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "bank_account": {
    "account_number": "1234567890",
    "ifsc": "HDFC",
    "account_type": "savings"
  },
  "settlement_schedule": "daily"
}

Response (201):
{
  "vendor_id": "vendor_123",
  "status": "active",
  "balance": 0,
  "settlements": [
    {
      "amount": 5000,
      "date": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Split Payment

```http
POST /v1/marketplace/payments
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "amount": 10000,
  "currency": "USD",
  "customer_id": "cust_123",
  "splits": [
    {
      "vendor_id": "vendor_123",
      "amount": 8000,
      "type": "percentage"
    },
    {
      "vendor_id": "vendor_456",
      "amount": 2000,
      "type": "flat"
    }
  ],
  "platform_fee": {
    "amount": 500,
    "type": "flat"
  }
}

Response (201):
{
  "transaction_id": "split_txn_123",
  "status": "processing",
  "amount": 10000,
  "splits": [...]
}
```

---

## SDK Integration

### Installation

```bash
pip install onerouter==2.0.1
```

### Quick Setup

```python
from onerouter import OneRouter

# Initialize client
client = OneRouter(
    api_key="unf_live_xxx",
    base_url="https://api.onerouter.com",  # Optional: Custom API URL
    timeout=30,  # Optional: Request timeout
    max_retries=3  # Optional: Max retry attempts
    environment="production"  # Optional: "development" or "production"
)
```

### SMS Integration

```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Send SMS
sms = client.sms.send(
    to="+1234567890",
    body="Hello from OneRouter!",
    from_number="+0987654321"  # Optional
)

print(f"SMS sent! ID: {sms['message_id']}")
print(f"Cost: ${sms['cost']}")

# Get SMS status
status = client.sms.get_status(sms['message_id'])
print(f"Status: {status['status']}")
```

### Email Integration

```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Send email
email = client.email.send(
    to="user@example.com",
    subject="Welcome to OneRouter",
    html_body="<h1>Welcome!</h1><p>Get started today.</p>",
    # OR
    # text_body="Welcome to OneRouter"
)

print(f"Email sent! ID: {email['email_id']}")
print(f"Cost: ${email['cost']}")

# Get email status
status = client.email.get_status(email['email_id'])
print(f"Status: {status['status']}")
```

### Payment Integration

```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Create UPI payment
payment = client.payments.create(
    amount=1000,
    currency="INR",
    customer_id="cust_123",
    payment_method={
        "type": "upi",
        "upi": {
            "vpa": "customer@upi"
        }
    }
)

print(f"Payment created: {payment['transaction_id']}")
print(f"Checkout URL: {payment.get('checkout_url', '')}")

# Get payment status
status = client.payments.get(payment['transaction_id'])
print(f"Status: {status['status']}")

# Refund payment
refund = client.payments.refund(
    payment_id=payment['transaction_id'],
    amount=500  # Partial refund
)

print(f"Refund ID: {refund['refund_id']}")
```

### Subscription Integration

```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Create subscription
subscription = client.subscriptions.create(
    plan_id="plan_monthly_99",
    customer_id="cust_123",
    trial_days=14
)

print(f"Subscription created: {subscription['id']}")
print(f"Trial ends: {subscription['trial_end']}")

# Pause subscription
client.subscriptions.pause(
    subscription_id=subscription['id'],
    pause_at="cycle_end"
)

# Resume subscription
client.subscriptions.resume(
    subscription_id=subscription['id']
)

# Cancel subscription
client.subscriptions.cancel(
    subscription_id=subscription['id'],
    cancel_at="cycle_end"
)
```

### Idempotency

```python
from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Create idempotency key (optional)
import uuid
idempotency_key = str(uuid.uuid4())

# Send same request multiple times - only one will be processed
payment1 = client.payments.create(
    amount=1000,
    currency="INR",
    idempotency_key=idempotency_key
)

payment2 = client.payments.create(
    amount=1000,
    currency="INR",
    idempotency_key=idempotency_key
)

# Both will return same transaction_id
assert payment1['transaction_id'] == payment2['transaction_id']
```

### Async Integration

```python
import asyncio
from onerouter import OneRouter

async def main():
    async with OneRouter(api_key="unf_live_xxx") as client:
        # Send SMS
        sms = await client.sms.send_async(
            to="+1234567890",
            body="Hello!"
        )
        print(f"SMS sent: {sms['message_id']}")

        # Send email
        email = await client.email.send_async(
            to="user@example.com",
            subject="Test",
            html_body="<h1>Test</h1>"
        )
        print(f"Email sent: {email['email_id']}")

asyncio.run(main())
```

---

## Edge Cases

### 1. Idempotency - Duplicate Requests

**Problem:** Client sends same payment request twice (e.g., user double-clicks button)

**Solution:** Always include `idempotency_key`

```python
# Bad: Multiple charges
payment1 = client.payments.create(amount=1000, currency="INR")
payment2 = client.payments.create(amount=1000, currency="INR")
# Result: Two payments created!

# Good: Only one charge
key = "unique-order-" + str(uuid.uuid4())[:8]
payment1 = client.payments.create(amount=1000, currency="INR", idempotency_key=key)
payment2 = client.payments.create(amount=1000, currency="INR", idempotency_key=key)
# Result: Both return same transaction_id
```

### 2. Invalid Phone Numbers

**Problem:** User enters invalid phone number format

**Solution:** Validate before sending

```python
import re

def validate_phone(phone: str) -> bool:
    # E.164 format: +CountryCodeNumber (e.g., +1234567890123)
    return bool(re.match(r'^\+[1-9]\d{1,14}$', phone))

# Validate before sending
phone = "+1234567890"
if not validate_phone(phone):
    print(f"Invalid phone: {phone}")
else:
    sms = client.sms.send(to=phone, body="Test")
```

### 3. Rate Limiting

**Problem:** Too many requests to SMS/Email endpoints

**Solution:** SDK handles automatically, but you can configure:

```python
client = OneRouter(
    api_key="unf_live_xxx",
    max_retries=5,  # Increase retries
    retry_delay=2   # Wait 2s before retry
)

# SDK will automatically:
# 1. Wait with exponential backoff
# 2. Retry up to max_retries times
# 3. Return error if still failing
```

### 4. Provider Service Outage

**Problem:** Twilio/Resend is down

**Solution:** Monitor errors and implement fallback

```python
try:
    sms = client.sms.send(to="+1234567890", body="Test")
except OneRouterError as e:
    if "Twilio service unavailable" in str(e):
        # Fallback to secondary provider
        print("Primary SMS provider down, try alternative")
    else:
        print(f"SMS failed: {e}")
```

### 5. Invalid Email Format

**Problem:** User enters invalid email address

**Solution:** Validate before sending

```python
import re

def validate_email(email: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))

# Validate
email = "user@example.com"
if not validate_email(email):
    print(f"Invalid email: {email}")
else:
    email_msg = client.email.send(to=email, subject="Test", html_body="<h1>Test</h1>")
```

### 6. Missing Credentials

**Problem:** User tries to send SMS/email but credentials not configured

**Solution:** Check service discovery first

```python
# Check if SMS service is configured
services = client.list_services()
twilio_configured = any(s['name'] == 'twilio' for s in services)

if not twilio_configured:
    print("Twilio not configured. Please add credentials.")
else:
    sms = client.sms.send(to="+1234567890", body="Test")
```

### 7. Invalid API Key

**Problem:** API key is expired or invalid

**Solution:** Handle authentication errors

```python
from onerouter.exceptions import AuthenticationError

try:
    sms = client.sms.send(to="+1234567890", body="Test")
except AuthenticationError as e:
    print(f"Authentication failed: {e}")
    print("Please check your API key")
    # Prompt user to re-authenticate
except OneRouterError as e:
    print(f"API error: {e}")
```

### 8. Timeout Issues

**Problem:** Network timeout or slow provider response

**Solution:** Increase timeout and implement retry logic

```python
client = OneRouter(
    api_key="unf_live_xxx",
    timeout=60  # Increase timeout to 60s
)

try:
    # Long-running operation
    sms = client.sms.send(to="+1234567890", body="Test")
except TimeoutError:
    print("Request timed out. Please try again.")
except OneRouterError as e:
    print(f"Error: {e}")
```

### 9. Subscription State Changes

**Problem:** User tries to pause/resume paused subscription

**Solution:** Check subscription state first

```python
subscription = client.subscriptions.get(subscription_id="sub_123")

if subscription['status'] == 'paused':
    print("Cannot pause: subscription already paused")
else:
    client.subscriptions.pause(subscription_id="sub_123")
```

### 10. Partial Refund Errors

**Problem:** Refund amount exceeds refundable amount

**Solution:** Check refundable amount first

```python
payment = client.payments.get(transaction_id="txn_123")
refundable_amount = payment['amount'] - payment.get('refunded_amount', 0)

try:
    refund = client.payments.refund(
        payment_id="txn_123",
        amount=refundable_amount  # Safe to refund full remaining
    )
except ValidationError as e:
    print(f"Refund error: {e}")
```

---

## Troubleshooting

### SDK Installation Issues

**Issue:** `ModuleNotFoundError: No module named 'onerouter'`

**Solution:**
```bash
# Check installation
pip list | grep onerouter

# If not installed
pip install onerouter==2.0.1

# If version mismatch
pip install --upgrade onerouter
```

### API Connection Issues

**Issue:** Connection refused or timeout

**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check correct base URL
# Verify API key is correct
# Check network connectivity
```

### Database Migration Issues

**Issue:** `relation "xxx" does not exist`

**Solution:**
```bash
# Reset migrations
cd backend
python -m alembic stamp base
python -m alembic upgrade head

# Or if production is fresh
python -m alembic stamp e7d4f554727d
```

### Environment Configuration Issues

**Issue:** "Service not configured" errors

**Solution:**
```bash
# Check environment variable
echo $ENVIRONMENT  # Should be "development" or "production"

# Check DATABASE_URL
echo $DATABASE_URL  # Should point to correct database

# Verify credentials exist in database
# Use dashboard to add provider credentials
```

### SMS Not Sending

**Issue:** SMS status always "pending"

**Solutions:**
1. Check Twilio credits are sufficient
2. Verify phone number format (E.164)
3. Check message length (max 1600 chars)
4. Verify Twilio credentials are correct
5. Check logs for Twilio API errors

```python
# Debug SMS send
sms = client.sms.send(to="+1234567890", body="Test")
print(f"Full response: {sms}")

# Check if message_id returned
if 'message_id' not in sms:
    print("SMS send failed")
else:
    # Poll for status update
    import time
    for i in range(10):  # Try 10 times
        status = client.sms.get_status(sms['message_id'])
        if status['status'] != 'pending':
            break
        time.sleep(5)  # Wait 5 seconds
```

### Email Not Sending

**Issue:** Email marked as spam or not delivered

**Solutions:**
1. Verify sender domain (DKIM, SPF, DMARC)
2. Check email content (avoid spam triggers)
3. Verify recipient email is valid
4. Check Resend credits
5. Test with plain text if HTML fails

```python
# Test plain text vs HTML
try:
    email = client.email.send(
        to="user@example.com",
        subject="Test",
        text_body="Plain text version"
    )
except Exception as e:
    print(f"Plain text failed: {e}")

try:
    email = client.email.send(
        to="user@example.com",
        subject="Test",
        html_body="<h1>HTML version</h1>"
    )
except Exception as e:
    print(f"HTML failed: {e}")
```

### Payment Not Processing

**Issue:** Payment stuck in "pending" state

**Solutions:**
1. Check payment method details
2. Verify customer exists
3. Check provider status (Razorpay/PayPal)
4. Implement webhook to receive status updates
5. Check for payment timeout

```python
# Poll for payment status
import time

payment = client.payments.get(transaction_id="txn_123")

max_wait = 300  # 5 minutes
start_time = time.time()

while payment['status'] == 'pending':
    if time.time() - start_time > max_wait:
        print("Payment timed out")
        break

    time.sleep(5)  # Wait 5 seconds
    payment = client.payments.get(transaction_id="txn_123")

    print(f"Status: {payment['status']}")
```

### Rate Limit Exceeded

**Issue:** "Rate limit exceeded" errors

**Solutions:**
1. Increase `max_retries` in client config
2. Implement backoff in your app
3. Use queue for bulk operations
4. Contact support to increase limits

```python
# Configure client for rate limits
client = OneRouter(
    api_key="unf_live_xxx",
    max_retries=5,  # More retries
    retry_delay=2,  # Wait longer between retries
)

# Implement queue in your app
from queue import Queue

sms_queue = Queue()

def send_sms(phone, message):
    try:
        sms = client.sms.send(to=phone, body=message)
        print(f"Sent: {sms['message_id']}")
    except RateLimitError as e:
        # Requeue
        sms_queue.put((phone, message))
        time.sleep(60)  # Wait 1 minute
```

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check endpoint URL |
| 422 | Validation Error | Check request format |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Check logs, try again |
| 503 | Service Unavailable | Contact support |

---

## Best Practices

### 1. Always Use Idempotency Keys
```python
import uuid

# Generate unique key for each payment
idempotency_key = f"order_{uuid.uuid4()}"
payment = client.payments.create(
    amount=1000,
    currency="INR",
    idempotency_key=idempotency_key
)
```

### 2. Implement Retry Logic
```python
from onerouter.exceptions import OneRouterError, RateLimitError

def robust_send_sms(to, body, max_retries=3):
    for attempt in range(max_retries):
        try:
            sms = client.sms.send(to=to, body=body)
            return sms
        except RateLimitError:
            if attempt < max_retries - 1:
                print(f"Rate limited, retrying... ({attempt + 1}/{max_retries})")
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
        except OneRouterError as e:
            print(f"Error: {e}")
            raise

    raise Exception("Max retries exceeded")
```

### 3. Monitor Webhooks
```python
from flask import Flask, request
import hashlib
import hmac

app = Flask(__name__)

@app.route('/webhooks/payment', methods=['POST'])
def payment_webhook():
    # Verify signature
    signature = request.headers.get('X-OneRouter-Signature')
    payload = request.data

    # Calculate expected signature
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        return "Invalid signature", 403

    # Process webhook
    print(f"Payment webhook: {payload}")
    return "OK", 200
```

### 4. Use Async for Bulk Operations
```python
import asyncio
from onerouter import OneRouter

async def send_bulk_sms(phone_numbers, message):
    async with OneRouter(api_key="unf_live_xxx") as client:
        tasks = [
            client.sms.send_async(to=phone, body=message)
            for phone in phone_numbers
        ]
        results = await asyncio.gather(*tasks)
        return results

# Usage
phones = ["+1234567890", "+1234567891", "+1234567892"]
results = asyncio.run(send_bulk_sms(phones, "Bulk message"))
```

### 5. Handle Errors Gracefully
```python
from onerouter.exceptions import (
    OneRouterError,
    AuthenticationError,
    RateLimitError,
    ValidationError
)

try:
    payment = client.payments.create(amount=1000, currency="INR")
except AuthenticationError as e:
    print(f"Auth failed: {e}")
    # Redirect to login
except RateLimitError as e:
    print(f"Rate limit: {e}")
    # Show retry countdown
    countdown = e.retry_after if hasattr(e, 'retry_after') else 60
    print(f"Retry in {countdown} seconds")
except ValidationError as e:
    print(f"Validation error: {e}")
    # Show form errors
except OneRouterError as e:
    print(f"API error: {e}")
    # Show generic error message
```

---

## Full Integration Example

```python
"""
Complete OneRouter integration example with SMS, Email, Payments, and Subscriptions
"""

from onerouter import OneRouter
from onerouter.exceptions import OneRouterError, AuthenticationError
import asyncio

# Initialize client
client = OneRouter(api_key="unf_live_xxx")

def send_communications():
    """Send SMS and email to new user"""
    # Send welcome SMS
    sms = client.sms.send(
        to="+1234567890",
        body="Welcome to OneRouter! Use code: 123456"
    )
    print(f"SMS sent: {sms['message_id']}")

    # Send welcome email
    email = client.email.send(
        to="user@example.com",
        subject="Welcome to OneRouter",
        html_body="""
            <h1>Welcome!</h1>
            <p>Your account has been created.</p>
            <p>Your verification code is: <strong>123456</strong></p>
        """
    )
    print(f"Email sent: {email['email_id']}")

def create_subscription():
    """Create subscription for user"""
    subscription = client.subscriptions.create(
        plan_id="plan_monthly_99",
        customer_id="cust_123",
        trial_days=14
    )
    print(f"Subscription created: {subscription['id']}")

    return subscription

async def async_operations():
    """Async operations example"""
    async with OneRouter(api_key="unf_live_xxx") as client:
        # Send SMS async
        sms = await client.sms.send_async(
            to="+1234567890",
            body="Async SMS"
        )
        print(f"Async SMS sent: {sms['message_id']}")

        # Send email async
        email = await client.email.send_async(
            to="user@example.com",
            subject="Async Email",
            html_body="<h1>Async</h1>"
        )
        print(f"Async email sent: {email['email_id']}")

# Main flow
try:
    print("=== Communications ===")
    send_communications()

    print("\n=== Subscription ===")
    subscription = create_subscription()

    print("\n=== Async Operations ===")
    asyncio.run(async_operations())

except AuthenticationError as e:
    print(f"\n❌ Authentication failed: {e}")
    print("Please check your API key")

except OneRouterError as e:
    print(f"\n❌ API Error: {e}")
    print(f"Status Code: {e.status_code if hasattr(e, 'status_code') else 'N/A'}")
    print(f"Message: {e.message}")
```

---

## Support

- **Documentation**: https://docs.onerouter.com
- **GitHub Issues**: https://github.com/onerouter/onerouter-python/issues
- **Email**: support@onerouter.com
- **Status Page**: https://status.onerouter.com

---

## Changelog

### v2.0.1 (Current)
- ✅ Added SMS communications support (Twilio)
- ✅ Added Email communications support (Resend)
- ✅ Added cost tracking for communications
- ✅ Added service discovery API
- ✅ Enhanced error handling
- ✅ Fixed TypeScript issues in marketplace UI
- ✅ Updated SDK documentation

### v2.0.0
- Initial release with payments and subscriptions
- Marketplace features
- Saved payment methods
- API key management

---

**Last Updated**: January 1, 2025
