import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const [forceShowContent, setForceShowContent] = useState(false);

  useEffect(() => {
    // Don't redirect while loading
    if (loading || roleLoading) return;

    // If user is authenticated, redirect to appropriate page
    if (user && userProfile) {
      if (!userProfile.onboarding_completed) {
        navigate('/onboarding');
      } else if (isAdmin || isEducator) {
        // Redirect admins/educators to admin dashboard
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userProfile, loading, roleLoading, isAdmin, isEducator, navigate]);

  // Add timeout to prevent infinite loading - show content after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Index] Force showing content due to loading timeout');
      setForceShowContent(true);
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking auth - but add a timeout to prevent infinite loading
  const isLoading = loading || roleLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated, show loading while redirect happens
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
