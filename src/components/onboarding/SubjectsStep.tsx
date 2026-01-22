import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, BookOpen, Calculator, Atom, Globe, Heart, DollarSign, Briefcase, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SubjectsStepProps {
  onNext: (selectedSubjects: string[]) => void;
  onBack: () => void;
  gradeLevel: number;
  initialSelected?: string[];
}

const subjectIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Mathematics': Calculator,
  'Physical Sciences': Atom,
  'Life Sciences': Heart,
  'English': BookOpen,
  'Afrikaans': BookOpen,
  'Geography': Globe,
  'History': BookOpen,
  'Business Studies': Briefcase,
  'Accounting': DollarSign,
  'Economics': DollarSign,
  'Information Technology': Cpu,
};

export const SubjectsStep = ({ onNext, onBack, gradeLevel, initialSelected = [] }: SubjectsStepProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, [gradeLevel]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('grade_level', gradeLevel)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Fallback to hardcoded subjects if database fails
      setSubjects([
        { id: '1', name: 'Mathematics', description: 'Master equations, algebra, and calculus', icon: 'Calculator' },
        { id: '2', name: 'Physical Sciences', description: 'Explore physics and chemistry concepts', icon: 'Atom' },
        { id: '3', name: 'Life Sciences', description: 'Understand biology and life processes', icon: 'Heart' },
        { id: '4', name: 'English', description: 'Develop language and literature skills', icon: 'BookOpen' },
        { id: '5', name: 'Geography', description: 'Learn about the world and its features', icon: 'Globe' },
        { id: '6', name: 'History', description: 'Explore past events and civilizations', icon: 'BookOpen' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectName: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectName)
        ? prev.filter(s => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const handleContinue = () => {
    if (selectedSubjects.length < 3) {
      alert('Please select at least 3 subjects to continue.');
      return;
    }
    onNext(selectedSubjects);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p>Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-serif text-primary">
            Select Your Subjects
          </CardTitle>
          <p className="text-muted-foreground">
            Choose the subjects you're studying this year. You can change these later.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step 2 of 4</span>
              <span>50% complete</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>

          {selectedSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {selectedSubjects.length} selected:
              </span>
              {selectedSubjects.map(subject => (
                <Badge key={subject} variant="secondary">
                  {subject}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const IconComponent = subjectIcons[subject.icon] || BookOpen;
              const isSelected = selectedSubjects.includes(subject.name);

              return (
                <Card
                  key={subject.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleSubject(subject.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSubject(subject.name)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">{subject.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {subject.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedSubjects.length < 3 && (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                Please select at least 3 subjects to continue.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={selectedSubjects.length < 3}
              className="flex items-center gap-2 flex-1"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};