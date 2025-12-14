import jwt
import json
from datetime import datetime, timedelta

# Create a test Clerk-like JWT token
payload = {
    "sub": "user_123",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "iat": int(datetime.utcnow().timestamp()),
    "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
    "iss": "https://clerk.example.com"
}

# Create token without signature (since we're in dev mode, signature won't be verified)
token = jwt.encode(payload, "secret", algorithm="HS256")
print("Test JWT Token:")
print(token)
print("\nDecoded (no verification):")
decoded = jwt.decode(token, options={"verify_signature": False})
print(json.dumps(decoded, indent=2, default=str))
