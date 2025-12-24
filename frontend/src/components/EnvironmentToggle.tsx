'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientApiCall } from '@/lib/api-client';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

interface EnvironmentToggleProps {
  service: string;
}

export function EnvironmentToggle({ service }: EnvironmentToggleProps) {
  const [environment, setEnvironment] = useState<'test' | 'live'>('test');
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState<{
    test: { configured: boolean; last_used: string | null };
    live: { configured: boolean; last_used: string | null };
  } | null>(null);

  const apiClient = useClientApiCall();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      loadEnvironmentStatus();
    }
  }, [service, isSignedIn]);

  const loadEnvironmentStatus = async () => {
    try {
      const response = await apiClient(`/api/services/${service}/environments`);
      setEnvironments(response);

      // Load user preference
      try {
        const prefsResponse = await apiClient('/api/user/environment-preferences');
        const userEnv = prefsResponse.environments[service];
        if (userEnv) {
          setEnvironment(userEnv);
        }
      } catch (prefsError) {
        console.warn('Could not load user preferences, using default environment:', prefsError);
        // Default to test if we can't load preferences
        setEnvironment('test');
      }
    } catch (error) {
      console.error('Failed to load environment status:', error);
      // Set default state on error - assume test environment
      setEnvironments({
        test: { configured: true, last_used: null },
        live: { configured: false, last_used: null }
      });
      setEnvironment('test');
    }
  };

  const switchEnvironment = async (newEnv: 'test' | 'live') => {
    if (newEnv === environment) return;

    setLoading(true);
    try {
      await apiClient(`/api/services/${service}/switch-environment`, {
        method: 'POST',
        body: JSON.stringify({ environment: newEnv })
      });

      setEnvironment(newEnv);
      await loadEnvironmentStatus();
    } catch (error) {
      console.error('Failed to switch environment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sign in to manage environments</span>
      </div>
    );
  }

  if (!environments) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium capitalize">{service}</span>
      <div className="flex gap-1">
        <Button
          variant={environment === 'test' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchEnvironment('test')}
          disabled={loading || !environments.test.configured}
          className="h-7 px-3"
        >
          Test
          {environments.test.configured && <Badge className="ml-1 h-4 text-xs">✓</Badge>}
        </Button>
        <Button
          variant={environment === 'live' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchEnvironment('live')}
          disabled={loading || !environments.live.configured}
          className="h-7 px-3"
        >
          Live
          {environments.live.configured && <Badge className="ml-1 h-4 text-xs">✓</Badge>}
        </Button>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
  );
}