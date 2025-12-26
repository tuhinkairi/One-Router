# OneRouter SDK Expansion Goals & Roadmap

## 🎯 Mission Statement
Expand OneRouter SDK to expose key payment gateway features while maintaining simplicity and unified API design. Focus on UPI and card payments as priority features.

## 📋 Current SDK Coverage (Baseline)
- ✅ Payments: create(), get(), refund()
- ✅ Subscriptions: create(), get(), cancel()
- ✅ Payment Links: create()

## 🎯 Priority Features to Add

### Phase 1: Core Payment Method Expansion (High Priority)
**Focus**: UPI and Cards - Most requested payment methods

#### Razorpay Additions:
- UPI payments (Google Pay, PhonePe, BHIM UPI, etc.)
- Card payments with EMI options
- Net banking (100+ banks)
- Wallet payments (Paytm, Mobikwik, etc.)
- Pay Later/BNPL options

#### PayPal Additions:
- Credit/Debit cards (Visa, Mastercard, Amex, Discover)
- Apple Pay integration
- Google Pay integration
- Local payment methods (iDEAL, Bancontact, etc.)
- Pay Later offerings

### Phase 2: Enhanced Existing Flows (Medium Priority)
**Focus**: Make current features more powerful

#### Payment Enhancements:
- Payment method selection in create() calls
- Saved payment methods (vaulting)
- Payment method preferences
- Enhanced refund options (partial refunds with reasons)

#### Subscription Enhancements:
- Trial periods
- Pause/Resume subscriptions
- Proration handling
- Plan upgrades/downgrades

### Phase 3: Advanced Features (Lower Priority)
**Focus**: Complex business workflows

#### Marketplace Features:
- Split payments/transfers
- Vendor payouts
- Platform fees

#### Advanced Payment Flows:
- Recurring payments (beyond subscriptions)
- Payment intents
- Payment method tokens
- Risk assessment

## 🏗️ Implementation Strategy

### SDK Design Principles:
1. **Unified API**: Same method signatures across providers where possible
2. **Provider-Specific Extensions**: Allow provider-specific features when needed
3. **Progressive Complexity**: Simple defaults, advanced options via parameters
4. **Backward Compatibility**: Never break existing integrations

### Technical Approach:
1. **Parameter Expansion**: Add optional parameters to existing methods
2. **New Resource Classes**: For major new features (marketplace, risk, etc.)
3. **Method Overloading**: Support both simple and advanced usage patterns
4. **Documentation**: Clear examples for each payment method

## 📊 Success Metrics

### Coverage Targets:
- UPI: 100% of major apps (Google Pay, PhonePe, Paytm, BHIM)
- Cards: All major networks (Visa, Mastercard, Amex, Discover)
- Global Reach: Support for 20+ countries payment methods

### SDK Usage:
- Maintain <5 method calls for 80% of use cases
- <10 method calls for advanced workflows
- Clear error messages for unsupported combinations

## 🚦 Phase 1 Implementation Plan

### 1.1 Enhanced Payment Creation
```python
# Current (simple)
payment = await client.payments.create(amount=100.00, currency="INR")

# Phase 1 (enhanced)
payment = await client.payments.create(
    amount=100.00, 
    currency="INR",
    method="upi",  # NEW: payment method
    upi_app="gpay",  # NEW: UPI app preference
    emi_plan="3_months"  # NEW: EMI option
)
```

### 1.2 Payment Method Validation
- Validate method availability by provider
- Auto-select providers based on method support
- Clear error messages for unsupported combinations

### 1.3 SDK Response Enhancements
- Include payment method in response
- Add method-specific metadata
- Provider-specific confirmation URLs

## 🔍 Research Findings

### Razorpay Payment Methods (from docs):
- UPI: Google Pay, PhonePe, BHIM, Paytm, Ola Money, etc.
- Cards: Visa, Mastercard, Amex, RuPay with EMI
- Net Banking: 100+ banks
- Wallets: Paytm, Mobikwik, Ola, JioMoney, etc.
- Pay Later: Various BNPL options

### PayPal Payment Methods (from docs):
- Cards: Visa, Mastercard, Amex, Discover
- Digital Wallets: PayPal, Venmo
- BNPL: Pay Later (US, UK, AU, FR, DE, IT, ES)
- Local Methods: iDEAL, Bancontact, BLIK, EPS, etc.
- Push Payments: Apple Pay, Google Pay

## 🎨 Frontend Impact Analysis

### Frontend Upgrade Requirements: NONE ✅

**Analysis Result**: No frontend changes needed for payment method enhancements

**Why No Changes Required:**
1. **Separation of Concerns**: SDK handles payment processing, Frontend handles service management
2. **Current Frontend Purpose**: Configuration dashboard, not payment creation
3. **API Backward Compatibility**: Existing frontend calls continue working unchanged
4. **No Payment UI**: Frontend doesn't have checkout or payment method selection interfaces

**Frontend Scope**:
- ✅ Service configuration (Razorpay/PayPal setup)
- ✅ API key management
- ✅ Webhook configuration
- ✅ Analytics dashboard
- ❌ Payment creation interfaces
- ❌ Payment method selection

**SDK Changes Impact**: Only affects external developers using OneRouter SDK

## ⚠️ Important Constraints

1. **Provider Limitations**: Not all methods available in all countries
2. **Regulatory Requirements**: Some features require special approvals
3. **API Complexity**: Advanced features may require additional API keys
4. **Testing Complexity**: Each new method needs comprehensive testing

## 📅 Timeline & Milestones

### Week 1: Planning & Design
- ✅ Create this tracking document
- Finalize API design patterns
- Get user approval

### Week 2-3: UPI Implementation ✅ COMPLETED
- ✅ Enhanced SDK `payments.create()` method with payment method parameters
- ✅ Added UPI, card, wallet, and net banking support
- ✅ Updated backend API to accept payment method parameters
- ✅ Updated Pydantic models and validation
- ✅ Comprehensive testing for SDK and backend integration

### Week 4-5: Payment Method Validation ✅ COMPLETED
- ✅ Created `payment_method_validator.py` with provider capability mappings
- ✅ Implemented smart provider auto-selection based on payment methods
- ✅ Added comprehensive validation for method/provider combinations
- ✅ Enhanced API responses with payment method details
- ✅ Integrated validation into unified API payment flow
- ✅ Full integration testing for Phase 2.1

### Week 6-7: Enhanced Subscription Flows ✅ COMPLETED
- ✅ Added trial periods support to subscription creation
- ✅ Implemented custom start dates for subscriptions
- ✅ Enhanced SDK with pause/resume/plan change operations
- ✅ Added backend API endpoints for subscription lifecycle management
- ✅ Updated Pydantic models and transformer for enhanced parameters
- ✅ Comprehensive testing for all subscription enhancements

### Week 4-5: Card Payments Implementation
- Add enhanced card support
- Implement EMI options
- Update both providers

### Week 6: Testing & Documentation
- Comprehensive testing
- Update SDK documentation
- Create usage examples

## 🎯 Decision Points

1. **Method Parameter Design**: How to structure payment method selection
2. **Provider Auto-Selection**: When to auto-select vs. require explicit provider
3. **Error Handling**: How to communicate unsupported method/provider combinations
4. **Backward Compatibility**: Ensuring existing integrations continue working

---

*Created: December 2025*
*Last Updated: December 2025*
*Status: Awaiting User Approval*</content>
<parameter name="filePath">SDK_EXPANSION_GOALS.txt