import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useQuiz, Quiz, QuizQuestion } from '@/hooks/useQuiz';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Save,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    fetchQuiz,
    fetchQuizQuestions,
    startQuizAttempt,
    saveQuizProgress,
    submitQuiz,
  } = useQuiz();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (quizId && user) {
      loadQuiz();
    }
  }, [quizId, user]);

  useEffect(() => {
    if (quiz?.time_limit_minutes && timeLeft !== null) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 0) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, timeLeft]);

  const loadQuiz = async () => {
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

    const questionsData = await fetchQuizQuestions(quizId, quizData.question_shuffle);
    setQuestions(questionsData);

    if (quizData.time_limit_minutes) {
      setTimeLeft(quizData.time_limit_minutes * 60);
    }

    const attempt = await startQuizAttempt(user.id, quizId);
    if (attempt) {
      setAttemptId(attempt.id);
      setStartTime(new Date(attempt.started_at));
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { answer, is_correct: null, points_earned: 0 }
    }));
  };

  const handleSaveProgress = async () => {
    if (!attemptId) return;
    
    const saved = await saveQuizProgress(attemptId, answers);
    if (saved) {
      toast({
        title: "Progress saved",
        description: "Your answers have been saved",
      });
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleAutoSubmit = async () => {
    toast({
      title: "Time's up!",
      description: "Submitting your quiz automatically",
      variant: "destructive",
    });
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!attemptId || !quiz || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      toast({
        title: "Grading your quiz...",
        description: "Please wait while we evaluate your answers.",
      });

      // Import grading function
      const { gradeQuiz } = await import('@/utils/quiz-grading');

      // Grade the quiz
      const gradingResult = await gradeQuiz(
        questions,
        answers,
        quiz.passing_score_percentage || 75
      );

      // Build graded answers object with full details
      const gradedAnswers: Record<string, any> = {};
      gradingResult.graded_answers.forEach((result) => {
        gradedAnswers[result.questionId] = {
          answer: result.student_answer,
          is_correct: result.is_correct,
          points_earned: result.points_earned,
          ai_feedback: result.ai_feedback,
          ai_confidence: result.ai_confidence,
          graded_by: result.graded_by,
        };
      });

      const submitResult = await submitQuiz(attemptId, gradedAnswers, timeSpent, {
        score_percentage: gradingResult.score_percentage,
        total_correct: gradingResult.total_correct,
        total_questions: gradingResult.total_questions,
        passed: gradingResult.passed,
      });

      if (submitResult) {
        toast({
          title: gradingResult.passed ? "Quiz Passed! 🎉" : "Quiz Completed",
          description: `You scored ${Math.round(gradingResult.score_percentage)}%`,
          variant: gradingResult.passed ? "default" : "destructive",
        });

        // Update chapter progress if quiz linked to chapter
        if (quiz.chapter_id && user) {
          const { supabase } = await import('@/integrations/supabase/client');
          
          await (supabase as any)
            .from('user_chapter_progress')
            .upsert({
              user_id: user.id,
              chapter_id: quiz.chapter_id,
              quiz_passed: gradingResult.passed,
              quiz_score: gradingResult.score_percentage,
              last_quiz_attempt: new Date().toISOString(),
              status: gradingResult.passed ? 'completed' : 'in_progress',
            });

          // Log activity
          await (supabase as any)
            .from('activity_log')
            .insert({
              user_id: user.id,
              activity_type: 'quiz_completed',
              activity_description: `Scored ${Math.round(gradingResult.score_percentage)}% on ${quiz.quiz_title}`,
              subject_name: quiz.subject_name,
              metadata: {
                score: gradingResult.score_percentage,
                passed: gradingResult.passed,
                attempt_number: submitResult.attempt_number,
              },
            });
        }

        navigate(`/quiz/${quizId}/results/${attemptId}`);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quiz || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{quiz.quiz_title}</h1>
              <p className="text-muted-foreground mt-1">{quiz.quiz_description}</p>
            </div>
            {timeLeft !== null && (
              <Badge 
                variant={timeLeft < 120 ? "destructive" : "secondary"}
                className="text-lg px-4 py-2"
              >
                <Clock className="mr-2 h-5 w-5" />
                {formatTime(timeLeft)}
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{answeredCount}/{questions.length} answered</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-6 mb-6 bg-card shadow-lg rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <Badge variant="outline" className="text-sm">
              Question {currentQuestionIndex + 1}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFlag(currentQuestion.id)}
              className={flaggedQuestions.has(currentQuestion.id) ? "text-destructive" : ""}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-6 leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          {/* Answer Input */}
          <div className="space-y-4">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id]?.answer || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={String.fromCharCode(65 + idx)} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id]?.answer || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true" className="flex-1 cursor-pointer text-base">True</Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false" className="flex-1 cursor-pointer text-base">False</Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <Textarea
                value={answers[currentQuestion.id]?.answer || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-[120px] text-base"
              />
            )}

            {currentQuestion.question_type === 'math_problem' && (
              <div className="space-y-4">
                <Input
                  type="text"
                  value={answers[currentQuestion.id]?.answer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Enter your answer"
                  className="text-base"
                />
                {currentQuestion.requires_working && (
                  <Textarea
                    value={answers[currentQuestion.id]?.working || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, {
                      ...answers[currentQuestion.id],
                      working: e.target.value
                    })}
                    placeholder="Show your working here..."
                    className="min-h-[120px] text-base"
                  />
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleSaveProgress}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Progress
            </Button>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                Submit Quiz
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="bg-primary hover:bg-primary/90"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigation Grid */}
        <Card className="mt-6 p-4">
          <h3 className="text-sm font-semibold mb-3">Question Navigation</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`
                  aspect-square rounded-lg text-sm font-medium transition-all
                  ${idx === currentQuestionIndex ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${answers[q.id] ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}
                  ${flaggedQuestions.has(q.id) ? 'border-2 border-destructive' : ''}
                  hover:scale-110
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </Card>

        <ConfirmationDialog
          isOpen={showSubmitDialog}
          onClose={() => setShowSubmitDialog(false)}
          onConfirm={handleSubmit}
          title="Submit Quiz?"
          description={`You have answered ${answeredCount} out of ${questions.length} questions. Are you sure you want to submit?`}
          confirmText="Submit"
          variant="default"
        />
      </div>
    </DashboardLayout>
  );
};
