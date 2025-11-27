import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, BookOpen, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Quiz {
  id: string;
  quiz_title: string;
  subject_name: string;
  total_questions: number;
  time_limit_minutes: number | null;
  difficulty_level: string | null;
}

interface GroupMember {
  user_id: string;
  users: {
    full_name: string;
    profile_picture_url: string | null;
  };
}

interface GroupQuizSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  subjectNames: string[];
  members: GroupMember[];
}

export default function GroupQuizSelection({
  open,
  onOpenChange,
  groupId,
  subjectNames,
  members
}: GroupQuizSelectionProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map(m => m.user_id)
  );
  const [customTimeLimit, setCustomTimeLimit] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadQuizzes();
    }
  }, [open, subjectNames]);

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .in('subject_name', subjectNames)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading quizzes',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setQuizzes(data || []);
  };

  const handleStartQuiz = async () => {
    if (!selectedQuiz) {
      toast({
        title: 'Select a quiz',
        description: 'Please choose a quiz to start',
        variant: 'destructive'
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: 'Select participants',
        description: 'At least one member must participate',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const { data: session, error } = await supabase
      .from('group_quiz_attempts')
      .insert({
        group_id: groupId,
        quiz_id: selectedQuiz,
        initiated_by: (await supabase.auth.getUser()).data.user?.id,
        participant_ids: selectedMembers,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: 'Error starting quiz',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Quiz started!',
      description: 'Participants have been notified'
    });

    onOpenChange(false);
    navigate(`/community/groups/${groupId}/quiz/${session.id}`);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start Group Quiz</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quiz Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Quiz</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  onClick={() => setSelectedQuiz(quiz.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedQuiz === quiz.id
                      ? 'border-secondary bg-secondary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-semibold text-primary">{quiz.quiz_title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {quiz.subject_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {quiz.total_questions} questions
                    </span>
                    {quiz.time_limit_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {quiz.time_limit_minutes} min
                      </span>
                    )}
                    {quiz.difficulty_level && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100">
                        {quiz.difficulty_level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Participants ({selectedMembers.length} selected)
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedMembers.includes(member.user_id)}
                    onCheckedChange={() => toggleMember(member.user_id)}
                  />
                  <img
                    src={member.users.profile_picture_url || '/placeholder.svg'}
                    alt={member.users.full_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm">{member.users.full_name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Time Limit */}
          {selectedQuizData?.time_limit_minutes && (
            <div>
              <Label htmlFor="timeLimit" className="text-base font-semibold mb-2 block">
                Custom Time Limit (optional)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                placeholder={`Default: ${selectedQuizData.time_limit_minutes} minutes`}
                value={customTimeLimit}
                onChange={e => setCustomTimeLimit(e.target.value)}
                min="5"
                max="180"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartQuiz}
              disabled={!selectedQuiz || loading}
              className="bg-secondary hover:bg-secondary/90"
            >
              {loading ? 'Starting...' : 'Start Quiz'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
