import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, Shield, Zap, FileCode, X } from "lucide-react";

// Service Detection Types
type ServiceStatus = "supported" | "unsupported";
type DetectedService = {
  name: string;
  status: ServiceStatus;
  keys: string[];
  features: string[];
  feature_metadata?: Record<string, unknown>;
};

type BackendService = {
  service_name: string;
  detected_keys: string[];
  features: Record<string, boolean>;
  feature_metadata?: Record<string, unknown>;
};

// Environment Parser Component
const EnvOnboardingFlow = ({ onBack }: { onBack: () => void }) => {
  const { getToken, isSignedIn } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [detectedServices, setDetectedServices] = useState<DetectedService[]>([]);
   const [step, setStep] = useState<"check-existing" | "upload" | "review" | "complete">("check-existing");
   const [sessionId, setSessionId] = useState<string | null>(null);
   const [existingServices, setExistingServices] = useState<DetectedService[]>([]);
   const [detectedEnvironment, setDetectedEnvironment] = useState<"test" | "live" | null>(null);
   const [checkingExisting, setCheckingExisting] = useState(true);
   const [editingKey, setEditingKey] = useState<{ service: string; key: string; value: string } | null>(null);

   // Check existing services on mount
   useEffect(() => {
     checkExistingServices();
   }, []);

   const checkExistingServices = async () => {
     try {
       const token = await getToken();
       if (!token) return;

       const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

       // Get existing services
       const servicesResponse = await fetch(`${API_BASE_URL}/api/services`, {
         headers: {
           'Authorization': `Bearer ${token}`,
         },
       });

       if (servicesResponse.ok) {
         const servicesData = await servicesResponse.json();
         const existing: DetectedService[] = servicesData.services.map((service: BackendService) => ({
           name: service.service_name,
           status: "supported" as ServiceStatus,
           keys: [], // We'll detect these from environment variables
           features: Object.keys(service.features || {}).filter(key => service.features[key])
         }));
         setExistingServices(existing);
       }

       // Try to detect environment from current variables
       await detectEnvironmentVariables();

     } catch (error) {
       console.error('Error checking existing services:', error);
     } finally {
       setCheckingExisting(false);
     }
   };

   const detectEnvironmentVariables = async () => {
     try {
       // This is a simplified detection - in production, you might check actual environment variables
       // For now, we'll detect based on existing service configurations
       const token = await getToken();
       if (!token) return;

       const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

       // Check if any services are configured with live credentials
       let hasLiveCredentials = false;
       for (const service of existingServices) {
         try {
           const envResponse = await fetch(`${API_BASE_URL}/api/services/${encodeURIComponent(service.name)}/environments`, {
             headers: {
               'Authorization': `Bearer ${token}`,
             },
           });
           if (envResponse.ok) {
             const envData = await envResponse.json();
             if (envData.live?.configured) {
               hasLiveCredentials = true;
               break;
             }
           }
         } catch (error) {
           // Ignore errors for individual services
         }
       }

       setDetectedEnvironment(hasLiveCredentials ? "live" : "test");
     } catch (error) {
       console.error('Error detecting environment:', error);
       setDetectedEnvironment("test"); // Default to test
     }
   };

   const handleKeyEdit = (serviceName: string, keyName: string) => {
     setEditingKey({ service: serviceName, key: keyName, value: "" });
   };

   const handleKeyEditSubmit = () => {
     // Here you would typically send the updated key to the backend
     setEditingKey(null);
   };

   const handleExistingCheckComplete = () => {
     setStep("upload");
   };

   // Supported services
  const SUPPORTED_SERVICES = {
    razorpay: { patterns: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], features: ["Payments", "Refunds", "Webhooks"] },
    stripe: { patterns: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"], features: ["Payments", "Subscriptions", "Refunds"] },
    paypal: { patterns: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"], features: ["Payments", "Payouts"] },
    twilio: { patterns: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"], features: ["SMS", "Calls", "Verification"] },
    aws_s3: { patterns: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"], features: ["Storage", "File Upload", "CDN"] },
  };

  const parseEnvFile = async (fileContent: string) => {
    setParsing(true);

    try {
      // Get authentication token
      const token = await getToken();
      // Call the backend API to parse the file
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const file = new File([blob], 'env.txt', { type: 'text/plain' });
      formData.append('file', file);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const parseResponse = await fetch(`${API_BASE_URL}/api/onboarding/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!parseResponse.ok) {
        throw new Error(`Failed to parse file: ${parseResponse.status}`);
      }

      const result = await parseResponse.json();

      if (result.status === 'error') {
        throw new Error(result.errors ? String(Object.values(result.errors)[0]) : 'Parse error');
      }

      // Store session ID for configure request
      setSessionId(result.session_id);

      // Convert backend response to frontend format
      const detected: DetectedService[] = result.detected_services.map((service: BackendService) => ({
        name: service.service_name,
        status: "supported", // All detected services from backend are supported
        keys: service.detected_keys,
        features: Object.entries(service.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature.charAt(0).toUpperCase() + feature.slice(1)),
        feature_metadata: service.feature_metadata // Store metadata for configure request
      }));

      setDetectedServices(detected);
      setParsing(false);
      setParsed(true);
      setStep("review");

    } catch (error) {
      console.error('Parse error:', error);
      setParsing(false);
      alert(`Failed to parse .env file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (uploadedFile: File) => {
    // Validate file
    if (!uploadedFile.name.endsWith(".env")) {
      alert("Please upload a .env file");
      return;
    }

    if (uploadedFile.size > 1024 * 1024) { // 1MB limit
      alert("File too large. Maximum 1MB allowed.");
      return;
    }

    setFile(uploadedFile);
    const content = await uploadedFile.text();
    await parseEnvFile(content);
  };

  const handleContinue = async () => {
    try {
      // Check if user is authenticated
      if (!isSignedIn) {
        alert("You must be signed in to configure services.");
        return;
      }

      // Get Clerk JWT token
      const token = await getToken();
      if (!token) {
        alert("Failed to retrieve authentication token. Please try signing in again.");
        return;
      }

      // Get supported services
      const supportedServices = detectedServices.filter(s => s.status === "supported");

      if (supportedServices.length === 0) {
        alert("No supported services detected. Please upload a different .env file.");
        return;
      }

      // Prepare configuration request
      const services = supportedServices.map(service => ({
        service_name: service.name,
        credentials: {}, // Will be extracted from parsed .env in backend
        features: service.features.reduce((acc, feature) => ({
          ...acc,
          [feature.toLowerCase()]: true
        }), {}),
        feature_metadata: service.feature_metadata || {}
      }));

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/onboarding/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ services, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Configuration failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Services configured successfully');

      setStep("complete");
      setTimeout(() => {
        onBack(); // Return to dashboard
      }, 2000);

    } catch (error) {
      console.error('Configuration error:', error);
      alert(`Failed to configure services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#222] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-l border-r border-white/10">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                <Shield className="w-4 h-4 text-cyan-500" />
              </div>
              <span className="font-semibold text-white text-lg">OneRouter</span>
            </div>
            <button
              onClick={onBack}
              className="text-[#888] hover:text-white transition-all duration-300 hover:scale-105 px-3 py-1 rounded-lg hover:bg-[#1a1a1a]"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 border-b border-[#222]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 md:gap-6">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300",
              step === "check-existing"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-lg shadow-cyan-500/20"
                : "border-[#333] text-[#888] hover:border-cyan-500/50"
            )}>
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Check Existing</span>
              <span className="sm:hidden">Check</span>
            </div>
            <div className={cn("h-[2px] transition-all duration-300", step === "upload" || step === "review" || step === "complete" ? "bg-cyan-500 w-6 md:w-8" : "bg-[#333] w-4 md:w-6")} />
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300",
              step === "upload"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-lg shadow-cyan-500/20"
                : step === "review" || step === "complete"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                : "border-[#333] text-[#888] hover:border-cyan-500/50"
            )}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload .env</span>
              <span className="sm:hidden">Upload</span>
            </div>
            <div className={cn("h-[2px] transition-all duration-300", step === "review" || step === "complete" ? "bg-cyan-500 w-6 md:w-8" : "bg-[#333] w-4 md:w-6")} />
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300",
              step === "review"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-lg shadow-cyan-500/20"
                : step === "complete"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                : "border-[#333] text-[#888] hover:border-cyan-500/50"
            )}>
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Review Services</span>
              <span className="sm:hidden">Review</span>
            </div>
            <div className={cn("h-[2px] transition-all duration-300", step === "complete" ? "bg-cyan-500 w-6 md:w-8" : "bg-[#333] w-4 md:w-6")} />
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300",
              step === "complete"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-lg shadow-cyan-500/20"
                : "border-[#333] text-[#888] hover:border-cyan-500/50"
            )}>
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Complete</span>
              <span className="sm:hidden">Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden border border-white/10 [mask-image:linear-gradient(to_bottom,white_0%,white_80%,transparent_100%)]">
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
          <div className="max-w-7xl mx-auto">
            {step === "check-existing" && (
              <div className="space-y-12">
                <div className="text-center space-y-6">
                  <h1 className="text-4xl md:text-5xl font-bold">
                    Checking Your <span className="text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text">Setup</span>
                  </h1>
                  <p className="text-[#888] text-lg max-w-2xl mx-auto leading-relaxed">
                    Let us check what services are already configured in your account
                  </p>
                </div>

              {checkingExisting ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-[#888] font-medium">Checking existing services...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Existing Services */}
                  {existingServices.length > 0 && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">
                          Already Configured Services
                        </h2>
                        <p className="text-[#888]">These services are ready to use</p>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {existingServices.map((service) => (
                          <div key={service.name} className="group relative">
                            <div className="p-6 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:bg-[#0f0f0f] hover:shadow-cyan-500/10">
                              {/* Header */}
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                                  <CheckCircle2 className="w-6 h-6 text-cyan-500" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-lg capitalize mb-1">{service.name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-2 py-0.5">
                                      Active
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Credentials Summary */}
                              <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-[#888]">Test Keys</span>
                                  <span className="text-cyan-400 font-medium">
                                    {service.keys.filter(k => k.includes('TEST') || k.includes('test')).length}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-[#888]">Live Keys</span>
                                  <span className="text-cyan-400 font-medium">
                                    {service.keys.filter(k => !k.includes('TEST') && !k.includes('test')).length}
                                  </span>
                                </div>
                              </div>

                              {/* Features */}
                              <div className="pt-4 border-t border-[#333]">
                                <div className="flex flex-wrap gap-1">
                                  {service.features.slice(0, 3).map((feature) => (
                                    <Badge key={feature} variant="secondary" className="bg-[#333] text-[#ccc] text-xs px-2 py-0.5">
                                      {feature}
                                    </Badge>
                                  ))}
                                  {service.features.length > 3 && (
                                    <Badge variant="secondary" className="bg-[#333] text-[#ccc] text-xs px-2 py-0.5">
                                      +{service.features.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hover Effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected Environment */}
                  {detectedEnvironment && (
                    <div className="text-center space-y-6">
                      <div className="inline-flex items-center gap-4 p-6 bg-[#1a1a1a] border border-[#222] rounded-xl">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                          {detectedEnvironment === "live" ? (
                            <Shield className="w-6 h-6 text-green-400" />
                          ) : (
                            <Zap className="w-6 h-6 text-cyan-500" />
                          )}
                        </div>
                        <div className="text-left">
                          <h2 className="text-xl font-bold text-white mb-1">
                            {detectedEnvironment === "live" ? "Live Environment" : "Test Environment"}
                          </h2>
                          <p className="text-[#888] text-sm">
                            {detectedEnvironment === "live"
                              ? "Live credentials detected. Ready for production payments."
                              : "Test credentials detected. Perfect for development and testing."
                            }
                          </p>
                        </div>
                        <Badge className={cn(
                          "text-sm px-3 py-1 font-medium",
                          detectedEnvironment === "live"
                            ? "bg-green-500 text-black"
                            : "bg-cyan-500 text-white"
                        )}>
                          {detectedEnvironment.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  <div className="text-center">
                    <Button
                      onClick={handleExistingCheckComplete}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-105 text-lg font-medium"
                    >
                      {existingServices.length > 0
                        ? "Continue to Upload More Services"
                        : "Continue to Upload .env File"
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-12">
              <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold">
                  Upload Your <span className="text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text">.env</span> File
                </h1>
                <p className="text-[#888] text-lg max-w-2xl mx-auto leading-relaxed">
                  We will automatically detect and configure your payment services
                </p>
              </div>

              {/* Upload Area */}
              <div className="max-w-2xl mx-auto">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-16 transition-all duration-300 hover:scale-105",
                    dragActive
                      ? "border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/20"
                      : "border-[#333] hover:border-cyan-500/50 hover:bg-[#1a1a1a]"
                  )}
                >
                  <input
                    type="file"
                    accept=".env"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 mx-auto">
                      <Upload className="w-10 h-10 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-white text-xl font-medium mb-2">
                        {parsing ? "Parsing your file..." : file ? file.name : "Drop your .env file here"}
                      </p>
                      <p className="text-sm text-[#888]">
                        or click to browse files
                      </p>
                    </div>
                    {parsing && (
                      <div className="flex justify-center">
                        <div className="flex gap-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full bg-cyan-500"
                              style={{
                                animation: "pulse 1s ease-in-out infinite",
                                animationDelay: `${i * 0.2}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 mb-4">
                    <Shield className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">AES-256 Encryption</h3>
                  <p className="text-[#888] text-sm leading-relaxed">Your credentials are encrypted at rest with military-grade security</p>
                </div>
                <div className="p-6 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 mb-4">
                    <Zap className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">Instant Detection</h3>
                  <p className="text-[#888] text-sm leading-relaxed">Auto-detect payment providers and validate configurations</p>
                </div>
                <div className="p-6 bg-[#1a1a1a] border border-[#222] rounded-xl hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 mb-4">
                    <FileCode className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">Smart Parsing</h3>
                  <p className="text-[#888] text-sm leading-relaxed">Validates all credentials and provides helpful error messages</p>
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-12">
              <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold">
                  Detected <span className="text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text">{detectedServices.length}</span> Services
                </h1>
                <p className="text-[#888] text-lg max-w-2xl mx-auto leading-relaxed">
                  Review and configure your integrations
                </p>
              </div>

              {/* Detected Services */}
              <div className="space-y-8">
                {detectedServices.filter(s => s.status === "supported").length > 0 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-semibold text-white mb-2">Supported Services</h2>
                      <p className="text-[#888]">These services will be configured for your account</p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {detectedServices.filter(s => s.status === "supported").map((service) => (
                        <div key={service.name} className="group relative">
                          <div className="p-6 bg-[#1a1a1a] border border-cyan-500/30 rounded-xl hover:border-cyan-500 transition-all duration-300 hover:shadow-xl hover:bg-[#0f0f0f] hover:shadow-cyan-500/10">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                                <CheckCircle2 className="w-7 h-7 text-cyan-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-white text-lg capitalize mb-1">{service.name}</p>
                                <Badge className="bg-cyan-500 text-white border-0 text-xs">Ready to Configure</Badge>
                              </div>
                            </div>

                            {/* Credentials Count */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#888]">Credentials Detected</span>
                                <span className="text-cyan-400 font-medium">{service.keys.length}</span>
                              </div>
                            </div>

                            {/* Keys Preview */}
                            <div className="mb-4">
                              <p className="text-sm text-[#888] mb-2">Keys Found:</p>
                              <div className="flex flex-wrap gap-1">
                                {service.keys.slice(0, 2).map((key) => (
                                  <Badge key={key} variant="secondary" className="bg-[#333] text-[#ccc] text-xs px-2 py-0.5">
                                    {key.length > 15 ? `${key.substring(0, 15)}...` : key}
                                  </Badge>
                                ))}
                                {service.keys.length > 2 && (
                                  <Badge variant="secondary" className="bg-[#333] text-[#ccc] text-xs px-2 py-0.5">
                                    +{service.keys.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Features */}
                            <div className="pt-4 border-t border-[#333]">
                              <p className="text-sm text-[#888] mb-2">Features:</p>
                              <div className="flex flex-wrap gap-1">
                                {service.features.slice(0, 3).map((feature) => (
                                  <Badge key={feature} variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-2 py-0.5">
                                    {feature}
                                  </Badge>
                                ))}
                                {service.features.length > 3 && (
                                  <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-2 py-0.5">
                                    +{service.features.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detectedServices.filter(s => s.status === "unsupported").length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-mono text-sm text-[#888] uppercase tracking-wider">Services Not Yet Supported</h2>
                    {detectedServices.filter(s => s.status === "unsupported").map((service) => (
                      <div key={service.name} className="bg-[#0a0a0a] border border-[#ffbd2e]/30 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-[#ffbd2e]" />
                            <div>
                              <h3 className="font-mono font-bold text-lg capitalize">{service.name}</h3>
                              <p className="text-sm text-[#888] font-mono">You will need to manage these credentials yourself</p>
                            </div>
                          </div>
                          <Badge className="bg-[#ffbd2e] text-black border-0">Coming Soon</Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-mono text-[#888]">Detected Keys:</p>
                          <div className="flex flex-wrap gap-2">
                            {service.keys.map((key) => (
                              <span key={key} className="px-3 py-1 bg-[#1a1a1a] border border-[#222] rounded font-mono text-xs text-[#ffbd2e]">
                                {key}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-[#ffbd2e]/10 border border-[#ffbd2e]/30 rounded">
                          <p className="text-xs font-mono text-[#ffbd2e]">
                            ⚠️ We are implementing support for {service.name} in the next phase. These credentials will remain in your .env file.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-6 justify-center pt-8">
                <Button
                  onClick={() => setStep("upload")}
                  variant="outline"
                  className="bg-transparent border-[#333] text-[#888] hover:border-cyan-500 hover:text-cyan-400 px-6 py-3 rounded-xl transition-all duration-300 hover:bg-cyan-500/5"
                >
                  Upload Different File
                </Button>
                <Button
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-105 text-lg font-medium"
                  disabled={detectedServices.filter(s => s.status === "supported").length === 0}
                >
                  Configure Services →
                </Button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center space-y-12 py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30">
                <CheckCircle2 className="w-12 h-12 text-cyan-500" />
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold">
                  <span className="text-transparent bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text">Onboarding Complete!</span>
                </h1>
                <p className="text-[#888] text-lg max-w-2xl mx-auto leading-relaxed">
                  Your services are configured and ready to use. You're all set to start processing payments.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="flex gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-cyan-500"
                      style={{
                        animation: "pulse 1s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Edit Key Dialog Modal */}
      {editingKey && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#00ff88] rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-mono font-bold text-white">
                Edit Key
              </h3>
              <button
                onClick={() => setEditingKey(null)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-mono text-[#888] mb-2">Service</p>
                <p className="px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded font-mono text-sm text-white capitalize">
                  {editingKey.service}
                </p>
              </div>

              <div>
                <p className="text-sm font-mono text-[#888] mb-2">Key Name</p>
                <p className="px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded font-mono text-sm text-white">
                  {editingKey.key}
                </p>
              </div>

              <div>
                <p className="text-sm font-mono text-[#888] mb-2">Key Value</p>
                <input
                  type="password"
                  value={editingKey.value}
                  onChange={(e) => setEditingKey({ ...editingKey, value: e.target.value })}
                  placeholder="Enter new value"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded font-mono text-sm text-white placeholder-[#666] focus:border-[#00ff88] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setEditingKey(null)}
                variant="outline"
                className="flex-1 bg-transparent border-[#222] text-white hover:border-[#888] font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={handleKeyEditSubmit}
                className="flex-1 bg-[#00ff88] text-black hover:bg-[#00dd77] font-mono font-bold"
                disabled={!editingKey.value}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvOnboardingFlow;