'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface APIKey {
  id: string;
  key_name: string;
  key_prefix: string;
  environment: string;
  is_active: boolean;
  rate_limit_per_min: number;
  rate_limit_per_day: number;
  last_used_at: string | null;
  created_at: string;
}

interface EditApiKeyModalProps {
  isOpen: boolean;
  apiKey: APIKey | null;
  onClose: () => void;
  onSave: (keyId: string, data: { key_name: string; rate_limit_per_min: number; rate_limit_per_day: number }) => Promise<void>;
  loading?: boolean;
}

export function EditApiKeyModal({
  isOpen,
  apiKey,
  onClose,
  onSave,
  loading = false
}: EditApiKeyModalProps) {
  const [formData, setFormData] = useState({
    key_name: apiKey?.key_name || '',
    rate_limit_per_min: apiKey?.rate_limit_per_min || 60,
    rate_limit_per_day: apiKey?.rate_limit_per_day || 10000
  });

  const handleSave = async () => {
    if (apiKey) {
      await onSave(apiKey.id, formData);
      onClose();
    }
  };

  if (!isOpen || !apiKey) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <Card className="bg-[#0a0a0a] border border-[#333] w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Edit API Key</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#222] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[#888]" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="key_name" className="text-white mb-2">
                Key Name
              </Label>
              <Input
                id="key_name"
                value={formData.key_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, key_name: e.target.value })}
                className="bg-[#1a1a1a] border-[#333] text-white"
                placeholder="My API Key"
              />
            </div>

            <div>
              <Label htmlFor="rate_limit_min" className="text-white mb-2">
                Rate Limit (requests per minute)
              </Label>
              <Input
                id="rate_limit_min"
                type="number"
                value={formData.rate_limit_per_min}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rate_limit_per_min: parseInt(e.target.value) })}
                className="bg-[#1a1a1a] border-[#333] text-white"
              />
            </div>

            <div>
              <Label htmlFor="rate_limit_day" className="text-white mb-2">
                Rate Limit (requests per day)
              </Label>
              <Input
                id="rate_limit_day"
                type="number"
                value={formData.rate_limit_per_day}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rate_limit_per_day: parseInt(e.target.value) })}
                className="bg-[#1a1a1a] border-[#333] text-white"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-transparent border-[#333] text-white hover:border-[#555]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-cyan-500 text-black hover:bg-cyan-600"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ActivityModalProps {
  isOpen: boolean;
  apiKey: APIKey | null;
  onClose: () => void;
  activity?: Record<string, unknown>;
}

export function ActivityModal({
  isOpen,
  apiKey,
  onClose,
  activity
}: ActivityModalProps) {
  if (!isOpen || !apiKey) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <Card className="bg-[#0a0a0a] border border-[#333] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">API Key Activity</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#222] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[#888]" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-[#888] text-sm">Key Name</p>
              <p className="text-white font-mono mt-1">{apiKey.key_name}</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-[#888] text-sm">Created</p>
              <p className="text-white mt-1">
                {new Date(apiKey.created_at).toLocaleString()}
              </p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <p className="text-[#888] text-sm">Last Used</p>
              <p className="text-white mt-1">
                {apiKey.last_used_at
                  ? new Date(apiKey.last_used_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>

            {activity && (
              <>
                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-[#888] text-sm">Total Requests</p>
                  <p className="text-white mt-1">{(activity as Record<string, number> | undefined)?.request_count || 0}</p>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg p-4">
                  <p className="text-[#888] text-sm">Total Cost</p>
                  <p className="text-white mt-1">${((activity as Record<string, number> | undefined)?.total_cost || 0).toFixed(3)}</p>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={onClose}
            className="w-full mt-6 bg-cyan-500 text-black hover:bg-cyan-600"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
