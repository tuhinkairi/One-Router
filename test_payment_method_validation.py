#!/usr/bin/env python3
"""
Test script for Phase 2.1: Payment Method Validation & Selection
"""

import asyncio
import sys
import os

async def test_payment_method_validation():
    """Test payment method validation and smart provider selection"""

    print("Testing Payment Method Validation & Smart Selection...")

    try:
        # Import the validator
        from backend.app.services.payment_method_validator import ProviderCapabilities, PaymentMethod

        # Test 1: Method support checking
        print("\n1. Testing method support validation...")

        # Razorpay should support UPI
        assert ProviderCapabilities.is_method_supported("razorpay", "upi") == True
        assert ProviderCapabilities.is_method_supported("paypal", "upi") == False

        # PayPal should support Venmo
        assert ProviderCapabilities.is_method_supported("razorpay", "venmo") == False
        assert ProviderCapabilities.is_method_supported("paypal", "venmo") == True

        # Both should support cards
        assert ProviderCapabilities.is_method_supported("razorpay", "card") == True
        assert ProviderCapabilities.is_method_supported("paypal", "card") == True

        print("   [PASS] Method support validation works")

        # Test 2: UPI app validation
        print("\n2. Testing UPI app validation...")

        assert ProviderCapabilities.validate_upi_app("gpay") == True
        assert ProviderCapabilities.validate_upi_app("phonepe") == True
        assert ProviderCapabilities.validate_upi_app("invalid_app") == False

        print("   [PASS] UPI app validation works")

        # Test 3: Card network validation
        print("\n3. Testing card network validation...")

        assert ProviderCapabilities.validate_card_network("visa") == True
        assert ProviderCapabilities.validate_card_network("mastercard") == True
        assert ProviderCapabilities.validate_card_network("invalid_network") == False

        print("   [PASS] Card network validation works")

        # Test 4: Smart provider selection
        print("\n4. Testing smart provider selection...")

        # UPI should prefer Razorpay
        assert ProviderCapabilities.get_preferred_provider("upi", "INR") == "razorpay"

        # Venmo should prefer PayPal
        assert ProviderCapabilities.get_preferred_provider("venmo", "USD") == "paypal"

        # Cards should work for both currencies
        assert ProviderCapabilities.get_preferred_provider("card", "INR") == "razorpay"
        assert ProviderCapabilities.get_preferred_provider("card", "USD") == "paypal"

        print("   [PASS] Smart provider selection works")

        # Test 5: Method combination validation
        print("\n5. Testing method combination validation...")

        # Valid combination
        result = ProviderCapabilities.validate_method_combination("razorpay", "upi", "gpay")
        assert result["valid"] == True

        # Invalid method for provider
        result = ProviderCapabilities.validate_method_combination("paypal", "upi")
        assert result["valid"] == False
        assert "not supported" in result["errors"][0]

        # Invalid UPI app
        result = ProviderCapabilities.validate_method_combination("razorpay", "upi", "invalid_app")
        assert result["valid"] == False
        assert "UPI app" in result["errors"][0]

        print("   [PASS] Method combination validation works")

        print("\n[SUCCESS] All payment method validation tests passed!")
        return True

    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_payment_method_validation())
    sys.exit(0 if success else 1)