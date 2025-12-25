'use client';

import { useState } from 'react';
import { Copy, MoreVertical, Eye, Edit2, Trash2, Lock, LockOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  usage?: Record<string, unknown>;
}

interface ApiKeysTableProps {
  apiKeys: APIKey[];
  onEdit: (key: APIKey) => void;
  onDisable: (keyId: string) => void;
  onEnable: (keyId: string) => void;
  onDelete: (keyId: string) => void;
  onViewActivity: (key: APIKey) => void;
  loading?: boolean;
}

const DropdownMenu = ({ 
  keyId, 
  isActive, 
  onEdit, 
  onDisable, 
  onEnable, 
  onDelete, 
  onViewActivity,
  apiKey
}: {
  keyId: string;
  isActive: boolean;
  onEdit: (key: APIKey) => void;
  onDisable: (keyId: string) => void;
  onEnable: (keyId: string) => void;
  onDelete: (keyId: string) => void;
  onViewActivity: (key: APIKey) => void;
  apiKey: APIKey;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-[#222] rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-[#888]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => {
              onViewActivity(apiKey);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#888] hover:bg-[#222] hover:text-white transition-colors border-b border-[#333]"
          >
            <Eye className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => {
              onEdit(apiKey);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#888] hover:bg-[#222] hover:text-white transition-colors border-b border-[#333]"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>

          {isActive ? (
            <button
              onClick={() => {
                onDisable(keyId);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#888] hover:bg-[#222] hover:text-white transition-colors border-b border-[#333]"
            >
              <Lock className="w-4 h-4" />
              Disable
            </button>
          ) : (
            <button
              onClick={() => {
                onEnable(keyId);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#888] hover:bg-[#222] hover:text-white transition-colors border-b border-[#333]"
            >
              <LockOpen className="w-4 h-4" />
              Enable
            </button>
          )}

          <button
            onClick={() => {
              onDelete(keyId);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default function ApiKeysTable({
  apiKeys,
  onEdit,
  onDisable,
  onEnable,
  onDelete,
  onViewActivity,
  loading = false
}: ApiKeysTableProps) {
  const [copyingKeyId, setCopyingKeyId] = useState<string | null>(null);

  /**
   * Mask the API key prefix for display
   * Shows only the last 4 characters with bullet points for security
   * Example: sk-or-v1-••••••••xxxx (for an 8-char prefix)
   */
  const maskKeyPrefix = (prefix: string): string => {
    if (prefix.length <= 4) {
      return prefix; // Don't mask if 4 chars or less
    }
    const bulletCount = prefix.length - 4;
    return '•'.repeat(bulletCount) + prefix.slice(-4);
  };

  /**
   * Copy API key to clipboard with confirmation dialog
   * Prevents accidental exposure of sensitive credentials
   */
  const handleCopyWithConfirmation = async (keyId: string, keyPrefix: string) => {
    const confirmed = confirm(
      '⚠️ Copy API Key Prefix?\n\n' +
      'This will copy your API key prefix to the clipboard.\n' +
      'The full key will be visible in your clipboard for 30 seconds,\n' +
      'then automatically cleared for security.\n\n' +
      'Proceed?'
    );

    if (!confirmed) return;

    try {
      setCopyingKeyId(keyId);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(keyPrefix);
      
      // Show feedback
      console.log('API key prefix copied to clipboard');
      
      // Auto-clear clipboard after 30 seconds for security
      const clearClipboardTimeout = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
          console.log('Clipboard cleared for security');
        } catch (err) {
          console.warn('Could not auto-clear clipboard:', err);
        }
      }, 30000); // 30 seconds

      // Clear the timeout if component unmounts
      return () => clearTimeout(clearClipboardTimeout);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy. Your browser may not support clipboard access.');
    } finally {
      setCopyingKeyId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#0a0a0a] border border-[#1a1a1a]">
        <CardContent className="p-8 text-center">
          <p className="text-[#888]">Loading API keys...</p>
        </CardContent>
      </Card>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <Card className="bg-[#0a0a0a] border border-[#222]">
        <CardContent className="p-8 text-center">
          <p className="text-[#888]">No API keys found. Create one to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="">
      <div className="bg-black border border-[#222] rounded-2xl  transition-all duration-300">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222] bg-black">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Key</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Usage</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Limit</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Created</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key, index) => (
                <tr
                  key={key.id}
                  className={`border-b border-[#222] hover:bg-[#111] transition-colors ${
                    index === apiKeys.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-white font-mono text-sm">{key.key_name}</p>
                        <p className="text-[#666] text-xs mt-1">
                          sk-or-v1-{maskKeyPrefix(key.key_prefix)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyWithConfirmation(key.id, key.key_prefix)}
                        disabled={copyingKeyId === key.id}
                        className="p-1 hover:bg-[#222] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Copy prefix (confirmation required)"
                      >
                        <Copy className={`w-3 h-3 ${copyingKeyId === key.id ? 'text-cyan-500' : 'text-[#888]'}`} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white">
                      ${((key.usage as Record<string, number> | undefined)?.total_cost || 0).toFixed(3)}
                    </p>
                    <p className="text-[#666] text-xs mt-1">
                      {((key.usage as Record<string, number> | undefined)?.request_count || 0)} requests
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">
                      <p className="text-sm">{key.rate_limit_per_min}/min</p>
                      <p className="text-[#666] text-xs mt-1">{key.rate_limit_per_day}/day</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={`${
                        key.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      } border`}
                    >
                      {key.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[#888] text-sm">
                      {new Date(key.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu
                      keyId={key.id}
                      isActive={key.is_active}
                      onEdit={onEdit}
                      onDisable={onDisable}
                      onEnable={onEnable}
                      onDelete={onDelete}
                      onViewActivity={onViewActivity}
                      apiKey={key}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </div>
    </div>
  );
}
