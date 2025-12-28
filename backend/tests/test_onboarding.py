#!/usr/bin/env python3
"""
Tests for OneRouter Onboarding System
"""

import asyncio
import sys
import os
sys.path.append('.')

from app.services.env_parser import EnvParserService
from app.services.credential_manager import CredentialManager

def test_env_parser():
    """Test the EnvParserService"""
    print("Testing EnvParserService...")

    parser = EnvParserService()

    # Test .env content
    env_content = """
    # Payment services
    RAZORPAY_KEY_ID=rzp_test_123
    RAZORPAY_KEY_SECRET=secret_123

    PAYPAL_CLIENT_ID=paypal_123
    PAYPAL_CLIENT_SECRET=paypal_secret

    STRIPE_SECRET_KEY=sk_test_123

    # Communication
    TWILIO_ACCOUNT_SID=AC123
    TWILIO_AUTH_TOKEN=auth_123
    TWILIO_PHONE_NUMBER=+1234567890

    # Cloud storage
    AWS_ACCESS_KEY_ID=AKIA123
    AWS_SECRET_ACCESS_KEY=secret_aws
    AWS_REGION=us-east-1
    AWS_S3_BUCKET=my-bucket

    # Random variables
    NODE_ENV=development
    PORT=3000
    """

    # Parse the content
    env_vars = parser.parse_env_content(env_content)
    print(f"  Parsed {len(env_vars)} variables")

    # Detect services
    detections = parser.detect_services(env_vars)
    print(f"  Detected {len(detections)} services")

    # Verify detections
    expected_services = {'razorpay', 'paypal', 'twilio', 'aws_s3'}
    detected_services = {d.service_name for d in detections}

    assert expected_services.issubset(detected_services), f"Missing services: {expected_services - detected_services}"
    print("  All expected services detected")

    # Check confidence levels
    for detection in detections:
        assert detection.confidence > 0, f"Low confidence for {detection.service_name}"
        assert len(detection.detected_keys) > 0, f"No keys detected for {detection.service_name}"
        print(f"    - {detection.service_name}: {detection.confidence:.1%} confidence")

    print("  EnvParserService tests passed!\n")

def test_credential_manager():
    """Test the CredentialManager"""
    print("Testing CredentialManager...")

    manager = CredentialManager()

    # Test credentials
    test_creds = {
        "RAZORPAY_KEY_ID": "rzp_test_123",
        "RAZORPAY_KEY_SECRET": "secret_123"
    }

    # Test encryption/decryption
    encrypted = manager.encrypt_credentials(test_creds)
    decrypted = manager.decrypt_credentials(encrypted)

    assert decrypted == test_creds, "Encryption/decryption failed"
    print("  Encryption/decryption works")

    # Test validation
    errors = manager.validate_credentials_format("razorpay", test_creds)
    assert len(errors) == 0, f"Validation failed: {errors}"
    print("  Credential validation works")

    # Test invalid credentials
    invalid_creds = {"RAZORPAY_KEY_ID": "test"}  # Missing secret
    errors = manager.validate_credentials_format("razorpay", invalid_creds)
    assert "RAZORPAY_KEY_SECRET" in errors, "Should detect missing secret"
    print("  Invalid credential detection works")

    print("  CredentialManager tests passed!\n")

def run_all_tests():
    """Run all tests"""
    print("Running OneRouter Onboarding Tests\n")

    try:
        # Run sync tests
        test_env_parser()
        test_credential_manager()

        print("All tests passed! Onboarding system is working correctly.")
        return True

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)