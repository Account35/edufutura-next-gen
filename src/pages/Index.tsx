import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // If user is authenticated, redirect to appropriate page
    if (user && userProfile) {
      if (!userProfile.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userProfile, loading, navigate]);

  // Don't render landing page content if authenticated
  if (loading || user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <HeroSection onGetStarted={() => setIsAuthModalOpen(true)} />
      <FeaturesSection />
      <PricingSection onGetStarted={() => setIsAuthModalOpen(true)} />
      <Footer />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
