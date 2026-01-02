import requests

API_KEY = "unf_test_M"  # Using the test key from logs
BASE_URL = "http://localhost:8000"

def test_health():
    """Test 1: Health check"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if response.status_code == 200:
            print("Health check passed")
            return True
        else:
            print(f"Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"Health check error: {e}")
        return False

def test_payment():
    """Test 2: Create payment"""
    try:
        response = requests.post(
            f"{BASE_URL}/v1/payments/orders",
            headers={
                "X-Platform-Key": API_KEY,  # Using X-Platform-Key header
                "Content-Type": "application/json"
            },
            json={
                "amount": 100.00,
                "currency": "INR",
                "receipt": "test_001"
            },
            timeout=30
        )

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            print("Payment creation passed")
            return True
        else:
            print(f"Payment creation failed: {response.status_code}")
            return False

    except Exception as e:
        print(f"Payment creation error: {e}")
        return False

if __name__ == "__main__":
    print("Testing OneRouter Integration...")

    health_ok = test_health()
    payment_ok = test_payment()

    if health_ok and payment_ok:
        print("\nAll tests passed!")
    else:
        print("\nSome tests failed - check backend logs")