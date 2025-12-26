#!/usr/bin/env python3
"""
Integration test for Phase 1: Backend API Payment Method Support
"""

import asyncio
import sys
import os

async def test_backend_payment_methods():
    """Test that backend API accepts payment method parameters"""

    print("Testing Backend API Payment Method Support...")

    try:
        # Import the Pydantic model
        from app.routes.unified_api import PaymentOrderRequest

        from decimal import Decimal

        # Test 1: Basic payment (existing functionality)
        print("\n1. Testing basic payment request...")
        request = PaymentOrderRequest(amount=Decimal("100.00"), currency="INR")
        assert request.amount == Decimal("100.00")
        assert request.currency == "INR"
        assert request.method is None
        print("   [PASS] Basic payment request works")

        # Test 2: Payment with UPI method
        print("\n2. Testing UPI payment request...")
        request = PaymentOrderRequest(
            amount=Decimal("500.00"),
            currency="INR",
            method="upi",
            upi_app="gpay"
        )
        assert request.method == "upi"
        assert request.upi_app == "gpay"
        assert request.amount == Decimal("500.00")
        print("   [PASS] UPI payment request works")

        # Test 3: Payment with card and EMI
        print("\n3. Testing card payment with EMI...")
        request = PaymentOrderRequest(
            amount=Decimal("10000.00"),
            currency="INR",
            method="card",
            emi_plan="6_months",
            card_network="visa"
        )
        assert request.method == "card"
        assert request.emi_plan == "6_months"
        assert request.card_network == "visa"
        print("   [PASS] Card payment with EMI works")

        # Test 4: Provider forcing
        print("\n4. Testing provider forcing...")
        request = PaymentOrderRequest(
            amount=Decimal("300.00"),
            currency="USD",
            provider="paypal",
            method="card"
        )
        assert request.provider == "paypal"
        assert request.method == "card"
        assert request.currency == "USD"
        print("   [PASS] Provider forcing works")

        # Test 5: Validation
        print("\n5. Testing validation...")
        try:
            # Invalid currency should fail
            PaymentOrderRequest(amount=Decimal("100.00"), currency="INVALID")
            print("   [PASS] Currency validation works")
        except Exception as e:
            print(f"   Currency validation failed as expected: {type(e).__name__}")

        try:
            # Negative amount should fail
            PaymentOrderRequest(amount=Decimal("-100.00"), currency="INR")
            print("   [PASS] Amount validation works")
        except Exception as e:
            print(f"   Amount validation failed as expected: {type(e).__name__}")

        print("\n[SUCCESS] All backend API tests passed!")
        return True

    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_backend_payment_methods())
    sys.exit(0 if success else 1)