// frontend/src/app/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Clock, DollarSign,  BarChart3 } from "lucide-react";
import { useClientApiCall } from "@/lib/api-client";

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

  const apiClient = useClientApiCall();

  useEffect(() => {
    loadAnalytics();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your API usage and performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.total_calls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {overview.period} period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.success_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                API call success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.avg_response_time.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">
                Average API response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{overview.total_cost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Projected monthly: ₹{overview.projected_monthly.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              API Call Volume
            </CardTitle>
            <CardDescription>Daily API calls over time</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeries?.daily_volume && timeSeries.daily_volume.length > 0 ? (
              <div className="space-y-2">
                {timeSeries.daily_volume.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{day.calls} calls</span>
                      {day.errors > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {day.errors} errors
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Service Usage</CardTitle>
            <CardDescription>API calls by payment provider</CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.top_services && overview.top_services.length > 0 ? (
              <div className="space-y-4">
                {overview.top_services.map((service) => (
                  <div key={service.service} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium capitalize">{service.service}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {overview.error_rate_by_service[service.service] || 0}% errors
                      </span>
                      <span className="font-medium">{service.calls.toLocaleString()} calls</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No service usage data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      {overview?.cost_breakdown && Object.keys(overview.cost_breakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>API costs by service provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(overview.cost_breakdown).map(([service, cost]) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="font-medium capitalize">{service}</span>
                  <span className="font-medium">₹{cost.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 flex items-center justify-between font-semibold">
                <span>Total Cost</span>
                <span>₹{overview.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}