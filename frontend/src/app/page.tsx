'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarqueeDemo } from "@/components/ui/marquee-demo";
import { Github, Plus } from "lucide-react";
import { FeaturesSectionWithHoverEffects } from "@/components/feature-section-with-hover-effects";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
  
    <div className="min-h-screen bg-black text-white">
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

        {/* Hero Section - Better Auth Style */}
        <section className="relative px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-20 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_3px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_3px)] bg-[size:40px_40px] pointer-events-none"></div>
          
          {/* Radial Diffusion Overlay - Fades gridlines at edges */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_60%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
          
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 items-center">
              {/* Left Side - Content */}
              <div>
                {/* Tag */}
                <div className="inline-flex items-center gap-2 mb-6 text-xs sm:text-sm text-[#00ff88] font-mono">
                  <span className="text-lg">⚡</span>
                  <span>Unified API Gateway</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 font-mono leading-tight">
                  One Router for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
                    Every Service
                  </span>
                </h1>

                {/* Subheading */}
                <p className="text-sm sm:text-base md:text-lg text-[#888] mb-8 font-mono">
                  Connect to 127+ services with a single API. No more SDK juggling, no more integration nightmares.
                </p>

                {/* Code Snippet */}
                <div className="bg-black border border-[#0a0a0a] rounded-lg p-3 sm:p-4 mb-8 font-mono text-xs sm:text-sm overflow-x-auto">
                  <div className="text-[#888] mb-3">npm install @onerouter/sdk</div>
                  <div className="text-[#00ff88]">✓ Ready to connect all services</div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-2 sm:gap-4 mb-8 flex-wrap">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 font-mono">
                        GET STARTED
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard">
                      <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 font-mono">
                        GO TO DASHBOARD
                      </Button>
                    </Link>
                  </SignedIn>
                  
                  <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm bg-transparent border border-white/30 text-white font-bold rounded-lg hover:border-white/60 transition-all duration-300 transform hover:scale-105 font-mono flex items-center gap-2 hover:bg-white/5">
                    <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                    <span className="hidden sm:inline">View Documentation</span>
                    <span className="sm:hidden">Docs</span>
                  </Button>
                </div>

                {/* Trust Badge */}
                <div className="text-xs sm:text-sm text-[#666] font-mono">
                  ✓ Trusted by 1000+ developers
                </div>
              </div>

              {/* Right Side - Code Example */}
              <div className="hidden lg:block">
                <div className="bg-[#000] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="bg-[#0a0a0a] border-b border-[#222] px-4 py-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#ffd93d]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#6bcf7f]"></div>
                    </div>
                    <span className="text-xs text-[#666] font-mono">initialize.ts</span>
                    <div className="w-3 h-3"></div>
                  </div>

                  {/* Code Content */}
                  <div className="p-6 font-mono text-sm">
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">1</span>
                      <span className="ml-4">import {'{}'} from <span className="text-[#ff9d76]">&quot;@onerouter/sdk&quot;</span></span>
                    </div>
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">2</span>
                      <span className="ml-4"></span>
                    </div>
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">3</span>
                      <span className="ml-4"><span className="text-[#ff9d76]">const</span> router = <span className="text-[#6bcf7f]">new OneRouter</span>({'{}'}</span>
                    </div>
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">4</span>
                      <span className="ml-4">  apiKey: <span className="text-[#ff9d76]">process.env.ONEROUTER_KEY</span></span>
                    </div>
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">5</span>
                      <span className="ml-4">  services: [<span className="text-[#ff9d76]">&quot;razorpay&quot;</span>, <span className="text-[#ff9d76]">&quot;paypal&quot;</span>, ...]</span>
                    </div>
                    <div className="text-[#888] mb-4">
                      <span className="text-[#666]">6</span>
                      <span className="ml-4">{'}'})</span>
                    </div>
                    <div className="text-[#888]">
                      <span className="text-[#666]">7</span>
                      <span className="ml-4"></span>
                    </div>
                    <div className="text-[#00ff88]">
                      <span className="text-[#666]">8</span>
                      <span className="ml-4">✓ Connected to 127 services</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section with Hover Effects */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <FeaturesSectionWithHoverEffects />
        </section>

        {/* Service Integrations - Marquee */}
        <section className="px-4 sm:px-6 py-12 sm:py-20 bg-[#000]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-sans sm:text-3xl md:text-5xl font-bold text-center mb-4 font-mono">
              Service <span className="text-sky-300">Matrix</span>
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#888] text-center mb-8 sm:mb-12 font-mono">
              Connect to 127+ services with a single integration
            </p>

            <MarqueeDemo />
          </div>
        </section>

        {/* Code Example Showcase */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-4 font-mono">
              Simple <span className="text-[#00ff88]">Integration</span>
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#888] text-center mb-8 sm:mb-12 font-mono">
              See how easy it is to work with multiple services
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-8 items-center">
              {/* Before */}
              <div>
                <p className="text-xs sm:text-sm font-mono text-[#888] mb-4">Without One Router</p>
                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden">
                  <div className="bg-[#1a1a1a] border-b border-[#222] px-3 sm:px-4 py-2">
                    <span className="text-xs text-[#666] font-mono">without.ts</span>
                  </div>
                  <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm space-y-2 text-[#888] overflow-x-auto">
                    <div><span className="text-[#ff9d76]">import</span> PayPal <span className="text-[#ff9d76]">from</span> <span className="text-[#90c695]">&quot;paypal-sdk&quot;</span></div>
                    <div><span className="text-[#ff9d76]">import</span> Razorpay <span className="text-[#ff9d76]">from</span> <span className="text-[#90c695]">&quot;razorpay&quot;</span></div>
                    <div className="mt-3 pt-3 border-t border-[#222]"><span className="text-[#ff9d76]">const</span> paypal = <span className="text-[#6bcf7f]">new PayPal</span>(key)</div>
                    <div><span className="text-[#ff9d76]">const</span> razorpay = <span className="text-[#6bcf7f]">new Razorpay</span>(key)</div>
                    <div className="mt-3 pt-3 border-t border-[#222]"><span className="text-[#888]"> Now handle 3 different APIs...</span></div>
                  </div>
                </div>
              </div>

              {/* After */}
              <div>
                <p className="text-xs sm:text-sm font-mono text-[#888] mb-4">With One Router</p>
                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden">
                  <div className="bg-[#1a1a1a] border-b border-[#222] px-3 sm:px-4 py-2">
                    <span className="text-xs text-[#666] font-mono">with.ts</span>
                  </div>
                  <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm space-y-2 overflow-x-auto">
                    <div><span className="text-[#ff9d76]">import</span> {'{'}OneRouter{'}'} <span className="text-[#ff9d76]">from</span> <span className="text-[#90c695]">&apos;@onerouter/sdk&apos;</span></div>
                    <div className="mt-3 pt-3 border-t border-[#222]"><span className="text-[#ff9d76]">const</span> router = <span className="text-[#6bcf7f]">new OneRouter</span>({'{}'}</div>
                    <div className="ml-4">apiKey: process.env.KEY</div>
                    <div className="ml-4">{'}'})</div>
                    <div className="mt-3 pt-3 border-t border-[#222]"><span className="text-[#00ff88]"># Use any service with the same API</span></div>
                    <div><span className="text-[#00ff88]">await router.call(&apos;stripe.charge&apos;, ...)</span></div>
                    <div><span className="text-[#00ff88]">await router.call(&apos;paypal.payment&apos;, ...)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Metrics - Grid Style */}
        <section className="px-4 sm:px-6 py-12 sm:py-20 bg-[#050505]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-8 sm:mb-12 font-mono bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
              Built for Production
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { metric: "23ms", label: "Avg Response Time", desc: "Lightning-fast API calls" },
                { metric: "99.99%", label: "Uptime SLA", desc: "Enterprise-grade reliability" },
                { metric: "127+", label: "Services", desc: "And growing every month" },
              ].map((item, idx) => (
                <div key={idx} className="border border-[#222] rounded-lg p-4 sm:p-8 text-center hover:border-[#666] transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#666]/20">
                  <div className="text-3xl sm:text-4xl font-bold mb-2 text-[#666] font-mono">{item.metric}</div>
                  <div className="text-sm sm:text-base text-white font-bold mb-2 font-mono">{item.label}</div>
                  <div className="text-xs sm:text-sm text-[#888] font-mono">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Getting Started Steps */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-8 sm:mb-12 font-mono bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
              Get Started in Minutes
            </h2>

            <div className="space-y-6 sm:space-y-8">
              {[
                {
                  num: "01",
                  title: "Install",
                  code: "npm install @onerouter/sdk",
                  desc: "Get the SDK from npm with one command"
                },
                {
                  num: "02",
                  title: "Configure",
                  code: "const router = new OneRouter({ apiKey: process.env.KEY })",
                  desc: "Initialize with your API key and you're ready"
                },
                {
                  num: "03",
                  title: "Integrate",
                  code: "await router.call(&apos;stripe.charge&apos;, { amount: 999, currency: &apos;usd&apos; })",
                  desc: "Start making calls to any service immediately"
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-3 sm:gap-6 flex-col sm:flex-row">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-lg bg-[#666] text-white text-sm sm:text-base font-bold font-mono">
                      {step.num}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold font-mono mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-[#888] font-mono mb-3">{step.desc}</p>
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto">
                      <code className="text-[#666]">{step.code}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resources Grid */}
        <section className="px-4 sm:px-6 py-12 sm:py-20 bg-[#050505]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-8 sm:mb-12 font-mono bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
              Everything You Need
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { icon: "📚", title: "Documentation", desc: "Complete API reference, guides, and examples" },
                { icon: "🔌", title: "Service SDKs", desc: "Official SDKs for Node.js, Python, Go, and more" },
                { icon: "💬", title: "Community", desc: "Join our Discord and get help from developers" },
              ].map((resource, idx) => (
                <div key={idx} className="border border-[#222] rounded-lg p-4 sm:p-6 hover:border-[#666] transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#666]/20 cursor-pointer group">
                  <div className="text-3xl sm:text-4xl mb-4">{resource.icon}</div>
                  <h3 className="text-base sm:text-lg font-bold font-mono mb-2 group-hover:text-[#666] transition-colors duration-300">{resource.title}</h3>
                  <p className="text-xs sm:text-sm text-[#888] font-mono">{resource.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center border border-[#222] rounded-2xl p-6 sm:p-12 bg-[#050505]">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 font-mono bg-gradient-to-r from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
              Ready to simplify integration?
            </h2>
            <p className="text-xs sm:text-base md:text-lg text-[#888] mb-6 sm:mb-8 font-mono">
              Stop managing multiple SDKs. Start building better integrations.
            </p>
            
            <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00dd77] transition-all duration-300 transform hover:scale-105 font-mono">
                    Start Building
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00dd77] transition-all duration-300 transform hover:scale-105 font-mono">
                    Go to Dashboard
                  </Button>
                </Link>
              </SignedIn>
              
              <Link href="https://github.com/onerouter" target="_blank">
                <Button className="px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm border border-[#222] text-white rounded-lg hover:border-[#666] transition-all duration-300 transform hover:scale-105 font-mono flex items-center gap-2 hover:shadow-lg hover:shadow-[#666]/20">
                  <Github className="w-3 sm:w-4 h-3 sm:h-4" />
                  <span className="hidden sm:inline">View on GitHub</span>
                  <span className="sm:hidden">GitHub</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-8 sm:py-12 border-t border-[#222]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-8">
              <div>
                <h3 className="font-bold font-mono mb-4 text-white text-sm sm:text-base">One Router</h3>
                <p className="text-[#888] text-xs sm:text-sm font-mono">Unified API gateway for all your service integrations.</p>
              </div>
              <div>
                <h4 className="font-bold font-mono mb-4 text-white text-xs sm:text-sm">Product</h4>
                <ul className="space-y-2 text-[#888] text-xs sm:text-sm font-mono">
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Docs</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold font-mono mb-4 text-white text-xs sm:text-sm">Company</h4>
                <ul className="space-y-2 text-[#888] text-xs sm:text-sm font-mono">
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">GitHub</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Community</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold font-mono mb-4 text-white text-xs sm:text-sm">Legal</h4>
                <ul className="space-y-2 text-[#888] text-xs sm:text-sm font-mono">
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Privacy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">Terms</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-300 hover:underline decoration-[#666]">License</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-[#222] pt-6 sm:pt-8 text-center text-[#666] font-mono text-xs sm:text-sm">
              <p>© 2025 One Router. Built for developers, by developers.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }