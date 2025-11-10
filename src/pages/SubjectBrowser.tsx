import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Subject } from '@/hooks/useCurriculumData';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Calculator, Atom, Dna, Globe, Clock } from 'lucide-react';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';

const iconMap: Record<string, any> = {
  Calculator: Calculator,
  Atom: Atom,
  Dna: Dna,
  Globe: Globe,
  Book: Book,
};

export default function SubjectBrowser() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { fetchSubjects } = useCurriculumData();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!userProfile?.grade_level) return;
      
      setLoading(true);
      const data = await fetchSubjects(userProfile.grade_level);
      setSubjects(data);
      setLoading(false);
    };

    loadSubjects();
  }, [userProfile?.grade_level]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">
            Browse Subjects
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore all Grade {userProfile?.grade_level} CAPS-aligned subjects
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No subjects available for Grade {userProfile?.grade_level}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const Icon = iconMap[subject.icon_name || 'Book'];
              
              return (
                <Card
                  key={subject.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                  onClick={() => navigate(`/curriculum/${subject.subject_name}`)}
                >
                  <CardHeader className="text-center">
                    <div 
                      className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: `hsl(var(--subject-${subject.color_scheme || 'math'}) / 0.2)` 
                      }}
                    >
                      <Icon 
                        className="h-12 w-12"
                        style={{ color: `hsl(var(--subject-${subject.color_scheme || 'math'}))` }}
                      />
                    </div>
                    <CardTitle className="text-xl font-serif text-primary">
                      {subject.subject_name}
                    </CardTitle>
                    <div className="flex justify-center gap-2 mt-2">
                      <CAPSBadge aligned={subject.caps_aligned} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-2">
                      {subject.description}
                    </CardDescription>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Book className="h-4 w-4" />
                        {subject.total_chapters} chapters
                      </span>
                      {subject.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {subject.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
