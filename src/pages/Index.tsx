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
 import { prefetchRoutes } from "@/hooks/usePrefetch";

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while loading
    if (loading || roleLoading) return;

    // If user is authenticated, redirect to appropriate page
    if (user && userProfile) {
       // Check for stored redirect destination
       const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
       if (storedRedirect) {
         sessionStorage.removeItem('redirectAfterLogin');
         navigate(storedRedirect);
         return;
       }
 
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
 
   // Prefetch likely routes on landing page load
   useEffect(() => {
     // Prefetch dashboard and onboarding after short delay
     const timer = setTimeout(() => {
       prefetchRoutes(['/dashboard', '/onboarding/welcome']);
     }, 2000);
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
