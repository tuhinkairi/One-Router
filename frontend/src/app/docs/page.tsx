'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

/**
 * Render the main documentation page with a sticky header, responsive navigation, a sidebar (desktop), a mobile section selector, and the content area for selectable documentation sections.
 *
 * @returns The JSX element for the DocsPage layout containing navigation, section controls, and the active documentation section's content.
 */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sections = [
    { id: 'overview', title: 'Overview', icon: '🚀' },
    { id: 'quickstart', title: 'Quick Start', icon: '⚡' },
    { id: 'sdk', title: 'Python SDK', icon: '🐍' },
    { id: 'js-sdk', title: 'JavaScript SDK', icon: '⚛️' },
    { id: 'management', title: 'Management API', icon: '🔧' },
    { id: 'api', title: 'REST API Reference', icon: '🌐' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔧' }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      {/* Modern Navbar */}
        <header className="sticky top-0 z-50 bg-black border-b border-[#222]">
          <div className="w-full h-16 flex items-center border-l border-r border-[#222] relative">
            {/* Vertical gridlines - hidden on mobile */}
            <div className="absolute inset-0 flex pointer-events-none hidden md:flex">
              <div className="flex-1 border-r border-[#222]"></div>
              <div className="flex-1 border-r border-[#222]"></div>
              <div className="flex-1 border-r border-[#222]"></div>
            </div>

            <div className="w-full h-full flex justify-between items-center px-4 md:px-8 relative z-10">
              {/* Left - Logo */}
              <div className="flex items-center gap-2 border-r border-[#222] pr-4 md:pr-8 flex-1">
                <div className="w-8 h-8 bg-gradient-to-br from-black  to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-cyan-500/25 hover:scale-110">
                  </div>
                <div className="font-bold text-sm md:text-lg font-mono">
                  
                  <span className="text-white">ONE</span>
                  <span className="text-cyan-400">ROUTER</span>
                </div>
              </div>

              {/* Middle - Navigation Links */}
              <nav className="hidden lg:flex flex-1 items-center justify-center gap-4 xl:gap-12 border-r border-[#222] px-4 xl:px-8">
                 <Link href="/docs" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   docs
                 </Link>
                 <a href="/privacy" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   privacy
                 </a>
                 <a href="/terms" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   terms
                 </a>
                 <Link href="/pricing" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   pricing
                 </Link>
                 <a href="/contact" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   contact
                 </a>
                 <a href="/community" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   community
                 </a>
                 <a href="/enterprise" className="text-[#888] hover:text-white transition-all duration-300 font-mono text-xs xl:text-sm hover:underline decoration-[#00ff88]">
                   enterprise
                 </a>
               </nav>

              {/* Right - Auth & GitHub */}
              <div className="flex items-center gap-2 md:gap-4 lg:gap-6 justify-end flex-1 pl-4 md:pl-8">
                <a href="https://github.com" className="text-[#888] hover:text-white transition-all duration-300 hover:scale-110">
                  <Github className="w-4 md:w-5 h-4 md:h-5" />
                </a>

                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="bg-white text-black hover:bg-gray-200 font-mono font-bold text-xs md:text-sm px-3 md:px-6 py-2 rounded transition-all duration-300 transform hover:scale-105 hidden sm:block">
                      Sign In
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button className="bg-white text-black hover:bg-gray-200 font-mono font-bold text-xs md:text-sm px-3 md:px-6 py-2 rounded transition-all duration-300 transform hover:scale-105 hidden sm:block">
                      Dashboard
                    </Button>
                  </Link>
                  <UserButton />
                </SignedIn>

                {/* Mobile Menu Button */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-[#888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Menu - Dropdown */}
             {mobileMenuOpen && (
               <div className="lg:hidden absolute top-16 left-0 right-0 bg-black border-b border-[#222] px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                 <Link href="/docs" className="block text-[#888] hover:text-white transition-colors duration-200 font-mono text-sm py-2 border-b border-[#222]">
                   docs
                 </Link>
                 <Link href="/privacy" className="block text-[#888] hover:text-white transition-colors duration-200 font-mono text-sm py-2 border-b border-[#222]">
                   privacy
                 </Link>
                 <Link href="/terms" className="block text-[#888] hover:text-white transition-colors duration-200 font-mono text-sm py-2 border-b border-[#222]">
                   terms
                 </Link>
                 <Link href="/pricing" className="block text-[#888] hover:text-white transition-colors duration-200 font-mono text-sm py-2 border-b border-[#222]">
                   pricing
                 </Link>
                 <Link href="/contact" className="block text-[#888] hover:text-white transition-colors duration-200 font-mono text-sm py-2 border-b border-[#222]">
                   contact
                 </Link>
               </div>
             )}
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Hidden on mobile when not expanded */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
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
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
                    {sections.slice(5).map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activeSection === section.id
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
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

          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden mb-4">
            <div className="flex overflow-x-auto gap-2 pb-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-h-[600px] w-full">
            <div className="border border-gray-800 rounded-lg p-4 sm:p-6 lg:p-8">
              {activeSection === 'overview' && <OverviewSection />}
              {activeSection === 'quickstart' && <QuickStartSection />}
              {activeSection === 'sdk' && <SDKSection />}
              {activeSection === 'js-sdk' && <JSSDKSection />}
              {activeSection === 'sms' && <SMSSection />}
              {activeSection === 'email' && <EmailSection />}
              {activeSection === 'payments' && <PaymentsSection />}
              {activeSection === 'api' && <APISection />}
              {activeSection === 'management' && <ManagementAPISection />}
              {activeSection === 'troubleshooting' && <TroubleshootingSection />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the Overview documentation section describing OneRouter's purpose, key features, supported services, quickstart links, and pricing.
 *
 * @returns The React element for the Overview section of the docs page.
 */
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
            </ul>
          </div>
          <div className="border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">📱 SMS</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Twilio</li>
            </ul>
          </div>
          <div className="border border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">📧 Email</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Resend</li>
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
          Note: You also pay your provider&apos;s fees (Razorpay, PayPal, etc.) directly to them. OneRouter only charges for API usage.
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the Quick Start documentation section with five onboarding steps, provider credential guidance, SDK install commands, and example usage for Python and JavaScript.
 *
 * @returns A React element containing the Quick Start content (steps, notes, code examples, and links) for the docs page.
 */
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
            <p className="text-gray-400 text-sm">Supported providers and required credentials:</p>
            <ul className="text-gray-300 text-sm space-y-1 ml-4">
              <li>• Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET</li>
              <li>• PayPal: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET</li>
              <li>• Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN</li>
              <li>• Resend: RESEND_API_KEY</li>
            </ul>
          </div>
          <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
            <p className="text-cyan-400 text-sm">
              <strong>Note:</strong> Configure credentials in the dashboard at <code className="text-cyan-300">/onboarding</code> or upload a .env file.
            </p>
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

/**
 * Renders the Python SDK documentation section used on the docs page.
 *
 * Provides installation instructions, base URL guidance, full SDK setup examples,
 * framework integration snippets (Flask, FastAPI, Django), and advanced usage
 * patterns such as idempotency, bulk operations, and error handling.
 *
 * @returns The JSX element representing the Python SDK documentation section.
 */
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
              <code className="text-cyan-400">python -c &quot;import onerouter; print(&apos;OneRouter SDK installed!&apos;)&quot;</code>
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
              <code className="text-white">https://api.yourdomain.com</code>
            </div>
            <p className="text-gray-400 text-sm mt-2">Replace with your actual production API URL</p>
          </div>
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-4">
            <p className="text-cyan-400 text-sm">
              <strong>Tip:</strong> Always use environment variables for URLs to easily switch between environments.
            </p>
          </div>
        </div>
      </div>

      {/* Complete Setup */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Complete SDK Setup</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`from onerouter import OneRouter

# Production Setup - Use your actual production URL
import os
client = OneRouter(
    api_key="unf_live_your_production_key_here",
    base_url=os.getenv("ONEROUTER_BASE_URL", "https://api.yourdomain.com"),
    timeout=30,
    max_retries=3
)

# Development Setup
client = OneRouter(
    api_key="unf_test_your_test_key_here",
    base_url="http://localhost:8000",
    timeout=60,
    max_retries=5
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

/**
 * Renders the JavaScript SDK documentation section for the docs page.
 *
 * Includes installation commands, base URL guidance, a complete SDK setup example,
 * and usage examples for sending SMS, creating payments, and sending email.
 *
 * @returns The JSX element for the JavaScript SDK documentation section.
 */
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
              <code className="text-white">https://api.yourdomain.com</code>
            </div>
            <p className="text-gray-400 text-sm mt-2">Replace with your actual production API URL</p>
          </div>
        </div>
      </div>

      {/* Complete Setup */}
      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Complete SDK Setup</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`import { OneRouter } from '@onerouter/sdk';

// Production - Use environment variable or actual URL
const client = new OneRouter({
  apiKey: process.env.ONEROUTER_API_KEY || 'unf_live_your_production_key',
  baseURL: process.env.ONEROUTER_BASE_URL || 'https://api.yourdomain.com',
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

/**
 * Renders the SMS Integration documentation section with prerequisites, sample usage for sending SMS,
 * advanced options (custom from number, idempotency), delivery status retrieval, and pricing notes.
 *
 * @returns The JSX element for the SMS documentation section
 */
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
        <p className="text-gray-400 text-sm">Note: You also pay Twilio&apos;s standard per-SMS fees directly to Twilio.</p>
      </div>
    </div>
  );
}

/**
 * Renders the Email Integration documentation section for OneRouter.
 *
 * This section presents prerequisites, examples for sending emails (including attachments and reply-to),
 * instructions for retrieving email status, and pricing notes related to Resend integration.
 *
 * @returns A JSX element containing the email integration documentation UI.
 */
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
        <p className="text-gray-400 text-sm">Note: You also pay Resend&apos;s fees directly to Resend.</p>
      </div>
    </div>
  );
}

/**
 * Renders the Payments documentation section for the docs page.
 *
 * Includes supported payment methods (India and international), feature list (subscriptions, refunds, multi-currency),
 * example usage for creating UPI and card payments, payment operations (get status, refund), and pricing notes.
 *
 * @returns A React element containing the payments documentation UI
 */
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
        <p className="text-gray-400 text-sm">Note: You also pay your provider&apos;s transaction fees (Razorpay: ~2%, PayPal: ~3%) directly to them.</p>
      </div>
    </div>
  );
}

/**
 * Renders the REST API reference section of the documentation page.
 *
 * Provides base URLs, authentication examples, SMS/Payment/Email endpoint examples,
 * common error response samples, rate limit information, and a link to the interactive Swagger UI.
 *
 * @returns A JSX element containing the API reference content for display in the docs page.
 */
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
              <code className="text-white">https://api.yourdomain.com/v1</code>
            </div>
            <p className="text-gray-400 text-sm mt-2">Replace with your actual production API URL</p>
          </div>
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-4">
            <p className="text-cyan-400 text-sm">
              <strong>Full API Docs:</strong> Visit <code className="text-cyan-300">/docs</code> on your API server for interactive Swagger documentation.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Authentication</h3>
        <div className="border border-gray-700 rounded p-4 bg-gray-900">
          <pre className="text-white text-sm overflow-x-auto">
{`# Bearer Token Authentication
curl -H "Authorization: Bearer unf_live_your_api_key_here" \
     http://localhost:8000/v1/sms

# Or API Key in header
curl -H "X-API-Key: unf_live_your_api_key_here" \
     http://localhost:8000/v1/sms`}
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
{`curl -X POST http://localhost:8000/v1/sms \
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
              <code className="white">{`/v1/sms/{message_id}`}</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -H "Authorization: Bearer unf_live_xxx" \
     http://localhost:8000/v1/sms/SM1234567890`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Payment Endpoints</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Create Payment Order</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/v1/payments/orders</code>
            </div>
            <div className="border border-gray-700 rounded p-4 bg-gray-900">
              <pre className="text-white text-sm overflow-x-auto">
{`curl -X POST http://localhost:8000/v1/payments/orders \
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
              <code className="text-white">{`/v1/payments/orders/{transaction_id}`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Capture Payment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">{`/v1/payments/capture`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Refund Payment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">{`/v1/payments/refunds`}</code>
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
{`curl -X POST http://localhost:8000/v1/email \
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

      {/* Link to Interactive API Docs */}
      <div className="border border-cyan-500/30 rounded-lg p-6 bg-cyan-900/10">
        <h3 className="text-xl font-semibold text-cyan-400 mb-4">Interactive API Documentation</h3>
        <p className="text-gray-300 mb-4">
          For complete, interactive API documentation with try-it-out functionality, visit the Swagger UI:
        </p>
        <div className="bg-[#1a1a1a] border border-cyan-500/30 rounded p-4">
          <code className="text-cyan-400">http://localhost:8000/docs</code>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          The Swagger documentation includes all endpoints, request/response schemas, and allows you to test API calls directly from your browser.
        </p>
      </div>
    </div>
  );
}

/**
 * Render the Management API documentation section showing available management endpoints and authentication details.
 *
 * This component displays grouped cards for API Keys Management, Connected Services Management, Environment Management,
 * Onboarding, and an authentication example required to call the management endpoints.
 *
 * @returns A React element containing the Management API documentation UI.
 */
function ManagementAPISection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Management API</h1>
        <p className="text-gray-300 leading-relaxed">
          Manage your OneRouter account, API keys, and connected services programmatically.
        </p>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">API Keys Management</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-2">List API Keys</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">/api/keys</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Create API Key</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/api/keys</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Delete API Key</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 font-mono">DELETE</span>
              <code className="text-white">{`/api/keys/{key_id}`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Disable/Enable API Key</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">{`/api/keys/{key_id}/disable`}</code>
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">{`/api/keys/{key_id}/enable`}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Connected Services Management</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-2">List Connected Services</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">/api/services</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Get Service Status</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">{`/api/services/{service_name}/status`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Update Service Credentials</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 font-mono">PUT</span>
              <code className="text-white">{`/api/services/{service_name}/credentials`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Delete/Disconnect Service</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 font-mono">DELETE</span>
              <code className="text-white">{`/api/services/{service_name}`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Disconnect All Services</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 font-mono">DELETE</span>
              <code className="text-white">/api/services</code>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Environment Management</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-2">Get Service Environments</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">{`/api/{service_name}/environments`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Switch Service Environment</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">{`/api/{service_name}/switch-environment`}</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Switch All Environments</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/api/services/switch-all-environments</code>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Onboarding</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-2">Parse .env File</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/api/onboarding/parse</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Configure Services</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-mono">POST</span>
              <code className="text-white">/api/onboarding/configure</code>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">Get User Services</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono">GET</span>
              <code className="text-white">/api/onboarding/services</code>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cyan-900/10 border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-cyan-400 mb-4">Authentication Required</h3>
        <p className="text-gray-300 mb-4">
          All management API endpoints require authentication with a valid API key.
        </p>
        <div className="bg-[#1a1a1a] border border-gray-700 rounded p-4">
          <pre className="text-white text-sm">
{`curl -H "Authorization: Bearer unf_live_your_api_key" \
     http://localhost:8000/api/services`}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the Troubleshooting documentation section with common issues, debugging tips, and support resources.
 *
 * @returns A JSX element containing troubleshooting content: common issues and their checks, debugging tips (including example debug logging and mode guidance), and links to additional help resources.
 */
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
            <h4 className="text-white font-medium mb-2"> 401 Invalid API Key</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Check that you&apos;re using the correct API key (not test key in production)</li>
              <li>Verify there are no extra spaces in the Authorization header</li>
              <li>Ensure your API key hasn&apos;t been revoked from the dashboard</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2"> Service Not Configured</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Go to dashboard and configure credentials for the service you&apos;re using</li>
              <li>For SMS: Configure Twilio credentials</li>
              <li>For Payments: Configure Razorpay/PayPal/Stripe credentials</li>
              <li>For Email: Configure Resend credentials</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2"> Payment Not Processing</h4>
            <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
              <li>Verify your provider account has sufficient balance</li>
              <li>Check that provider credentials are correct and not expired</li>
              <li>Ensure you&apos;re using the correct environment (test/live)</li>
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
            <h4 className="text-white font-medium mb-2"> Webhooks Not Working</h4>
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
          If you&apos;re still having issues, check these resources:
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