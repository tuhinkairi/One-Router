'use client';

import { useState, useEffect } from 'react';
import { useClientApiCall } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Settings, ExternalLink, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import { FeatureCard } from '@/components/ui/grid-feature-cards';

interface Service {
  id: string;
  service_name: string;
  environment: string;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

interface Environment {
  configured: boolean;
  last_used: string | null;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [environments, setEnvironments] = useState<Record<string, { test: Environment; live: Environment }>>({});
  const [servicesData, setServicesData] = useState<any[]>([]);
  const apiClient = useClientApiCall();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await apiClient('/api/services');
      setServices(response.services || []);
      setServicesData(response.services || []);

      // Load environment status for each service
      const envPromises = response.services.map((service: Service) =>
        apiClient(`/api/services/${service.service_name}/environments`)
          .then(env => ({ [service.service_name]: env }))
          .catch(() => ({ [service.service_name]: { test: { configured: false, last_used: null }, live: { configured: false, last_used: null } } }))
      );

      const envResults = await Promise.all(envPromises);
      const envMap = Object.assign({}, ...envResults);
      setEnvironments(envMap);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
      setServicesData([]);
    } finally {
      setLoading(false);
    }
  };

  const switchEnvironment = async (serviceName: string, newEnv: 'test' | 'live') => {
    try {
      await apiClient(`/api/services/${serviceName}/switch-environment`, {
        method: 'POST',
        body: JSON.stringify({ environment: newEnv })
      });
      await loadServices();
    } catch (error) {
      console.error('Failed to switch environment:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-white font-sans border-t border-white/10">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="text-white font-sans border-t border-white/10">
        <header className="border-[#333] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <GlobalEnvironmentToggle services={servicesData} />
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

          <div className="relative z-10">
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

            {/* Services Metrics */}
            <BentoGrid items={[
              {
                title: "Connected Services",
                meta: `${services.length} active`,
                description: "Payment providers and integrations configured",
                icon: <Zap className="w-4 h-4 text-cyan-500" />,
                status: "Active",
                tags: ["Integration", "Payments"],
                colSpan: 2,
                hasPersistentHover: true,
              },
              {
                title: "Environments",
                meta: "Test & Live",
                description: "Switch between testing and production modes",
                icon: <Settings className="w-4 h-4 text-cyan-500" />,
                status: "Configured",
                tags: ["Environment", "Testing"],
              },
            ]} />
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}