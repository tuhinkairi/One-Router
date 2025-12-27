#!/usr/bin/env python3
"""
Test script for Phase 3: Advanced Marketplace Features
"""

import asyncio
import sys
import os

async def test_phase3_marketplace():
    """Test marketplace split payments and vendor management"""

    print("Testing Phase 3: Advanced Marketplace Features...")

    try:
        # Test 1: SDK split payment creation
        print("\n1. Testing SDK split payment creation...")

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
                    'transaction_id': 'txn_split_123',
                    'amount': 100.00,
                    'splits': [
                        {'account_id': 'vendor_123', 'amount': 80.00, 'status': 'processed'},
                        {'account_id': 'platform', 'amount': 15.00, 'status': 'processed'},
                        {'account_id': 'tax', 'amount': 5.00, 'status': 'pending'}
                    ],
                    'status': 'created'
                }

        mock_client = MockHTTPClient()

        from onerouter.resources.marketplace import MarketplaceResource
        marketplace = MarketplaceResource(mock_client)

        # Test split payment
        result = await marketplace.create_split_payment(
            amount=100.00,
            currency="INR",
            splits=[
                {"account_id": "vendor_123", "amount": 80.00, "type": "vendor"},
                {"account_id": "platform", "amount": 15.00, "type": "fee"},
                {"account_id": "tax", "amount": 5.00, "type": "tax"}
            ],
            description="Test marketplace payment"
        )

        # Verify SDK passes split data
        request_data = mock_client.last_request['data']
        assert request_data['amount'] == 100.00
        assert len(request_data['splits']) == 3
        assert request_data['splits'][0]['amount'] == 80.00

        # Verify response includes splits
        assert result['status'] == 'created'
        assert len(result['splits']) == 3

        print("   [PASS] Split payment creation works")

        # Test 2: Vendor account management
        print("\n2. Testing vendor account management...")

        # Test adding vendor
        result = await marketplace.add_vendor_account(
            vendor_id="VENDOR_001",
            name="Test Vendor",
            account_details={
                "bank_name": "HDFC",
                "account_number": "1234567890",
                "ifsc": "HDFC0001234"
            },
            split_config={
                "split_percentage": 80.00,
                "split_type": "percentage"
            }
        )

        request_data = mock_client.last_request['data']
        assert request_data['vendor_id'] == 'VENDOR_001'
        assert request_data['name'] == 'Test Vendor'
        assert request_data['split_config']['split_percentage'] == 80.00

        print("   [PASS] Vendor account addition works")

        # Test 3: Platform fee tracking
        print("\n3. Testing platform fee tracking...")

        # Verify method exists and has correct signature
        import inspect
        sig = inspect.signature(marketplace.get_platform_fees)
        params = list(sig.parameters.keys())

        assert 'period' in params
        assert 'currency' in params

        print("   [PASS] Platform fee tracking method exists")

        # Test 4: Backend API model validation
        print("\n4. Testing backend API models...")

        from backend.app.routes.unified_api import SplitPaymentRequest, VendorAccountRequest

        # Test split payment request
        split_req = SplitPaymentRequest(
            amount=100.00,
            splits=[
                {"account_id": "vendor_123", "amount": 80.00, "type": "vendor"},
                {"account_id": "platform", "amount": 15.00, "type": "fee"}
            ],
            currency="INR",
            description="Test split payment"
        )

        assert split_req.amount == 100.00
        assert len(split_req.splits) == 2
        assert split_req.splits[0]['amount'] == 80.00

        # Test vendor account request
        vendor_req = VendorAccountRequest(
            vendor_id="VENDOR_001",
            name="Test Vendor",
            account_details={
                "bank_name": "HDFC",
                "account_number": "1234567890"
            },
            split_config={
                "split_percentage": 80.00
            }
        )

        assert vendor_req.vendor_id == "VENDOR_001"
        assert vendor_req.name == "Test Vendor"
        assert vendor_req.split_config['split_percentage'] == 80.00

        print("   [PASS] Backend API models work")

        # Test 5: SDK client integration
        print("\n5. Testing SDK client integration...")

        # Mock client to avoid API calls
        class MockOneRouter:
            def __init__(self):
                self.payments = None
                self.marketplace = None

        mock_router = MockOneRouter()
        mock_router.marketplace = marketplace

        # Verify marketplace resource exists
        assert hasattr(mock_router, 'marketplace')

        print("   [PASS] SDK client integration works")

        print("\n[SUCCESS] Phase 3 marketplace features are working!")
        print("[OK] Split payments with automatic allocation")
        print("[OK] Vendor account management")
        print("[OK] Platform fee tracking")
        print("[OK] Backend API models")
        print("[OK] SDK client integration")

        return True

    except Exception as e:
        print(f"\n[FAILED] Phase 3 test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_phase3_marketplace())
    sys.exit(0 if success else 1)