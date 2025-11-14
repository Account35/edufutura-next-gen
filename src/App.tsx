import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <NetworkStatusBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/subjects" element={<SubjectBrowser />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/curriculum/:subjectName" element={<SubjectLanding />} />
              <Route path="/curriculum/:subjectName/:chapterNumber" element={<ChapterContent />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/quiz/:quizId" element={<QuizLanding />} />
              <Route path="/quiz/:quizId/attempt/:attemptId" element={<QuizTaking />} />
              <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
