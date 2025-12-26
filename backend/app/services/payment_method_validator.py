"""
Payment Method Capabilities and Validation

Defines which payment methods are supported by each provider
and provides validation logic for payment method requests.
"""

from typing import Dict, List, Set, Optional, Any
from enum import Enum


class PaymentMethod(str, Enum):
    """Supported payment methods across all providers"""
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"
    WALLET = "wallet"
    PAYPAL = "paypal"  # PayPal's own wallet
    VENMO = "venmo"    # US digital wallet
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    PAY_LATER = "pay_later"
    EMI = "emi"        # EMI payments (subset of card)


class ProviderCapabilities:
    """Payment method capabilities for each provider"""

    # Razorpay capabilities (India-focused)
    RAZORPAY_METHODS = {
        PaymentMethod.UPI,
        PaymentMethod.CARD,
        PaymentMethod.NETBANKING,
        PaymentMethod.WALLET,
        PaymentMethod.EMI,  # Through card payments
    }

    # PayPal capabilities (Global)
    PAYPAL_METHODS = {
        PaymentMethod.CARD,
        PaymentMethod.PAYPAL,
        PaymentMethod.VENMO,      # US only
        PaymentMethod.APPLE_PAY,
        PaymentMethod.GOOGLE_PAY,
        PaymentMethod.PAY_LATER,  # BNPL
    }

    # UPI app support (Razorpay)
    RAZORPAY_UPI_APPS = {
        "gpay", "phonepe", "paytm", "bhim", "amazonpay",
        "ola", "mobikwik", "jiomoney", "freecharge"
    }

    # Card networks
    SUPPORTED_CARD_NETWORKS = {
        "visa", "mastercard", "amex", "discover", "rupay"
    }

    # Wallet providers by region
    WALLET_PROVIDERS = {
        "india": {"paytm", "mobikwik", "ola", "jiomoney", "freecharge", "amazonpay"},
        "global": {"paypal", "venmo"}  # PayPal handles these separately
    }

    @classmethod
    def get_supported_methods(cls, provider: str) -> Set[PaymentMethod]:
        """Get all payment methods supported by a provider"""
        provider = provider.lower()
        if provider == "razorpay":
            return cls.RAZORPAY_METHODS
        elif provider == "paypal":
            return cls.PAYPAL_METHODS
        else:
            return set()

    @classmethod
    def is_method_supported(cls, provider: str, method: str) -> bool:
        """Check if a payment method is supported by a provider"""
        supported_methods = cls.get_supported_methods(provider)
        try:
            payment_method = PaymentMethod(method.lower())
            return payment_method in supported_methods
        except ValueError:
            return False

    @classmethod
    def validate_upi_app(cls, upi_app: str) -> bool:
        """Validate UPI app name"""
        return upi_app.lower() in cls.RAZORPAY_UPI_APPS

    @classmethod
    def validate_card_network(cls, network: str) -> bool:
        """Validate card network"""
        return network.lower() in cls.SUPPORTED_CARD_NETWORKS

    @classmethod
    def get_preferred_provider(cls, method: str, currency: str = "INR") -> Optional[str]:
        """
        Get preferred provider for a payment method and currency

        Args:
            method: Payment method requested
            currency: Transaction currency

        Returns:
            Preferred provider name or None
        """
        method = method.lower()

        # Currency-based preferences
        if currency == "INR":
            # India - prefer Razorpay for local methods
            if method in ["upi", "netbanking", "wallet"]:
                return "razorpay"
        elif currency in ["USD", "EUR", "GBP"]:
            # International - prefer PayPal
            if method in ["card", "paypal", "apple_pay", "google_pay", "pay_later"]:
                return "paypal"

        # Method-based preferences
        if method == "upi":
            return "razorpay"  # Only Razorpay supports UPI
        elif method in ["venmo", "pay_later"]:
            return "paypal"  # PayPal-specific features
        elif method in ["apple_pay", "google_pay"]:
            return "paypal"  # PayPal has better global support

        # Default to Razorpay for India, PayPal for others
        return "razorpay" if currency == "INR" else "paypal"

    @classmethod
    def validate_method_combination(cls, provider: str, method: str,
                                  upi_app: Optional[str] = None,
                                  card_network: Optional[str] = None,
                                  wallet_provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate payment method combination and return validation result

        Returns:
            Dict with 'valid': bool and optional 'error': str
        """
        errors = []

        # Check if method is supported by provider
        if not cls.is_method_supported(provider, method):
            errors.append(f"Payment method '{method}' is not supported by {provider}")

        # Provider-specific validations
        if provider.lower() == "razorpay":
            if method == "upi" and upi_app and not cls.validate_upi_app(upi_app):
                errors.append(f"UPI app '{upi_app}' is not supported")

            if card_network and not cls.validate_card_network(card_network):
                errors.append(f"Card network '{card_network}' is not supported")

        elif provider.lower() == "paypal":
            # PayPal validations can be added here
            pass

        return {
            "valid": len(errors) == 0,
            "errors": errors
        }