import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SubjectsStepProps {
  data: {
    grade_level: number | null;
    school_id: string | null;
    subjects_studying: string[];
  };
  onUpdate: (data: Partial<SubjectsStepProps['data']>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function SubjectsStep({ data, onUpdate, onNext, onPrev }: SubjectsStepProps) {
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data.school_id && data.grade_level) {
      loadSubjects();
    }
  }, [data.school_id, data.grade_level]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('subjects_per_grade')
        .eq('id', data.school_id)
        .single();

      if (error) throw error;

      const subjectsForGrade = schoolData.subjects_per_grade?.[data.grade_level.toString()] || [];
      setAvailableSubjects(subjectsForGrade);
    } catch (error) {
      console.error('Error loading subjects:', error);
      // Fallback to common CAPS subjects
      setAvailableSubjects([
        'Mathematics', 'English', 'Life Sciences', 'Physical Sciences',
        'Accounting', 'Business Studies', 'Geography', 'History', 'Life Orientation'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subject: string, checked: boolean) => {
    const currentSubjects = data.subjects_studying || [];
    let newSubjects;

    if (checked) {
      newSubjects = [...currentSubjects, subject];
    } else {
      newSubjects = currentSubjects.filter(s => s !== subject);
    }

    onUpdate({ subjects_studying: newSubjects });
  };

  const isValid = data.subjects_studying && data.subjects_studying.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading subjects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Choose Your Subjects</h2>
        <p className="text-muted-foreground">
          Select the subjects you want to study. You can change this later in your profile.
        </p>
      </div>

      <div className="space-y-4">
        <Label>Select subjects for Grade {data.grade_level}:</Label>
        <div className="grid grid-cols-1 gap-3">
          {availableSubjects.map((subject) => (
            <div key={subject} className="flex items-center space-x-2">
              <Checkbox
                id={subject}
                checked={data.subjects_studying?.includes(subject) || false}
                onCheckedChange={(checked) => handleSubjectToggle(subject, checked as boolean)}
              />
              <Label htmlFor={subject} className="text-sm font-normal cursor-pointer">
                {subject}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Next
        </Button>
      </div>
    </div>
  );
}