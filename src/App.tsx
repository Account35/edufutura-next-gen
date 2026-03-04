 import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
 import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet } from "react-router-dom";
import createQueryClient from '@/lib/query-client';
import { AuthProvider } from "@/hooks/useAuth";
import { AuthEventsProvider } from "@/components/AuthEventsProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/error-boundaries/RouteErrorBoundary";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
 import RouteProgressBar from "@/components/ui/RouteProgressBar";
 import { ProtectedRoute, AdminRoute, OnboardingRoute } from "@/components/auth/ProtectedRoute";
 import { 
   DashboardSkeleton, 
   OnboardingSkeleton, 
   CurriculumSkeleton, 
   CommunitySkeleton, 
   QuizSkeleton, 
   GenericPageSkeleton 
 } from "@/components/ui/PageSkeletons";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import DebugAuthOverlay from '@/components/DebugAuthOverlay';

// Critical path - loaded immediately (essential screens)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
 
 // Dashboard & Onboarding - using chunk naming for better debugging
 const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ "./pages/Dashboard"));
 const Onboarding = lazy(() => import(/* webpackChunkName: "onboarding" */ "./pages/Onboarding"));

 // Onboarding wizard steps - grouped chunk
 const OnboardingWelcome = lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ "./pages/onboarding/OnboardingWelcome"));
 const OnboardingProfile = lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ "./pages/onboarding/OnboardingProfile"));
 const OnboardingSubjects = lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ "./pages/onboarding/OnboardingSubjects"));
 const OnboardingPreferences = lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ "./pages/onboarding/OnboardingPreferences"));
 const OnboardingComplete = lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ "./pages/onboarding/OnboardingComplete"));
 
 // Auth pages - grouped chunk
 const ForgotPassword = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/auth/ForgotPassword"));
 const ResetPassword = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/auth/ResetPassword"));
 const VerifyEmail = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/auth/VerifyEmail"));

// Phase 2: Profile & Settings - lazy loaded
 const Settings = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/Settings"));
 const Profile = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/Profile"));
 const ProfileCertificates = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/ProfileCertificates"));
 const Reports = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/Reports"));

// Phase 3: Curriculum - core learning content
 const SubjectBrowser = lazy(() => import(/* webpackChunkName: "curriculum" */ "./pages/SubjectBrowser"));
 const SubjectLanding = lazy(() => import(/* webpackChunkName: "curriculum" */ "./pages/SubjectLanding"));
 const ChapterContent = lazy(() => import(/* webpackChunkName: "curriculum" */ "./pages/ChapterContent"));
 const SearchResults = lazy(() => import(/* webpackChunkName: "curriculum" */ "./pages/SearchResults"));
 const Bookmarks = lazy(() => import(/* webpackChunkName: "curriculum" */ "./pages/Bookmarks"));

// Phase 5: Assessment - quiz engine
 const QuizLanding = lazy(() => import(/* webpackChunkName: "quiz" */ "./pages/QuizLanding").then(m => ({ default: m.QuizLanding })));
 const QuizTaking = lazy(() => import(/* webpackChunkName: "quiz" */ "./pages/QuizTaking").then(m => ({ default: m.QuizTaking })));
 const QuizResults = lazy(() => import(/* webpackChunkName: "quiz" */ "./pages/QuizResults").then(m => ({ default: m.QuizResults })));
 const Analytics = lazy(() => import(/* webpackChunkName: "quiz" */ "./pages/Analytics"));

// Phase 6: Certificates
 const VerifyCertificate = lazy(() => import(/* webpackChunkName: "certificates" */ "./pages/VerifyCertificate"));
 const Certificates = lazy(() => import(/* webpackChunkName: "certificates" */ "./pages/Certificates"));

// Phase 7: Career Guidance
 const Universities = lazy(() => import(/* webpackChunkName: "career" */ "./pages/Universities"));
 const InstitutionDetail = lazy(() => import(/* webpackChunkName: "career" */ "./pages/InstitutionDetail"));
 const CareerQuiz = lazy(() => import(/* webpackChunkName: "career" */ "./pages/CareerQuiz"));
 const SalaryCalculator = lazy(() => import(/* webpackChunkName: "career" */ "./pages/SalaryCalculator"));
 const CareerResources = lazy(() => import(/* webpackChunkName: "career" */ "./pages/CareerResources"));
 const CareerFAQ = lazy(() => import(/* webpackChunkName: "career" */ "./pages/CareerFAQ"));

// Phase 8: Community - social features
 const Forums = lazy(() => import(/* webpackChunkName: "community" */ "./pages/Forums"));
 const ForumDetail = lazy(() => import(/* webpackChunkName: "community" */ "./pages/ForumDetail"));
 const PostDetail = lazy(() => import(/* webpackChunkName: "community" */ "./pages/PostDetail"));
 const Resources = lazy(() => import(/* webpackChunkName: "community" */ "./pages/Resources"));
 const StudyBuddyFinder = lazy(() => import(/* webpackChunkName: "community" */ "./pages/StudyBuddyFinder"));
 const CommunityGuidelines = lazy(() => import(/* webpackChunkName: "community" */ "./pages/CommunityGuidelines"));
 const Leaderboard = lazy(() => import(/* webpackChunkName: "community" */ "./pages/Leaderboard"));

// Admin moderation
 const AdminModeration = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/AdminModeration"));

// PWA Install page
 const Install = lazy(() => import(/* webpackChunkName: "pwa" */ "./pages/Install"));

// Admin features - separate chunk
 const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminDashboard"));
 const AdminContent = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminContent"));
 const AdminCurriculum = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminCurriculum"));
 const AdminQuizzes = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminQuizzes"));
 const AdminQuizCreate = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminQuizCreate"));
 const AdminAnalytics = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminAnalytics"));
 const AdminUsers = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminUsers"));
 const AdminSettings = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminSettings"));
 const JobMonitoring = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/JobMonitoring"));
 const AdminSupport = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminSupport"));
 const AdminAuditLog = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminAuditLog"));
 const AdminOnboardingAnalytics = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/AdminOnboardingAnalytics"));
 
 // Layout wrapper with route progress bar
 const AppLayout = () => (
   <>
     <RouteProgressBar />
     <Outlet />
   </>
 );

const queryClient = createQueryClient();

 // Helper component for protected routes with specific skeletons
 const ProtectedDashboard = () => (
   <ProtectedRoute>
     <Suspense fallback={<DashboardSkeleton />}>
       <Dashboard />
     </Suspense>
   </ProtectedRoute>
 );
 
 const ProtectedCurriculum = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
   <ProtectedRoute>
     <Suspense fallback={<CurriculumSkeleton />}>
       <Component />
     </Suspense>
   </ProtectedRoute>
 );
 
 const ProtectedCommunity = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
   <ProtectedRoute>
     <Suspense fallback={<CommunitySkeleton />}>
       <Component />
     </Suspense>
   </ProtectedRoute>
 );
 
 const ProtectedQuiz = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
   <ProtectedRoute>
     <Suspense fallback={<QuizSkeleton />}>
       <Component />
     </Suspense>
   </ProtectedRoute>
 );
 
 const OnboardingWrapper = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
   <OnboardingRoute>
     <Suspense fallback={<OnboardingSkeleton />}>
       <Component />
     </Suspense>
   </OnboardingRoute>
 );
 
 const AdminWrapper = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
   <AdminRoute>
     <Suspense fallback={<GenericPageSkeleton />}>
       <Component />
     </Suspense>
   </AdminRoute>
 );

// Router with opt-in future flags (v7 safe opt-in feature flags)
const router = createBrowserRouter(
  createRoutesFromElements(
     <Route element={<AppLayout />} errorElement={<RouteErrorBoundary><div/></RouteErrorBoundary>}>
      {/* Critical path */}
      <Route path="/" element={<Index />} />
      
      {/* Phase 1: Auth & Onboarding */}
       <Route path="/onboarding" element={<OnboardingWrapper Component={Onboarding} />} />
       <Route path="/onboarding/welcome" element={<OnboardingWrapper Component={OnboardingWelcome} />} />
       <Route path="/onboarding/profile" element={<OnboardingWrapper Component={OnboardingProfile} />} />
       <Route path="/onboarding/subjects" element={<OnboardingWrapper Component={OnboardingSubjects} />} />
       <Route path="/onboarding/preferences" element={<OnboardingWrapper Component={OnboardingPreferences} />} />
       <Route path="/onboarding/complete" element={<OnboardingWrapper Component={OnboardingComplete} />} />
       
       {/* Auth pages - public */}
       <Route path="/auth/forgot-password" element={<Suspense fallback={<GenericPageSkeleton />}><ForgotPassword /></Suspense>} />
       <Route path="/auth/reset-password" element={<Suspense fallback={<GenericPageSkeleton />}><ResetPassword /></Suspense>} />
       <Route path="/auth/verify-email" element={<Suspense fallback={<GenericPageSkeleton />}><VerifyEmail /></Suspense>} />
      
      {/* Phase 2: Dashboard & Profile */}
       <Route path="/dashboard" element={<ProtectedDashboard />} />
       <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Settings /></Suspense></ProtectedRoute>} />
       <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Profile /></Suspense></ProtectedRoute>} />
       <Route path="/profile/certificates" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><ProfileCertificates /></Suspense></ProtectedRoute>} />
       <Route path="/reports" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Reports /></Suspense></ProtectedRoute>} />
      
      {/* Phase 3: Curriculum */}
       <Route path="/subjects" element={<ProtectedCurriculum Component={SubjectBrowser} />} />
       <Route path="/curriculum/:subjectName" element={<ProtectedCurriculum Component={SubjectLanding} />} />
       <Route path="/curriculum/:subjectName/:chapterNumber" element={<ProtectedCurriculum Component={ChapterContent} />} />
       <Route path="/search" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><SearchResults /></Suspense></ProtectedRoute>} />
       <Route path="/bookmarks" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Bookmarks /></Suspense></ProtectedRoute>} />
      
      {/* Phase 5: Assessment */}
       <Route path="/quiz/:quizId" element={<ProtectedQuiz Component={QuizLanding} />} />
       <Route path="/quiz/:quizId/attempt/:attemptId" element={<ProtectedQuiz Component={QuizTaking} />} />
       <Route path="/quiz/:quizId/results/:attemptId" element={<ProtectedQuiz Component={QuizResults} />} />
       <Route path="/analytics" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Analytics /></Suspense></ProtectedRoute>} />
       <Route path="/analytics/:subject" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Analytics /></Suspense></ProtectedRoute>} />
      
       {/* Phase 6: Certificates - verification is public */}
       <Route path="/verify" element={<Suspense fallback={<GenericPageSkeleton />}><VerifyCertificate /></Suspense>} />
       <Route path="/verify/:code" element={<Suspense fallback={<GenericPageSkeleton />}><VerifyCertificate /></Suspense>} />
       <Route path="/certificates" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Certificates /></Suspense></ProtectedRoute>} />
      
      {/* Phase 7: Career Guidance */}
       <Route path="/career-guidance/universities" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><Universities /></Suspense></ProtectedRoute>} />
       <Route path="/career-guidance/quiz" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><CareerQuiz /></Suspense></ProtectedRoute>} />
       <Route path="/career-guidance/salary-calculator" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><SalaryCalculator /></Suspense></ProtectedRoute>} />
       <Route path="/career-guidance/resources" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><CareerResources /></Suspense></ProtectedRoute>} />
       <Route path="/career-guidance/faq" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><CareerFAQ /></Suspense></ProtectedRoute>} />
       <Route path="/institutions/:institutionName" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><InstitutionDetail /></Suspense></ProtectedRoute>} />
      
      {/* Phase 8: Community */}
       <Route path="/community/forums" element={<ProtectedCommunity Component={Forums} />} />
       <Route path="/community/forums/:subject" element={<ProtectedCommunity Component={ForumDetail} />} />
       <Route path="/community/forums/:subject/post/:postId" element={<ProtectedCommunity Component={PostDetail} />} />
       <Route path="/community/resources" element={<ProtectedCommunity Component={Resources} />} />
       <Route path="/community/study-buddies" element={<ProtectedCommunity Component={StudyBuddyFinder} />} />
       <Route path="/community/guidelines" element={<Suspense fallback={<GenericPageSkeleton />}><CommunityGuidelines /></Suspense>} />
       <Route path="/community/leaderboard" element={<ProtectedCommunity Component={Leaderboard} />} />
      
      {/* Admin */}
       <Route path="/admin" element={<AdminWrapper Component={AdminDashboard} />} />
       <Route path="/admin/moderation" element={<AdminWrapper Component={AdminModeration} />} />
       <Route path="/admin/content" element={<AdminWrapper Component={AdminContent} />} />
       <Route path="/admin/curriculum" element={<AdminWrapper Component={AdminCurriculum} />} />
       <Route path="/admin/jobs" element={<AdminWrapper Component={JobMonitoring} />} />
       <Route path="/admin/quizzes" element={<AdminWrapper Component={AdminQuizzes} />} />
       <Route path="/admin/quizzes/create" element={<AdminWrapper Component={AdminQuizCreate} />} />
       <Route path="/admin/analytics" element={<AdminWrapper Component={AdminAnalytics} />} />
       <Route path="/admin/users" element={<AdminWrapper Component={AdminUsers} />} />
       <Route path="/admin/settings" element={<AdminWrapper Component={AdminSettings} />} />
       <Route path="/admin/support" element={<AdminWrapper Component={AdminSupport} />} />
       <Route path="/admin/audit-log" element={<AdminWrapper Component={AdminAuditLog} />} />
       <Route path="/admin/onboarding" element={<AdminWrapper Component={AdminOnboardingAnalytics} />} />
      
      {/* PWA Install */}
       <Route path="/install" element={<Suspense fallback={<GenericPageSkeleton />}><Install /></Suspense>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  { future: ({ v7_startTransition: true, v7_relativeSplatPath: true } as any) }
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthEventsProvider>
          <TooltipProvider>
            <PWAUpdatePrompt />
            <NetworkStatusBanner />
            <Toaster />
            <Sonner />
            <PWAInstallPrompt minPageViews={3} />
             <RouterProvider router={router} />
            <DebugAuthOverlay />
          </TooltipProvider>
        </AuthEventsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
