import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuiz, Quiz } from '@/hooks/useQuiz';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { 
  Clock, 
  Trophy, 
  Target,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  Sparkles
} from 'lucide-react';

export const QuizLanding = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();
  const {
    fetchQuiz,
    checkCooldown,
    fetchUserAttempts,
    startQuizAttempt,
  } = useQuiz();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [cooldown, setCooldown] = useState<{ canAttempt: boolean; minutesLeft: number }>({ canAttempt: true, minutesLeft: 0 });
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (quizId && user) {
      loadQuizData();
    }
  }, [quizId, user]);

  useEffect(() => {
    if (cooldown.minutesLeft > 0 && !cooldown.canAttempt) {
      const seconds = cooldown.minutesLeft * 60;
      setCountdown(seconds);

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 0) {
            setCooldown({ canAttempt: true, minutesLeft: 0 });
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const loadQuizData = async () => {
    if (!quizId || !user) return;

    const quizData = await fetchQuiz(quizId);
    if (!quizData) {
      toast({
        title: "Quiz not found",
        description: "The quiz you're looking for doesn't exist",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    setQuiz(quizData);

    const attemptsData = await fetchUserAttempts(user.id, quizId);
    setAttempts(attemptsData);

    const cooldownData = await checkCooldown(user.id, quizId);
    setCooldown(cooldownData);

    setLoading(false);
  };

  const handleStartQuiz = async () => {
    if (!user || !quiz) return;

    // Check authentication
    if (!user.id) {
      navigate('/');
      return;
    }

    // Check attempt limit for free users
    if (!isPremium && attempts.length >= 2) {
      setShowUpgradeModal(true);
      return;
    }

    // Check cooldown
    if (!cooldown.canAttempt) {
      toast({
        title: "Please wait",
        description: `You can attempt this quiz again in ${Math.ceil(cooldown.minutesLeft)} minutes`,
        variant: "destructive",
      });
      return;
    }

    const attempt = await startQuizAttempt(user.id, quiz.id);
    if (attempt) {
      navigate(`/quiz/${quiz.id}/attempt/${attempt.id}`);
    }
  };

  const getDifficultyColor = (level: string | null) => {
    switch (level) {
      case 'Beginner': return 'bg-green-500';
      case 'Intermediate': return 'bg-orange-500';
      case 'Advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bestScore = attempts.reduce((max, att) => 
    Math.max(max, att.score_percentage || 0), 0
  );
  
  const lastAttempt = attempts[0];
  const avgScore = attempts.length > 0
    ? attempts.reduce((sum, att) => sum + (att.score_percentage || 0), 0) / attempts.length
    : 0;

  if (loading) {
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

  const estimatedTime = quiz.time_limit_minutes || Math.ceil(quiz.total_questions * 1.5);
  const remainingAttempts = isPremium ? null : Math.max(0, 2 - attempts.length);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Quiz Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            {quiz.quiz_title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {quiz.quiz_description || 'Test your knowledge and understanding of this chapter'}
          </p>
        </div>

        {/* Quiz Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <Target className="h-8 w-8 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{quiz.total_questions}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-secondary mb-2" />
              <p className="text-2xl font-bold text-foreground">{estimatedTime}</p>
              <p className="text-sm text-muted-foreground">Minutes</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              {quiz.difficulty_level && (
                <Badge className={`${getDifficultyColor(quiz.difficulty_level)} text-white mb-2`}>
                  {quiz.difficulty_level}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground mt-2">Difficulty</p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-foreground">{quiz.passing_score_percentage}%</p>
              <p className="text-sm text-muted-foreground">To Pass</p>
            </div>
          </Card>
        </div>

        {/* Attempt Information */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Attempt Information</h3>
          
          {isPremium ? (
            <div className="flex items-center gap-2 text-secondary mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Unlimited attempts available</span>
            </div>
          ) : (
            <div className="mb-4">
              {remainingAttempts! > 0 ? (
                <p className="text-foreground">
                  <span className="font-semibold">{remainingAttempts} of 2 attempts remaining</span>
                  {remainingAttempts === 1 && (
                    <span className="text-destructive ml-2">(Last attempt!)</span>
                  )}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">No attempts remaining</span>
                </div>
              )}
            </div>
          )}

          {!cooldown.canAttempt && countdown !== null && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-2">Next attempt available in:</p>
              <p className="text-2xl font-bold text-accent">{formatCountdown(countdown)}</p>
            </div>
          )}

          {attempts.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground">Previous Attempts</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Best Score</p>
                    <p className="text-xl font-bold text-foreground">{Math.round(bestScore)}%</p>
                  </div>
                </div>

                {lastAttempt && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Score</p>
                      <p className="text-xl font-bold text-foreground">{Math.round(lastAttempt.score_percentage || 0)}%</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Target className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-xl font-bold text-foreground">{Math.round(avgScore)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Start Button */}
        <Card className="p-6 bg-gradient-to-br from-card to-secondary/5">
          <div className="flex flex-col items-center text-center space-y-4">
            {!isPremium && remainingAttempts === 0 ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No Attempts Remaining</h3>
                  <p className="text-muted-foreground mb-4">
                    Upgrade to Premium for unlimited quiz attempts
                  </p>
                </div>
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Upgrade to Premium
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleStartQuiz}
                  disabled={!cooldown.canAttempt}
                  className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg hover:scale-105 transition-transform shadow-lg disabled:hover:scale-100"
                  size="lg"
                >
                  <PlayCircle className="mr-2 h-6 w-6" />
                  Start Quiz
                </Button>
                {quiz.time_limit_minutes && (
                  <p className="text-sm text-muted-foreground">
                    This is a timed quiz. You'll have {quiz.time_limit_minutes} minutes to complete it.
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </DashboardLayout>
  );
};
