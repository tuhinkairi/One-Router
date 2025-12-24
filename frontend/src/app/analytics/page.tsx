// frontend/src/app/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Clock, DollarSign, AlertCircle, BarChart3 } from "lucide-react";
import { useClientApiCall } from "@/lib/api-client";
import DashboardLayout from "@/components/DashboardLayout";
import { GlobalEnvironmentToggle } from "@/components/GlobalEnvironmentToggle";
import { BentoGrid } from "@/components/ui/bento-grid";
import Link from "next/link";

interface AnalyticsOverview {
  period: string;
  since_date: string;
  total_calls: number;
  success_rate: number;
  avg_response_time: number;
  top_services: Array<{ service: string; calls: number }>;
  error_rate_by_service: Record<string, number>;
  cost_breakdown: Record<string, number>;
  total_cost: number;
  projected_monthly: number;
}

interface TimeSeriesData {
  daily_volume: Array<{ date: string; calls: number; errors: number; avg_response_time: number }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);

  const apiClient = useClientApiCall();

  useEffect(() => {
    loadAnalytics();
    loadServices();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, timeSeriesRes] = await Promise.all([
        apiClient(`/api/analytics/overview?period=${period}`),
        apiClient(`/api/analytics/timeseries?period=${period}`)
      ]);

      setOverview(overviewRes);
      setTimeSeries(timeSeriesRes);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-white font-sans border-t border-white/10">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
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
              <div className="flex items-center gap-4">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-32 bg-[#0a0a0a] border-[#222] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadAnalytics} className="bg-transparent border-[#222] text-white hover:border-cyan-500">
                  Refresh
                </Button>
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
            {/* Analytics Overview */}
            {overview && (
              <BentoGrid items={[
                {
                  title: "Total API Calls",
                  meta: (overview.total_calls || 0).toLocaleString(),
                  description: "API requests processed in selected period",
                  icon: <Activity className="w-4 h-4 text-cyan-500" />,
                  status: "Active",
                  tags: ["Requests", "Traffic"],
                  colSpan: 2,
                  hasPersistentHover: true,
                },
                {
                  title: "Success Rate",
                  meta: overview.success_rate ? `${(overview.success_rate * 100).toFixed(1)}%` : "0%",
                  description: "Percentage of successful API calls",
                  icon: <TrendingUp className="w-4 h-4 text-cyan-500" />,
                  status: overview.success_rate && overview.success_rate > 0.95 ? "Excellent" : "Good",
                  tags: ["Performance", "Reliability"],
                },
                {
                  title: "Avg Response Time",
                  meta: overview.avg_response_time ? `${overview.avg_response_time.toFixed(0)}ms` : "0ms",
                  description: "Average API response time",
                  icon: <Clock className="w-4 h-4 text-cyan-500" />,
                  status: overview.avg_response_time && overview.avg_response_time < 500 ? "Fast" : "Normal",
                  tags: ["Performance", "Speed"],
                },
                {
                  title: "Total Cost",
                  meta: overview.total_cost ? `$${overview.total_cost.toFixed(2)}` : "$0.00",
                  description: overview.projected_monthly ? `Projected monthly: $${overview.projected_monthly.toFixed(2)}` : "No cost data available",
                  icon: <DollarSign className="w-4 h-4 text-cyan-500" />,
                  status: "Tracked",
                  tags: ["Billing", "Usage"],
                },
              ]} />
            )}

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Time Series Chart */}
              <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      📊
                    </div>
                    API Call Volume
                  </CardTitle>
                  <CardDescription className="text-[#888]">Daily API calls over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {timeSeries?.daily_volume && timeSeries.daily_volume.length > 0 ? (
                    <div className="space-y-3">
                      {timeSeries.daily_volume.slice(-7).map((day) => (
                        <div key={day.date} className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#222] rounded-lg">
                          <span className="text-sm text-white">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-cyan-500">{day.calls} calls</span>
                            {day.errors > 0 && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                {day.errors} errors
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-[#666] border border-dashed border-[#333] rounded-xl bg-[#1a1a1a]">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 text-[#666] mx-auto mb-2" />
                        No data available for selected period
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Performance */}
              <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      ⚡
                    </div>
                    Service Performance
                  </CardTitle>
                  <CardDescription className="text-[#888]">Performance by service</CardDescription>
                </CardHeader>
                <CardContent>
                  {overview?.top_services && overview.top_services.length > 0 ? (
                    <div className="space-y-3">
                      {overview.top_services.slice(0, 5).map((service, index) => (
                        <div key={service.service} className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#222] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30 text-xs font-bold text-cyan-500">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-white capitalize">{service.service}</span>
                          </div>
                          <span className="text-sm text-cyan-500 font-medium">{service.calls} calls</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-[#666] border border-dashed border-[#333] rounded-xl bg-[#1a1a1a]">
                      <div className="text-center">
                        <TrendingUp className="w-8 h-8 text-[#666] mx-auto mb-2" />
                        No service data available
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}