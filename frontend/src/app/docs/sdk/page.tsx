'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Code,
  Terminal,
  CheckCircle,
  Github,
  Play,
  Database,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Render the SDK documentation page with a responsive layout, sidebar (desktop), and mobile tab navigation.
 *
 * The component manages an internal active-tab state to switch between five content sections: Installation, Quick Start,
 * API Reference, Examples, and Error Handling. It also includes header navigation, quick links, and pricing summary.
 *
 * @returns The React element for the SDK documentation UI.
 */
export default function SDKDocsPage() {
  const [activeTab, setActiveTab] = useState('installation');

  const tabs = [
    { id: 'installation', title: 'Installation', icon: Code },
    { id: 'quickstart', title: 'Quick Start', icon: Play },
    { id: 'api-reference', title: 'API Reference', icon: Database },
    { id: 'examples', title: 'Examples', icon: Terminal },
    { id: 'error-handling', title: 'Error Handling', icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto">
              <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-black to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-mono text-sm font-bold">OR</span>
                </div>
                <span className="font-bold text-lg font-mono text-white hidden sm:block">OneRouter</span>
              </Link>
              <span className="text-[#888] hidden sm:block">/</span>
              <Link href="/docs" className="text-[#888] hover:text-cyan-400 text-sm flex-shrink-0">
                docs
              </Link>
              <span className="text-[#888] hidden sm:block">/</span>
              <span className="text-cyan-400 text-sm flex-shrink-0">sdk</span>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <Link href="https://github.com/onerouter/sdk-python" target="_blank" className="text-[#888] hover:text-white p-2">
                <Github className="w-5 h-5" />
              </Link>
              <Link href="/docs" className="flex-shrink-0">
                <Button variant="outline" className="border-[#222] text-white hover:border-cyan-500 whitespace-nowrap text-sm">
                  ← Back to Docs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24">
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">SDK Documentation</h3>
                <ul className="space-y-2">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <li key={tab.id}>
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            activeTab === tab.id
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-[#888] hover:text-white hover:bg-[#222]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{tab.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Quick Links */}
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-4 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/api-keys" className="block text-[#888] hover:text-cyan-400 text-sm">
                    Generate API Keys →
                  </Link>
                  <span className="block text-[#888] text-sm">
                    Backend URL: Use environment variable
                  </span>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-4 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">💰 Pricing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Per API Call</span>
                    <span className="text-cyan-400">1 credit ($0.01)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Free Tier</span>
                    <span className="text-green-400">1,000 credits/mo</span>
                  </div>
                </div>
              </div>
            </nav>
          </aside>

          {/* Mobile Tab Navigation */}
          <div className="lg:hidden mb-4">
            <div className="flex overflow-x-auto gap-2 pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 w-full">
            {activeTab === 'installation' && <InstallationSection />}
            {activeTab === 'quickstart' && <QuickStartSection />}
            {activeTab === 'api-reference' && <APIReferenceSection />}
            {activeTab === 'examples' && <ExamplesSection />}
            {activeTab === 'error-handling' && <ErrorHandlingSection />}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the "SDK Installation" documentation section with installation commands and backend URLs.
 *
 * Renders cards for the Python SDK (installation commands for standard and async variants, requirements, and a verification command),
 * a JavaScript SDK install snippet, and development/production backend URL blocks with environment guidance.
 *
 * @returns A React element containing the installation instructions and backend URL cards for the SDK documentation page.
 */
function InstallationSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">SDK Installation</h1>
        <p className="text-xl text-[#888] leading-relaxed">
          Install the OneRouter Python SDK for your project. Supports Python 3.8+ with async/sync interfaces.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardHeader>
          <CardTitle className="text-white">Python SDK</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Installation</h3>
            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
              <pre className="text-sm text-green-400">pip install onerouter</pre>
            </div>
            <p className="text-sm text-[#888] mt-2">
              With async support:
            </p>
            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4 mt-2">
              <pre className="text-sm text-green-400">pip install onerouter[async]</pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Requirements</h3>
            <ul className="text-sm text-[#888] space-y-2">
              <li>• Python 3.8 or higher</li>
              <li>• httpx (automatically installed)</li>
              <li>• Optional: aiohttp for async support</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Verify Installation</h3>
            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
              <pre className="text-sm text-cyan-400">python -c &quot;import onerouter; print(&apos;OneRouter SDK installed successfully!&apos;)&quot;</pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">JavaScript SDK</h3>
            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
              <pre className="text-sm text-green-400">npm install @onerouter/sdk</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardHeader>
          <CardTitle className="text-white">Backend URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Development</h4>
                <Badge className="bg-yellow-500/20 text-yellow-400">Local</Badge>
              </div>
              <code className="text-sm text-white">http://localhost:8000</code>
            </div>

            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Production</h4>
                <Badge className="bg-green-500/20 text-green-400">Live</Badge>
              </div>
              <code className="text-sm text-white">https://api.yourdomain.com</code>
              <p className="text-[#666] text-xs mt-2">Replace with your actual production URL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Render the Quick Start documentation section for the OneRouter SDK.
 *
 * Displays a Basic Setup card with a Python example, a Success card confirming a completed API call,
 * and an Environment Configuration card showing a sample .env and Python initialization snippet.
 *
 * @returns A JSX element containing the Quick Start content for the documentation page.
 */
function QuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">Quick Start</h1>
        <p className="text-xl text-[#888] leading-relaxed">
          Get started with OneRouter SDK in minutes. Configure your credentials and make your first API call.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Basic Setup</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`from onerouter import OneRouter

# Initialize with your API key
import os
client = OneRouter(
    api_key="unf_live_your_api_key_here",
    base_url=os.getenv("ONEROUTER_BASE_URL", "http://localhost:8000")
)

# Send SMS
sms = client.sms.send(
    to="+1234567890",
    body="Hello from OneRouter!"
)
print(f"SMS sent: {sms['message_id']}")`}
          </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">Success!</h3>
              <p className="text-[#888]">
                You&apos;ve made your first API call with OneRouter. Your credentials are encrypted and stored securely.
                The API routes to your provider accounts (Razorpay, Twilio, etc.) using your configured credentials.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Environment Configuration</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Using Environment Variables</h4>
              <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
                <pre className="text-sm text-cyan-400">
                {`# .env file
                    ONEROUTER_API_KEY=unf_live_your_key_here
                    ONEROUTER_BASE_URL=http://localhost:8000
                    ONEROUTER_TIMEOUT=30
                    ONEROUTER_MAX_RETRIES=3`}
                </pre>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Python Code</h4>
              <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
                <pre className="text-sm text-cyan-400">
                  {`import os from onerouter import OneRouter
                    client = OneRouter(
                        api_key=os.getenv("ONEROUTER_API_KEY"),
                        base_url=os.getenv("ONEROUTER_BASE_URL", "http://localhost:8000"),
                        timeout=int(os.getenv("ONEROUTER_TIMEOUT", "30")),
                        max_retries=int(os.getenv("ONEROUTER_MAX_RETRIES", "3"))
                    )`}
              </pre>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Render the API Reference section showing available services and their method details.
 *
 * The component displays a service selector (sidebar on large screens, horizontal chips on mobile)
 * and a details panel that lists each method's signature, description, parameters, and returns.
 *
 * @returns A React element that presents the SDK API reference for services and methods.
 */
function APIReferenceSection() {
  const [activeMethod, setActiveMethod] = useState('sms');

  const methods = {
    sms: {
      title: 'SMS',
      methods: [
        {
          name: 'send',
          signature: 'client.sms.send(to, body, from_number=None, idempotency_key=None)',
          description: 'Send an SMS message',
          params: [
            { name: 'to', type: 'str', required: true, desc: 'Phone number in E.164 format (+1234567890)' },
            { name: 'body', type: 'str', required: true, desc: 'Message content' },
            { name: 'from_number', type: 'str', required: false, desc: 'Custom sender number' },
            { name: 'idempotency_key', type: 'str', required: false, desc: 'Prevent duplicate sends' }
          ],
          returns: '{message_id, status, cost, provider, created_at}'
        },
        {
          name: 'get_status',
          signature: 'client.sms.get_status(message_id)',
          description: 'Get SMS delivery status',
          params: [
            { name: 'message_id', type: 'str', required: true, desc: 'SMS message ID' }
          ],
          returns: '{message_id, status, to, from, body, delivered_at}'
        }
      ]
    },
    payments: {
      title: 'Payments',
      methods: [
        {
          name: 'create',
          signature: 'client.payments.create(amount, currency, customer_id, payment_method)',
          description: 'Create a payment order',
          params: [
            { name: 'amount', type: 'int', required: true, desc: 'Amount in smallest currency unit' },
            { name: 'currency', type: 'str', required: true, desc: 'Currency code (INR, USD, EUR)' },
            { name: 'customer_id', type: 'str', required: true, desc: 'Customer identifier' },
            { name: 'payment_method', type: 'dict', required: true, desc: 'Payment method details' }
          ],
          returns: '{transaction_id, provider, status, checkout_url, provider_order_id}'
        },
        {
          name: 'get',
          signature: 'client.payments.get(transaction_id)',
          description: 'Get payment details',
          params: [
            { name: 'transaction_id', type: 'str', required: true, desc: 'Transaction ID' }
          ],
          returns: '{transaction_id, status, amount, currency, provider_order_id}'
        },
        {
          name: 'refund',
          signature: 'client.payments.refund(payment_id, amount=None)',
          description: 'Refund a payment',
          params: [
            { name: 'payment_id', type: 'str', required: true, desc: 'Transaction ID to refund' },
            { name: 'amount', type: 'int', required: false, desc: 'Refund amount (full refund if not specified)' }
          ],
          returns: '{refund_id, status, amount, provider_refund_id}'
        }
      ]
    },
    email: {
      title: 'Email',
      methods: [
        {
          name: 'send',
          signature: 'client.email.send(to, subject, html_body, text_body=None, attachments=None)',
          description: 'Send an email',
          params: [
            { name: 'to', type: 'str', required: true, desc: 'Recipient email address' },
            { name: 'subject', type: 'str', required: true, desc: 'Email subject' },
            { name: 'html_body', type: 'str', required: true, desc: 'HTML email content' },
            { name: 'text_body', type: 'str', required: false, desc: 'Plain text alternative' },
            { name: 'attachments', type: 'list', required: false, desc: 'Email attachments' }
          ],
          returns: '{email_id, status, cost, provider}'
        }
      ]
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">API Reference</h1>
        <p className="text-lg sm:text-xl text-[#888] leading-relaxed">
          Complete OneRouter SDK API reference. All methods return unified responses regardless of provider.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Method Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Card className="bg-[#0a0a0a] border-[#222]">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Services</h3>
              <div className="space-y-2">
                {Object.entries(methods).map(([key, method]) => (
                  <button
                    key={key}
                    onClick={() => setActiveMethod(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeMethod === key
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-[#888] hover:text-white hover:bg-[#222]'
                    }`}
                  >
                    {method.title}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Method Selector */}
        <div className="lg:hidden mb-4">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {Object.entries(methods).map(([key, method]) => (
              <button
                key={key}
                onClick={() => setActiveMethod(key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
                  activeMethod === key
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {method.title}
              </button>
            ))}
          </div>
        </div>

        {/* Method Details */}
        <div className="flex-1 w-full">
          <Card className="bg-[#0a0a0a] border-[#222]">
            <CardHeader>
              <CardTitle className="text-white text-xl sm:text-2xl">
                {methods[activeMethod as keyof typeof methods].title} API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {methods[activeMethod as keyof typeof methods].methods.map((method, index) => (
                <div key={index} className="border border-[#222] rounded-lg p-4">
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-2">client.{activeMethod}.{method.name}</h4>
                    <code className="text-cyan-400 text-sm block sm:inline">{method.signature}</code>
                  </div>

                  <p className="text-[#888] mb-4">{method.description}</p>

                  <div className="mb-4">
                    <h5 className="text-white font-medium mb-2">Parameters</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#222]">
                            <th className="text-left py-2 px-4 text-cyan-400">Parameter</th>
                            <th className="text-left py-2 px-4 text-cyan-400">Type</th>
                            <th className="text-left py-2 px-4 text-cyan-400">Required</th>
                            <th className="text-left py-2 px-4 text-cyan-400">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#888]">
                          {method.params.map((param, paramIndex) => (
                            <tr key={paramIndex} className="border-b border-[#222]">
                              <td className="py-2 px-4"><code>{param.name}</code></td>
                              <td className="py-2 px-4">{param.type}</td>
                              <td className="py-2 px-4">
                                <Badge variant={param.required ? "default" : "secondary"}>
                                  {param.required ? 'Yes' : 'No'}
                                </Badge>
                              </td>
                              <td className="py-2 px-4">{param.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-white font-medium mb-2">Returns</h5>
                    <p className="text-sm text-[#888]">{method.returns}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the "Code Examples" documentation section showcasing multiple SDK usage patterns.
 *
 * Displays four example cards: E-commerce Payment Flow, OTP Verification (SMS), Transactional Email,
 * and Async Bulk Operations. Each card contains a titled code sample illustrating typical client usage,
 * environment-variable-based base URL examples, and notes suitable for copy-pasting into user projects.
 *
 * @returns The JSX element containing the examples documentation section
 */
function ExamplesSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">Code Examples</h1>
        <p className="text-xl text-[#888] leading-relaxed">
          Complete examples for common use cases and integration patterns.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">E-commerce Payment Flow</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`from onerouter import OneRouter
import os

class PaymentService:
    def __init__(self, api_key):
        self.client = OneRouter(
            api_key=api_key,
            base_url=os.getenv("ONEROUTER_BASE_URL", "http://localhost:8000")
        )

    def create_checkout(self, cart_items, customer_email, customer_phone):
        """Create payment order for checkout"""
        total_amount = sum(item['price'] * item['quantity'] for item in cart_items)

        order = self.client.payments.create(
            amount=int(total_amount * 100),  # Convert to paise/cents
            currency="INR",
            customer_id=customer_email,
            payment_method={
                "type": "upi",
                "upi": {"vpa": f"{customer_phone}@upi"}
            }
        )

        return {
            "transaction_id": order["transaction_id"],
            "checkout_url": order.get("checkout_url"),
            "amount": total_amount
        }

    def verify_payment(self, transaction_id):
        """Verify payment completion"""
        payment = self.client.payments.get(transaction_id)
        return payment["status"] == "completed"

# Usage
payment_service = PaymentService("unf_live_your_key")
checkout = payment_service.create_checkout(
    cart_items=[{"name": "Widget", "price": 29.99, "quantity": 2}],
    customer_email="customer@example.com",
    customer_phone="+919999999999"
)
print(f"Payment URL: {checkout['checkout_url']}")`}
          </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">OTP Verification (SMS)</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`from onerouter import OneRouter
import random

client = OneRouter(api_key="unf_live_your_key")

def send_otp(phone_number):
    """Send OTP via SMS"""
    otp = str(random.randint(100000, 999999))
    
    sms = client.sms.send(
        to=phone_number,
        body=f"Your verification code is {otp}. Valid for 10 minutes.",
        idempotency_key=f"otp_{phone_number}"
    )
    
    return otp, sms['message_id']

# Usage
otp, message_id = send_otp("+919999999999")
print(f"OTP sent: {otp}, Message ID: {message_id}")`}
          </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Transactional Email</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`from onerouter import OneRouter

client = OneRouter(api_key="unf_live_your_key")

def send_welcome_email(user_email, user_name):
    """Send welcome email to new user"""
    email = client.email.send(
        to=user_email,
        subject=f"Welcome to Our Platform, {user_name}!",
        html_body=f"""
        <h1>Welcome, {user_name}!</h1>
        <p>Thanks for joining our platform.</p>
        <p>We're excited to have you on board!</p>
        """,
        text_body=f"Welcome, {user_name}! Thanks for joining our platform."
    )
    return email['email_id']

# Usage
email_id = send_welcome_email("user@example.com", "John")
print(f"Welcome email sent: {email_id}")`}
          </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Async Bulk Operations</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`import asyncio
from onerouter import OneRouter

async def send_bulk_sms(phone_numbers, message):
    """Send SMS to multiple numbers concurrently"""
    async with OneRouter(api_key="unf_live_xxx") as client:
        tasks = [
            client.sms.send_async(to=phone, body=message)
            for phone in phone_numbers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Usage
phones = ["+919999999999", "+919999999998", "+919999999997"]
results = asyncio.run(send_bulk_sms(phones, "Bulk message from OneRouter!"))

for i, result in enumerate(results):
    if isinstance(result, Exception):
        print(f"Failed for {phones[i]}: {result}")
    else:
        print(f"Success for {phones[i]}: {result['message_id']}")`}
          </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Render the "Error Handling" documentation section for the SDK docs page.
 *
 * Renders exception type descriptions, a comprehensive Python error-handling example with retry logic,
 * and recommended best practices for retries, idempotency, logging, and monitoring.
 *
 * @returns The rendered JSX for the Error Handling documentation section.
 */
function ErrorHandlingSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">Error Handling</h1>
        <p className="text-xl text-[#888] leading-relaxed">
          Handle errors gracefully and implement proper retry logic in your OneRouter integration.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardHeader>
          <CardTitle className="text-white">Exception Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-[#1a1a1a] rounded border border-red-500/30">
              <h4 className="text-red-400 font-medium mb-2">ValidationError</h4>
              <p className="text-sm text-[#888]">Invalid request parameters or missing required fields.</p>
              <pre className="text-xs text-red-400 mt-2">Field: &apos;amount&apos;, Message: &apos;Amount must be positive&apos;</pre>
            </div>

            <div className="p-4 bg-[#1a1a1a] rounded border border-red-500/30">
              <h4 className="text-red-400 font-medium mb-2">APIError</h4>
              <p className="text-sm text-[#888]">API returned an error response from the provider.</p>
              <pre className="text-xs text-red-400 mt-2">Code: &apos;PAYMENT_FAILED&apos;, Message: &apos;Insufficient funds&apos;</pre>
            </div>

            <div className="p-4 bg-[#1a1a1a] rounded border border-yellow-500/30">
              <h4 className="text-yellow-400 font-medium mb-2">RateLimitError</h4>
              <p className="text-sm text-[#888]">API rate limit exceeded.</p>
              <pre className="text-xs text-yellow-400 mt-2">Retry after: 60 seconds</pre>
            </div>

            <div className="p-4 bg-[#1a1a1a] rounded border border-yellow-500/30">
              <h4 className="text-yellow-400 font-medium mb-2">NetworkError</h4>
              <p className="text-sm text-[#888]">Network connectivity issues or timeouts.</p>
              <pre className="text-xs text-yellow-400 mt-2">Connection timeout or DNS resolution failed</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Comprehensive Error Handling</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`from onerouter import OneRouter
from onerouter.exceptions import ValidationError, APIError, RateLimitError, NetworkError
import time
import logging
import os

logger = logging.getLogger(__name__)

class OneRouterClient:
    def __init__(self, api_key):
        self.client = OneRouter(
            api_key=api_key,
            base_url=os.getenv("ONEROUTER_BASE_URL", "http://localhost:8000"),
            max_retries=3
        )
        self.retry_delay = 1

    def create_payment_with_retry(self, payment_data):
        """Create payment with automatic retry logic"""
        for attempt in range(self.client.max_retries + 1):
            try:
                payment = self.client.payments.create(**payment_data)
                logger.info(f"Payment created: {payment['transaction_id']}")
                return payment

            except RateLimitError as e:
                wait_time = e.retry_after or self.retry_delay * (2 ** attempt)
                logger.warning(f"Rate limited. Waiting {wait_time}s")
                time.sleep(wait_time)

            except NetworkError as e:
                if attempt < self.client.max_retries:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.warning(f"Network error. Retrying in {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Network error after {self.client.max_retries} attempts")
                    raise

            except ValidationError as e:
                logger.error(f"Validation error: {e}")
                raise  # Don't retry validation errors

            except APIError as e:
                if attempt < self.client.max_retries:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.warning(f"API error. Retrying in {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.error(f"API error after retries: {e}")
                    raise

        raise Exception(f"Failed after {self.client.max_retries} retries")

# Usage
client = OneRouterClient("unf_live_your_key")
try:
    payment = client.create_payment_with_retry({
        "amount": 1000,
        "currency": "INR",
        "customer_id": "cust_123"
    })
    print(f"Payment created: {payment['transaction_id']}")
except Exception as e:
    print(f"Failed: {e}")`}
          </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Best Practices</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Implement Exponential Backoff</h4>
                <p className="text-sm text-[#888]">Use exponential backoff for retries to avoid overwhelming the API.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Use Idempotency Keys</h4>
                <p className="text-sm text-[#888]">Prevent duplicate transactions by using idempotency keys for critical operations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Log Errors with Context</h4>
                <p className="text-sm text-[#888]">Log errors with sufficient context for debugging while avoiding sensitive data.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Monitor API Health</h4>
                <p className="text-sm text-[#888]">Implement health checks and monitor API availability in your dashboard.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}