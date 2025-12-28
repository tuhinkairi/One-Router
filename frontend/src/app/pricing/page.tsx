import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Shield, TrendingUp, Star, Bolt, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const PricingCard = ({ 
  title, 
  price, 
  description, 
  features, 
  highlight, 
  popular = false,
  buttonLabel = 'Get Started'
}: any) => (
  <Card className={`bg-[#1a1a1a] border-2 transition-all duration-300 ${
        highlight ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105' : 
        popular ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 
        'border-[#222] hover:border-cyan-500/50'
      }`}>
      <CardContent className="p-6">
        {popular && (
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            POPULAR
          </div>
        )}
        <div className="mb-4">
          <h3 className="text-3xl font-bold text-white mb-2">{title}</h3>
          <p className="text-4xl font-bold text-cyan-500">{price}</p>
        </div>
        <p className="text-[#888] mb-6">{description}</p>
        <ul className="space-y-3 mb-6">
          {features.map((feature: any, index: number) => (
            <li key={index} className="flex items-start gap-3">
              <Check className={`w-5 h-5 shrink-0 ${feature.highlight ? 'text-cyan-500' : 'text-[#666]'}`} />
              <span className="text-[#888] text-sm">{feature.text}</span>
            </li>
          ))}
        </ul>
        <Link href="/onboarding">
          <Button className={`w-full ${
            highlight ? 'bg-cyan-500 hover:bg-cyan-600 text-black' :
            popular ? 'bg-cyan-400 hover:bg-cyan-500 text-black' :
            'bg-[#1a1a1a] hover:bg-cyan-500 text-white'
          } font-medium`}>
            {buttonLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
);

const FeatureItem = ({ icon: Icon, title, description }: any) => (
  <div className="p-6 border-b border-[#222] last:border-0">
    <div className="flex items-start gap-4">
      <div className="flex shrink-0">
        <Icon className="w-8 h-8 text-cyan-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-[#888] text-sm">{description}</p>
      </div>
    </div>
  </div>
);

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-cyan-500" />
              <h1 className="text-2xl font-bold">Pricing</h1>
            </div>
            <Link href="/onboarding">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-[#888] max-w-2xl mx-auto mb-8">
            Scale your payments infrastructure with predictable pricing and powerful features
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/onboarding">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium px-8">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <PricingCard
            title="Starter"
            price="Free"
            description="Perfect for developers and small projects starting out"
            features={[
              { text: "10,000 API requests/month" },
              { text: "2 payment gateways", highlight: true },
              { text: "Basic analytics", highlight: true },
              { text: "Test environment" },
              { text: "Community support" },
              { text: "99.9% uptime SLA" },
            ]}
            buttonLabel="Get Started Free"
          />

          <PricingCard
            title="Professional"
            price="$49/mo"
            description="For growing businesses with payment volume"
            features={[
              { text: "100,000 API requests/month" },
              { text: "Unlimited payment gateways", highlight: true },
              { text: "Advanced analytics", highlight: true },
              { text: "Test + Live environments", highlight: true },
              { text: "Priority email support", highlight: true },
              { text: "Webhook support", highlight: true },
              { text: "Custom rate limits" },
              { text: "99.95% uptime SLA" },
            ]}
            popular={true}
          />

          <PricingCard
            title="Enterprise"
            price="Custom"
            description="For large-scale operations and high-volume needs"
            features={[
              { text: "Unlimited API requests", highlight: true },
              { text: "Unlimited payment gateways", highlight: true },
              { text: "Dedicated support", highlight: true },
              { text: "All environments: Test, Live, Sandbox", highlight: true },
              { text: "Real-time monitoring", highlight: true },
              { text: "Custom integrations", highlight: true },
              { text: "99.99% uptime SLA" },
              { text: "SLA credits for downtime", highlight: true },
            ]}
            buttonLabel="Contact Sales"
          />
        </div>

        {/* Feature Comparison */}
        <Card className="bg-[#1a1a1a] border-[#222] mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-cyan-500">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="text-left py-3 px-4 text-[#888] font-semibold">Feature</th>
                    <th className="text-center py-3 px-4 text-[#888] font-semibold">Starter</th>
                    <th className="text-center py-3 px-4 text-[#888] font-semibold">Professional</th>
                    <th className="text-center py-3 px-4 text-[#888] font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="text-[#888]">
                  <tr className="border-b border-[#222]">
                    <td className="py-3 px-4 font-medium">API Requests</td>
                    <td className="text-center py-3 px-4">10K</td>
                    <td className="text-center py-3 px-4">100K</td>
                    <td className="text-center py-3 px-4 text-green-500 font-bold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="py-3 px-4 font-medium">Payment Gateways</td>
                    <td className="text-center py-3 px-4">2</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="py-3 px-4 font-medium">Environments</td>
                    <td className="text-center py-3 px-4">Test</td>
                    <td className="text-center py-3 px-4">Test + Live</td>
                    <td className="text-center py-3 px-4">All + Custom</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="py-3 px-4 font-medium">Analytics</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Advanced</td>
                    <td className="text-center py-3 px-4 text-cyan-500 font-bold">Real-time</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Support</td>
                    <td className="text-center py-3 px-4">Community</td>
                    <td className="text-center py-3 px-4">Priority Email</td>
                    <td className="text-center py-3 px-4 text-green-500 font-bold">Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Platform Features */}
        <h2 className="text-3xl font-bold mb-8">Platform Features</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <FeatureItem
            icon={Zap}
            title="Unified API"
            description="Single API for Razorpay and PayPal. Integrate once, support all major payment gateways seamlessly."
          />
          <FeatureItem
            icon={Shield}
            title="Bank-Grade Security"
            description="AES-256 encryption for credentials, webhook signature verification, and CSRF protection built-in."
          />
          <FeatureItem
            icon={TrendingUp}
            title="Developer Experience"
            description="Comprehensive SDKs for Python, comprehensive REST API documentation, and real-time analytics dashboard."
          />
          <FeatureItem
            icon={Star}
            title="Scalable Infrastructure"
            description="99.9%+ uptime, automatic failover, and global edge caching for lightning-fast responses."
          />
        </div>

        {/* Included in All Plans */}
        <Card className="bg-[#1a1a1a] border-[#222] mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-cyan-500">Included in All Plans</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                <Shield className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white mb-2">Secure Storage</h3>
                <p className="text-sm text-[#888]">
                  Encrypted credential storage with AES-256-GCM
                </p>
              </div>
              <div className="text-center p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                <Bolt className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white mb-2">API Access</h3>
                <p className="text-sm text-[#888]">
                  Rate-limited API keys with detailed usage tracking
                </p>
              </div>
              <div className="text-center p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                <CheckCircle className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white mb-2">Environment Isolation</h3>
                <p className="text-sm text-[#888]">
                  Separate test and live environments for safe development
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="bg-[#1a1a1a] border-[#222] mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-cyan-500">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How do I get started?</h3>
              <p className="text-[#888]">
                Create a free account to get API keys instantly. No credit card required to get started.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Can I change plans later?</h3>
              <p className="text-[#888]">
                Yes, you can upgrade or downgrade at any time. Pro-rated adjustments will be applied automatically.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What payment gateways do you support?</h3>
              <p className="text-[#888]">
                We support Razorpay and PayPal out of the box. You can add them after creating your account.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Is there a free trial?</h3>
              <p className="text-[#888]">
                Yes! All plans include a 14-day free trial. No credit card required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How is billing handled?</h3>
              <p className="text-[#888]">
                Billing is monthly with automatic invoicing. You can view and download invoices from your dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What happens if I exceed API limits?</h3>
              <p className="text-[#888]">
                We'll notify you before limits are reached. You can upgrade your plan or configure custom rate limits for Enterprise.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 mb-8">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Scale Your Payments?</h2>
            <p className="text-[#888] mb-6 max-w-2xl mx-auto">
              Join thousands of developers who trust OneRouter for their payment infrastructure. Get started in minutes with our free trial.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/onboarding">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="border-[#222] text-white hover:border-cyan-500">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm text-[#888]">
              <Link href="/docs">Documentation</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <p className="text-sm text-[#666]">
              © 2025 OneRouter. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
