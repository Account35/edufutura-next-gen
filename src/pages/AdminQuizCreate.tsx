import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageLoader } from '@/components/ui/loading';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuizMetadataForm } from '@/components/admin/quiz/QuizMetadataForm';
import { QuizQuestionsBuilder } from '@/components/admin/quiz/QuizQuestionsBuilder';
import { QuizReviewPublish } from '@/components/admin/quiz/QuizReviewPublish';

export default function AdminQuizCreate() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [currentStep, setCurrentStep] = useState('metadata');
  const [quizData, setQuizData] = useState<any>({
    quiz_title: '',
    quiz_description: '',
    subject_name: '',
    chapter_id: null,
    difficulty_level: 'Intermediate',
    time_limit_minutes: null,
    passing_score_percentage: 75,
    question_shuffle: true,
    option_shuffle: true,
    instant_feedback: false,
  });
  const [questions, setQuestions] = useState<any[]>([]);

  // Access control is handled by AdminLayout - no need for duplicate redirect logic

  if (authLoading || roleLoading) {
    return <FullPageLoader message="Loading..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="Create Quiz">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/quizzes')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Create Quiz</h1>
              <p className="text-muted-foreground">Build a new assessment quiz</p>
            </div>
          </div>
        </div>

        {/* Wizard Steps */}
        <Card className="p-6">
          <Tabs value={currentStep} onValueChange={setCurrentStep}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metadata">1. Metadata</TabsTrigger>
              <TabsTrigger value="questions" disabled={!quizData.quiz_title}>
                2. Questions
              </TabsTrigger>
              <TabsTrigger value="review" disabled={questions.length === 0}>
                3. Review & Publish
              </TabsTrigger>
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
                onPublish={() => navigate('/admin/quizzes')}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
}
