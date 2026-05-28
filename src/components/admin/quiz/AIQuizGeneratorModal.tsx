import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface QuestionTypeConfig {
  multiple_choice: number;
  true_false: number;
  short_answer: number;
}

interface AIQuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onGenerated is optional — when called from the list page we navigate directly
  onGenerated?: (questions: any[], metadata: { subject_name: string; grade_level: number; chapter_title?: string; chapter_id?: string }) => void;
}

export function AIQuizGeneratorModal({ isOpen, onClose, onGenerated }: AIQuizGeneratorModalProps) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('none');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeConfig>({
    multiple_choice: 5,
    true_false: 3,
    short_answer: 2,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const totalQuestions = questionTypes.multiple_choice + questionTypes.true_false + questionTypes.short_answer;
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  useEffect(() => {
    if (isOpen) {
      loadSubjects();
      setError('');
      setSelectedSubjectId('');
      setSelectedChapterId('none');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSubjectId) loadChapters(selectedSubjectId);
    else setChapters([]);
    setSelectedChapterId('none');
  }, [selectedSubjectId]);

  const loadSubjects = async () => {
    const { data } = await (supabase as any)
      .from('curriculum_subjects')
      .select('id, subject_name, grade_level')
      .eq('is_published', true)
      .order('grade_level')
      .order('subject_name');
    setSubjects(data || []);
  };

  const loadChapters = async (subjectId: string) => {
    const { data } = await (supabase as any)
      .from('curriculum_chapters')
      .select('id, chapter_number, chapter_title')
      .eq('subject_id', subjectId)
      .eq('is_published', true)
      .order('chapter_number');
    setChapters(data || []);
  };

  const updateType = (type: keyof QuestionTypeConfig, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setQuestionTypes(prev => ({ ...prev, [type]: num }));
  };

  const handleGenerate = async () => {
    if (!selectedSubjectId) { setError('Please select a subject.'); return; }
    if (selectedChapterId === 'none') { setError('Please select a chapter — the AI needs chapter content to generate accurate questions.'); return; }
    if (totalQuestions < 5) { setError('Total questions must be at least 5.'); return; }
    setError('');
    setGenerating(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          chapter_id: selectedChapterId,
          question_count: totalQuestions,
          difficulty_level: difficulty,
          question_type_distribution: {
            multiple_choice: questionTypes.multiple_choice,
            true_false: questionTypes.true_false,
            short_answer: questionTypes.short_answer,
          },
        },
      });

      if (fnError) throw new Error(fnError.message || 'Generation failed');
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      const questions: any[] = data.generated_questions || [];
      const quizId: string = data.quiz_id;

      toast.success(`Generated ${questions.length} questions successfully`);

      if (onGenerated) {
        // Called from create page — pass questions back to the wizard
        onGenerated(questions, {
          subject_name: selectedSubject?.subject_name,
          grade_level: selectedSubject?.grade_level,
          chapter_title: selectedChapter?.chapter_title,
          chapter_id: selectedChapterId,
        });
      } else {
        // Called from list page — navigate directly to edit the created quiz
        navigate(`/admin/quizzes/edit/${quizId}`);
      }

      onClose();
    } catch (err: any) {
      // Surface the exact error from the edge function
      const msg = err.message || 'Generation failed. Please try again.';
      if (msg.includes('OPENROUTER_API_KEY')) {
        setError('OpenRouter API key is not configured in Supabase secrets. Go to Supabase Dashboard → Settings → Edge Functions → Secrets and add OPENROUTER_API_KEY.');
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Create Quiz with AI
          </DialogTitle>
          <DialogDescription>
            Select a subject and chapter, configure question types, and let AI generate the questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.subject_name} — Grade {s.grade_level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter */}
          <div className="space-y-2">
            <Label>Chapter *</Label>
            <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Select a chapter —</SelectItem>
                {chapters.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    Ch {c.chapter_number}: {c.chapter_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A chapter is required so the AI can use the actual curriculum content.</p>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question type breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Question Breakdown</Label>
              <Badge variant={totalQuestions >= 5 ? 'default' : 'destructive'}>
                {totalQuestions} total
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Multiple Choice</Label>
                <Input
                  type="number"
                  min="0"
                  value={questionTypes.multiple_choice}
                  onChange={e => updateType('multiple_choice', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">True / False</Label>
                <Input
                  type="number"
                  min="0"
                  value={questionTypes.true_false}
                  onChange={e => updateType('true_false', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Short Answer</Label>
                <Input
                  type="number"
                  min="0"
                  value={questionTypes.short_answer}
                  onChange={e => updateType('short_answer', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Set any type to 0 to exclude it. Minimum 5 total.</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || totalQuestions < 5 || !selectedSubjectId || selectedChapterId === 'none'}>
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate {totalQuestions} Questions</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
