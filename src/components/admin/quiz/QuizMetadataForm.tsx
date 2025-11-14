import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

interface QuizMetadataFormProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
}

export const QuizMetadataForm = ({ data, onChange, onNext }: QuizMetadataFormProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (data.subject_name) {
      loadChapters(data.subject_name);
    }
  }, [data.subject_name]);

  const loadSubjects = async () => {
    const { data: subjectsData } = await (supabase as any)
      .from('curriculum_subjects')
      .select('*')
      .eq('is_published', true)
      .order('subject_name');
    setSubjects(subjectsData || []);
  };

  const loadChapters = async (subjectName: string) => {
    const { data: subject } = await (supabase as any)
      .from('curriculum_subjects')
      .select('id')
      .eq('subject_name', subjectName)
      .single();

    if (subject) {
      const { data: chaptersData } = await (supabase as any)
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', subject.id)
        .eq('is_published', true)
        .order('chapter_number');
      setChapters(chaptersData || []);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.quiz_title?.trim()) {
      newErrors.quiz_title = 'Quiz title is required';
    }
    if (!data.subject_name) {
      newErrors.subject_name = 'Subject is required';
    }
    if (!data.difficulty_level) {
      newErrors.difficulty_level = 'Difficulty level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="quiz_title">Quiz Title *</Label>
            <Input
              id="quiz_title"
              value={data.quiz_title}
              onChange={(e) => updateField('quiz_title', e.target.value)}
              placeholder="e.g., Chapter 5: Photosynthesis Quiz"
              className={errors.quiz_title ? 'border-red-500' : ''}
            />
            {errors.quiz_title && (
              <p className="text-sm text-red-600 mt-1">{errors.quiz_title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="quiz_description">Description</Label>
            <Textarea
              id="quiz_description"
              value={data.quiz_description}
              onChange={(e) => updateField('quiz_description', e.target.value)}
              placeholder="Describe what this quiz covers..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={data.subject_name} onValueChange={(v) => updateField('subject_name', v)}>
                <SelectTrigger className={errors.subject_name ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.subject_name}>
                      {s.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject_name && (
                <p className="text-sm text-red-600 mt-1">{errors.subject_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="chapter">Chapter (Optional)</Label>
              <Select
                value={data.chapter_id || ''}
                onValueChange={(v) => updateField('chapter_id', v || null)}
                disabled={!data.subject_name}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific chapter</SelectItem>
                  {chapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Ch {c.chapter_number}: {c.chapter_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Difficulty Level *</Label>
            <RadioGroup value={data.difficulty_level} onValueChange={(v) => updateField('difficulty_level', v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Beginner" id="beginner" />
                <Label htmlFor="beginner">Beginner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Intermediate" id="intermediate" />
                <Label htmlFor="intermediate">Intermediate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Advanced" id="advanced" />
                <Label htmlFor="advanced">Advanced</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="time_limit">Time Limit (minutes)</Label>
            <Input
              id="time_limit"
              type="number"
              value={data.time_limit_minutes || ''}
              onChange={(e) => updateField('time_limit_minutes', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty for no time limit"
              min="1"
            />
          </div>

          <div>
            <Label>Passing Score: {data.passing_score_percentage}%</Label>
            <Slider
              value={[data.passing_score_percentage]}
              onValueChange={([v]) => updateField('passing_score_percentage', v)}
              min={50}
              max={90}
              step={5}
              className="mt-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="question_shuffle">Shuffle Questions</Label>
              <Switch
                id="question_shuffle"
                checked={data.question_shuffle}
                onCheckedChange={(checked) => updateField('question_shuffle', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="option_shuffle">Shuffle Answer Options</Label>
              <Switch
                id="option_shuffle"
                checked={data.option_shuffle}
                onCheckedChange={(checked) => updateField('option_shuffle', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="instant_feedback">Instant Feedback</Label>
              <Switch
                id="instant_feedback"
                checked={data.instant_feedback}
                onCheckedChange={(checked) => updateField('instant_feedback', checked)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          Next: Add Questions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
