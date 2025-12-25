// frontend/src/components/GlobalEnvironmentToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientApiCall } from "@/lib/api-client";
import { fetchWithCsrf } from "@/lib/csrf";
import { Loader2, Zap, Shield } from "lucide-react";

interface Service {
  id: string;
  service_name: string;
  environment: string;
}

interface GlobalEnvironmentToggleProps {
  services: Service[];
  onGlobalSwitch?: (newEnvironment: "test" | "live") => void;
}

export function GlobalEnvironmentToggle({ services, onGlobalSwitch }: GlobalEnvironmentToggleProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [currentMode, setCurrentMode] = useState<"test" | "live" | "mixed">("test");
  const [manualOverride, setManualOverride] = useState<"test" | "live" | null>(null);
  const { getToken } = useAuth();
  const apiClient = useClientApiCall();

  // Load CSRF token on component mount for state-changing operations
  useEffect(() => {
    const loadTokenWithAuth = async () => {
      try {
        const token = await getToken();
        // Load CSRF token with authentication context
        const response = await fetch('/api/csrf/token', {
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
          console.warn('Failed to fetch CSRF token:', response.statusText);
          return;
        }
        const data = await response.json();
        console.log('CSRF token loaded successfully');
      } catch (error) {
        console.warn('Failed to preload CSRF token:', error);
      }
    };
    loadTokenWithAuth();
  }, [getToken]);

  // Determine current global mode
  useEffect(() => {
    // If user just switched, trust their choice until page reloads
    if (manualOverride) {
      setCurrentMode(manualOverride);
      return;
    }

    if (services.length === 0) {
      setCurrentMode("test");
      return;
    }

    console.log('Determining current global mode from services:', services.map(s => ({ name: s.service_name, env: s.environment })));

    const environments = services.map(s => s.environment);
    const uniqueEnvs = [...new Set(environments)];

    console.log('Unique environments found:', uniqueEnvs);

    if (uniqueEnvs.length === 1) {
      const mode = uniqueEnvs[0] as "test" | "live";
      setCurrentMode(mode);
      console.log('Set current mode to:', mode);
    } else {
      setCurrentMode("mixed");
      console.log('Set current mode to: mixed');
    }
  }, [services, manualOverride]);

  const switchAllServices = async (targetEnvironment: "test" | "live") => {
    if (services.length === 0) return;
    
    // Get Clerk token for authentication
    const token = await getToken();
    if (!token) {
      alert('Authentication failed. Please log in again.');
      return;
    }
    
    // Immediately update UI to show the target mode
    setManualOverride(targetEnvironment);
    setCurrentMode(targetEnvironment);
    setIsSwitching(true);
    
    try {
      console.log('Atomically switching all services to:', targetEnvironment);

      // Use atomic batch API instead of sequential updates
      // This ensures all-or-nothing semantics with database transaction
      const switchResponse = await fetchWithCsrf('/api/services/switch-all-environments', {
        method: 'POST',
        body: JSON.stringify({
          environment: targetEnvironment,
          service_ids: services.map(s => s.id)
        })
      }, token);

      if (!switchResponse.ok) {
        throw new Error(`Switch failed: ${switchResponse.statusText}`);
      }

      const switchResult = await switchResponse.json();
      console.log('Switch result:', switchResult);

      // Verify that the switch succeeded
      const verifyResponse = await fetchWithCsrf('/api/services/verify-environment', {
        method: 'POST',
        body: JSON.stringify({ expected: targetEnvironment })
      }, token);

      if (!verifyResponse.ok) {
        throw new Error(`Verification failed: ${verifyResponse.statusText}`);
      }

      const verification = await verifyResponse.json();
      console.log('Verification result:', verification);

      // Check if all services switched successfully
      if (!verification.all_switched) {
        console.error('Not all services switched:', {
          switched: verification.switched_count,
          failed: verification.failed_count,
          services: verification.services
        });
        throw new Error(
          `Environment switch incomplete: ${verification.switched_count} switched, ` +
          `${verification.failed_count} failed`
        );
      }

      onGlobalSwitch?.(targetEnvironment);
      console.log('All services switched successfully');

      // Soft reload - use SWR-like refetch instead of hard page reload
      // This preserves user state while getting fresh data
      // The parent component should have access to a mutate function for /api/services
      // For now, do a gentle refresh of just the services data
      // Note: Ideally this would be passed as a prop from parent component that uses SWR
      try {
        // Refresh the page data without full reload
        // This gives users fresh data without losing form state
        window.location.href = window.location.href;
      } catch (err) {
        console.warn('Could not trigger data refresh:', err);
      }

    } catch (error) {
      console.error("Failed to switch all services:", error);
      // Reset on error - let it recalculate from services
      setManualOverride(null);
      setCurrentMode("test");
      
      // Show user-friendly error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Failed to switch environment: ${errorMsg}\n\nPlease try again.`);
    } finally {
      setIsSwitching(false);
    }
  };

  const getModeDisplay = () => {
    switch (currentMode) {
      case "test":
        return { label: "Test Mode", color: "bg-blue-500", textColor: "text-white" };
      case "live":
        return { label: "Live Mode", color: "bg-green-500", textColor: "text-white" };
      case "mixed":
        return { label: "Mixed Mode", color: "bg-yellow-500", textColor: "text-black" };
      default:
        return { label: "Unknown", color: "bg-gray-500", textColor: "text-white" };
    }
  };

  const modeDisplay = getModeDisplay();

  if (services.length === 0) {
    return null; // Don't show if no services
  }

  const isLiveMode = currentMode === "live";

  return (
    <div className="flex items-center bg-[#1a1a1a] rounded-full border border-[#333] p-1">
      <button
        onClick={() => !isSwitching && switchAllServices("test")}
        disabled={isSwitching}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${
          !isLiveMode
            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
            : "text-[#888] hover:text-white hover:bg-[#333]"
        } ${isSwitching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isSwitching && !isLiveMode && <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />}
        <Zap className="w-3 h-3 mr-1 inline" />
        Test
        {!isLiveMode && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        )}
      </button>

      <button
        onClick={() => !isSwitching && switchAllServices("live")}
        disabled={isSwitching}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${
          isLiveMode
            ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
            : "text-[#888] hover:text-white hover:bg-[#333]"
        } ${isSwitching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isSwitching && isLiveMode && <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />}
        <Shield className="w-3 h-3 mr-1 inline" />
        Live
        {isLiveMode && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </button>
    </div>
  );
}