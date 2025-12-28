'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Book,
  Code,
  Zap,
  Shield,
  Search,
  Menu,
  Github,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  Play,
  Terminal,
  Database,
  Key,
  Users,
  CreditCard,
  Webhook,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: Book,
      content: <OverviewSection />
    },
    {
      id: 'quickstart',
      title: 'Quick Start',
      icon: Zap,
      content: <QuickStartSection />
    },
    {
      id: 'authentication',
      title: 'Authentication',
      icon: Key,
      content: <AuthenticationSection />
    },
    {
      id: 'sdk',
      title: 'SDK Guide',
      icon: Code,
      content: <SDKSection />
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: Database,
      content: <APIReferenceSection />
    }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContent = sections.find(s => s.id === activeSection)?.content || <OverviewSection />;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-black to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-mono text-sm font-bold">OR</span>
                </div>
                <span className="font-bold text-lg font-mono text-white">OneRouter</span>
              </Link>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#222] rounded-lg pl-10 pr-4 py-2 text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="https://github.com/onerouter" target="_blank" className="text-[#888] hover:text-white">
                <Github className="w-5 h-5" />
              </Link>
              <Link href="/api-keys">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium">
                  Get API Keys
                </Button>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#888] hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`lg:w-64 flex-shrink-0 ${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
            <nav className="sticky top-24">
              <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Documentation</h3>
                <ul className="space-y-2">
                  {filteredSections.map(section => {
                    const Icon = section.icon;
                    return (
                      <li key={section.id}>
                        <button
                          onClick={() => {
                            setActiveSection(section.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            activeSection === section.id
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-[#888] hover:text-white hover:bg-[#222]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{section.title}</span>
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
                    Get API Keys →
                  </Link>
                  <Link href="/pricing" className="block text-[#888] hover:text-cyan-400 text-sm">
                    View Pricing →
                  </Link>
                  <Link href="/contact" className="block text-[#888] hover:text-cyan-400 text-sm">
                    Contact Support →
                  </Link>
                  <Link href="/docs/sdk" className="block text-[#888] hover:text-cyan-400 text-sm">
                    Python SDK Docs →
                  </Link>
                  <Link href="https://github.com/onerouter/sdk-python" target="_blank" className="block text-[#888] hover:text-cyan-400 text-sm">
                    GitHub Repository →
                  </Link>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-[600px]">
            <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-8">
              {activeContent}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-4">OneRouter API Documentation</h1>
        <p className="text-xl text-[#888] leading-relaxed">
          Welcome to OneRouter&apos;s comprehensive API documentation. Learn how to integrate payment processing,
          manage subscriptions, and build powerful financial applications.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-cyan-500" />
              <h3 className="text-lg font-semibold text-white">Quick Start</h3>
            </div>
            <p className="text-[#888] mb-4">
              Get up and running in minutes with our SDKs and REST API.
            </p>
            <Button
              onClick={() => document.querySelector('[data-section="quickstart"]')?.scrollIntoView()}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              Start Here →
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-cyan-500" />
              <h3 className="text-lg font-semibold text-white">API Reference</h3>
            </div>
            <p className="text-[#888] mb-4">
              Complete API reference with examples and parameters.
            </p>
            <Button
              onClick={() => document.querySelector('[data-section="api-reference"]')?.scrollIntoView()}
              variant="outline"
              className="border-[#222] text-white hover:border-cyan-500"
            >
              View API →
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-[#0a0a0a] rounded-lg border border-[#222]">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-cyan-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
          <p className="text-sm text-[#888]">
            Bank-grade security with AES-256 encryption and OAuth 2.0
          </p>
        </div>

        <div className="text-center p-6 bg-[#0a0a0a] rounded-lg border border-[#222]">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-cyan-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Fast</h3>
          <p className="text-sm text-[#888]">
            99.9% uptime with global CDN and edge caching
          </p>
        </div>

        <div className="text-center p-6 bg-[#0a0a0a] rounded-lg border border-[#222]">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Code className="w-6 h-6 text-cyan-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Developer Friendly</h3>
          <p className="text-sm text-[#888]">
            SDKs for Python, JavaScript, and REST API for all languages
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-cyan-500 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Supported Payment Gateways</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-[#0a0a0a] rounded border border-[#222]">
                  <p className="text-sm font-medium text-cyan-400">Razorpay</p>
                  <p className="text-xs text-[#666]">India&apos;s leading payment gateway</p>
                </div>
                <div className="p-3 bg-[#0a0a0a] rounded border border-[#222]">
                  <p className="text-sm font-medium text-blue-400">PayPal</p>
                  <p className="text-xs text-[#666]">Global payments and subscriptions</p>
                </div>

              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Quick Start Guide</h1>
        <p className="text-[#888] leading-relaxed">
          Get started with OneRouter in under 5 minutes. Follow this step-by-step guide to make your first API call.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-black text-sm px-2 py-1 rounded font-mono">1</span>
              Create an Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#888] mb-4">
              Sign up for a free OneRouter account to get your API keys.
            </p>
            <Link href="/onboarding">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                Sign Up Free →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-black text-sm px-2 py-1 rounded font-mono">2</span>
              Get Your API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-[#888]">
                Navigate to your dashboard and generate API keys for the test environment.
              </p>
              <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
                <p className="text-sm text-cyan-400 mb-2">Your API Keys:</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-[#888] text-sm">Key ID: </span>
                    <code className="text-cyan-400">rzp_test_xxxxxxxxxxxxxx</code>
                  </div>
                  <div>
                    <span className="text-[#888] text-sm">Key Secret: </span>
                    <code className="text-cyan-400">secret_xxxxxxxxxxxxxx</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-black text-sm px-2 py-1 rounded font-mono">3</span>
              Make Your First API Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-[#888]">Create a payment order using our REST API:</p>

              <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm text-cyan-400">cURL Example</span>
                </div>
                <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST "https://api.onerouter.com/v1/orders" \\
  -u "rzp_test_xxxxxxxxxxxxxx:secret_xxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "currency": "USD",
    "receipt": "order_123"
  }'`}
                </pre>
              </div>

              <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm text-cyan-400">Python SDK</span>
                </div>
                <pre className="text-sm text-cyan-400 overflow-x-auto">
{`import onerouter

client = onerouter.Client(
    api_key="your_api_key",
    api_secret="your_api_secret"
)

order = client.orders.create({
    "amount": 1000,
    "currency": "USD",
    "receipt": "order_123"
})

print(f"Order ID: {order['id']}")`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-black text-sm px-2 py-1 rounded font-mono">4</span>
              Test the Payment Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-[#888]">
                Use the payment URL from the response to complete a test transaction.
              </p>
              <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#222]">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Success Response</p>
                    <pre className="text-xs text-cyan-400 mt-2">
{`{
  "id": "order_xyz123",
  "amount": 1000,
  "currency": "USD",
  "status": "created",
  "payment_link": "https://checkout.onerouter.com/pay/xyz123"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
        <CardContent className="p-8 text-center">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">🎉 Congratulations!</h3>
              <p className="text-[#888] mb-4">
                You&apos;ve successfully created your first payment order. Your integration is now ready for testing.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/api-keys">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                    Manage API Keys
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-[#222] text-white hover:border-cyan-500">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthenticationSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Authentication</h1>
        <p className="text-[#888] leading-relaxed">
          Secure your API requests with proper authentication. OneRouter uses HTTP Basic Auth with your API credentials.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardHeader>
          <CardTitle className="text-white">API Key Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">How It Works</h3>
            <p className="text-[#888] mb-4">
              Every API request must include your API key credentials in the Authorization header using HTTP Basic Auth.
            </p>

            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
              <p className="text-sm text-cyan-400 mb-2">Authorization Format:</p>
              <pre className="text-sm text-white">
                Authorization: Basic base64(key_id:key_secret)
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Example Request</h3>
            <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
              <pre className="text-sm text-green-400">
{`curl -X GET "https://api.onerouter.com/v1/payments/orders" \\
  -H "Authorization: Basic cnpwX3Rlc3RfWFhYWFhYWFhYWFhYOg==" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-500" />
              Test Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#888] mb-3">
              Use test keys for development and testing. No real money involved.
            </p>
            <div className="space-y-2">
              <div>
                <span className="text-[#666] text-sm">Key ID: </span>
                <code className="text-cyan-400">rzp_test_xxxxxxxxxxxxxxxx</code>
              </div>
              <div>
                <span className="text-[#666] text-sm">Key Secret: </span>
                <code className="text-cyan-400">secret_xxxxxxxxxxxxxxxx</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              Live Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#888] mb-3">
              Use live keys for production. Handle real transactions and payments.
            </p>
            <div className="space-y-2">
              <div>
                <span className="text-[#666] text-sm">Key ID: </span>
                <code className="text-green-400">rzp_live_xxxxxxxxxxxxxxxx</code>
              </div>
              <div>
                <span className="text-[#666] text-sm">Key Secret: </span>
                <code className="text-green-400">secret_xxxxxxxxxxxxxxxx</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardHeader>
          <CardTitle className="text-white">Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Never Share Secrets</h4>
                <p className="text-sm text-[#888]">Keep your API secrets private and never expose them in client-side code.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Use HTTPS Only</h4>
                <p className="text-sm text-[#888]">All API requests must use HTTPS. HTTP requests will be rejected.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Rotate Keys Regularly</h4>
                <p className="text-sm text-[#888]">Regenerate your API keys every 90 days for enhanced security.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Environment Separation</h4>
                <p className="text-sm text-[#888]">Always use test keys for development and live keys only for production.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SDKSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">SDK Installation & Usage</h1>
        <p className="text-[#888] leading-relaxed">
          OneRouter provides official SDKs for popular programming languages to make integration faster and easier.
        </p>
      </div>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222] text-center">
              <Code className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Python</h3>
              <p className="text-[#666] text-sm">pip install onerouter</p>
              <Badge className="mt-2 bg-green-500/20 text-green-400">Available</Badge>
            </div>
            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222] text-center opacity-50">
              <Code className="w-8 h-8 text-[#666] mx-auto mb-2" />
              <h3 className="text-[#666] font-medium mb-1">JavaScript</h3>
              <p className="text-[#666] text-sm">Coming Soon</p>
              <Badge variant="secondary" className="mt-2">Planned</Badge>
            </div>
            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222] text-center opacity-50">
              <Code className="w-8 h-8 text-[#666] mx-auto mb-2" />
              <h3 className="text-[#666] font-medium mb-1">Java</h3>
              <p className="text-[#666] text-sm">Coming Soon</p>
              <Badge variant="secondary" className="mt-2">Planned</Badge>
            </div>
            <div className="p-4 bg-[#1a1a1a] rounded border border-[#222] text-center">
              <Terminal className="w-8 h-8 text-[#666] mx-auto mb-2" />
              <h3 className="text-[#666] font-medium mb-1">REST API</h3>
              <p className="text-[#666] text-sm">All Languages</p>
              <Badge className="mt-2 bg-cyan-500/20 text-cyan-400">Direct</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0a0a] border-[#222]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Python SDK Installation</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4 mb-4">
            <pre className="text-sm text-green-400">pip install onerouter</pre>
          </div>

          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Basic Usage</h3>
          <div className="bg-[#1a1a1a] border border-[#222] rounded p-4">
            <pre className="text-sm text-cyan-400">{`import onerouter

client = onerouter.Client(
    api_key="your_api_key",
    api_secret="your_api_secret"
)

order = client.orders.create({
    "amount": 1000,
    "currency": "USD",
    "receipt": "order_123"
})

print(f"Order created: {order['id']}")`}</pre>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <ExternalLink className="w-6 h-6 text-cyan-500 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Complete SDK Documentation</h3>
              <p className="text-[#888] mb-4">
                Download the complete SDK documentation for detailed API reference, examples, and advanced usage.
              </p>
              <Link
                href="/docs/sdk"
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium px-4 py-2 rounded inline-block"
              >
                📄 Full SDK Docs
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function APIReferenceSection() {
  const [activeEndpoint, setActiveEndpoint] = useState('orders');

  const endpoints = {
    orders: {
      title: 'Orders',
      description: 'Create and manage payment orders',
      methods: [
        {
          method: 'POST',
          path: '/v1/orders',
          description: 'Create a new payment order',
          parameters: [
            { name: 'amount', type: 'integer', required: true, description: 'Amount in the smallest currency unit' },
            { name: 'currency', type: 'string', required: true, description: 'Currency code (e.g., INR, USD, EUR)' },
            { name: 'receipt', type: 'string', required: false, description: 'Receipt number for the order' }
          ],
          example: {
            request: `{
  "amount": 1000,
  "currency": "USD",
  "receipt": "order_123"
}`,
            response: `{
  "id": "order_xyz123",
  "amount": 1000,
  "currency": "USD",
  "status": "created"
}`
          }
        }
      ]
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">API Reference</h1>
        <p className="text-[#888] leading-relaxed">
          Complete API documentation with request/response examples and parameter details.
        </p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <Card className="bg-[#0a0a0a] border-[#222]">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Endpoints</h3>
              <div className="space-y-2">
                {Object.entries(endpoints).map(([key, endpoint]) => (
                  <button
                    key={key}
                    onClick={() => setActiveEndpoint(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeEndpoint === key
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-[#888] hover:text-white hover:bg-[#222]'
                    }`}
                  >
                    {endpoint.title}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          <Card className="bg-[#0a0a0a] border-[#222]">
            <CardHeader>
              <CardTitle className="text-white">
                {endpoints[activeEndpoint as keyof typeof endpoints].title}
              </CardTitle>
              <p className="text-[#888]">
                {endpoints[activeEndpoint as keyof typeof endpoints].description}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {endpoints[activeEndpoint as keyof typeof endpoints].methods.map((method, index) => (
                <div key={index} className="border border-[#222] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="border-blue-500 text-blue-400">
                      {method.method}
                    </Badge>
                    <code className="text-cyan-400">{method.path}</code>
                  </div>

                  <p className="text-[#888] mb-4">{method.description}</p>

                  {method.parameters.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">Parameters</h4>
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
                            {method.parameters.map((param, paramIndex) => (
                              <tr key={paramIndex} className="border-b border-[#222]">
                                <td className="py-2 px-4"><code>{param.name}</code></td>
                                <td className="py-2 px-4">{param.type}</td>
                                <td className="py-2 px-4">
                                  <Badge variant={param.required ? "default" : "secondary"}>
                                    {param.required ? 'Yes' : 'No'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-4">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-white font-medium mb-2">Example</h4>
                    <div className="mb-4">
                      <p className="text-sm text-cyan-400 mb-2">Request Body:</p>
                      <pre className="bg-[#1a1a1a] border border-[#222] rounded p-3 text-sm text-cyan-400 overflow-x-auto">
                        {method.example.request}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm text-cyan-400 mb-2">Response:</p>
                      <pre className="bg-[#1a1a1a] border border-[#222] rounded p-3 text-sm text-green-400 overflow-x-auto">
                        {method.example.response}
                      </pre>
                    </div>
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