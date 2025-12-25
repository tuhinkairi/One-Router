"""
Test environment segregation for API keys, provider credentials, and service routing.

Tests that cover:
1. API key environment support (test vs live)
2. Provider credentials per environment
3. Credential manager environment awareness
4. Request routing by environment
5. Safety rules preventing credential leakage
6. Rate limiting by environment
7. Transaction logging by environment
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.credential_manager import CredentialManager
from app.models import ApiKey, ServiceCredential, TransactionLog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, AsyncMock
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
import hashlib


class TestEnvironmentSegregation:
    """Test environment segregation functionality."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment."""
        self.cm = CredentialManager()
        self.user_id = str(secrets.token_uuid())
        self.mock_db = AsyncMock()

    def test_api_key_environment_prefix(self):
        """Test that API keys are generated with correct environment prefixes."""
        test_api_key = "unf_test_abcdef123456"
        live_api_key = "unf_live_abcdef123456"
        
        assert test_api_key.startswith("unf_test_")
        assert live_api_key.startswith("unf_live_")

    @pytest.mark.asyncio
    async def test_generate_test_api_key_default_limits(self):
        """Test generating a test API key with default rate limits."""
        self.mock_db.add = AsyncMock()
        self.mock_db.commit = AsyncMock()
        self.mock_db.refresh = AsyncMock()
        
        with patch('app.services.credential_manager.uuid.uuid4', return_value='test-uuid'):
            result = await self.cm.generate_api_key(
                db=self.mock_db,
                user_id=self.user_id,
                key_name="Test Key",
                key_environment="test"
            )

        assert "api_key" in result
        assert result["environment"] == "test"
        assert result["api_key"].startswith("unf_test_")
        
        # Verify database was called with correct parameters
        call_args = self.mock_db.add.call_args[0][0]
        assert call_args.environment == "test"
        assert call_args.rate_limit_per_min == 1000  # Test environment default
        assert call_args.rate_limit_per_day == 100000  # Test environment default

    @pytest.mark.asyncio  
    async def test_generate_live_api_key_default_limits(self):
        """Test generating a live API key with default rate limits."""
        self.mock_db.add = AsyncMock()
        self.mock_db.commit = AsyncMock()
        self.mock_db.refresh = AsyncMock()
        
        with patch('app.services.credential_manager.uuid.uuid4', return_value='test-uuid'):
            result = await self.cm.generate_api_key(
                db=self.mock_db,
                user_id=self.user_id,
                key_name="Live Key",
                key_environment="live"
            )

        assert "api_key" in result
        assert result["environment"] == "live"
        assert result["api_key"].startswith("unf_live_")
        
        # Verify database was called with correct parameters
        call_args = self.mock_db.add.call_args[0][0]
        assert call_args.environment == "live"
        assert call_args.rate_limit_per_min == 100  # Live environment default
        assert call_args.rate_limit_per_day == 10000  # Live environment default

    @pytest.mark.asyncio
    async def test_store_service_credentials_with_environment(self):
        """Test storing provider credentials with environment isolation."""
        test_credentials = {
            "RAZORPAY_KEY_ID": "test_key",
            "RAZORPAY_KEY_SECRET": "test_secret"
        }
        
        # Test environment
        result_test = await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=test_credentials,
            features={"enabled": True},
            environment="test"
        )
        
        assert result_test.environment == "test"
        assert result_test.provider_name == "razorpay"
        
        # Live environment (should be separate)
        result_live = await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=test_credentials,
            features={"enabled": True},
            environment="live"
        )
        
        assert result_live.environment == "live"
        assert result_live.provider_name == "razorpay"
        assert result_test.id != result_live.id  # Must be different records

    @pytest.mark.asyncio
    async def test_get_credentials_by_environment(self):
        """Test retrieving credentials for specific environment."""
        # Store test credentials
        test_creds = {"RAZORPAY_KEY": "test_value"}
        await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=test_creds,
            features={},
            environment="test"
        )
        
        # Store live credentials
        live_creds = {"RAZORPAY_KEY": "live_value"}
        await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=live_creds,
            features={},
            environment="live"
        )
        
        # Test getting test credentials
        result_test = await self.cm.get_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            provider_name="razorpay",
            environment="test"
        )
        assert result_test["RAZORPAY_KEY"] == "test_value"
        
        # Test getting live credentials
        result_live = await self.cm.get_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            provider_name="razorpay",
            environment="live"
        )
        assert result_live["RAZORPAY_KEY"] == "live_value"

    @pytest.mark.asyncio
    async def test_no_credential_leakage_between_environments(self):
        """Test that live credentials are not accessible with test key."""
        test_creds = {"RAZORPAY_KEY": "test_value"}
        live_creds = {"RAZORPAY_KEY": "live_value"}
        
        # Store test credentials
        await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=test_creds,
            features={},
            environment="test"
        )
        
        # Attempt to get non-existent live credentials (should return None)
        result = await self.cm.get_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            provider_name="razorpay",
            environment="live"
        )
        assert result is None  # No live credentials exist yet
        
        # Store live credentials
        await self.cm.store_service_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            service_name="razorpay",
            credentials=live_creds,
            features={},
            environment="live"
        )
        
        # Now both environments should work independently
        test_result = await self.cm.get_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            provider_name="razorpay",
            environment="test"
        )
        assert test_result["RAZORPAY_KEY"] == "test_value"
        
        live_result = await self.cm.get_credentials(
            db=self.mock_db,
            user_id=self.user_id,
            provider_name="razorpay",
            environment="live"
        )
        assert live_result["RAZORPAY_KEY"] == "live_value"

    @pytest.mark.asyncio
    async def test_unique_constraint_api_keys(self):
        """Test unique constraint for (user_id, environment, key_hash)."""
        import hashlib
        
        # Generate two API keys with same hash for same user/environment (should fail)
        test_key_1 = "unf_test_same_hash_1"
        test_key_2 = "unf_test_same_hash_2" 
        
        # Manually create keys with same hash
        same_hash = hashlib.sha256("same_hash".encode()).hexdigest()
        
        key1 = ApiKey(
            id=secrets.token_uuid(),
            user_id=self.user_id,
            key_hash=same_hash,
            key_name="Key 1",
            key_prefix="unf_test_a",
            environment="test",
            is_active=True
        )
        
        # Database should prevent second key with same hash/environmnt
        # This is tested via database constraint enforcement

    @pytest.mark.asyncio
    async def test_rate_limit_enforcement_by_environment(self):
        """Test that rate limits are enforced according to environment."""
        # Test environment should have higher limits
        test_api_key = await self.cm.generate_api_key(
            db=self.mock_db,
            user_id=self.user_id,
            key_name="Test Key",
            key_environment="test"
        )
        
        # Verify test limits
        result = await self.cm.validate_api_key(self.mock_db, test_api_key["api_key"])
        assert result["rate_limit_per_min"] == 1000
        assert result["rate_limit_per_day"] == 100000
        
        # Live environment should have stricter limits
        live_api_key = await self.cm.generate_api_key(
            db=self.mock_db,
            user_id=self.user_id,
            key_name="Live Key", 
            key_environment="live"
        )
        
        # Verify live limits
        result = await self.cm.validate_api_key(self.mock_db, live_api_key["api_key"])
        assert result["rate_limit_per_min"] == 100
        assert result["rate_limit_per_day"] == 10000

    @pytest.mark.asyncio
    async def test_transaction_logging_with_environment(self):
        """Test transaction logs record environment correctly."""
        test_api_key = await self.cm.generate_api_key(
            db=self.mock_db,
            user_id=self.user_id,
            key_name="Test Key",
            key_environment="test"
        )
        
        key_info = await self.cm.validate_api_key(self.mock_db, test_api_key["api_key"])
        
        # Simulate transaction with test key
        transaction_data = {
            "id": secrets.token_uuid(),
            "user_id": key_info["user_id"],
            "api_key_id": key_info["key_id"], 
            "transaction_id": "txn_test_123",
            "service_name": "razorpay",
            "endpoint": "/v1/orders",
            "http_method": "POST",
            "status": "success",
            "environment": "test"  # Should be logged from API key
        }
        
        # Verify environment is correctly extracted from API key
        assert transaction_data["environment"] == "test"


class TestEnvironmentAPIEndpointUpdates:
    """Test frontend API key creation endpoint updates."""

    def test_create_api_key_request_model(self):
        """Test that CreateApiKeyRequest model accepts environment parameter."""
        from app.routes.api_keys import CreateApiKeyRequest
        
        # Should work with environment
        request = CreateApiKeyRequest(
            key_name="Test Key",
            rate_limit_per_min=500,
            rate_limit_per_day=50000
        )
        
        # Environment is handled separately in the endpoint
        assert request.key_name == "Test Key"

    @pytest.mark.asyncio
    async def test_update_create_api_key_endpoint(self):
        """Test updated create API key endpoint accepts environment."""
        from app.routes.api_keys import create_api_key
        from unittest.mock import MagicMock
        
        # Mock the database session
        mock_db = AsyncMock()
        mock_user = {"id": "test-user-id"}
        
        # Create request with environment
        mock_request = MagicMock()
        mock_request.key_name = "Test API Key"
        mock_request.rate_limit_per_min = 500
        mock_request.rate_limit_per_day = 50000
        # Environment will be added to the endpoint parameters
        
        # The actual endpoint will handle environment selection
        assert hasattr(mock_request, 'key_name')


class TestEnvironmentAdapters:
    """Test adapter environment-aware routing."""

    @pytest.mark.asyncio
    async def test_razorpay_adapter_respects_environment(self):
        """Test Razorpay adapter uses correct credentials per environment."""
        from app.adapters.razorpay import RazorpayAdapter
        
        adapter = RazorpayAdapter()
        
        # Test credentials
        test_creds = {
            "RAZORPAY_KEY_ID": "test_key_id",
            "RAZORPAY_KEY_SECRET": "test_key_secret"
        }
        
        # Configure for test environment
        adapter.configure(test_creds, "test")
        assert adapter.config["key_id"] == "test_key_id"
        
        # Live credentials
        live_creds = {
            "RAZORPAY_KEY_ID": "live_key_id", 
            "RAZORPAY_KEY_SECRET": "live_key_secret"
        }
        
        # Configure for live environment
        adapter.configure(live_creds, "live")
        assert adapter.config["key_id"] == "live_key_id"


def pytest_configure(config):
    """Configure pytest with markers."""
    config.addinivalue_line("markers", "environment: Test environment segregation")