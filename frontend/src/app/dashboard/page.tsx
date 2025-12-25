import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Key, BarChart3, Link as LinkIcon, CheckCircle2, Zap, Cpu, Fingerprint, Pencil, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { EnvironmentToggle } from "@/components/EnvironmentToggle";
import { GlobalEnvironmentToggle } from "@/components/GlobalEnvironmentToggle";
import { EditServiceModal } from "@/components/EditServiceModal";
import { BentoGrid } from "@/components/ui/bento-grid";
import { FeatureCard } from "@/components/ui/grid-feature-cards";
import { Navbar } from "@/components/vercel-navbar";

interface Service {
  id: string;
  service_name: string;
  environment: string;
  features: Record<string, boolean>;
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

  // Redirect to onboarding if no services are configured
  if (!hasServices || services.length === 0) {
    redirect("/onboarding");
  }

  console.log('Dashboard: Services check result:', { hasServices, servicesCount: services.length, services });

  // API Keys count (placeholder - you can fetch real data)
  const apiKeysCount = 0;
  const transactionsCount = 0;

   return (
    <DashboardLayout>

      <div className=" text-white font-sans border-t border-white/10">
        <header className=" border-[#333] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10 ">
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

            <div className="space-y-8">
              {/* Metrics Cards - Bento Grid */}
              <BentoGrid items={[
             {
               title: "API Keys",
               meta: `${apiKeysCount} active`,
               description: "Manage your API keys and permissions for secure access",
               icon: <Key className="w-4 h-4 text-cyan-500" />,
               status: "Active",
               tags: ["Authentication", "Security"],
               colSpan: 2,
               hasPersistentHover: true,
             },
             {
               title: "Transactions",
               meta: `${transactionsCount} calls`,
               description: "Monitor your API usage and performance metrics",
               icon: <BarChart3 className="w-4 h-4 text-cyan-500" />,
               status: "Live",
               tags: ["Analytics"],
             },
             {
               title: "Services",
               meta: `${services.length} connected`,
               description: services.length === 0 ? "No providers connected yet" : "Connected payment providers active",
               icon: <LinkIcon className="w-4 h-4 text-cyan-500" />,
               status: services.length === 0 ? "Pending" : "Connected",
               tags: ["Integration"],
             },
           ]} />



           {/* Connected Services */}
           <Card className="bg-black border border-black mb-8 hover:border-black transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
             <CardHeader className="pb-6">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-white flex items-center gap-3 text-xl">
                   <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                     <Shield className="w-5 h-5" />
                   </div>
                   Connected Services
                 </CardTitle>
                 <div className="text-sm text-[#888] bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#333]">
                   {services.length} active
                 </div>
               </div>
             </CardHeader>
             <CardContent>
               {services.length === 0 ? (
                 <div className="text-center py-16">
                   <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-cyan-500/20 transition-all duration-300 hover:bg-gradient-to-br hover:from-cyan-500/20 hover:to-blue-500/20 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/20">
                     <LinkIcon className="w-12 h-12 text-cyan-500" />
                   </div>
                   <h3 className="text-2xl font-semibold text-white mb-3">No services connected yet</h3>
                   <p className="text-[#888] mb-8 max-w-lg mx-auto text-lg leading-relaxed">
                     Connect your first payment service to start processing payments securely
                   </p>
                   <Link href="/onboarding">
                     <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-105 text-lg font-medium">
                       <Sparkles className="w-5 h-5 mr-2" />
                       Connect Services
                     </Button>
                   </Link>
                 </div>
               ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                   {services.map((service: Service) => (
                     <div key={service.id} className="group relative">
                       {/* Service Card */}
                       <div className="p-5 bg-[#0a0a0a] border border-[#222] rounded-xl  transition-all duration-300 hover:shadow-xl hover:bg-[#0f0f0f] hover:shadow-cyan-500/10">
                         {/* Header with Service Info and Actions */}
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                               <CheckCircle2 className="w-6 h-6 text-cyan-500" />
                             </div>
                             <div>
                               <p className="font-semibold text-white text-base capitalize mb-1">{service.service_name}</p>
                               <div className="flex items-center gap-2">
                                 <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-2 py-0.5">
                                   {service.environment}
                                 </Badge>
                                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                 <span className="text-xs text-[#666]">Active</span>
                               </div>
                             </div>
                           </div>

                           {/* Edit Button */}
                           <EditServiceModal
                             service={service}
                             trigger={
                               <button
                                 className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-[#333] transition-all duration-300 hover:scale-110"
                                 title="Edit service credentials"
                               >
                                 <Pencil className="w-4 h-4 text-[#888] hover:text-cyan-400" />
                               </button>
                             }
                           />
                         </div>

                         {/* Service Status */}
                         <div className="mb-3">
                           <div className="flex items-center gap-2">
                             <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${
                               service.environment === 'live'
                                 ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                 : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                             }`}>
                               {service.environment.toUpperCase()}
                             </Badge>
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                             <span className="text-xs text-[#666]">Active</span>
                           </div>
                         </div>



                         {/* Status Indicator */}
                         <div className="mt-3 pt-3 border-t border-[#333]">
                           <div className="flex items-center justify-between">
                             <span className="text-xs text-[#666]">Last used</span>
                             <span className="text-xs text-[#888]">2 hours ago</span>
                           </div>
                         </div>
                       </div>

                       {/* Hover Effect Overlay */}
                       <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                     </div>
                   ))}
                 </div>
               )}

               {/* Add Service Button */}
               {services.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-[#333]">
                   <div className="flex items-center justify-center">
                     <Link href="/onboarding">
                       <Button className="bg-transparent border-2 border-dashed border-[#333] text-[#888] hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-xl py-4 px-8 transition-all duration-300 hover:scale-105">
                         <div className="flex items-center gap-3">
                           <div className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                             <span className="text-cyan-500 text-lg">+</span>
                           </div>
                           <span className="font-medium">Add More Services</span>
                         </div>
                       </Button>
                     </Link>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    🚀
                  </div>
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500 transition-all duration-300 hover:bg-[#0f0f0f] group">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500 text-cyan-500 font-bold group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-white">Generate API Keys</p>
                      <p className="text-sm text-[#888]">Create keys for your applications</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500 transition-all duration-300 hover:bg-[#0f0f0f] group">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500 text-cyan-500 font-bold group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-white">Read Documentation</p>
                      <p className="text-sm text-[#888]">Learn how to integrate OneRouter</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500 transition-all duration-300 hover:bg-[#0f0f0f] group">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500 text-cyan-500 font-bold group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-white">Make Your First Call</p>
                      <p className="text-sm text-[#888]">Test the unified API</p>
                    </div>
                  </div>
                </div>
                <Link href="/api-keys">
                  <Button className="w-full bg-cyan-500 text-white hover:bg-cyan-600 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105">
                    Generate API Key →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                    📊
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#222] rounded-xl transition-all duration-300 hover:border-cyan-500 hover:bg-[#0f0f0f]">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Services connected</p>
                      <p className="text-xs text-[#888]">Just now</p>
                    </div>
                  </div>
                  <div className="text-center py-12 text-[#666] border border-dashed border-[#333] rounded-xl bg-[#1a1a1a] transition-all duration-300 hover:border-cyan-500 hover:bg-[#0f0f0f]">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-cyan-500/20">
                      📈
                    </div>
                    No API transactions yet
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
        </main>
      </div>
    </DashboardLayout>
  );
}