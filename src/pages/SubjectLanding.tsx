import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Subject, Chapter } from '@/hooks/useCurriculumData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Atom, Dna, Globe, Book, ChevronRight, Clock, Target } from 'lucide-react';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';
import { ProgressRing } from '@/components/ui/progress-ring';

const iconMap: Record<string, any> = {
  Calculator: Calculator,
  Atom: Atom,
  Dna: Dna,
  Globe: Globe,
  Book: Book,
};

export default function SubjectLanding() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { fetchSubject, fetchChapters } = useCurriculumData();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!subjectName) return;

      setLoading(true);
      const subjectData = await fetchSubject(subjectName);
      
      if (subjectData) {
        setSubject(subjectData);
        const chaptersData = await fetchChapters(subjectData.id);
        setChapters(chaptersData);

        // TODO: Fetch actual progress from user_progress table
        setProgress(0);
      }
      
      setLoading(false);
    };

    loadData();
  }, [subjectName]);

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

  const Icon = iconMap[subject.icon_name || 'Book'];
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
            onClick={() => firstChapter && navigate(`/curriculum/${subjectName}/${firstChapter.chapter_number}`)}
            disabled={!firstChapter}
          >
            {progress > 0 ? 'Continue Learning' : 'Start Learning'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Chapter List - Coming in next part */}
      </div>
    </DashboardLayout>
  );
}
