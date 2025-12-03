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
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ProfileCertificates from "./pages/ProfileCertificates";
import Reports from "./pages/Reports";
import VerifyCertificate from "./pages/VerifyCertificate";
import Certificates from "./pages/Certificates";
import NotFound from "./pages/NotFound";
import SubjectBrowser from "./pages/SubjectBrowser";
import AdminContent from "./pages/AdminContent";
import SubjectLanding from "./pages/SubjectLanding";
import ChapterContent from "./pages/ChapterContent";
import SearchResults from "./pages/SearchResults";
import Bookmarks from "./pages/Bookmarks";
import { QuizLanding } from "./pages/QuizLanding";
import { QuizTaking } from "./pages/QuizTaking";
import { QuizResults } from "./pages/QuizResults";
import Analytics from "./pages/Analytics";
import AdminQuizzes from "./pages/AdminQuizzes";
import AdminQuizCreate from "./pages/AdminQuizCreate";
import Universities from "./pages/Universities";
import InstitutionDetail from "./pages/InstitutionDetail";
import CareerQuiz from "./pages/CareerQuiz";
import SalaryCalculator from "./pages/SalaryCalculator";
import CareerResources from "./pages/CareerResources";
import CareerFAQ from "./pages/CareerFAQ";
import Forums from "./pages/Forums";
import ForumDetail from "./pages/ForumDetail";
import PostDetail from "./pages/PostDetail";
import Resources from "./pages/Resources";
import StudyBuddyFinder from "./pages/StudyBuddyFinder";
import ModerationDashboard from "./pages/ModerationDashboard";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import JobMonitoring from "./pages/admin/JobMonitoring";
import Leaderboard from "./pages/Leaderboard";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthEventsProvider>
          <TooltipProvider>
            <NetworkStatusBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/certificates" element={<ProfileCertificates />} />
                  <Route path="/verify" element={<VerifyCertificate />} />
                  <Route path="/verify/:code" element={<VerifyCertificate />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/certificates" element={<Certificates />} />
                  <Route path="/subjects" element={<SubjectBrowser />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="/admin/jobs" element={<JobMonitoring />} />
                  <Route path="/curriculum/:subjectName" element={<SubjectLanding />} />
                  <Route path="/curriculum/:subjectName/:chapterNumber" element={<ChapterContent />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/bookmarks" element={<Bookmarks />} />
                  <Route path="/quiz/:quizId" element={<QuizLanding />} />
                  <Route path="/quiz/:quizId/attempt/:attemptId" element={<QuizTaking />} />
                  <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/analytics/:subject" element={<Analytics />} />
                  <Route path="/admin/quizzes" element={<AdminQuizzes />} />
                  <Route path="/admin/quizzes/create" element={<AdminQuizCreate />} />
                  <Route path="/career-guidance/universities" element={<Universities />} />
                  <Route path="/career-guidance/quiz" element={<CareerQuiz />} />
                  <Route path="/career-guidance/salary-calculator" element={<SalaryCalculator />} />
                  <Route path="/career-guidance/resources" element={<CareerResources />} />
                  <Route path="/career-guidance/faq" element={<CareerFAQ />} />
                  <Route path="/institutions/:institutionName" element={<InstitutionDetail />} />
                  <Route path="/community/forums" element={<Forums />} />
                  <Route path="/community/forums/:subject" element={<ForumDetail />} />
                  <Route path="/community/forums/:subject/post/:postId" element={<PostDetail />} />
                  <Route path="/community/resources" element={<Resources />} />
                  <Route path="/community/study-buddies" element={<StudyBuddyFinder />} />
                  <Route path="/community/guidelines" element={<CommunityGuidelines />} />
                  <Route path="/community/leaderboard" element={<Leaderboard />} />
                  <Route path="/admin/moderation" element={<ModerationDashboard />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </RouteErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthEventsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
