'use client';

import { useState, useEffect } from 'react';
import { useClientApiCall } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCode, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import Link from 'next/link';

interface Transaction {
  id: string;
  transaction_id: string;
  service_name: string;
  endpoint: string;
  http_method: string;
  status: string;
  response_status: number;
  response_time_ms: number;
  created_at: string;
}

export default function LogsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const apiClient = useClientApiCall();

  useEffect(() => {
    loadTransactions();
    loadServices();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // This endpoint needs to be created in the backend
      // For now, we'll use a placeholder
      const response = await apiClient('/api/analytics/logs?limit=100');
      setTransactions(response.logs || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
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

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.status === filter;
    const matchesSearch = searchTerm === '' ||
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-cyan-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
      default:
        return 'bg-cyan-500 text-white';
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
            {/* Logs Metrics */}
            <BentoGrid items={[
              {
                title: "Total Transactions",
                meta: transactions.length.toString(),
                description: "API calls logged in the system",
                icon: <FileCode className="w-4 h-4 text-cyan-500" />,
                status: "Active",
                tags: ["Logs", "Transactions"],
                colSpan: 2,
                hasPersistentHover: true,
              },
              {
                title: "Success Rate",
                meta: transactions.length > 0 ? `${Math.round((transactions.filter(tx => tx.status === 'success').length / transactions.length) * 100)}%` : "0%",
                description: "Percentage of successful transactions",
                icon: <CheckCircle className="w-4 h-4 text-cyan-500" />,
                status: "Tracked",
                tags: ["Performance", "Success"],
              },
            ]} />

            {/* Filters */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by transaction ID or service..."
                      className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-[#222] rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex gap-2">
                    {['all', 'success', 'failed', 'pending'].map((status) => (
                      <Button
                        key={status}
                        onClick={() => setFilter(status)}
                        variant={filter === status ? 'default' : 'outline'}
                        className={filter === status ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-transparent border-[#222] text-white hover:border-cyan-500'}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Logs */}
            <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      📋
                    </div>
                    Transaction Logs
                  </CardTitle>
                  <span className="text-sm text-[#888] bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#222]">
                    {filteredTransactions.length} transactions
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-[#666] border border-dashed border-[#333] rounded-xl bg-[#1a1a1a]">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-cyan-500/20">
                      <FileCode className="w-8 h-8 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
                    <p className="text-[#888]">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.slice(0, 20).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 bg-[#1a1a1a] border border-[#222] rounded-lg hover:border-cyan-500 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(tx.status)}
                              <code className="text-sm font-mono text-cyan-500">
                                {tx.transaction_id}
                              </code>
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                                {tx.service_name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-[#666]">
                              <span className="font-mono">{tx.http_method} {tx.endpoint}</span>
                              <span>•</span>
                              <span>{tx.response_time_ms}ms</span>
                              <span>•</span>
                              <span>{new Date(tx.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(tx.status)}>
                              {tx.status}
                            </Badge>
                            <Badge variant="outline" className="font-mono border-[#222] text-[#888]">
                              {tx.response_status}
                            </Badge>
                          </div>
                        </div>
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