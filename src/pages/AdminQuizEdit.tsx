import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuizMetadataForm } from '@/components/admin/quiz/QuizMetadataForm';
import { QuizQuestionsBuilder } from '@/components/admin/quiz/QuizQuestionsBuilder';
import { QuizReviewPublish } from '@/components/admin/quiz/QuizReviewPublish';
import { supabase } from '@/integrations/supabase/client';
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes';
import { toast } from 'sonner';

export default function AdminQuizEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateQuiz } = useAdminQuizzes();

  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState('metadata');
  const [togglingPublish, setTogglingPublish] = useState(false);

  const isPublished = quizData?.is_published === true;

  useEffect(() => {
    if (id) loadQuiz(id);
  }, [id]);

  const loadQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      const { data: quiz, error: quizError } = await (supabase as any)
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError || !quiz) {
        toast.error('Quiz not found');
        navigate('/admin/quizzes');
        return;
      }

      const { data: qs } = await (supabase as any)
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_number');

      setQuizData(quiz);
      setQuestions(qs || []);
    } catch {
      toast.error('Failed to load quiz');
      navigate('/admin/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!quizData) return;
    setTogglingPublish(true);
    const success = await updateQuiz(quizData.id, { is_published: !isPublished });
    if (success) {
      setQuizData((prev: any) => ({ ...prev, is_published: !isPublished }));
      toast.success(isPublished ? 'Quiz unpublished — you can now edit it.' : 'Quiz published.');
    }
    setTogglingPublish(false);
  };

  const handleSaveQuiz = async (publish: boolean) => {
    if (!quizData) return;

    // Update quiz metadata
    await updateQuiz(quizData.id, {
      ...quizData,
      is_published: publish,
      total_questions: questions.length,
    });

    // Delete old questions and re-insert
    await (supabase as any).from('quiz_questions').delete().eq('quiz_id', quizData.id);
    if (questions.length > 0) {
      await (supabase as any).from('quiz_questions').insert(
        questions.map(q => ({ ...q, quiz_id: quizData.id }))
      );
    }

    toast.success(publish ? 'Quiz published successfully' : 'Draft saved successfully');
    navigate('/admin/quizzes');
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Quiz">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Quiz">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/quizzes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-primary">Edit Quiz</h1>
                <Badge variant={isPublished ? 'default' : 'outline'}>
                  {isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-muted-foreground">{quizData?.quiz_title}</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleTogglePublish}
            disabled={togglingPublish}
            className={isPublished ? 'border-orange-400 text-orange-600 hover:bg-orange-50' : ''}
          >
            {togglingPublish ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="w-4 h-4 mr-2" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            {isPublished ? 'Unpublish to Edit' : 'Publish'}
          </Button>
        </div>

        {/* Published lock warning */}
        {isPublished && (
          <Alert className="border-orange-300 bg-orange-50">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              This quiz is published and locked. Students currently taking it will not be affected.
              Click <strong>Unpublish to Edit</strong> to make changes — active attempts will continue uninterrupted.
            </AlertDescription>
          </Alert>
        )}

        {/* Wizard */}
        <Card className="p-6">
          <Tabs value={currentStep} onValueChange={isPublished ? undefined : setCurrentStep}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metadata" disabled={isPublished}>1. Metadata</TabsTrigger>
              <TabsTrigger value="questions" disabled={isPublished || !quizData?.quiz_title}>2. Questions</TabsTrigger>
              <TabsTrigger value="review" disabled={isPublished || questions.length === 0}>3. Review & Save</TabsTrigger>
            </TabsList>

            <TabsContent value="metadata" className="mt-6">
              <QuizMetadataForm
                data={quizData}
                onChange={setQuizData}
                onNext={() => setCurrentStep('questions')}
              />
            </TabsContent>

            <TabsContent value="questions" className="mt-6">
              <QuizQuestionsBuilder
                questions={questions}
                onChange={setQuestions}
                onNext={() => setCurrentStep('review')}
                onBack={() => setCurrentStep('metadata')}
              />
            </TabsContent>

            <TabsContent value="review" className="mt-6">
              <QuizReviewPublish
                quizData={quizData}
                questions={questions}
                onBack={() => setCurrentStep('questions')}
                onPublish={() => handleSaveQuiz(true)}
                onSaveDraft={() => handleSaveQuiz(false)}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
}
