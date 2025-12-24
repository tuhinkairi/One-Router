'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, User, Key, Bell, Shield, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState({
    email: true,
    webhook: false,
    sms: false,
  });
  const [services, setServices] = useState<any[]>([]);

  const loadServices = async () => {
    try {
      // For now, we'll use a placeholder since we don't have the API client in settings
      setServices([]);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    }
  };

  return (
    <DashboardLayout>
      <div className="text-white font-sans border-t border-white/10">
        <header className="border-[#333] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <GlobalEnvironmentToggle services={services} />
                <div className="px-4 rounded-full text-sm font-medium text-cyan-500 transition-all duration-300 hover:bg-cyan-500/10">
                  Free Plan
                </div>
                <Link href="/api-keys">
                  <Button className="text-white hover:bg-[#1a1a1a] border-0 transition-all duration-300 hover:shadow-md hover:shadow-blue-300 hover:scale-105">
                    Manage API Keys
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden border border-white/10 [mask-image:linear-gradient(to_bottom,white_0%,white_80%,transparent_100%)]">
            {/* Top-left corner */}
            <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-cyan-500/30"></div>
            {/* Top-right corner */}
            <div className="absolute top-10 right-10 w-20 h-20 border-t border-r border-cyan-500/30"></div>
            {/* Bottom-left corner */}
            <div className="absolute bottom-10 left-10 w-20 h-20 border-b border-l border-cyan-500/30"></div>
            {/* Bottom-right corner */}
            <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-cyan-500/30"></div>
           </div>
          <div className="relative z-10">
            {/* Settings Overview */}
            <BentoGrid items={[
              {
                title: "Account Status",
                meta: "Active",
                description: "Your OneRouter account is in good standing",
                icon: <User className="w-4 h-4 text-cyan-500" />,
                status: "Active",
                tags: ["Profile", "Account"],
                colSpan: 2,
                hasPersistentHover: true,
              },
              {
                title: "Security Level",
                meta: "Medium",
                description: "Enable 2FA for enhanced security",
                icon: <Shield className="w-4 h-4 text-cyan-500" />,
                status: "Medium",
                tags: ["Security", "Protection"],
              },
            ]} />

            {/* Profile Settings */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    👤
                  </div>
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#888] mb-3">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.fullName || ''}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#222] rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#888] mb-3">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.primaryEmailAddress?.emailAddress || ''}
                      disabled
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#222] rounded-lg text-[#666] font-mono cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-3">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Company"
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#222] rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <Button className="bg-cyan-500 text-white hover:bg-cyan-600 px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25">
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    🔔
                  </div>
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors">
                    <div>
                      <h3 className="font-medium text-white mb-1 capitalize">{key} Notifications</h3>
                      <p className="text-sm text-[#888]">
                        Receive {key} notifications for important events
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        value ? 'bg-cyan-500' : 'bg-[#333]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          value ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    🔒
                  </div>
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors">
                  <div>
                    <h3 className="font-medium text-white mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-[#888]">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline" className="bg-transparent border-[#222] text-white hover:border-cyan-500">
                    Enable
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors">
                  <div>
                    <h3 className="font-medium text-white mb-1">API Key Rotation</h3>
                    <p className="text-sm text-[#888]">Automatically rotate API keys every 90 days</p>
                  </div>
                  <Button variant="outline" className="bg-transparent border-[#222] text-white hover:border-cyan-500">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-[#0a0a0a] border border-red-500/30 hover:border-red-500 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-red-400 flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                    ⚠️
                  </div>
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg">
                  <div>
                    <h3 className="font-medium text-red-400 mb-1">Delete Account</h3>
                    <p className="text-sm text-[#888]">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}