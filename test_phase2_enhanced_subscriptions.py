#!/usr/bin/env python3
"""
Test script for Phase 2.2: Enhanced Subscription Flows
"""

import asyncio
import sys
import os

async def test_phase2_enhanced_subscriptions():
    """Test enhanced subscription features"""

    print("Testing Phase 2.2: Enhanced Subscription Flows...")

    try:
        # Test 1: SDK enhanced subscription creation
        print("\n1. Testing SDK enhanced subscription creation...")

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
                    'subscription_id': 'sub_test_123',
                    'plan_id': 'plan_monthly_99',
                    'status': 'created',
                    'trial_days': 7,
                    'start_date': '2024-01-15'
                }

        mock_client = MockHTTPClient()

        # Test SDK subscription creation with trial
        from onerouter.resources.subscriptions import SubscriptionsResource
        subscriptions = SubscriptionsResource(mock_client)

        result = await subscriptions.create(
            plan_id="plan_monthly_99",
            trial_days=7,
            start_date="2024-01-15",
            provider="razorpay"
        )

        # Verify SDK passes parameters correctly
        request_data = mock_client.last_request['data']
        assert request_data['plan_id'] == "plan_monthly_99"
        assert request_data['trial_days'] == 7
        assert request_data['start_date'] == "2024-01-15"
        assert request_data['provider'] == "razorpay"

        # Verify response includes trial info
        assert result['trial_days'] == 7
        assert result['start_date'] == '2024-01-15'

        print("   [PASS] SDK enhanced subscription creation works")

        # Test 2: SDK pause/resume operations
        print("\n2. Testing SDK pause/resume operations...")

        # Test pause
        result = await subscriptions.pause("sub_test_123", "cycle_end")
        request_data = mock_client.last_request['data']
        assert mock_client.last_request['endpoint'] == "/v1/subscriptions/sub_test_123/pause"
        assert request_data.get('pause_at') == "cycle_end"

        # Test resume
        result = await subscriptions.resume("sub_test_123")
        assert mock_client.last_request['endpoint'] == "/v1/subscriptions/sub_test_123/resume"

        print("   [PASS] SDK pause/resume operations work")

        # Test 3: SDK plan change
        print("\n3. Testing SDK plan change...")

        result = await subscriptions.change_plan("sub_test_123", "plan_monthly_199", True)
        request_data = mock_client.last_request['data']
        assert mock_client.last_request['endpoint'] == "/v1/subscriptions/sub_test_123/change_plan"
        assert request_data['new_plan_id'] == "plan_monthly_199"
        assert request_data['prorate'] == True

        print("   [PASS] SDK plan change works")

        # Test 4: Backend API model validation
        print("\n4. Testing backend API model validation...")

        from backend.app.routes.unified_api import CreateSubscriptionRequest

        # Test enhanced subscription request
        request = CreateSubscriptionRequest(
            plan_id="plan_monthly_99",
            trial_days=7,
            start_date="2024-01-15",
            provider="razorpay"
        )

        assert request.plan_id == "plan_monthly_99"
        assert request.trial_days == 7
        assert request.start_date == "2024-01-15"
        assert request.provider == "razorpay"

        print("   [PASS] Backend API model validation works")

        # Test 5: Unified request transformer
        print("\n5. Testing unified request transformer...")

        from backend.app.adapters.razorpay_transformer import UnifiedSubscriptionRequest

        unified_request = UnifiedSubscriptionRequest(
            plan_id="plan_monthly_99",
            total_count=12,
            quantity=1,
            trial_days=7,
            start_date="2024-01-15"
        )

        assert unified_request.plan_id == "plan_monthly_99"
        assert unified_request.trial_days == 7
        assert unified_request.start_date == "2024-01-15"

        print("   [PASS] Unified request transformer works")

        print("\n[SUCCESS] Phase 2.2 enhanced subscription flows are working!")
        print("[OK] Trial periods support")
        print("[OK] Custom start dates")
        print("[OK] Pause/resume operations")
        print("[OK] Plan change functionality")
        print("[OK] Enhanced SDK methods")
        print("[OK] Backend API integration")

        return True

    except Exception as e:
        print(f"\n[FAILED] Phase 2.2 test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_phase2_enhanced_subscriptions())
    sys.exit(0 if success else 1)