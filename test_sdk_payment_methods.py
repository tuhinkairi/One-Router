#!/usr/bin/env python3
"""
Test script for Phase 1: Payment Method Enhancements
"""

import asyncio
import sys
import os
sys.path.append('.')

# Add the SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'onerouter-sdk'))

async def test_sdk_payment_methods():
    """Test the enhanced SDK payment creation with method parameters"""

    print("Testing OneRouter SDK Payment Method Enhancements...")

    # Test 1: Basic payment creation (existing functionality)
    print("\n1. Testing basic payment creation...")

    try:
        # Mock the HTTP client to capture the request data
        class MockHTTPClient:
            def __init__(self):
                self.last_request = None

            async def request(self, method, endpoint, data=None, idempotency_key=None):
                self.last_request = {
                    'method': method,
                    'endpoint': endpoint,
                    'data': data,
                    'idempotency_key': idempotency_key
                }
                return {
                    'transaction_id': 'txn_test_123',
                    'provider': 'razorpay',
                    'amount': 100.0,
                    'currency': 'INR',
                    'status': 'created'
                }

        mock_client = MockHTTPClient()

        # Import and create payments resource
        from onerouter.resources.payments import PaymentsResource
        payments = PaymentsResource(mock_client)

        # Test basic payment
        result = await payments.create(amount=100.00, currency="INR")
        assert result['transaction_id'] == 'txn_test_123'
        assert mock_client.last_request['data']['amount'] == 100.00
        assert mock_client.last_request['data']['currency'] == "INR"
        print("   [PASS] Basic payment creation works")

        # Test 2: Payment with UPI method
        print("\n2. Testing UPI payment creation...")
        result = await payments.create(
            amount=500.00,
            currency="INR",
            method="upi",
            upi_app="gpay"
        )

        request_data = mock_client.last_request['data']
        assert request_data['method'] == "upi"
        assert request_data['upi_app'] == "gpay"
        assert request_data['amount'] == 500.00
        print("   [PASS] UPI payment parameters work")

        # Test 3: Payment with card method and EMI
        print("\n3. Testing card payment with EMI...")
        result = await payments.create(
            amount=10000.00,
            currency="INR",
            method="card",
            emi_plan="6_months",
            card_network="visa"
        )

        request_data = mock_client.last_request['data']
        assert request_data['method'] == "card"
        assert request_data['emi_plan'] == "6_months"
        assert request_data['card_network'] == "visa"
        print("   [PASS] Card payment with EMI works")

        # Test 4: Payment with wallet
        print("\n4. Testing wallet payment...")
        result = await payments.create(
            amount=200.00,
            currency="INR",
            method="wallet",
            wallet_provider="paytm"
        )

        request_data = mock_client.last_request['data']
        assert request_data['method'] == "wallet"
        assert request_data['wallet_provider'] == "paytm"
        print("   [PASS] Wallet payment works")

        # Test 5: Net banking
        print("\n5. Testing net banking...")
        result = await payments.create(
            amount=1500.00,
            currency="INR",
            method="netbanking",
            bank_code="HDFC"
        )

        request_data = mock_client.last_request['data']
        assert request_data['method'] == "netbanking"
        assert request_data['bank_code'] == "HDFC"
        print("   [PASS] Net banking payment works")

        # Test 6: Provider forcing
        print("\n6. Testing provider forcing...")
        result = await payments.create(
            amount=300.00,
            currency="USD",
            provider="paypal",
            method="card"
        )

        request_data = mock_client.last_request['data']
        assert request_data['provider'] == "paypal"
        assert request_data['method'] == "card"
        assert request_data['currency'] == "USD"
        print("   [PASS] Provider forcing works")

        print("\n[SUCCESS] All SDK payment method tests passed!")
        return True

    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_sdk_payment_methods())
    sys.exit(0 if success else 1)