// frontend/src/components/GlobalEnvironmentToggle.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientApiCall } from "@/lib/api-client";
import { Loader2, Zap } from "lucide-react";

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
  const apiClient = useClientApiCall();

  // Determine current global mode
  useEffect(() => {
    if (services.length === 0) {
      setCurrentMode("test");
      return;
    }

    const environments = services.map(s => s.environment);
    const uniqueEnvs = [...new Set(environments)];

    if (uniqueEnvs.length === 1) {
      setCurrentMode(uniqueEnvs[0] as "test" | "live");
    } else {
      setCurrentMode("mixed");
    }
  }, [services]);

  const switchAllServices = async (targetEnvironment: "test" | "live") => {
    if (services.length === 0) return;

    setIsSwitching(true);
    try {
      // Switch all services to target environment
      const switchPromises = services.map(service =>
        apiClient(`/api/services/${service.service_name}/switch-environment`, {
          method: 'POST',
          body: JSON.stringify({ environment: targetEnvironment })
        })
      );

      await Promise.all(switchPromises);

      // Update local state
      setCurrentMode(targetEnvironment);
      onGlobalSwitch?.(targetEnvironment);

      // Reload the page to refresh all data
      window.location.reload();

    } catch (error) {
      console.error("Failed to switch all services:", error);
      // Could show a toast notification here
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

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#00ff88]" />
        <span className="text-sm font-mono text-white">Global Mode:</span>
        <Badge className={`${modeDisplay.color} ${modeDisplay.textColor} border-0 font-mono`}>
          {modeDisplay.label}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant={currentMode === "test" ? "default" : "outline"}
          size="sm"
          onClick={() => switchAllServices("test")}
          disabled={isSwitching}
          className="h-8 px-3 font-mono text-xs"
        >
          {isSwitching && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          All Test
        </Button>

        <Button
          variant={currentMode === "live" ? "default" : "outline"}
          size="sm"
          onClick={() => switchAllServices("live")}
          disabled={isSwitching}
          className="h-8 px-3 font-mono text-xs"
        >
          {isSwitching && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          All Live
        </Button>
      </div>
    </div>
  );
}