'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Eye, EyeOff, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { useClientApiCall } from '@/lib/api-client';

interface ServiceCredentials {
  [key: string]: string;
}

interface EditServiceModalProps {
  service: {
    id: string;
    service_name: string;
    environment: string;
    features: Record<string, boolean>;
  };
  trigger: React.ReactNode;
  onDelete?: () => void;
}

/**
 * Renders a modal UI for viewing and managing a service's credentials and connection.
 *
 * The modal lets users enter or update provider-specific credential fields, toggle visibility of each field, save changes to the server, and disconnect the service via a delete flow that requires confirmation. It displays validation, loading, success, and error states and optionally notifies a parent component after a successful disconnect.
 *
 * @param service - The service object containing `id`, `service_name`, `environment`, and `features` used to determine displayed fields and context.
 * @param trigger - A React node that acts as the modal trigger (rendered as the DialogTrigger child).
 * @param onDelete - Optional callback invoked after a successful disconnect; if not provided the page will reload.
 * @returns The modal component that manages editing and disconnecting the specified service.
 */
export function EditServiceModal({ service, trigger, onDelete }: EditServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<ServiceCredentials>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apiClient = useClientApiCall();

  // Get credential field names based on service type
  const getCredentialFields = (serviceName: string) => {
    const fieldMappings: Record<string, string[]> = {
      razorpay: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
      paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
      stripe: ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY'],
    };
    return fieldMappings[serviceName] || [];
  };

  const credentialFields = getCredentialFields(service.service_name);

  const toggleFieldVisibility = (field: string) => {
    const newVisible = new Set(visibleFields);
    if (newVisible.has(field)) {
      newVisible.delete(field);
    } else {
      newVisible.add(field);
    }
    setVisibleFields(newVisible);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate that at least one credential is provided
      const hasCredentials = Object.values(credentials).some(value => value.trim() !== '');
      if (!hasCredentials) {
        throw new Error('At least one credential must be provided');
      }

      // Call the API to update credentials
      await apiClient(`/api/services/${service.service_name}/credentials`, {
        method: 'PUT',
        body: JSON.stringify({
          credentials,
          environment: service.environment
        })
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setCredentials({});
        // Optionally refresh the page or update parent state
        window.location.reload();
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/services/${service.service_name}`, {
        method: 'DELETE'
      });

      // Close modal and notify parent
      setOpen(false);
      if (typeof onDelete === 'function') {
        onDelete();
      } else {
        window.location.reload();
      }

    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to disconnect service');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCredentials({});
    setError(null);
    setSuccess(false);
    setVisibleFields(new Set());
    setDeleteMode(false);
    setDeleteError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-[#222] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
              🔧
            </div>
            Edit {service.service_name} Credentials
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Info */}
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white capitalize">{service.service_name}</span>
              <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                {service.environment}
              </Badge>
            </div>
            <p className="text-sm text-[#888]">
              Update your API credentials securely. Changes will take effect immediately.
            </p>
          </div>

          {/* Credential Fields */}
          <div className="space-y-4">
            {credentialFields.map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field} className="text-sm font-medium text-[#ccc]">
                  {field.replace(/_/g, ' ')}
                </Label>
                <div className="relative">
                  <Input
                    id={field}
                    type={visibleFields.has(field) ? 'text' : 'password'}
                    value={credentials[field] || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={`Enter ${field.toLowerCase().replace(/_/g, ' ')}`}
                    className="bg-[#1a1a1a] border-[#333] text-white placeholder-[#666] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleFieldVisibility(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-cyan-400 transition-colors"
                  >
                    {visibleFields.has(field) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
              <p className="text-sm text-green-400">Credentials updated successfully!</p>
            </div>
          )}

          {/* Delete Confirmation Mode */}
          {deleteMode ? (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Disconnect {service.service_name}?</p>
                  <p className="text-xs text-[#888] mt-1">
                    This will remove {service.service_name} from your connected services. 
                    You can reconnect anytime.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setDeleteMode(false)}
                  variant="outline"
                  disabled={deleteLoading}
                  className="flex-1 bg-transparent border-[#333] text-[#888] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Action Buttons */
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-transparent border-[#333] text-[#888] hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => setDeleteMode(true)}
                variant="outline"
                className="flex-1 bg-transparent border-[#333] text-[#888] hover:border-red-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || success}
                className="flex-1 bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : success ? (
                  <>
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}