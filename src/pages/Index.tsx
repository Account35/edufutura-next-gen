import { useState, useEffect, useRef } from "react";
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

const INDEX_LOADING_TIMEOUT_MS = 4000; // 4 second timeout for index page loading

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  // Safety timeout for the loading state on the index page
  useEffect(() => {
    if (loading) {
      // Reset timeout when auth starts loading
      setLoadingTimedOut(false);
      return;
    }
    
    // If user exists but profile not loaded, start timeout
    if (user && !userProfile) {
      const timeout = setTimeout(() => {
        console.warn('[Index] Profile loading timed out, showing landing page');
        setLoadingTimedOut(true);
      }, INDEX_LOADING_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }
    
    // Reset timeout flag if profile loads
    if (userProfile) {
      setLoadingTimedOut(false);
    }
  }, [loading, user, userProfile]);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) return;
    
    // Prevent double redirects
    if (hasRedirectedRef.current) return;
    
    // If user exists but profile is still loading, wait briefly (unless timed out)
    if (user && !userProfile && !loadingTimedOut) {
      return;
    }
    
    // Don't redirect while role is loading (only if user exists and has profile)
    if (user && userProfile && roleLoading) return;

    // If user is authenticated and profile is loaded, redirect
    if (user && userProfile) {
      hasRedirectedRef.current = true;
      
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
  }, [user, userProfile, loading, roleLoading, isAdmin, isEducator, navigate, loadingTimedOut]);
 
  // Prefetch likely routes on landing page load
  useEffect(() => {
    // Prefetch dashboard and onboarding after short delay
    const timer = setTimeout(() => {
      prefetchRoutes(['/dashboard', '/onboarding/welcome']);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking auth
  // Only show loading if:
  // 1. Auth is loading, OR
  // 2. User exists but profile is still being created/loaded (and not timed out), OR
  // 3. User exists with profile and role is loading
  const isLoading = loading || (user && !userProfile && !loadingTimedOut) || (user && userProfile && roleLoading);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : user && !userProfile ? 'Setting up your account...' : 'Checking permissions...'}
          </p>
        </div>
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
