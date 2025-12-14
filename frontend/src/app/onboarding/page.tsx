'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import EnvOnboardingFlow from "@/components/EnvOnboardingFlow";

export default function OnboardingPage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleBack = () => {
    setShowOnboarding(false);
    router.push('/dashboard');
  };

  return <EnvOnboardingFlow onBack={handleBack} />;
}