import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageLoader } from '@/components/ui/loading';
import { OverviewStats } from '@/components/analytics/OverviewStats';
import { SubjectPerformance } from '@/components/analytics/SubjectPerformance';
import { ScoreTrendChart } from '@/components/analytics/ScoreTrendChart';
import { QuestionTypeAnalysis } from '@/components/analytics/QuestionTypeAnalysis';
import { KnowledgeGaps } from '@/components/analytics/KnowledgeGaps';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { Download, FileDown, ArrowLeft, Lock } from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const {
    overview,
    subjectPerformance,
    attempts,
    questionTypeStats,
    knowledgeGaps,
    loading: analyticsLoading,
    exportToCSV,
    exportToPDF,
  } = useAnalytics(user?.id, subject);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading || analyticsLoading) {
    return <FullPageLoader message="Loading analytics..." />;
  }

  // Filter attempts by subject if viewing subject-specific analytics
  const filteredAttempts = subject
    ? attempts.filter(a => a.subject_name === decodeURIComponent(subject))
    : attempts;

  // Premium feature gate for detailed analytics
  if (!isPremium && attempts.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Performance Analytics</h1>
              <p className="text-muted-foreground">Track your learning progress and identify areas for improvement</p>
            </div>
          </div>

          {overview && <OverviewStats overview={overview} />}

          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Detailed Analytics</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Get comprehensive insights into your performance, identify knowledge gaps, and track your improvement over time with Premium.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <div className="px-4 py-2 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">📊 Detailed Charts</p>
              </div>
              <div className="px-4 py-2 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">🎯 Question Type Analysis</p>
              </div>
              <div className="px-4 py-2 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">📈 Progress Tracking</p>
              </div>
              <div className="px-4 py-2 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">💾 Export Reports</p>
              </div>
            </div>
            <Button onClick={() => setShowUpgradeModal(true)} size="lg">
              Upgrade to Premium - R60/month
            </Button>
          </Card>
        </div>

        <SubscriptionModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {subject ? (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/analytics')}
                  className="mb-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to All Subjects
                </Button>
                <h1 className="text-3xl font-bold text-primary">{decodeURIComponent(subject)} Analytics</h1>
                <p className="text-muted-foreground">Detailed performance analysis for this subject</p>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-primary">Performance Analytics</h1>
                <p className="text-muted-foreground">Track your learning progress and identify areas for improvement</p>
              </>
            )}
          </div>

          {isPremium && attempts.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          )}
        </div>

        {/* No data state */}
        {attempts.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Quiz Data Yet</h3>
            <p className="text-muted-foreground mb-4">Complete some quizzes to see your performance analytics</p>
            <Button onClick={() => navigate('/subjects')}>
              Browse Quizzes
            </Button>
          </Card>
        )}

        {/* Overview Stats */}
        {overview && !subject && <OverviewStats overview={overview} />}

        {/* Subject Performance (only on main analytics page) */}
        {!subject && subjectPerformance.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Performance by Subject</h2>
            <SubjectPerformance subjects={subjectPerformance} />
          </div>
        )}

        {/* Score Trend Chart */}
        {filteredAttempts.length > 0 && (
          <ScoreTrendChart attempts={filteredAttempts} />
        )}

        {/* Question Type Analysis */}
        {questionTypeStats.length > 0 && isPremium && (
          <QuestionTypeAnalysis stats={questionTypeStats} />
        )}

        {/* Knowledge Gaps */}
        {knowledgeGaps.length > 0 && isPremium && (
          <KnowledgeGaps gaps={knowledgeGaps} />
        )}
      </div>

      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </DashboardLayout>
  );
}
