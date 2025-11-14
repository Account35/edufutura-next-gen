import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/hooks/useAuth';
import { useAttemptManagement } from '@/hooks/useAttemptManagement';
import { CooldownTimer } from '@/components/quiz/CooldownTimer';
import { AttemptHistory } from '@/components/quiz/AttemptHistory';
import { 
  Play, 
  Trophy, 
  Clock, 
  Target,
  BookOpen,
  AlertCircle,
  Crown,
  Lock,
  Sparkles
} from 'lucide-react';

export const QuizLanding = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchQuiz, startQuizAttempt } = useQuiz();

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { 
    attempts,
    stats, 
    validation, 
    loading: attemptLoading,
    accountType,
    loadAttemptData 
  } = useAttemptManagement(user?.id, quizId);

  useEffect(() => {
    if (quizId && user) {
      loadQuizData();
    }
  }, [quizId, user]);

  const loadQuizData = async () => {
    if (!quizId || !user) return;

    try {
      const quizData = await fetchQuiz(quizId);
      if (!quizData) {
        navigate('/dashboard');
        return;
      }

      setQuiz(quizData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!user || !quizId || !validation?.canAttempt) return;

    const attempt = await startQuizAttempt(user.id, quizId);
    if (attempt) {
      navigate(`/quiz/${quizId}/attempt/${attempt.id}`);
    }
  };

  if (loading || attemptLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">Quiz not found</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  const completedAttempts = attempts.filter(a => a.is_completed);
  const freeUserLimitReached = accountType === 'free' && completedAttempts.length >= 2;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Quiz Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {quiz.difficulty_level && (
              <Badge variant={
                quiz.difficulty_level === 'Beginner' ? 'default' :
                quiz.difficulty_level === 'Intermediate' ? 'secondary' :
                'destructive'
              }>
                {quiz.difficulty_level}
              </Badge>
            )}
            {accountType === 'premium' && (
              <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-yellow-600">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">
            {quiz.quiz_title}
          </h1>
          {quiz.quiz_description && (
            <p className="text-lg text-muted-foreground">
              {quiz.quiz_description}
            </p>
          )}
        </div>

        {/* Attempt Status Alerts */}
        {validation && !validation.canAttempt && validation.reason === 'attempt_limit' && (
          <Alert className="mb-6 border-accent bg-accent/5">
            <Lock className="h-5 w-5 text-accent" />
            <AlertDescription className="ml-2">
              <p className="font-semibold mb-2">Free Attempt Limit Reached</p>
              <p className="text-sm text-muted-foreground mb-3">
                You've completed both free attempts for this quiz. Your attempts:
              </p>
              <div className="flex gap-3 mb-3 text-sm">
                {completedAttempts.slice(0, 2).map((att) => (
                  <div key={att.id} className="px-3 py-1 bg-muted rounded">
                    Attempt {att.attempt_number}: {Math.round(att.score_percentage || 0)}%
                  </div>
                ))}
              </div>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium for Unlimited Attempts
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {validation && !validation.canAttempt && validation.reason === 'cooldown' && validation.nextAvailableTime && (
          <div className="mb-6">
            <CooldownTimer 
              nextAvailableTime={validation.nextAvailableTime}
              onComplete={loadAttemptData}
            />
          </div>
        )}

        {validation?.reason === 'incomplete_exists' && (
          <Alert className="mb-6 border-secondary bg-secondary/5">
            <AlertCircle className="h-5 w-5 text-secondary" />
            <AlertDescription className="ml-2">
              <p className="font-semibold mb-1">Incomplete Attempt Found</p>
              <p className="text-sm text-muted-foreground">
                You have an incomplete quiz attempt. You can continue where you left off or start a fresh attempt.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Quiz Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <BookOpen className="h-6 w-6 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{quiz.total_questions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-6 w-6 text-secondary mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {quiz.time_limit_minutes || '∞'}
              </p>
              <p className="text-xs text-muted-foreground">
                {quiz.time_limit_minutes ? 'Minutes' : 'Untimed'}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <Target className="h-6 w-6 text-accent mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {quiz.passing_score_percentage}%
              </p>
              <p className="text-xs text-muted-foreground">To Pass</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              {accountType === 'premium' ? (
                <>
                  <Sparkles className="h-6 w-6 text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-foreground">∞</p>
                  <p className="text-xs text-muted-foreground">Attempts</p>
                </>
              ) : (
                <>
                  <Trophy className="h-6 w-6 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {2 - completedAttempts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Attempt History */}
        {stats && completedAttempts.length > 0 && (
          <div className="mb-6">
            <AttemptHistory 
              attempts={attempts}
              stats={stats}
              quizId={quizId!}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleStartQuiz}
            disabled={!validation?.canAttempt}
            size="lg"
            className="flex-1 md:flex-none min-w-48"
          >
            <Play className="mr-2 h-5 w-5" />
            {validation?.reason === 'incomplete_exists' ? 'Continue Quiz' : 'Start Quiz'}
          </Button>
          
          {quiz.chapter_id && (
            <Button
              onClick={() => navigate(`/chapter/${quiz.chapter_id}`)}
              variant="outline"
              size="lg"
              className="flex-1 md:flex-none"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Review Chapter
            </Button>
          )}
          
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="lg"
            className="flex-1 md:flex-none md:ml-auto"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Premium Upsell */}
        {accountType === 'free' && freeUserLimitReached && (
          <Card className="p-6 mt-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Unlock Unlimited Quiz Attempts
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Premium students improve scores 23% faster with unlimited practice opportunities.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <span>Unlimited quiz attempts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <span>Instant retakes (no cooldown)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <span>AI-powered feedback</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <span>Detailed performance analytics</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                >
                  <Crown className="mr-2 h-5 w-5" />
                  Upgrade to Premium - R60/month
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
