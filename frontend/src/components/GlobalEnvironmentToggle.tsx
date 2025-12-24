// frontend/src/components/GlobalEnvironmentToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientApiCall } from "@/lib/api-client";
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
  const apiClient = useClientApiCall();

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
    
    // Immediately update UI to show the target mode
    setManualOverride(targetEnvironment);
    setCurrentMode(targetEnvironment);
    setIsSwitching(true);
    
    try {
      console.log('Switching all services to:', targetEnvironment);

      // Switch all services to target environment
      const switchPromises = services.map(service => {
        console.log(`Switching ${service.service_name} to ${targetEnvironment}`);
        return apiClient(`/api/services/${service.service_name}/switch-environment`, {
          method: 'POST',
          body: JSON.stringify({ environment: targetEnvironment })
        });
      });

      const results = await Promise.all(switchPromises);
      console.log('Switch results:', results);

      // Check if any API calls failed
      const failedResults = results.filter(result => !result || result.error);
      if (failedResults.length > 0) {
        console.error('Some API calls failed:', failedResults);
        throw new Error('Some environment switches failed');
      }

      onGlobalSwitch?.(targetEnvironment);

      // Debug: Check what the backend thinks the state is
      try {
        const debugResponse = await apiClient('/api/debug/service-environments');
        console.log('Backend state after switch:', debugResponse);
      } catch (debugError) {
        console.warn('Could not fetch debug state:', debugError);
      }

      // Wait longer to ensure all backend operations complete before reload
      console.log('All switches completed successfully, waiting before reload...');
      setTimeout(() => {
        console.log('Reloading page after environment switch');
        console.log('Current window location:', window.location.href);
        window.location.href = window.location.href; // Force full page reload with fresh data
      }, 1500);

    } catch (error) {
      console.error("Failed to switch all services:", error);
      // Reset on error - let it recalculate from services
      setManualOverride(null);
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