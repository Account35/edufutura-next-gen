import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthEventsProvider } from "@/components/AuthEventsProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/error-boundaries/RouteErrorBoundary";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";

// Critical path - loaded immediately (essential screens)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";

// Phase 2: Profile & Settings - lazy loaded
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileCertificates = lazy(() => import("./pages/ProfileCertificates"));
const Reports = lazy(() => import("./pages/Reports"));

// Phase 3: Curriculum - core learning content
const SubjectBrowser = lazy(() => import("./pages/SubjectBrowser"));
const SubjectLanding = lazy(() => import("./pages/SubjectLanding"));
const ChapterContent = lazy(() => import("./pages/ChapterContent"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));

// Phase 5: Assessment - quiz engine
const QuizLanding = lazy(() => import("./pages/QuizLanding").then(m => ({ default: m.QuizLanding })));
const QuizTaking = lazy(() => import("./pages/QuizTaking").then(m => ({ default: m.QuizTaking })));
const QuizResults = lazy(() => import("./pages/QuizResults").then(m => ({ default: m.QuizResults })));
const Analytics = lazy(() => import("./pages/Analytics"));

// Phase 6: Certificates
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const Certificates = lazy(() => import("./pages/Certificates"));

// Phase 7: Career Guidance
const Universities = lazy(() => import("./pages/Universities"));
const InstitutionDetail = lazy(() => import("./pages/InstitutionDetail"));
const CareerQuiz = lazy(() => import("./pages/CareerQuiz"));
const SalaryCalculator = lazy(() => import("./pages/SalaryCalculator"));
const CareerResources = lazy(() => import("./pages/CareerResources"));
const CareerFAQ = lazy(() => import("./pages/CareerFAQ"));

// Phase 8: Community - social features
const Forums = lazy(() => import("./pages/Forums"));
const ForumDetail = lazy(() => import("./pages/ForumDetail"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Resources = lazy(() => import("./pages/Resources"));
const StudyBuddyFinder = lazy(() => import("./pages/StudyBuddyFinder"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

// Admin moderation
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));

// PWA Install page
const Install = lazy(() => import("./pages/Install"));

// Admin features - separate chunk
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminCurriculum = lazy(() => import("./pages/AdminCurriculum"));
const AdminQuizzes = lazy(() => import("./pages/AdminQuizzes"));
const AdminQuizCreate = lazy(() => import("./pages/AdminQuizCreate"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const JobMonitoring = lazy(() => import("./pages/admin/JobMonitoring"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
            <BrowserRouter>
              <RouteErrorBoundary>
                <Suspense fallback={<LazyLoadFallback type="page" />}>
                  <Routes>
                    {/* Critical path */}
                    <Route path="/" element={<Index />} />
                    
                    {/* Phase 1: Auth & Onboarding */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    
                    {/* Phase 2: Dashboard & Profile */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/certificates" element={<ProfileCertificates />} />
                    <Route path="/reports" element={<Reports />} />
                    
                    {/* Phase 3: Curriculum */}
                    <Route path="/subjects" element={<SubjectBrowser />} />
                    <Route path="/curriculum/:subjectName" element={<SubjectLanding />} />
                    <Route path="/curriculum/:subjectName/:chapterNumber" element={<ChapterContent />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    
                    {/* Phase 5: Assessment */}
                    <Route path="/quiz/:quizId" element={<QuizLanding />} />
                    <Route path="/quiz/:quizId/attempt/:attemptId" element={<QuizTaking />} />
                    <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/analytics/:subject" element={<Analytics />} />
                    
                    {/* Phase 6: Certificates */}
                    <Route path="/verify" element={<VerifyCertificate />} />
                    <Route path="/verify/:code" element={<VerifyCertificate />} />
                    <Route path="/certificates" element={<Certificates />} />
                    
                    {/* Phase 7: Career Guidance */}
                    <Route path="/career-guidance/universities" element={<Universities />} />
                    <Route path="/career-guidance/quiz" element={<CareerQuiz />} />
                    <Route path="/career-guidance/salary-calculator" element={<SalaryCalculator />} />
                    <Route path="/career-guidance/resources" element={<CareerResources />} />
                    <Route path="/career-guidance/faq" element={<CareerFAQ />} />
                    <Route path="/institutions/:institutionName" element={<InstitutionDetail />} />
                    
                    {/* Phase 8: Community */}
                    <Route path="/community/forums" element={<Forums />} />
                    <Route path="/community/forums/:subject" element={<ForumDetail />} />
                    <Route path="/community/forums/:subject/post/:postId" element={<PostDetail />} />
                    <Route path="/community/resources" element={<Resources />} />
                    <Route path="/community/study-buddies" element={<StudyBuddyFinder />} />
                    <Route path="/community/guidelines" element={<CommunityGuidelines />} />
                    <Route path="/community/leaderboard" element={<Leaderboard />} />
                    
                    {/* Admin */}
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/moderation" element={<AdminModeration />} />
                    <Route path="/admin/content" element={<AdminContent />} />
                    <Route path="/admin/curriculum" element={<AdminCurriculum />} />
                    <Route path="/admin/jobs" element={<JobMonitoring />} />
                    <Route path="/admin/quizzes" element={<AdminQuizzes />} />
                    <Route path="/admin/quizzes/create" element={<AdminQuizCreate />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/support" element={<AdminSupport />} />
                    <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                    
                    {/* PWA Install */}
                    <Route path="/install" element={<Install />} />
                    
                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </RouteErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthEventsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
