'use client';

import { useState, useEffect } from 'react';
import { useClientApiCall } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Webhook, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import Link from 'next/link';

interface WebhookEvent {
  id: string;
  service_name: string;
  event_type: string;
  processed: boolean;
  created_at: string;
}

export default function WebhooksPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [services, setServices] = useState<any[]>([]);
  const apiClient = useClientApiCall();

  useEffect(() => {
    loadWebhookConfig();
    loadWebhookLogs();
    loadServices();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      const response = await apiClient('/api/webhooks/configure');
      // Handle webhook configuration
      console.log('Webhook config:', response);
    } catch (error) {
      console.error('Failed to load webhook config:', error);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const response = await apiClient('/api/webhooks/logs?limit=50');
      setEvents(response.events || []);
    } catch (error) {
      console.error('Failed to load webhook logs:', error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await apiClient('/api/services');
      setServices(response.services || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    }
  };

  const saveWebhookUrl = async () => {
    if (!webhookUrl) return;

    setLoading(true);
    try {
      // This is a placeholder - implement for each service
      await apiClient('/api/webhooks/configure', {
        method: 'PUT',
        body: JSON.stringify({
          service_name: 'razorpay',
          webhook_url: webhookUrl,
          events: ['payment.success', 'payment.failed']
        })
      });
      alert('Webhook URL saved successfully!');
    } catch (error) {
      console.error('Failed to save webhook URL:', error);
      alert('Failed to save webhook URL');
    } finally {
      setLoading(false);
    }
  };

  const sendTestWebhook = async () => {
    setTestStatus('sending');
    try {
      await apiClient('/api/webhooks/test', {
        method: 'POST',
        body: JSON.stringify({ service_name: 'razorpay' })
      });
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (error) {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
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
            {/* Webhooks Metrics */}
            <BentoGrid items={[
              {
                title: "Total Events",
                meta: events.length.toString(),
                description: "Webhook events processed",
                icon: <Webhook className="w-4 h-4 text-cyan-500" />,
                status: "Active",
                tags: ["Webhooks", "Events"],
                colSpan: 2,
                hasPersistentHover: true,
              },
              {
                title: "Success Rate",
                meta: events.length > 0 ? `${Math.round((events.filter(e => e.processed).length / events.length) * 100)}%` : "0%",
                description: "Successfully processed events",
                icon: <CheckCircle className="w-4 h-4 text-cyan-500" />,
                status: "Healthy",
                tags: ["Performance", "Reliability"],
              },
            ]} />

            {/* Configuration Card */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    🔗
                  </div>
                  Webhook Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-3">
                    Webhook Endpoint URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-app.com/webhooks/onerouter"
                      className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#222] rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                    <Button
                      onClick={saveWebhookUrl}
                      disabled={loading || !webhookUrl}
                      className="bg-cyan-500 text-white hover:bg-cyan-600 px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-sm text-[#666] mt-2">
                    Events from all connected services will be forwarded to this URL
                  </p>
                </div>

                {/* Test Webhook */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">Test Webhook</h3>
                    <p className="text-sm text-[#888]">Send a test event to verify your endpoint</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={sendTestWebhook}
                      disabled={testStatus !== 'idle' || !webhookUrl}
                      variant="outline"
                      className="bg-transparent border-[#222] text-white hover:border-cyan-500"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {testStatus === 'sending' ? 'Sending...' : 'Send Test'}
                    </Button>
                    {testStatus === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {testStatus === 'error' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {/* OneRouter Webhook URLs */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">OneRouter Webhook Endpoints</h3>
                  <p className="text-sm text-[#666] mb-4">
                    Configure these URLs in your payment provider dashboards:
                  </p>
                  <div className="grid gap-3">
                    {['razorpay', 'paypal', 'stripe'].map((service) => (
                      <div key={service} className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors">
                        <div>
                          <p className="font-medium text-white capitalize">{service}</p>
                          <code className="text-sm text-cyan-500 font-mono">
                            https://api.onerouter.com/webhooks/{service}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(`https://api.onerouter.com/webhooks/${service}`)}
                          className="bg-transparent border-[#222] text-white hover:border-cyan-500"
                        >
                          Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    📋
                  </div>
                  Recent Webhook Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-12 text-[#666] border border-dashed border-[#333] rounded-xl bg-[#1a1a1a]">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-cyan-500/20">
                      <Clock className="w-8 h-8 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No webhook events yet</h3>
                    <p className="text-[#888]">Events will appear here once webhooks are configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.slice(0, 10).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                              {event.service_name}
                            </Badge>
                            <span className="font-medium text-white">{event.event_type}</span>
                          </div>
                          <p className="text-sm text-[#666]">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                        {event.processed ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <Clock className="w-6 h-6 text-cyan-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}