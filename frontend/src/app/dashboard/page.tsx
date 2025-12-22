import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Key, BarChart3, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { EnvironmentToggle } from "@/components/EnvironmentToggle";
import { GlobalEnvironmentToggle } from "@/components/GlobalEnvironmentToggle";

export const dynamic = 'force-dynamic';

interface Service {
  id: string | number;
  service_name: string;
  environment: string;
}

// Server-side API call to check user services
async function getUserServices(token: string) {
  const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    console.log('Fetching services with token:', token ? 'present' : 'missing');
    const response = await fetch(`${API_BASE_URL}/api/services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to fetch services:', response.status, response.statusText);
      // If unauthorized, don't redirect - let the client handle it
      if (response.status === 401) {
        console.log('Authentication failed, returning empty services');
        return { services: [], has_services: false, total_count: 0 };
      }
      return { services: [], has_services: false, total_count: 0 };
    }

    const data = await response.json();
    console.log('Services data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching services:', error);
    // Don't fail completely on network errors - return empty state
    return { services: [], has_services: false, total_count: 0 };
  }
}

export default async function DashboardPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get authentication token
  const token = await getToken();
  
  if (!token) {
    redirect("/sign-in");
  }
  
  // Check if user has any services configured
  const servicesData = await getUserServices(token);
  const hasServices = servicesData.has_services;
  const services = servicesData.services || [];

  // For now, don't redirect to onboarding - let the user see the dashboard
  // and handle the empty state there. This prevents redirect loops.
  console.log('Dashboard: Services check result:', { hasServices, servicesCount: services.length, services });

  // API Keys count (placeholder - you can fetch real data)
  const apiKeysCount = 0;
  const transactionsCount = 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="shadow-sm">
        <div className="max-w-4xl bg-[#1a1a1a]/50 rounded-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-[#00ff88]" />
                <h1 className="text-2xl font-bold font-mono">Dashboard</h1>
              </div>
              <p className="text-sm text-[#888] font-mono">Welcome back</p>
            </div>
             <div className="flex items-center space-x-4">
               <GlobalEnvironmentToggle services={services} />
               <Badge className="bg-[#1a1a1a] border border-[#00ff88] text-[#00ff88] px-3 py-1 font-mono">
                 Free Plan
               </Badge>
               <Link href="/api-keys">
                 <Button className="bg-[#00ff88] text-black hover:bg-[#00dd77] font-mono font-bold">
                   Manage API Keys
                 </Button>
               </Link>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card className="bg-[#0a0a0a] border-[#222] hover:border-[#00ff88] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#888] font-mono">API Keys</p>
                    <p className="text-3xl font-bold text-[#00ff88] font-mono">{apiKeysCount}</p>
                    <p className="text-xs text-[#666] font-mono mt-1">Active API keys</p>
                  </div>
                  <div className="w-12 h-12 bg-[#00ff88]/10 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-[#00ff88]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0a0a0a] border-[#222] hover:border-[#00ff88] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#888] font-mono">Transactions</p>
                    <p className="text-3xl font-bold text-[#00ff88] font-mono">{transactionsCount}</p>
                    <p className="text-xs text-[#666] font-mono mt-1">Total API calls</p>
                  </div>
                  <div className="w-12 h-12 bg-[#00ff88]/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#00ff88]" />
                  </div>
                </div>
              </CardContent>
            </Card>

             <Card className="bg-[#0a0a0a] border-[#222] hover:border-[#00ff88] transition-colors">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-[#888] font-mono">Services</p>
                     <p className="text-3xl font-bold text-[#00ff88] font-mono">{services.length}</p>
                     <p className="text-xs text-[#666] font-mono mt-1">
                       {services.length === 0 ? 'No providers connected' : 'Connected providers'}
                     </p>
                   </div>
                   <div className="w-12 h-12 bg-[#00ff88]/10 rounded-lg flex items-center justify-center">
                     <LinkIcon className="w-6 h-6 text-[#00ff88]" />
                   </div>
                 </div>
               </CardContent>
             </Card>
          </div>

           {/* Connected Services */}
           <Card className="bg-[#0a0a0a] border-[#222] mb-8">
             <CardHeader>
               <CardTitle className="font-mono text-white">🔗 Connected Services</CardTitle>
             </CardHeader>
             <CardContent>
               {services.length === 0 ? (
                 <div className="text-center py-8">
                   <div className="w-16 h-16 bg-[#00ff88]/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                     <LinkIcon className="w-8 h-8 text-[#00ff88]" />
                   </div>
                   <p className="text-white font-mono mb-2">No services connected yet</p>
                   <p className="text-[#888] font-mono text-sm mb-4">Connect your first payment service to get started</p>
                   <Link href="/onboarding">
                     <Button className="bg-[#00ff88] text-black hover:bg-[#00dd77] font-mono">
                       Connect Services
                     </Button>
                   </Link>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {services.map((service: Service) => (
                     <div key={service.id} className="p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-[#00ff88] transition-colors">
                       <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
                           <div>
                             <p className="font-medium text-white font-mono capitalize">{service.service_name}</p>
                             <p className="text-sm text-[#888] font-mono">
                               Environment: {service.environment}
                             </p>
                           </div>
                         </div>
                         <Badge className="bg-[#00ff88] text-black border-0">
                           Active
                         </Badge>
                       </div>
                       <EnvironmentToggle service={service.service_name} />
                     <p className="text-xs text-[#666] font-mono mt-1">
                       Service: {service.service_name} | Environment: {service.environment}
                     </p>
                     {/* Debug info */}
                     {typeof window !== 'undefined' && (
                       <script
                         dangerouslySetInnerHTML={{
                           __html: `console.log('Dashboard: Rendering EnvironmentToggle for service:', '${service.service_name}');`
                         }}
                       />
                     )}
                     </div>
                   ))}
                 </div>
               )}
              <div className="mt-4">
                <Link href="/onboarding">
                  <Button variant="outline" className="w-full bg-transparent border-[#222] text-white hover:border-[#00ff88] font-mono">
                    + Add More Services
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-[#0a0a0a] border-[#222]">
              <CardHeader>
                <CardTitle className="font-mono text-white">🚀 Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-[#00ff88] transition-colors">
                    <div className="w-8 h-8 bg-[#00ff88]/10 rounded-full flex items-center justify-center border border-[#00ff88]">
                      <span className="text-[#00ff88] text-sm font-semibold font-mono">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-white font-mono">Generate API Keys</p>
                      <p className="text-sm text-[#888] font-mono">Create keys for your applications</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-[#00ff88] transition-colors">
                    <div className="w-8 h-8 bg-[#00ff88]/10 rounded-full flex items-center justify-center border border-[#00ff88]">
                      <span className="text-[#00ff88] text-sm font-semibold font-mono">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-white font-mono">Read Documentation</p>
                      <p className="text-sm text-[#888] font-mono">Learn how to integrate OneRouter</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-[#00ff88] transition-colors">
                    <div className="w-8 h-8 bg-[#00ff88]/10 rounded-full flex items-center justify-center border border-[#00ff88]">
                      <span className="text-[#00ff88] text-sm font-semibold font-mono">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-white font-mono">Make Your First Call</p>
                      <p className="text-sm text-[#888] font-mono">Test the unified API</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Link href="/api-keys">
                    <Button className="w-full bg-[#00ff88] text-black hover:bg-[#00dd77] font-mono font-bold">
                      Generate API Key →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0a0a0a] border-[#222]">
              <CardHeader>
                <CardTitle className="font-mono text-white">📊 Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#222] rounded-lg">
                    <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white font-mono">Services connected</p>
                      <p className="text-xs text-[#888] font-mono">Just now</p>
                    </div>
                  </div>
                  <div className="text-center py-8 text-[#666] text-sm font-mono border border-dashed border-[#222] rounded-lg">
                    No API transactions yet
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}