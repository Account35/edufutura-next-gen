import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Eye, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes';
import { useState } from 'react';

interface QuizReviewPublishProps {
  quizData: any;
  questions: any[];
  onBack: () => void;
  onPublish: () => void;
}

export const QuizReviewPublish = ({ quizData, questions, onBack, onPublish }: QuizReviewPublishProps) => {
  const { createQuiz } = useAdminQuizzes();
  const [publishing, setPublishing] = useState(false);

  const validateQuiz = () => {
    const issues: string[] = [];
    
    if (!quizData.quiz_title) issues.push('Quiz title is missing');
    if (!quizData.subject_name) issues.push('Subject is not selected');
    if (questions.length < 5) issues.push(`Need at least 5 questions (currently ${questions.length})`);
    
    questions.forEach((q, i) => {
      if (!q.question_text) issues.push(`Question ${i + 1} has no text`);
      if (!q.correct_answer) issues.push(`Question ${i + 1} has no correct answer`);
    });

    return issues;
  };

  const issues = validateQuiz();

  const handleSaveDraft = async () => {
    setPublishing(true);
    const quiz = await createQuiz({
      ...quizData,
      is_published: false,
      total_questions: questions.length,
    });

    if (quiz) {
      // Save questions
      const { supabase } = await import('@/integrations/supabase/client');
      const questionsWithQuizId = questions.map(q => ({ ...q, quiz_id: quiz.id }));
      await (supabase as any).from('quiz_questions').insert(questionsWithQuizId);
      onPublish();
    }
    setPublishing(false);
  };

  const handlePublishNow = async () => {
    if (issues.length > 0) return;
    
    setPublishing(true);
    const quiz = await createQuiz({
      ...quizData,
      is_published: true,
      total_questions: questions.length,
    });

    if (quiz) {
      // Save questions
      const { supabase } = await import('@/integrations/supabase/client');
      const questionsWithQuizId = questions.map(q => ({ ...q, quiz_id: quiz.id }));
      await (supabase as any).from('quiz_questions').insert(questionsWithQuizId);
      onPublish();
    }
    setPublishing(false);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Review all information carefully before publishing. Students will see this quiz once published.
        </AlertDescription>
      </Alert>

      {/* Validation Issues */}
      {issues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Please fix these issues before publishing:</p>
            <ul className="list-disc list-inside space-y-1">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quiz Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{quizData.quiz_title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subject</p>
            <p className="font-medium">{quizData.subject_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Difficulty</p>
            <Badge>{quizData.difficulty_level}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time Limit</p>
            <p className="font-medium">{quizData.time_limit_minutes ? `${quizData.time_limit_minutes} minutes` : 'Unlimited'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Passing Score</p>
            <p className="font-medium">{quizData.passing_score_percentage}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Questions</p>
            <p className="font-medium">{questions.length}</p>
          </div>
        </div>

        {quizData.quiz_description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm">{quizData.quiz_description}</p>
          </div>
        )}
      </Card>

      {/* Questions Preview */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Questions ({questions.length})</h3>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Q{i + 1}</span>
                  <Badge variant="outline">{q.question_type.replace('_', ' ')}</Badge>
                  <Badge variant="secondary">{q.difficulty_level}</Badge>
                  <span className="text-sm text-muted-foreground">{q.points} pts</span>
                </div>
                {!q.question_text || !q.correct_answer ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              <p className="text-sm">{q.question_text}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questions
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={publishing}>
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={handlePublishNow} disabled={issues.length > 0 || publishing}>
            <Eye className="h-4 w-4 mr-2" />
            Publish Now
          </Button>
        </div>
      </div>
    </div>
  );
};
