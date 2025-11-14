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
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import jsPDF from 'jspdf';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock,
  RotateCcw,
  Home,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Target,
  Hash,
  Download,
  Lightbulb,
  Brain,
  TrendingDown,
  Award
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
  points: number;
  difficulty_level: string | null;
  requires_working: boolean;
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
  const [animatedScore, setAnimatedScore] = useState(0);
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (attemptId && user) {
      loadResults();
    }
  }, [attemptId, user]);

  // Animate score on load
  useEffect(() => {
    if (attempt && !loading) {
      const targetScore = attempt.score_percentage || 0;
      const duration = 1000;
      const steps = 60;
      const increment = targetScore / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetScore) {
          setAnimatedScore(targetScore);
          clearInterval(timer);
        } else {
          setAnimatedScore(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [attempt, loading]);

  const loadResults = async () => {
    try {
      // Fetch attempt
      const { data: attemptData, error: attemptError } = await (supabase as any)
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', user?.id)
        .single();

      if (attemptError) throw attemptError;
      const attempt = attemptData as QuizAttempt;
      setAttempt(attempt);

      // Fetch quiz
      const { data: quizData, error: quizError } = await (supabase as any)
        .from('quizzes')
        .select('*')
        .eq('id', attempt.quiz_id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData as Quiz);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await (supabase as any)
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attempt.quiz_id)
        .order('question_number');

      if (questionsError) throw questionsError;
      setQuestions(questionsData as QuizQuestion[]);

      // Fetch all attempts for history
      const { data: attemptsData } = await (supabase as any)
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('quiz_id', attempt.quiz_id)
        .eq('is_completed', true)
        .order('attempt_number', { ascending: true });
      
      if (attemptsData) {
        setAllAttempts(attemptsData as QuizAttempt[]);
      }

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

  const analyzeKnowledgeGaps = () => {
    const topicScores: Record<string, { correct: number; total: number }> = {};
    
    questions.forEach((question) => {
      const topic = question.reference_section || 'General';
      const answer = attempt?.answers[question.id];
      
      if (!topicScores[topic]) {
        topicScores[topic] = { correct: 0, total: 0 };
      }
      
      topicScores[topic].total++;
      if (answer?.is_correct) {
        topicScores[topic].correct++;
      }
    });

    return Object.entries(topicScores).map(([topic, scores]) => ({
      topic,
      score: (scores.correct / scores.total) * 100,
      correct: scores.correct,
      total: scores.total,
    })).sort((a, b) => a.score - b.score);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text(quiz?.quiz_title || 'Quiz Results', 20, 20);
      
      // Score
      doc.setFontSize(16);
      doc.text(`Score: ${Math.round(attempt?.score_percentage || 0)}%`, 20, 35);
      doc.text(`Status: ${attempt?.passed ? 'PASSED' : 'FAILED'}`, 20, 45);
      
      // Stats
      doc.setFontSize(12);
      doc.text(`Correct Answers: ${attempt?.total_correct}/${attempt?.total_questions}`, 20, 60);
      doc.text(`Time Spent: ${formatTime(attempt?.time_spent_seconds || 0)}`, 20, 70);
      doc.text(`Date: ${new Date(attempt?.submitted_at || '').toLocaleDateString()}`, 20, 80);
      
      // Questions summary
      let yPos = 95;
      doc.setFontSize(14);
      doc.text('Questions Summary:', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      questions.forEach((q, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const answer = attempt?.answers[q.id];
        const status = answer?.is_correct ? '✓' : '✗';
        doc.text(`${idx + 1}. ${status} ${q.question_text.substring(0, 60)}...`, 20, yPos);
        yPos += 7;
      });
      
      doc.save(`Quiz_Results_${quiz?.quiz_title}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Your quiz results have been saved",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
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
  const knowledgeGaps = analyzeKnowledgeGaps();
  const weakTopics = knowledgeGaps.filter(t => t.score < 60);
  const strongTopics = knowledgeGaps.filter(t => t.score >= 85);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Hero Section with Circular Progress */}
        <Card className="p-8 mb-6 text-center bg-gradient-to-br from-card to-accent/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
          
          <div className="relative flex flex-col items-center space-y-6">
            {/* Animated Circular Progress */}
            <div className="w-48 h-48 md:w-56 md:h-56">
              <CircularProgressbar
                value={animatedScore}
                text={`${Math.round(animatedScore)}%`}
                styles={buildStyles({
                  pathColor: attempt.passed ? '#10b981' : '#ef4444',
                  textColor: 'hsl(var(--foreground))',
                  trailColor: 'hsl(var(--muted))',
                  pathTransitionDuration: 0.5,
                  textSize: '20px',
                })}
              />
            </div>

            {/* Animated Pass/Fail Badge */}
            <Badge 
              variant={attempt.passed ? "default" : "destructive"}
              className="text-xl px-6 py-2 animate-in zoom-in duration-500 delay-500"
            >
              {attempt.passed ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Passed!
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  Try Again
                </>
              )}
            </Badge>

            <p className="text-lg text-muted-foreground max-w-md animate-in fade-in duration-700 delay-700">
              {getMotivationalMessage(scorePercentage, attempt.passed)}
            </p>
          </div>
        </Card>

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {attempt.total_correct}/{attempt.total_questions}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Clock className="h-5 w-5 text-secondary" />
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatTime(attempt.time_spent_seconds || 0)}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Hash className="h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">Attempt</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                #{attempt.attempt_number}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Target className="h-5 w-5 text-accent" />
                <p className="text-xs text-muted-foreground">Pass at</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {quiz.passing_score_percentage}%
              </p>
            </div>
          </Card>
        </div>

        {/* Knowledge Gap Analysis */}
        {knowledgeGaps.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Knowledge Analysis</h2>
            </div>
            
            <div className="space-y-3">
              {knowledgeGaps.map((gap) => (
                <div key={gap.topic} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{gap.topic}</span>
                    <span className={`font-bold ${
                      gap.score >= 85 ? 'text-green-600' :
                      gap.score >= 75 ? 'text-secondary' :
                      gap.score >= 60 ? 'text-yellow-600' :
                      'text-destructive'
                    }`}>
                      {Math.round(gap.score)}% ({gap.correct}/{gap.total})
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                        gap.score >= 85 ? 'bg-green-600' :
                        gap.score >= 75 ? 'bg-secondary' :
                        gap.score >= 60 ? 'bg-yellow-600' :
                        'bg-destructive'
                      }`}
                      style={{ width: `${gap.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {strongTopics.length > 0 && `Strong in ${strongTopics.length} topic${strongTopics.length !== 1 ? 's' : ''}`}
                {strongTopics.length > 0 && weakTopics.length > 0 && ' • '}
                {weakTopics.length > 0 && `Need review in ${weakTopics.length} topic${weakTopics.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </Card>
        )}

        {/* Study Recommendations */}
        {weakTopics.length > 0 && (
          <Card className="p-6 mb-6 bg-accent/5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-bold text-foreground">Recommended Next Steps</h2>
            </div>
            
            <div className="grid gap-3">
              {weakTopics.slice(0, 3).map((topic) => (
                <div key={topic.topic} className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                  <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Review {topic.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      You scored {Math.round(topic.score)}% on this topic. Reviewing will help strengthen your understanding.
                    </p>
                    {quiz.chapter_id && topic.topic !== 'General' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 h-auto mt-1"
                        onClick={() => navigate(`/chapter/${quiz.chapter_id}#${topic.topic}`)}
                      >
                        Go to section →
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
            onClick={() => navigate(`/quiz/${quizId}/landing`)}
            variant="default"
            size="lg"
            className="flex-1 md:flex-none"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake Quiz
          </Button>
          {quiz.chapter_id && (
            <Button 
              onClick={() => navigate(`/chapter/${quiz.chapter_id}`)}
              variant="secondary"
              size="lg"
              className="flex-1 md:flex-none"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Review Chapter
            </Button>
          )}
          <Button 
            onClick={exportToPDF}
            variant="outline"
            size="lg"
            className="flex-1 md:flex-none"
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="lg"
            className="flex-1 md:flex-none md:ml-auto"
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
                  <AccordionTrigger className="px-4 hover:no-underline border-l-4" style={{
                    borderLeftColor: isCorrect ? '#10b981' : 
                      (userAnswer?.points_earned > 0 ? '#eab308' : '#ef4444')
                  }}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : userAnswer?.points_earned > 0 ? (
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <div className="text-left">
                          <span className="font-medium block">
                            Question {index + 1}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {question.question_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userAnswer?.points_earned !== undefined && (
                          <span className="text-xs text-muted-foreground mr-2">
                            {userAnswer.points_earned}/{question.points || 1} pts
                          </span>
                        )}
                        <Badge variant={isCorrect ? "default" : 
                          userAnswer?.points_earned > 0 ? "secondary" : "destructive"
                        }>
                          {isCorrect ? "Correct" : 
                            userAnswer?.points_earned > 0 ? "Partial" : "Incorrect"
                          }
                        </Badge>
                      </div>
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

                      {/* AI Feedback */}
                      {userAnswer?.ai_feedback && (
                        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-2 mb-2">
                            <Brain className="h-4 w-4 text-primary mt-0.5" />
                            <p className="text-sm font-semibold text-primary">AI Feedback</p>
                            {userAnswer.ai_confidence && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {Math.round(userAnswer.ai_confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{userAnswer.ai_feedback}</p>
                        </div>
                      )}

                      {question.explanation && (
                        <div className="mt-4 p-4 bg-accent/10 rounded-lg border">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            Explanation
                          </p>
                          <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        </div>
                      )}

                      {question.reference_section && quiz.chapter_id && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/chapter/${quiz.chapter_id}#${question.reference_section}`)}
                          >
                            <BookOpen className="mr-2 h-3 w-3" />
                            Review in Chapter: {question.reference_section}
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

        {/* Attempt History */}
        {allAttempts.length > 1 && (
          <Card className="p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
            </div>
            
            <div className="space-y-3">
              {allAttempts.map((att, idx) => {
                const prevScore = idx > 0 ? allAttempts[idx - 1].score_percentage : null;
                const diff = prevScore ? att.score_percentage - prevScore : null;
                const isCurrent = att.id === attemptId;
                
                return (
                  <div 
                    key={att.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCurrent ? 'bg-accent/10 border-accent' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        att.passed ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        #{att.attempt_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {Math.round(att.score_percentage)}%
                          {diff !== null && (
                            <span className={`ml-2 text-xs ${
                              diff > 0 ? 'text-green-600' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {Math.abs(Math.round(diff))}%
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(att.submitted_at!).toLocaleDateString()} • {formatTime(att.time_spent_seconds || 0)}
                        </p>
                      </div>
                    </div>
                    {att.passed && (
                      <Award className="h-5 w-5 text-green-600" />
                    )}
                    {isCurrent && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {allAttempts.length > 1 && (
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Score</p>
                  <p className="text-lg font-bold text-green-600">
                    {Math.round(Math.max(...allAttempts.map(a => a.score_percentage)))}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Average</p>
                  <p className="text-lg font-bold text-foreground">
                    {Math.round(allAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / allAttempts.length)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Improvement</p>
                  <p className="text-lg font-bold text-secondary">
                    +{Math.round(attempt.score_percentage - allAttempts[0].score_percentage)}%
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
