'use client';

import { useState, useEffect } from 'react';
import { useClientApiCall } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Copy, Key, Plus, Trash2 } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

export const dynamic = 'force-dynamic';

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const clientApiCall = useClientApiCall();

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      // For now, just show empty state
      setApiKeys([]);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAPIKey = async () => {
    setGenerating(true);
    try {
      const data = await clientApiCall('/api/keys', {
        method: 'POST',
      });
      setNewKey(data.api_key);
      loadAPIKeys(); // Refresh the list
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('Failed to generate API key. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your application access keys</p>
            </div>
            <Button
              onClick={generateAPIKey}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate New Key'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {newKey && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    New API Key Generated
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="font-mono bg-yellow-100 p-2 rounded">
                      {newKey}
                    </p>
                    <p className="mt-2">
                      <strong>Important:</strong> Copy this key now. It will not be shown again for security reasons.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setNewKey(null)}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <Card className="text-center py-12 bg-white border border-gray-200">
              <CardContent className="pt-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Key className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No API keys yet</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Generate your first API key to start integrating OneRouter into your applications.
                </p>
                <Button
                  onClick={generateAPIKey}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate Your First API Key'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your API Keys</h3>
                <p className="text-sm text-gray-600">Manage and monitor your API access</p>
              </div>
              <div className="divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <div key={key.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Key className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{key.name}</p>
                            <Badge
                              variant={key.is_active ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {key.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                              {key.prefix}••••••••
                            </code>
                            <span className="text-xs text-gray-500">
                              Created {new Date(key.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(`${key.prefix}••••••••`)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
           )}
        </div>
      </main>
    </div>
  );
}