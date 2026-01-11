#!/usr/bin/env python3
"""
Test script for Enhanced Credential Fallback System
Tests cross-environment fallback and auto-provisioning from environment variables
"""

import sys
import os
sys.path.insert(0, 'backend')

from app.services.get_env_credentials import (
    get_credentials_from_env,
    get_available_env_services,
    get_env_service_status,
    SERVICE_ENV_PATTERNS
)

def test_get_credentials_from_env():
    """Test retrieving credentials from environment variables"""
    print("Testing get_credentials_from_env...")
    
    # Test with missing environment variables
    result = get_credentials_from_env("razorpay")
    print(f"  Razorpay (no env vars): {result}")
    assert result is None, "Should return None when env vars not set"
    
    # Set environment variables for testing
    os.environ["RAZORPAY_KEY_ID"] = "test_key_id"
    os.environ["RAZORPAY_KEY_SECRET"] = "test_key_secret"
    
    # Test with environment variables set
    result = get_credentials_from_env("razorpay")
    print(f"  Razorpay (with env vars): {result}")
    assert result is not None, "Should return credentials when env vars are set"
    assert result["RAZORPAY_KEY_ID"] == "test_key_id"
    assert result["RAZORPAY_KEY_SECRET"] == "test_key_secret"
    
    # Clean up
    del os.environ["RAZORPAY_KEY_ID"]
    del os.environ["RAZORPAY_KEY_SECRET"]
    
    print("  get_credentials_from_env tests passed!")

def test_get_available_env_services():
    """Test getting list of services with environment variables"""
    print("Testing get_available_env_services...")
    
    # Initially no services should be available
    available = get_available_env_services()
    print(f"  Available (no vars): {available}")
    assert len(available) == 0, "Should have no available services"
    
    # Set environment variables
    os.environ["PAYPAL_CLIENT_ID"] = "test_client_id"
    os.environ["PAYPAL_CLIENT_SECRET"] = "test_client_secret"
    
    # Now PayPal should be available
    available = get_available_env_services()
    print(f"  Available (with paypal): {available}")
    assert "paypal" in available, "PayPal should be available"
    
    # Clean up
    del os.environ["PAYPAL_CLIENT_ID"]
    del os.environ["PAYPAL_CLIENT_SECRET"]
    
    print("  get_available_env_services tests passed!")

def test_get_env_service_status():
    """Test getting status of all services"""
    print("Testing get_env_service_status...")
    
    # Clear all environment variables first
    for pattern in SERVICE_ENV_PATTERNS.values():
        for var in pattern["required"]:
            if var in os.environ:
                del os.environ[var]
    
    # Get status
    status = get_env_service_status()
    print(f"  Status keys: {list(status.keys())}")
    
    # Razorpay should show as not available with missing required vars
    assert "razorpay" in status
    assert status["razorpay"]["available"] == False
    assert "RAZORPAY_KEY_ID" in status["razorpay"]["missing_required"]
    assert "RAZORPAY_KEY_SECRET" in status["razorpay"]["missing_required"]
    
    # Set environment variables
    os.environ["RAZORPAY_KEY_ID"] = "test_key_id"
    os.environ["RAZORPAY_KEY_SECRET"] = "test_key_secret"
    
    # Now razorpay should be available
    status = get_env_service_status()
    print(f"  Razorpay status (with vars): {status['razorpay']}")
    assert status["razorpay"]["available"] == True
    assert len(status["razorpay"]["missing_required"]) == 0
    
    # Clean up
    del os.environ["RAZORPAY_KEY_ID"]
    del os.environ["RAZORPAY_KEY_SECRET"]
    
    print("  get_env_service_status tests passed!")

def test_service_env_patterns():
    """Test that all expected services have patterns defined"""
    print("Testing SERVICE_ENV_PATTERNS...")
    
    expected_services = ["razorpay", "paypal", "twilio", "aws_s3"]
    for service in expected_services:
        assert service in SERVICE_ENV_PATTERNS, f"{service} should be in patterns"
        pattern = SERVICE_ENV_PATTERNS[service]
        assert len(pattern["required"]) > 0, f"{service} should have required fields"
        print(f"  {service}: required={pattern['required']}")
    
    print("  SERVICE_ENV_PATTERNS tests passed!")

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Enhanced Credential Fallback System Tests")
    print("=" * 60)
    print()
    
    try:
        test_service_env_patterns()
        print()
        test_get_credentials_from_env()
        print()
        test_get_available_env_services()
        print()
        test_get_env_service_status()
        print()
        
        print("=" * 60)
        print("All tests passed!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
