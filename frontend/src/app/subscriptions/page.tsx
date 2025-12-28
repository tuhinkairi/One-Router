'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Filter, X } from 'lucide-react';
import  DashboardLayout  from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { useSubscriptionAPI, Subscription } from '@/lib/api-subscriptions';
import Link from 'next/link';
import { useClientApiCall} from '@/lib/api-client';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
  const subscriptionAPI = useSubscriptionAPI();
  const apiClient = useClientApiCall();

  useEffect(() => {
    loadServices();
    loadSubscriptions();
  }, []);

  const loadServices = async () => {
    try {
      const response = await apiClient('/api/services');
      setServices(response.services || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      // Replace this with your actual API call when the endpoint is ready
      const response = await apiClient('/v1/subscriptions');
      setSubscriptions(response.subscriptions || []);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts from subscriptions
  const activeCount = subscriptions.filter(sub => sub.status === 'active').length;
  const pausedCount = subscriptions.filter(sub => sub.status === 'paused').length;
  const cancelledCount = subscriptions.filter(sub => sub.status === 'cancelled').length;

  // Add filtering logic if needed
  const filteredSubscriptions = subscriptions;

  return (
    <DashboardLayout>
      <div className="text-white font-sans border-t border-white/10">
        <header className="border-[#333] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <GlobalEnvironmentToggle services={services} />
                <Link href="/api-keys">
                  <Button className="text-white hover:bg-[#1a1a1a] border-0">
                    Manage API Keys
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
          {/* Overview Metrics */}
          <div className="mb-8">
            <BentoGrid items={[
              {
                title: "Active Subscriptions",
                meta: `${activeCount}`,
                description: "Currently active and recurring",
                icon: <Calendar className="w-4 h-4 text-cyan-500" />,
                status: activeCount > 0 ? "Active" : "None",
                tags: ["Subscriptions", "Active"],
                colSpan: 1,
                hasPersistentHover: true,
              },
              {
                title: "Paused",
                meta: `${pausedCount}`,
                description: "Temporarily paused subscriptions",
                icon: <Filter className="w-4 h-4 text-yellow-500" />,
                status: pausedCount > 0 ? "Paused" : "None",
                tags: ["Subscriptions", "Paused"],
                colSpan: 1,
                hasPersistentHover: true,
              },
              {
                title: "Cancelled",
                meta: `${cancelledCount}`,
                description: "Cancelled subscriptions",
                icon: <X className="w-4 h-4 text-red-500" />,
                status: cancelledCount > 0 ? "Cancelled" : "None",
                tags: ["Subscriptions", "Cancelled"],
                colSpan: 2,
                hasPersistentHover: true,
              },
            ]} />
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Subscriptions</h1>
              <p className="text-[#888] text-sm mt-1">
                Manage your recurring subscriptions
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/subscriptions/create">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Subscription
                </Button>
              </Link>
            </div>
          </div>

          {/* Subscriptions List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-[#222]">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="w-16 h-16 text-[#444] mb-4" />
                <h3 className="text-xl font-semibold mb-2">Subscription Management Coming Soon</h3>
                <p className="text-[#888] text-center mb-4 max-w-md">
                  The backend endpoint for listing subscriptions is currently being implemented.
                  In the meantime, you can:
                </p>
                <ul className="text-sm text-[#888] space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500">•</span>
                    <span>Use the SDK to create subscriptions programmatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500">•</span>
                    <span>View individual subscription details via SDK if you have subscription IDs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500">•</span>
                    <span>Manage marketplace vendors through the new Marketplace page</span>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-[#222]">
                  <p className="text-xs text-[#666] text-center">
                    Note: Backend developers are working on adding the subscription listing endpoint.
                    Once completed, this page will automatically display all your subscriptions.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSubscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.subscription_id}
                  subscription={subscription}
                  onUpdate={loadSubscriptions}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}