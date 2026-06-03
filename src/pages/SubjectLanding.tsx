import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Subject, Chapter } from '@/hooks/useCurriculumData';
import { useAuth } from '@/hooks/useAuth';
import { useQuiz, Quiz } from '@/hooks/useQuiz';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Atom, Dna, Globe, Book, ChevronRight, Clock, Target, FileQuestion, Play } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';
import { ProgressRing } from '@/components/ui/progress-ring';

const iconMap: Record<string, any> = {
  Calculator: Calculator,
  Atom: Atom,
  Dna: Dna,
  Globe: Globe,
  Book: Book,
  BookOpen: Book,
};

export default function SubjectLanding() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { fetchSubject, fetchChapters } = useCurriculumData();
  const { fetchQuizzesBySubject } = useQuiz();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [resumeChapterNumber, setResumeChapterNumber] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!subjectName) return;

      setLoading(true);
      try {
        const subjectData = await fetchSubject(subjectName);

        if (subjectData) {
          setSubject(subjectData);
          const chaptersData = await fetchChapters(subjectData.id);
          setChapters(chaptersData);
          const quizzesData = await fetchQuizzesBySubject(subjectData.subject_name);
          setQuizzes(quizzesData);

          if (user) {
            const { data: progressData, error: progressError } = await supabase
              .from('user_progress')
              .select('progress_percentage, current_chapter_number')
              .eq('user_id', user.id)
              .eq('subject_name', subjectData.subject_name)
              .maybeSingle();

            if (!progressError && progressData) {
              setProgress(Number(progressData.progress_percentage) || 0);
              setResumeChapterNumber(progressData.current_chapter_number || null);
            } else {
              setProgress(0);
              setResumeChapterNumber(null);
            }
          } else {
            setProgress(0);
            setResumeChapterNumber(null);
          }
        }
      } catch (err) {
        console.error('[SubjectLanding] Failed to load subject data', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subjectName, user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!subject) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Subject not found</p>
            <Button onClick={() => navigate('/subjects')} className="mt-4">
              Browse Subjects
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const Icon =
    iconMap[subject.icon_name || 'Book'] ||
    (subject.icon_name ? (LucideIcons as Record<string, any>)[subject.icon_name] : null) ||
    Book;
  const firstChapter = chapters[0];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="bg-primary text-white rounded-xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div 
              className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Icon className="h-16 w-16 md:h-20 md:w-20 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">
                {subject.subject_name}
              </h1>
              <CAPSBadge aligned={subject.caps_aligned} className="mb-4" />
              <p className="text-lg text-white/90 leading-relaxed">
                {subject.description}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-5xl font-bold text-center text-primary">
                {subject.total_chapters}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">Total Chapters</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center flex justify-center">
                <ProgressRing progress={progress} size={80} strokeWidth={6} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">Your Progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-5xl font-bold text-center text-primary">
                {subject.estimated_hours}h
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">Estimated Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Objectives */}
        {subject.learning_objectives && subject.learning_objectives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {subject.learning_objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{objective}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* CTA Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-white px-8 py-6 text-lg"
            onClick={() => {
              const targetChapterNumber = resumeChapterNumber && chapters.some((chapter) => chapter.chapter_number === resumeChapterNumber)
                ? resumeChapterNumber
                : firstChapter?.chapter_number;

              if (targetChapterNumber) {
                navigate(`/curriculum/${subjectName}/${targetChapterNumber}`);
              }
            }}
            disabled={!firstChapter}
          >
            {progress > 0 ? 'Continue Learning' : 'Start Learning'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Quizzes Section */}
        {quizzes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary" />
                Available Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{quiz.quiz_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {quiz.difficulty_level && (
                        <Badge variant="outline" className="text-xs">{quiz.difficulty_level}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileQuestion className="h-3 w-3" />
                        {quiz.total_questions} questions
                      </span>
                      {quiz.time_limit_minutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.time_limit_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="ml-3 flex-shrink-0"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
