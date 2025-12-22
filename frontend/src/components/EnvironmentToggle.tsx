// frontend/src/components/EnvironmentToggle.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientApiCall } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

interface EnvironmentToggleProps {
  service: string;
}

export function EnvironmentToggle({ service }: EnvironmentToggleProps) {
  console.log('EnvironmentToggle: Component initialized for service:', service);

  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState<{
    test: { configured: boolean; last_used: string | null };
    live: { configured: boolean; last_used: string | null };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useClientApiCall();
  const { isSignedIn } = useAuth();
  const hasLoadedRef = useRef(false);

  const loadEnvironmentStatus = useCallback(async () => {
    try {
      const endpoint = `/api/services/${service}/environments`;
      console.log('EnvironmentToggle: Loading environment status for service:', service);
      console.log('EnvironmentToggle: Making API call to:', endpoint);

      // Check if service name is valid
      if (!service || service.trim() === '') {
        console.error('EnvironmentToggle: Invalid service name:', service);
        setError("Invalid service name");
        setEnvironments({
          test: { configured: true, last_used: null },
          live: { configured: false, last_used: null }
        });
        return;
      }

      const response = await apiClient(endpoint);
      console.log('EnvironmentToggle: Response received:', response);
      setEnvironments(response);

      // Set current environment based on user preferences
      try {
        const prefsResponse = await apiClient("/api/user/environment-preferences");
        const userEnv = prefsResponse.environments[service];
        if (userEnv && (userEnv === "test" || userEnv === "live")) {
          setEnvironment(userEnv);
        }
      } catch (prefsError) {
        console.warn("Could not load user preferences, using default environment:", prefsError);
        // Default to test if we can't load preferences
        setEnvironment("test");
      }
    } catch (error) {
      console.error("EnvironmentToggle: Failed to load environment status:", error);
      console.error("EnvironmentToggle: Error details:", error);

      // Set error state and default fallback
      setError("Failed to load environment status");
      setEnvironments({
        test: { configured: true, last_used: null },
        live: { configured: false, last_used: null }
      });
      setEnvironment("test");
    }
  }, [service, apiClient]);

  // Load environment status on mount (only if authenticated)
  // Use ref to prevent multiple calls
  useEffect(() => {
    if (isSignedIn && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadEnvironmentStatus();
    }
  }, [service, isSignedIn, loadEnvironmentStatus]);

  const switchEnvironment = async (newEnvironment: "test" | "live") => {
    if (newEnvironment === environment) return;

    setLoading(true);
    try {
      await apiClient(`/api/services/${service}/switch-environment`, {
        method: 'POST',
        body: JSON.stringify({ environment: newEnvironment })
      });

      setEnvironment(newEnvironment);

      // Reload environment status to get updated timestamps
      await loadEnvironmentStatus();
    } catch (error) {
      console.error("Failed to switch environment:", error);
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

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            loadEnvironmentStatus();
          }}
          className="h-7 text-xs"
        >
          Retry
        </Button>
        <span className="text-xs text-red-400">API Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium capitalize">{service}</span>

      <div className="flex gap-1">
        <Button
          variant={environment === "test" ? "default" : "outline"}
          size="sm"
          onClick={() => switchEnvironment("test")}
          disabled={loading || !environments.test.configured}
          className="h-7 px-3"
        >
          Test
          {environments.test.configured && (
            <Badge variant="secondary" className="ml-1 h-4 text-xs">
              ✓
            </Badge>
          )}
        </Button>

        <Button
          variant={environment === "live" ? "default" : "outline"}
          size="sm"
          onClick={() => switchEnvironment("live")}
          disabled={loading || !environments.live.configured}
          className="h-7 px-3"
        >
          Live
          {environments.live.configured && (
            <Badge variant="secondary" className="ml-1 h-4 text-xs">
              ✓
            </Badge>
          )}
        </Button>
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin" />}

      <div className="text-xs text-muted-foreground">
        {environment === "test" && environments.test.last_used && (
          <span>Last used: {new Date(environments.test.last_used).toLocaleDateString()}</span>
        )}
        {environment === "live" && environments.live.last_used && (
          <span>Last used: {new Date(environments.live.last_used).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}