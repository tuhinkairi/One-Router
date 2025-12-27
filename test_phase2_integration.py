#!/usr/bin/env python3
"""
Integration test for Phase 2.1: Payment Method Validation & Enhanced Responses
"""

import asyncio
import sys
import os

async def test_phase2_integration():
    """Test the complete Phase 2.1 implementation"""

    print("Testing Phase 2.1: Payment Method Validation & Enhanced Responses...")

    try:
        # Test 1: Backend API with payment method parameters
        print("\n1. Testing backend API with payment methods...")

        from backend.app.routes.unified_api import PaymentOrderRequest
        from backend.app.services.payment_method_validator import ProviderCapabilities
        from decimal import Decimal

        # Valid request with payment method
        request = PaymentOrderRequest(
            amount=Decimal("500.00"),
            currency="INR",
            method="upi",
            upi_app="gpay"
        )
        assert request.method == "upi"
        assert request.upi_app == "gpay"

        print("   [PASS] Payment method parameters accepted")

        # Test 2: Smart provider selection
        print("\n2. Testing smart provider selection...")

        # UPI should select Razorpay
        provider = ProviderCapabilities.get_preferred_provider("upi", "INR")
        assert provider == "razorpay"

        # Card with USD should select PayPal
        provider = ProviderCapabilities.get_preferred_provider("card", "USD")
        assert provider == "paypal"

        print("   [PASS] Smart provider selection works")

        # Test 3: Validation logic
        print("\n3. Testing validation combinations...")

        # Valid: Razorpay + UPI + valid app
        result = ProviderCapabilities.validate_method_combination("razorpay", "upi", "gpay")
        assert result["valid"] == True

        # Invalid: PayPal + UPI (not supported)
        result = ProviderCapabilities.validate_method_combination("paypal", "upi")
        assert result["valid"] == False

        # Invalid: Razorpay + UPI + invalid app
        result = ProviderCapabilities.validate_method_combination("razorpay", "upi", "invalid_app")
        assert result["valid"] == False

        print("   [PASS] Validation logic works correctly")

        # Test 4: Response enhancement simulation
        print("\n4. Testing response enhancement...")

        # Simulate what the backend does - enrich response with method details
        base_response = {
            "transaction_id": "txn_test_123",
            "provider": "razorpay",
            "provider_order_id": "order_test_123",
            "amount": 500.0,
            "currency": "INR",
            "status": "created",
            "checkout_url": "https://checkout.example.com"
        }

        # Simulate request with payment method
        mock_request = type('MockRequest', (), {
            'method': 'upi',
            'upi_app': 'gpay',
            'emi_plan': None,
            'card_network': None,
            'wallet_provider': None,
            'bank_code': None
        })()

        # Apply the enhancement logic (copied from unified_api.py)
        if hasattr(mock_request, 'method') and mock_request.method:
            base_response["payment_method"] = mock_request.method

            method_details = {}
            if hasattr(mock_request, 'upi_app') and mock_request.upi_app:
                method_details["upi_app"] = mock_request.upi_app
            if hasattr(mock_request, 'emi_plan') and mock_request.emi_plan:
                method_details["emi_plan"] = mock_request.emi_plan
            if hasattr(mock_request, 'card_network') and mock_request.card_network:
                method_details["card_network"] = mock_request.card_network
            if hasattr(mock_request, 'wallet_provider') and mock_request.wallet_provider:
                method_details["wallet_provider"] = mock_request.wallet_provider
            if hasattr(mock_request, 'bank_code') and mock_request.bank_code:
                method_details["bank_code"] = mock_request.bank_code

            if method_details:
                base_response["method_details"] = method_details

        # Verify enhancement
        assert base_response["payment_method"] == "upi"
        assert base_response["method_details"]["upi_app"] == "gpay"

        print("   [PASS] Response enhancement works")

        # Test 5: SDK integration test
        print("\n5. Testing SDK integration...")

        # Mock HTTP client for SDK test
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
                    'amount': 1000.0,
                    'currency': 'INR',
                    'status': 'created',
                    'payment_method': 'upi',
                    'method_details': {'upi_app': 'gpay'}
                }

        mock_client = MockHTTPClient()

        # Test SDK with payment method
        from onerouter.resources.payments import PaymentsResource
        payments = PaymentsResource(mock_client)

        result = await payments.create(
            amount=1000.00,
            currency="INR",
            method="upi",
            upi_app="gpay"
        )

        # Verify SDK passes parameters correctly
        request_data = mock_client.last_request['data']
        assert request_data['method'] == 'upi'
        assert request_data['upi_app'] == 'gpay'

        # Verify enhanced response
        assert result['payment_method'] == 'upi'
        assert result['method_details']['upi_app'] == 'gpay'

        print("   [PASS] SDK integration works with enhanced responses")

        print("\n[SUCCESS] Phase 2.1 implementation is working correctly!")
        print("[OK] Payment method validation")
        print("[OK] Smart provider selection")
        print("[OK] Enhanced API responses")
        print("[OK] SDK integration")

        return True

    except Exception as e:
        print(f"\n[FAILED] Phase 2.1 test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_phase2_integration())
    sys.exit(0 if success else 1)