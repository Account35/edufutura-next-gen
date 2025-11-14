import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: any) => void;
  question?: any;
}

export const QuestionEditorModal = ({ isOpen, onClose, onSave, question }: QuestionEditorModalProps) => {
  const [type, setType] = useState(question?.question_type || 'multiple_choice');
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    reference_section: '',
    difficulty_level: 'Intermediate',
    points: 1,
    requires_working: false,
  });

  useEffect(() => {
    if (question) {
      setFormData({...question});
      setType(question.question_type);
    } else {
      setFormData({
        question_text: '',
        question_type: type,
        options: type === 'multiple_choice' ? ['', '', '', ''] : [],
        correct_answer: '',
        explanation: '',
        reference_section: '',
        difficulty_level: 'Intermediate',
        points: 1,
        requires_working: false,
      });
    }
  }, [question, type]);

  const handleSave = () => {
    if (!formData.question_text.trim()) return;
    if (!formData.correct_answer.trim()) return;
    
    onSave({ ...formData, question_type: type });
    onClose();
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!question && (
            <div>
              <Label>Question Type</Label>
              <RadioGroup value={type} onValueChange={setType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple_choice" id="mc" />
                  <Label htmlFor="mc">Multiple Choice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true_false" id="tf" />
                  <Label htmlFor="tf">True/False</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short_answer" id="sa" />
                  <Label htmlFor="sa">Short Answer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="math_problem" id="math" />
                  <Label htmlFor="math">Math Problem</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div>
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              rows={3}
            />
          </div>

          {type === 'multiple_choice' && (
            <div>
              <Label>Answer Options *</Label>
              <div className="space-y-2 mt-2">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-8">{String.fromCharCode(65 + i)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Label>Correct Answer *</Label>
                <RadioGroup value={formData.correct_answer} onValueChange={(v) => setFormData({ ...formData, correct_answer: v })}>
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`correct-${i}`} />
                      <Label htmlFor={`correct-${i}`}>{String.fromCharCode(65 + i)}. {opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {type === 'true_false' && (
            <div>
              <Label>Correct Answer *</Label>
              <RadioGroup value={formData.correct_answer} onValueChange={(v) => setFormData({ ...formData, correct_answer: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false">False</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {(type === 'short_answer' || type === 'math_problem') && (
            <div>
              <Label htmlFor="correct_answer">Expected Answer *</Label>
              <Textarea
                id="correct_answer"
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                rows={2}
                placeholder="Enter the correct answer or solution"
              />
            </div>
          )}

          {type === 'math_problem' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="requires_working">Requires Working</Label>
              <Switch
                id="requires_working"
                checked={formData.requires_working}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_working: checked })}
              />
            </div>
          )}

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={2}
              placeholder="Explain why the answer is correct..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <RadioGroup value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v as any })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Beginner" id="diff-beginner" />
                  <Label htmlFor="diff-beginner">Beginner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Intermediate" id="diff-intermediate" />
                  <Label htmlFor="diff-intermediate">Intermediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Advanced" id="diff-advanced" />
                  <Label htmlFor="diff-advanced">Advanced</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
