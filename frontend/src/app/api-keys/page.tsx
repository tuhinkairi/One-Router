'use client';

import { useState, useEffect, useCallback } from 'react';
import { useClientApiCall } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Copy, Key, Plus, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { GlobalEnvironmentToggle } from '@/components/GlobalEnvironmentToggle';
import { BentoGrid } from '@/components/ui/bento-grid';

import ApiKeysTable from '@/components/ApiKeysTable';
import { EditApiKeyModal, ActivityModal } from '@/components/ApiKeyModals';

interface APIKey {
  id: string;
  key_name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  rate_limit_per_min: number;
  rate_limit_per_day: number;
  environment: string;
  usage?: Record<string, unknown>;
}

interface Service {
  id: string;
  name: string;
  service_name: string;
  status?: string;
  environment: string;
  [key: string]: unknown;
}

const LoadingDots = () => (
  <div className="flex gap-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-[#00ff88]"
        style={{
          animation: "pulse 1s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </div>
);

export const dynamic = 'force-dynamic';

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [viewingActivity, setViewingActivity] = useState<APIKey | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState<'test' | 'live'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onerouter_environment');
      return (saved === 'live' || saved === 'test') ? saved : 'test';
    }
    return 'test';
  });

  const handleEnvironmentChange = (newEnvironment: "test" | "live") => {
    setCurrentEnvironment(newEnvironment);
  };

  const clientApiCall = useClientApiCall();

  const loadAPIKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientApiCall(`/api/keys?environment=${currentEnvironment}`);
      setApiKeys((response as { api_keys: APIKey[] }).api_keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [clientApiCall, currentEnvironment]);

  const loadServices = useCallback(async () => {
    try {
      const response = await clientApiCall('/api/services');
      setServices((response as { services: Service[] }).services || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    }
  }, [clientApiCall]);

  useEffect(() => {
    loadAPIKeys();
    loadServices();
  }, [currentEnvironment]);

  const generateAPIKey = async () => {
    setGenerating(true);
    try {
      const data = await clientApiCall('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          key_name: 'New API Key',
          environment: currentEnvironment,
          rate_limit_per_min: 60,
          rate_limit_per_day: 10000
        })
      });
      setNewKey((data as { api_key: string }).api_key);
      loadAPIKeys();
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('Failed to generate API key. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditKey = (key: APIKey) => {
    setEditingKey(key);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (keyId: string, data: { key_name: string; rate_limit_per_min: number; rate_limit_per_day: number }) => {
    setIsSaving(true);
    try {
      await clientApiCall(`/api/keys/${keyId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      await loadAPIKeys();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update API key:', error);
      alert('Failed to update API key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableKey = async (keyId: string) => {
    try {
      await clientApiCall(`/api/keys/${keyId}/disable`, {
        method: 'POST'
      });
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to disable API key:', error);
      alert('Failed to disable API key.');
    }
  };

  const handleEnableKey = async (keyId: string) => {
    try {
      await clientApiCall(`/api/keys/${keyId}/enable`, {
        method: 'POST'
      });
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to enable API key:', error);
      alert('Failed to enable API key.');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      try {
        await clientApiCall(`/api/keys/${keyId}`, {
          method: 'DELETE'
        });
        await loadAPIKeys();
      } catch (error) {
        console.error('Failed to delete API key:', error);
        alert('Failed to delete API key.');
      }
    }
  };

  const handleViewActivity = (key: APIKey) => {
    setViewingActivity(key);
    setIsActivityModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <LoadingDots />
          <p className="mt-4 text-[#888] font-mono">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="text-white font-sans border-t border-white/10">
        <header className="border-[#333] backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center space-x-4">
                  <GlobalEnvironmentToggle 
                    services={services} 
                    onGlobalSwitch={handleEnvironmentChange}
                  />
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
          <div className="pointer-events-none absolute inset-0 overflow-hidden border border-white/10 mask-[linear-gradient(to_bottom,white_0%,white_80%,transparent_100%)]">
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
            {/* API Keys Metrics */}
            <BentoGrid items={[
              {
                title: "Total API Keys",
                meta: `${apiKeys.length} active`,
                description: "Manage your API keys and permissions for secure access",
                icon: <Key className="w-4 h-4 text-cyan-500" />,
                status: "Active",
                tags: ["Authentication", "Security"],
                colSpan: 2,
                hasPersistentHover: true,
              },
              {
                title: "Security Features",
                meta: "3 enabled",
                description: "Advanced security measures protecting your API access",
                icon: <Shield className="w-4 h-4 text-cyan-500" />,
                status: "Protected",
                tags: ["Security", "Encryption"],
              },
            ]} />

            {/* Environment indicator */}
            {apiKeys.length === 0 && (
              <div className="mb-8 p-4 bg-[#1a1a1a] rounded border border-[#222]">
                <p className="text-sm text-[#888]">
                  No API keys in <span className="text-cyan-500 font-medium">{currentEnvironment}</span> environment. 
                  Create one to get started.
                </p>
              </div>
            )}

            {/* New Key Alert */}
            {newKey && (
              <Card className="bg-[#0a0a0a] border border-[#222] mb-8 hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex shrink-0">
                      <AlertTriangle className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-cyan-500 mb-2">
                        New API Key Generated
                      </h3>
                      <div className="flex items-center gap-2 font-mono bg-[#1a1a1a] p-4 rounded border border-[#222] mb-4">
                        <code className="flex-1 text-cyan-500 text-sm">{newKey}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(newKey)}
                          className="px-3 py-2 bg-cyan-500 text-black rounded hover:bg-cyan-600 transition-colors text-sm font-medium"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[#888] text-sm mb-4">
                        <strong>Important:</strong> Copy this key now. It will not be shown again for security reasons.
                      </p>
                      <Button
                        onClick={() => setNewKey(null)}
                        variant="outline"
                        className="bg-transparent border-[#222] text-white hover:border-cyan-500"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* API Keys Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <div className="w-8 h-8  flex items-center justify-center ">
                    🔑
                  </div>
                  Your API Keys ({currentEnvironment === 'test' ? 'Test' : 'Live'})
                </h2>
                <Button
                  onClick={generateAPIKey}
                  disabled={generating}
                  className="bg-cyan-500 text-black hover:bg-cyan-600 px-6 py-2"
                >
                  {generating ? (
                    <>
                      <LoadingDots />
                      <span className="ml-2">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create API Key
                    </>
                  )}
                </Button>
              </div>
              
              <ApiKeysTable
                apiKeys={apiKeys}
                onEdit={handleEditKey}
                onDisable={handleDisableKey}
                onEnable={handleEnableKey}
                onDelete={handleDeleteKey}
                onViewActivity={handleViewActivity}
                loading={loading}
              />
            </div>

            {/* Security Features */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      🔒
                    </div>
                    AES-256 Encryption
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#888]">Your keys are encrypted at rest with military-grade security</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      ⚡
                    </div>
                    Rate Limiting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#888]">Automatic rate limiting protection prevents abuse</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border border-[#222] hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                      📊
                    </div>
                    Audit Logging
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#888]">Complete access logs available for compliance</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Modals */}
        <EditApiKeyModal
          isOpen={isEditModalOpen}
          apiKey={editingKey}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingKey(null);
          }}
          onSave={handleSaveEdit}
          loading={isSaving}
        />

        <ActivityModal
          isOpen={isActivityModalOpen}
          apiKey={viewingActivity}
          onClose={() => {
            setIsActivityModalOpen(false);
            setViewingActivity(null);
          }}
          activity={viewingActivity?.usage}
        />
      </div>
    </DashboardLayout>
  );
}