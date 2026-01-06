'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: '🚀' },
    { id: 'quickstart', title: 'Quick Start', icon: '⚡' },
    { id: 'sdk', title: 'Python SDK', icon: '🐍' },
    { id: 'js-sdk', title: 'JavaScript SDK', icon: '⚛️' },
    { id: 'sms', title: 'SMS', icon: '📱' },
    { id: 'email', title: 'Email', icon: '📧' },
    { id: 'payments', title: 'Payments', icon: '💳' },
    { id: 'api', title: 'REST API', icon: '🌐' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔧' }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-mono text-sm font-bold">OR</span>
                </div>
                <span className="font-bold text-lg font-mono text-white">OneRouter</span>
              </Link>

              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/docs" className="text-cyan-400 text-sm font-medium">Docs</Link>
                <a href="#api" className="text-gray-300 hover:text-white text-sm font-medium">API</a>
                <a href="#examples" className="text-gray-300 hover:text-white text-sm font-medium">Examples</a>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/api-keys">
                <button className="border border-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:border-gray-600 transition-colors">
                  Get API Keys
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-8">
              <div className="space-y-1">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Documentation</h3>
                  <ul className="space-y-1">
                    {sections.slice(0, 2).map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activeSection === section.id
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">SDKs</h3>
                  <ul className="space-y-1">
                    {sections.slice(2, 4).map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activeSection === section.id
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Services</h3>
                  <ul className="space-y-1">
                    {sections.slice(4, 7).map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activeSection === section.id
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Reference</h3>
                  <ul className="space-y-1">
                    {sections.slice(7).map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activeSection === section.id
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-[600px]">
            <div className="border border-gray-800 rounded-lg p-8">
              {activeSection === 'overview' && <OverviewSection />}
              {activeSection === 'quickstart' && <QuickStartSection />}
              {activeSection === 'sdk' && <SDKSection />}
              {activeSection === 'js-sdk' && <JSSDKSection />}
              {activeSection === 'sms' && <SMSSection />}
              {activeSection === 'email' && <EmailSection />}
              {activeSection === 'payments' && <PaymentsSection />}
              {activeSection === 'api' && <APISection />}
              {activeSection === 'troubleshooting' && <TroubleshootingSection />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Overview Section
function OverviewSection() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">Introduction</h1>
        <p className="text-xl text-gray-300 leading-relaxed">
          OneRouter is a unified API integration platform that provides a single interface for payments, SMS, email, and more. Route requests to your existing provider accounts (Razorpay, PayPal, Stripe, Twilio, Resend) through one SDK.
        </p>
      </div>

      {/* Key Points */}
      <div className="border border-gray-800 rounded-lg p-6 bg-gray-900/50">
        <h2 className="text-xl font-semibold text-white mb-4">What OneRouter Does</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">🔐 Secure Credential Management</h3>
            <p className="text-gray-300 text-sm">Upload your provider credentials once. We encrypt and securely store them. Never manage multiple env variables again.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">🔄 Unified API Interface</h3>
            <p className="text-gray-300 text-sm">One SDK for all services. Payments, SMS, and email work the same way regardless of provider.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">💰 Credit-Based Pricing</h3>
            <p className="text-gray-300 text-sm">Pay $0.01 per API call. 1,000 free credits/month. No monthly subscriptions. Pay only for what you use.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">🏢 Multi-Tenant Architecture</h3>
            <p className="text-gray-300 text-sm">Complete data isolation. Your credentials and data are never accessible to other users.</p>
          </div>
        </div>
      </div>

      {/* Supported Services */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Supported Services</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">💳 Payments</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Razorpay</li>
              <li>• PayPal</li>
              <li>• Stripe</li>
            </ul>
          </div>
          <div className="border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">📱 SMS</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Twilio</li>
              <li>• AWS SNS</li>
            </ul>
          </div>
          <div className="border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">📧 Email</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Resend</li>
              <li>• SendGrid</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why Use OneRouter */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Why Use OneRouter?</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <div>
              <h4 className="text-white font-medium">Single Integration</h4>
              <p className="text-gray-400 text-sm">Integrate once, use multiple providers. Add new services without code changes.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <div>
              <h4 className="text-white font-medium">No Credential Management</h4>
              <p className="text-gray-400 text-sm">Upload credentials once through dashboard. We handle encryption and security.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <div>
              <h4 className="text-white font-medium">Unified Response Format</h4>
              <p className="text-gray-400 text-sm">All providers return data in the same structure. No more mapping different response formats.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <div>
              <h4 className="text-white font-medium">Multi-Provider Fallback</h4>
              <p className="text-gray-400 text-sm">If one provider fails, automatically retry with another. Built-in reliability.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <div>
              <h4 className="text-white font-medium">Real-Time Analytics</h4>
              <p className="text-gray-400 text-sm">See all your transactions in one dashboard. Track costs and usage per service.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quickstart Cards */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Quickstart</h2>
        <p className="text-gray-300 mb-8">Get OneRouter integrated in 5 minutes.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-gray-800 rounded-lg p-6 hover:border-cyan-500 transition-colors cursor-pointer" onClick={() => window.location.href = '/docs/sdk'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🐍</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Python SDK</h3>
            </div>
            <p className="text-gray-400 text-sm">Install pip package and start integrating</p>
          </div>

          <div className="border border-gray-800 rounded-lg p-6 hover:border-cyan-500 transition-colors cursor-pointer" onClick={() => window.location.href = '/docs/sdk'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">⚛️</span>
              </div>
              <h3 className="text-lg font-semibold text-white">JavaScript SDK</h3>
            </div>
            <p className="text-gray-400 text-sm">Node.js, browser, and edge support</p>
          </div>

          <div className="border border-gray-800 rounded-lg p-6 hover:border-cyan-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🌐</span>
              </div>
              <h3 className="text-lg font-semibold text-white">REST API</h3>
            </div>
            <p className="text-gray-400 text-sm">Use any HTTP client</p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="border border-gray-800 rounded-lg p-6 bg-cyan-900/20">
        <h2 className="text-xl font-semibold text-white mb-4">💰 Pricing</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">Free</div>
            <div className="text-gray-400 text-sm mb-4">1,000 credits/month</div>
            <ul className="text-gray-300 text-sm space-y-1 text-left">
              <li>• Perfect for testing</li>
              <li>• All features included</li>
              <li>• No credit card required</li>
            </ul>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">$10</div>
            <div className="text-gray-400 text-sm mb-4">1,000 credits</div>
            <ul className="text-gray-300 text-sm space-y-1 text-left">
              <li>• $0.01 per API call</li>
              <li>• Pay as you go</li>
              <li>• No monthly minimums</li>
            </ul>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">Volume</div>
            <div className="text-gray-400 text-sm mb-4">20-30% off</div>
            <ul className="text-gray-300 text-sm space-y-1 text-left">
              <li>• $100+ purchase: 20% off</li>
              <li>• $500+ purchase: 30% off</li>
              <li>• Enterprise pricing available</li>
            </ul>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-4 text-center">
          Note: You also pay your provider's fees (Razorpay, PayPal, etc.) directly to them. OneRouter only charges for API usage.
        </p>
      </div>
    </div>
  );
}

// Quick Start Section
function QuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Quick Start</h1>
        <p className="text-gray-300 leading-relaxed">
          Get started with OneRouter in 5 minutes. Follow these steps to integrate payments, SMS, or email.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold">1</div>
            <h3 className="text-xl font-semibold text-white">Get API Key</h3>
          </div>
          <p className="text-gray-300 mb-4">Sign up and generate your API key from the dashboard.</p>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <div className="text-sm text-gray-400 mb-2">Your API Key Format:</div>
            <code className="text-cyan-400">unf_live_xxxxxxxxxxxxxxxxxxxxxxxx</code>
            <p className="text-gray-500 text-xs mt-2">Use unf_test_ for development, unf_live_ for production</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold">2</div>
            <h3 className="text-xl font-semibold text-white">Configure Provider Credentials</h3>
          </div>
          <p className="text-gray-300 mb-4">Upload your provider credentials through the dashboard. We encrypt and store them securely.</p>
          <div className="space-y-2">
            <p className="text-gray-400 text-sm">Supported providers:</p>
            <ul className="text-gray-300 text-sm space-y-1 ml-4">
              <li>• Razorpay: RZP_KEY_ID, RZP_KEY_SECRET</li>
              <li>• PayPal: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET</li>
              <li>• Stripe: STRIPE_SECRET_KEY</li>
              <li>• Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN</li>
              <li>• Resend: RESEND_API_KEY</li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold">3</div>
            <h3 className="text-xl font-semibold text-white">Install SDK</h3>
          </div>
          <div className="border border-gray-700 rounded p-4 bg-gray-900 mb-4">
            <code className="text-green-400">pip install onerouter</code>
          </div>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <code className="text-green-400">npm install @onerouter/sdk</code>
          </div>
        </div>

        {/* Step 4 */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold">4</div>
            <h3 className="text-xl font-semibold text-white">Make Your First API Call</h3>
          </div>
          
          <div className="mb-6">
            <h4 className="text-white font-medium mb-2">Python</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

client = OneRouter(api_key="unf_test_your_key_here")

# Send SMS
sms = client.sms.send(
    to="+1234567890",
    body="Hello from OneRouter!"
)
print("SMS sent:", sms['message_id'])

# Create Payment
payment = client.payments.create(
    amount=1000,  # ₹10.00 or $10.00
    currency="INR",
    customer_id="cust_123"
)
print("Payment created:", payment['transaction_id'])`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">JavaScript</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`import { OneRouter } from '@onerouter/sdk';

const client = new OneRouter({
  apiKey: 'unf_test_your_key_here'
});

// Send SMS
const sms = await client.sms.send({
  to: '+1234567890',
  body: 'Hello from OneRouter!'
});
console.log('SMS sent:', sms.message_id);

// Create Payment
const payment = await client.payments.create({
  amount: 1000,
  currency: 'INR',
  customerId: 'cust_123'
});
console.log('Payment created:', payment.transactionId);`}
              </pre>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold">5</div>
            <h3 className="text-xl font-semibold text-white">Go Live</h3>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Switch from test to live credentials in dashboard</li>
            <li>Change API key from <code className="text-cyan-400">unf_test_</code> to <code className="text-cyan-400">unf_live_</code></li>
            <li>Test with real transactions (small amounts)</li>
            <li>Monitor your dashboard for usage and costs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// SDK Section
function SDKSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Python SDK</h1>
        <p className="text-gray-300 leading-relaxed">
          Complete integration guide for the OneRouter Python SDK. Supports Python 3.8+, async/sync interfaces, and all major frameworks.
        </p>
      </div>

      {/* Installation */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Installation</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Basic Installation</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-green-400">pip install onerouter</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">With Async Support</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-green-400">pip install onerouter[async]</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Verify Installation</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-cyan-400">python -c "import onerouter; print('OneRouter SDK installed!')"</code>
            </div>
          </div>
        </div>
      </div>

      {/* Base URLs */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Base URLs</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Development (Local)</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">http://localhost:8000</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Production</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">https://one-backend.stack-end.com</code>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Setup */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Complete SDK Setup</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

# Production Setup
client = OneRouter(
    api_key="unf_live_your_production_key_here",
    base_url="https://one-backend.stack-end.com",
    timeout=30,        # seconds
    max_retries=3,     # automatic retries on failure
    environment="production"
)

# Development Setup
client = OneRouter(
    api_key="unf_test_your_test_key_here",
    base_url="http://localhost:8000",
    timeout=60,
    max_retries=5,
    environment="development"
)`}
          </pre>
        </div>
      </div>

      {/* Framework Integration */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Framework Integration</h3>
        
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">Flask</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`from flask import Flask, request, jsonify
from onerouter import OneRouter

app = Flask(__name__)
client = OneRouter(api_key="unf_live_your_key")

@app.route('/api/payments', methods=['POST'])
def create_payment():
    data = request.get_json()
    payment = client.payments.create(
        amount=data['amount'],
        currency=data['currency'],
        customer_id=data['customer_id']
    )
    return jsonify({
        'payment_id': payment['transaction_id'],
        'checkout_url': payment.get('checkout_url')
    })

if __name__ == '__main__':
    app.run(port=3000)`}
            </pre>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">FastAPI</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`from fastapi import FastAPI, HTTPException
from pydantic import BaseSettings
from onerouter import OneRouter

app = FastAPI()

class Settings(BaseSettings):
    api_key: str
    base_url: str = "https://one-backend.stack-end.com"
    class Config:
        env_prefix = "ONEROUTER_"

settings = Settings()
client = OneRouter(api_key=settings.api_key, base_url=settings.base_url)

@app.post("/api/sms")
async def send_sms(to: str, body: str):
    try:
        sms = await client.sms.send_async(to=to, body=body)
        return {"message_id": sms['message_id'], "status": sms['status']}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))`}
            </pre>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Django</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`# settings.py
ONEROUTER_CONFIG = {
    'API_KEY': 'unf_live_your_key_here',
    'BASE_URL': 'https://one-backend.stack-end.com',
    'TIMEOUT': 30,
    'MAX_RETRIES': 3
}

# views.py
from django.conf import settings
from django.http import JsonResponse
from onerouter import OneRouter

def get_onerouter_client():
    return OneRouter(
        api_key=settings.ONEROUTER_CONFIG['API_KEY'],
        base_url=settings.ONEROUTER_CONFIG['BASE_URL'],
        timeout=settings.ONEROUTER_CONFIG['TIMEOUT']
    )`}
            </pre>
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Advanced Features</h3>
        
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">Idempotency (Prevent Duplicate Requests)</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`import uuid

# Same idempotency_key = same result (prevents duplicates)
idempotency_key = str(uuid.uuid4())

payment1 = client.payments.create(
    amount=1000,
    currency="USD",
    idempotency_key=idempotency_key
)

payment2 = client.payments.create(
    amount=1000,
    currency="USD",
    idempotency_key=idempotency_key
)

assert payment1['transaction_id'] == payment2['transaction_id']  # Same!`}
            </pre>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">Bulk Operations</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`import asyncio

async def send_bulk_sms(phone_numbers, message):
    async with OneRouter(api_key="unf_live_xxx") as client:
        tasks = [
            client.sms.send_async(to=phone, body=message)
            for phone in phone_numbers
        ]
        results = await asyncio.gather(*tasks)
        return results

# Send to 100 numbers at once
phones = ["+1234567890", "+1234567891", ...]  # 100 numbers
results = asyncio.run(send_bulk_sms(phones, "Bulk message!"))`}
            </pre>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Error Handling</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter, ValidationError, APIError, RateLimitError

client = OneRouter(api_key="unf_live_xxx")

try:
    payment = client.payments.create(amount=1000, currency="USD")
except ValidationError as e:
    print(f"Invalid input: {e}")
except RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after}s")
except APIError as e:
    print(f"API error: {e.code} - {e.message}")
except Exception as e:
    print(f"Unexpected error: {e}")`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// JavaScript SDK Section
function JSSDKSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">JavaScript SDK</h1>
        <p className="text-gray-300 leading-relaxed">
          OneRouter JavaScript SDK for Node.js, browsers, and edge environments. Supports async/await and all modern JavaScript runtimes.
        </p>
      </div>

      {/* Installation */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Installation</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">npm</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-green-400">npm install @onerouter/sdk</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">yarn</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-green-400">yarn add @onerouter/sdk</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">pnpm</h4>
            <div className="border border-gray-700 rounded p-3 bg-gray-900">
              <code className="text-green-400">pnpm add @onerouter/sdk</code>
            </div>
          </div>
        </div>
      </div>

      {/* Base URLs */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Base URLs</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Development (Local)</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">http://localhost:8000</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Production</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">https://one-backend.stack-end.com</code>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Setup */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Complete SDK Setup</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`import { OneRouter } from '@onerouter/sdk';

// Production
const client = new OneRouter({
  apiKey: 'unf_live_your_production_key',
  baseURL: 'https://one-backend.stack-end.com',
  timeout: 30000,
  maxRetries: 3
});

// Development
const client = new OneRouter({
  apiKey: 'unf_test_your_test_key',
  baseURL: 'http://localhost:8000',
  timeout: 60000,
  maxRetries: 5
});`}
          </pre>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Usage Examples</h3>
        
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">Send SMS</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`const client = new OneRouter({ apiKey: 'unf_live_xxx' });

// Basic SMS
const sms = await client.sms.send({
  to: '+1234567890',
  body: 'Hello from OneRouter!'
});
console.log('SMS ID:', sms.message_id);

// With idempotency
const sms2 = await client.sms.send({
  to: '+1234567890',
  body: 'Idempotent message',
  idempotencyKey: crypto.randomUUID()
});`}
            </pre>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">Create Payment</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`const payment = await client.payments.create({
  amount: 1000,  // ₹10.00 or $10.00
  currency: 'INR',
  customerId: 'cust_123',
  paymentMethod: {
    type: 'card',
    card: {
      number: '4242424242424242',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123'
    }
  }
});

console.log('Payment ID:', payment.transactionId);
console.log('Checkout URL:', payment.checkoutUrl);`}
            </pre>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-2">Send Email</h4>
          <div className="border border-gray-700 rounded p-4 bg-gray-900">
            <pre className="text-white text-sm overflow-x-auto">
{`const email = await client.email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  htmlBody: '<h1>Welcome to OneRouter</h1>',
  textBody: 'Welcome to OneRouter'
});

console.log('Email ID:', email.emailId);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// SMS Section
function SMSSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">SMS Integration</h1>
        <p className="text-gray-300 leading-relaxed">
          Send SMS messages via Twilio with delivery tracking. Configure your Twilio credentials in the dashboard, then use our unified API.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Prerequisites</h3>
        <ul className="text-gray-300 space-y-2">
          <li>• Twilio Account with phone number</li>
          <li>• API credentials configured in dashboard</li>
          <li>• SMS credits in your Twilio account</li>
        </ul>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Send SMS</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Basic SMS
sms = client.sms.send(
    to="+1234567890",
    body="Your verification code is 1234"
)

print("SMS sent:", sms['message_id'])
print("Status:", sms['status'])  # sent, delivered, failed
print("Cost:", sms['cost'])  # Cost in credits`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Advanced Options</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Custom From Number</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`sms = client.sms.send(
    to="+1234567890",
    body="Custom sender message",
    from_number="+0987654321"  # Your Twilio number
)`}
              </pre>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Idempotency</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`import uuid

sms = client.sms.send(
    to="+1234567890",
    body="Idempotent message",
    idempotency_key=str(uuid.uuid4())
)`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Get SMS Status</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`# Get delivery status
status = client.sms.get_status("SM1234567890")

print("Status:", status['status'])  # queued, sent, delivered, failed
print("To:", status['to'])
print("Delivered at:", status.get('delivered_at'))`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Pricing</h3>
        <p className="text-gray-300 mb-4">Cost: 1 credit per SMS ($0.01 per SMS)</p>
        <p className="text-gray-400 text-sm">Note: You also pay Twilio's standard per-SMS fees directly to Twilio.</p>
      </div>
    </div>
  );
}

// Email Section
function EmailSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Email Integration</h1>
        <p className="text-gray-300 leading-relaxed">
          Send transactional emails via Resend with delivery tracking. Configure your Resend API key in the dashboard.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Prerequisites</h3>
        <ul className="text-gray-300 space-y-2">
          <li>• Resend Account</li>
          <li>• Verified sending domain or email</li>
          <li>• API key configured in dashboard</li>
        </ul>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Send Email</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# Basic email
email = client.email.send(
    to="user@example.com",
    subject="Welcome to OneRouter",
    html_body="<h1>Welcome!</h1><p>Thanks for signing up.</p>",
    text_body="Welcome! Thanks for signing up."
)

print("Email sent:", email['email_id'])
print("Status:", email['status'])`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Advanced Options</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">With Attachments</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`email = client.email.send(
    to="user@example.com",
    subject="Your Invoice",
    html_body="<h1>Invoice</h1><p>Please find your invoice attached.</p>",
    attachments=[
        {
            "filename": "invoice.pdf",
            "content": base64.b64encode(open("invoice.pdf", "rb").read()).decode(),
            "content_type": "application/pdf"
        }
    ]
)`}
              </pre>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Reply-To</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`email = client.email.send(
    to="user@example.com",
    subject="Question about order",
    html_body="<p>Hi, I have a question...</p>",
    reply_to="support@yourcompany.com"
)`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Get Email Status</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`status = client.email.get_status("email_123")

print("Status:", status['status'])  # sent, delivered, opened, bounced
print("Opened at:", status.get('opened_at'))`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Pricing</h3>
        <p className="text-gray-300 mb-4">Cost: 1 credit per email ($0.01 per email)</p>
        <p className="text-gray-400 text-sm">Note: You also pay Resend's fees directly to Resend.</p>
      </div>
    </div>
  );
}

// Payments Section
function PaymentsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Payment Integration</h1>
        <p className="text-gray-300 leading-relaxed">
          Process payments with multiple providers (Razorpay, PayPal, Stripe) through one unified API. Use your existing provider accounts.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Supported Payment Methods</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-700 rounded">
            <h4 className="text-white font-medium mb-2">🇮🇳 India</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• UPI</li>
              <li>• Credit/Debit Cards</li>
              <li>• Net Banking</li>
              <li>• Wallets</li>
            </ul>
          </div>
          <div className="p-4 border border-gray-700 rounded">
            <h4 className="text-white font-medium mb-2">🌍 International</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Credit/Debit Cards</li>
              <li>• PayPal</li>
              <li>• Apple Pay / Google Pay</li>
            </ul>
          </div>
          <div className="p-4 border border-gray-700 rounded">
            <h4 className="text-white font-medium mb-2">💰 Features</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• One-time payments</li>
              <li>• Subscriptions</li>
              <li>• Refunds</li>
              <li>• Multi-currency</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Create Payment</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

client = OneRouter(api_key="unf_live_xxx")

# UPI Payment (India)
payment = client.payments.create(
    amount=1000,  # ₹10.00
    currency="INR",
    customer_id="cust_123",
    payment_method={
        "type": "upi",
        "upi": {
            "vpa": "customer@upi"
        }
    }
)

print("Payment ID:", payment['transaction_id'])
print("Checkout URL:", payment.get('checkout_url'))`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Card Payment</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`# Card Payment (International)
payment = client.payments.create(
    amount=2500,  # $25.00
    currency="USD",
    customer_id="cust_123",
    payment_method={
        "type": "card",
        "card": {
            "number": "4242424242424242",
            "expiry_month": "12",
            "expiry_year": "2025",
            "cvv": "123"
        }
    }
)`}
          </pre>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Payment Operations</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-700 rounded p-4">
            <h4 className="text-white font-medium mb-2">Get Payment Status</h4>
            <pre className="text-white text-xs overflow-x-auto">
{`status = client.payments.get(payment['transaction_id'])
print("Status:", status['status'])`}
            </pre>
          </div>
          <div className="border border-gray-700 rounded p-4">
            <h4 className="text-white font-medium mb-2">Refund Payment</h4>
            <pre className="text-white text-xs overflow-x-auto">
{`refund = client.payments.refund(
    payment_id=payment['transaction_id'],
    amount=500  # Partial refund
)`}
            </pre>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Pricing</h3>
        <p className="text-gray-300 mb-4">Cost: 1 credit per payment API call ($0.01 per call)</p>
        <p className="text-gray-400 text-sm">Note: You also pay your provider's transaction fees (Razorpay: ~2%, PayPal: ~3%) directly to them.</p>
      </div>
    </div>
  );
}

// API Section
function APISection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">REST API Reference</h1>
        <p className="text-gray-300 leading-relaxed">
          Complete REST API documentation. Use any HTTP client to integrate with OneRouter.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Base URLs</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Development</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">http://localhost:8000/v1</code>
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Production</h4>
            <div className="border border-gray-700 rounded p-3">
              <code className="text-white">https://one-backend.stack-end.com/v1</code>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Authentication</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`# Bearer Token Authentication
curl -H "Authorization: Bearer unf_live_your_api_key_here" \
     https://one-backend.stack-end.com/v1/sms

# Or API Key in header
curl -H "X-API-Key: unf_live_your_api_key_here" \
     https://one-backend.stack-end.com/v1/sms`}
          </pre>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          API Key Format: <code className="text-cyan-400">unf_live_xxxxxxxxxxxxxxxxxxxxxxxx</code> or <code className="text-cyan-400">unf_test_xxxxxxxxxxxxxxxxxxxxxxxx</code>
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">SMS Endpoints</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Send SMS</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/v1/sms</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -X POST https://one-backend.stack-end.com/v1/sms \
  -H "Authorization: Bearer unf_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hello from OneRouter!",
    "idempotency_key": "unique-key-123"
  }'

# Response
{
  "message_id": "SM1234567890",
  "status": "sent",
  "cost": 1
}`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Get SMS Status</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">/v1/sms/{message_id}</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -H "Authorization: Bearer unf_live_xxx" \
     https://one-backend.stack-end.com/v1/sms/SM1234567890`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Payment Endpoints</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Create Payment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/v1/payments</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -X POST https://one-backend.stack-end.com/v1/payments \
  -H "Authorization: Bearer unf_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "customer_id": "cust_123",
    "payment_method": {
      "type": "upi",
      "upi": {"vpa": "customer@upi"}
    }
  }'

# Response
{
  "transaction_id": "txn_123",
  "status": "pending",
  "checkout_url": "https://checkout...",
  "provider": "razorpay"
}`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Get Payment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">/v1/payments/{transaction_id}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Refund Payment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/v1/payments/{transaction_id}/refund</code>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Email Endpoints</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Send Email</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/v1/email</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -X POST https://one-backend.stack-end.com/v1/email \
  -H "Authorization: Bearer unf_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome",
    "html_body": "<h1>Welcome!</h1>"
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Error Responses</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-red-400 font-medium mb-2">400 Bad Request</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`{
  "detail": "Validation error",
  "errors": [{"field": "to", "message": "Invalid phone format"}]
}`}
              </pre>
            </div>
          </div>
          <div>
            <h4 className="text-red-400 font-medium mb-2">401 Unauthorized</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm">
{`{"detail": "Invalid API key"}`}
              </pre>
            </div>
          </div>
          <div>
            <h4 className="text-yellow-400 font-medium mb-2">429 Rate Limited</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm">
{`{"detail": "Rate limit exceeded", "retry_after": 60}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Rate Limits</h3>
        <div className="text-gray-300 space-y-2">
          <div className="flex justify-between">
            <span>All endpoints</span>
            <span className="text-cyan-400">60 requests/minute</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          Rate limits are applied per API key. Contact support for higher limits.
        </p>
      </div>
    </div>
  );
}

// Troubleshooting Section
function TroubleshootingSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Troubleshooting</h1>
        <p className="text-gray-300 leading-relaxed">
          Common issues and solutions when integrating OneRouter.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Common Issues</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-2">❌ 401 Invalid API Key</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Check that you're using the correct API key (not test key in production)</li>
              <li>Verify there are no extra spaces in the Authorization header</li>
              <li>Ensure your API key hasn't been revoked from the dashboard</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">❌ Service Not Configured</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Go to dashboard and configure credentials for the service you're using</li>
              <li>For SMS: Configure Twilio credentials</li>
              <li>For Payments: Configure Razorpay/PayPal/Stripe credentials</li>
              <li>For Email: Configure Resend credentials</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">❌ Payment Not Processing</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Verify your provider account has sufficient balance</li>
              <li>Check that provider credentials are correct and not expired</li>
              <li>Ensure you're using the correct environment (test/live)</li>
              <li>Check provider dashboard for any account issues</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">❌ SMS Not Delivering</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Verify phone number is in E.164 format (+1234567890)</li>
              <li>Check Twilio account has SMS credits</li>
              <li>Ensure the from number is verified in Twilio</li>
              <li>Check for carrier blocking or message filtering</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">❌ 429 Rate Limit Exceeded</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Implement exponential backoff in your code</li>
              <li>Reduce request frequency</li>
              <li>Wait the specified retry_after duration</li>
              <li>Contact support if you need higher limits</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">❌ Webhooks Not Working</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Verify your webhook endpoint is publicly accessible</li>
              <li>Check that your server is returning 200 OK quickly</li>
              <li>Verify webhook signature if enabled</li>
              <li>Check your server logs for incoming webhook requests</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Debugging Tips</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Enable Debug Logging</h4>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`import logging
logging.basicConfig(level=logging.DEBUG)

from onerouter import OneRouter
client = OneRouter(api_key="unf_live_xxx")
# Now you'll see detailed request/response logs`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Test Mode vs Live Mode</h4>
            <p className="text-gray-300 text-sm">
              Use <code className="text-cyan-400">unf_test_</code> keys for development. These hit sandbox/test endpoints where no real charges occur. Switch to <code className="text-cyan-400">unf_live_</code> keys for production.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Check Dashboard Logs</h4>
            <p className="text-gray-300 text-sm">
              Your dashboard shows all API requests, errors, and usage. This is the best place to debug issues.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Need More Help?</h3>
        <p className="text-gray-300 mb-4">
          If you're still having issues, check these resources:
        </p>
        <ul className="text-gray-300 space-y-2">
          <li>• Dashboard: Check your usage logs and error messages</li>
          <li>• GitHub Issues: Report bugs or request features</li>
          <li>• Email: Contact support through dashboard</li>
        </ul>
      </div>
    </div>
  );
}
