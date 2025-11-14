import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock,
  RotateCcw,
  Home,
  BookOpen,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface QuizAttempt {
  id: string;
  quiz_id: string;
  attempt_number: number;
  score_percentage: number;
  total_correct: number;
  total_questions: number;
  passed: boolean;
  time_spent_seconds: number;
  answers: Record<string, any>;
  submitted_at: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer: string;
  explanation: string | null;
  reference_section: string | null;
  options: string[] | null;
}

interface Quiz {
  id: string;
  quiz_title: string;
  passing_score_percentage: number;
  chapter_id: string;
}

export const QuizResults = () => {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId && user) {
      loadResults();
    }
  }, [attemptId, user]);

  const loadResults = async () => {
    try {
      // Fetch attempt
      // @ts-ignore - Quiz tables not yet in generated types
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', user?.id)
        .single();

      if (attemptError) throw attemptError;
      const attempt = attemptData as unknown as QuizAttempt;
      setAttempt(attempt);

      // Fetch quiz
      // @ts-ignore - Quiz tables not yet in generated types
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', attempt.quiz_id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData as unknown as Quiz);

      // Fetch questions
      // @ts-ignore - Quiz tables not yet in generated types
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attempt.quiz_id)
        .order('question_number');

      if (questionsError) throw questionsError;
      setQuestions(questionsData as unknown as QuizQuestion[]);

      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Error loading results",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getMotivationalMessage = (percentage: number, passed: boolean) => {
    if (passed && percentage >= 90) {
      return "Outstanding performance! You've mastered this material!";
    }
    if (passed && percentage >= 80) {
      return "Excellent work! You've demonstrated strong understanding!";
    }
    if (passed) {
      return "Well done! You've passed the quiz successfully!";
    }
    if (percentage >= 60) {
      return "Good effort! Review the highlighted topics and try again.";
    }
    return "Keep practicing! Review the material and you'll improve next time.";
  };

  const getAnswerLabel = (question: QuizQuestion, answer: string) => {
    if (question.question_type === 'multiple_choice' && question.options) {
      const index = answer.charCodeAt(0) - 65;
      return question.options[index] || answer;
    }
    return answer;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt || !quiz) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">Results not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const scorePercentage = attempt.score_percentage || 0;
  const progressValue = (scorePercentage / 100) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Score Card */}
        <Card className="p-8 mb-6 text-center bg-gradient-to-br from-card to-accent/10">
          <div className="flex flex-col items-center space-y-4">
            {attempt.passed ? (
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <RotateCcw className="h-10 w-10 text-destructive" />
              </div>
            )}

            <div>
              <h1 className="text-6xl font-bold text-foreground mb-2">
                {Math.round(scorePercentage)}%
              </h1>
              <Badge 
                variant={attempt.passed ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {attempt.passed ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Passed!
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Badge>
            </div>

            <Progress 
              value={progressValue} 
              className={`h-3 w-full max-w-md ${attempt.passed ? '[&>div]:bg-green-600' : '[&>div]:bg-destructive'}`}
            />

            <p className="text-lg text-muted-foreground max-w-md">
              {getMotivationalMessage(scorePercentage, attempt.passed)}
            </p>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
                <p className="text-2xl font-bold text-foreground">
                  {attempt.total_correct}/{attempt.total_questions}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Spent</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatTime(attempt.time_spent_seconds || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-secondary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passing Score</p>
                <p className="text-2xl font-bold text-foreground">
                  {quiz.passing_score_percentage}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Button 
            onClick={() => navigate(`/quiz/${quizId}`)}
            variant="default"
            className="flex-1 md:flex-none"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake Quiz
          </Button>
          <Button 
            onClick={() => navigate(`/chapter/${quiz.chapter_id}`)}
            variant="secondary"
            className="flex-1 md:flex-none"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Review Chapter
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex-1 md:flex-none"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Detailed Results */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Detailed Results</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {questions.map((question, index) => {
              const userAnswer = attempt.answers[question.id];
              const isCorrect = userAnswer?.is_correct === true;
              
              return (
                <AccordionItem key={question.id} value={question.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-left font-medium">
                          Question {index + 1}
                        </span>
                      </div>
                      <Badge variant={isCorrect ? "default" : "destructive"}>
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <p className="text-base font-medium mb-3">{question.question_text}</p>
                      
                      <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                        <div>
                          <span className="text-sm font-semibold">Your Answer: </span>
                          <span className={isCorrect ? "text-green-600" : "text-destructive"}>
                            {getAnswerLabel(question, userAnswer?.answer || 'Not answered')}
                          </span>
                        </div>
                        
                        {!isCorrect && (
                          <div>
                            <span className="text-sm font-semibold">Correct Answer: </span>
                            <span className="text-green-600">
                              {getAnswerLabel(question, question.correct_answer)}
                            </span>
                          </div>
                        )}
                      </div>

                      {question.explanation && (
                        <div className="mt-4 p-4 bg-accent/20 rounded-lg">
                          <p className="text-sm font-semibold mb-2">Explanation:</p>
                          <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        </div>
                      )}

                      {question.reference_section && (
                        <div className="mt-3">
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0"
                            onClick={() => navigate(`/chapter/${quiz.chapter_id}#${question.reference_section}`)}
                          >
                            <BookOpen className="mr-2 h-3 w-3" />
                            Review {question.reference_section}
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Card>

        {/* Next Steps Card */}
        {!attempt.passed && (
          <Card className="p-6 mt-6 bg-accent/10">
            <h3 className="text-lg font-semibold text-foreground mb-3">Recommended Next Steps</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Review the chapter content, focusing on sections where you made mistakes</li>
              <li>• Practice similar problems to strengthen your understanding</li>
              <li>• Ask the AI tutor for help with concepts you found challenging</li>
              <li>• Wait for the cooldown period before attempting the quiz again</li>
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
