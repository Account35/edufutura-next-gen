import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, ArrowRight, Trash2, Edit, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { QuestionEditorModal } from './QuestionEditorModal';

interface QuizQuestionsBuilderProps {
  questions: any[];
  onChange: (questions: any[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const QuizQuestionsBuilder = ({ questions, onChange, onNext, onBack }: QuizQuestionsBuilderProps) => {
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setEditingIndex(-1);
    setIsModalOpen(true);
  };

  const handleEditQuestion = (index: number) => {
    setEditingQuestion(questions[index]);
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = (question: any) => {
    if (editingIndex >= 0) {
      // Update existing
      const updated = [...questions];
      updated[editingIndex] = { ...question, question_number: editingIndex + 1 };
      onChange(updated);
    } else {
      // Add new
      onChange([...questions, { ...question, question_number: questions.length + 1 }]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Delete this question?')) {
      const updated = questions.filter((_, i) => i !== index);
      // Renumber questions
      const renumbered = updated.map((q, i) => ({ ...q, question_number: i + 1 }));
      onChange(renumbered);
    }
  };

  const getQuestionTypeCounts = () => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      counts[q.question_type] = (counts[q.question_type] || 0) + 1;
    });
    return counts;
  };

  const counts = getQuestionTypeCounts();

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
              <p className="text-2xl font-bold text-foreground">{questions.length}</p>
            </div>
            {Object.entries(counts).map(([type, count]) => (
              <div key={type}>
                <p className="text-sm text-muted-foreground">{type.replace('_', ' ')}</p>
                <p className="text-lg font-semibold text-foreground">{count}</p>
              </div>
            ))}
          </div>
          <Button onClick={handleAddQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </Card>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No questions added yet</p>
          <Button onClick={handleAddQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Question
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-4">
                <div className="cursor-move text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Question {index + 1}</span>
                      <Badge variant="outline">{question.question_type.replace('_', ' ')}</Badge>
                      {question.difficulty_level && (
                        <Badge variant="secondary">{question.difficulty_level}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{question.points} pts</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(index)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground">{question.question_text}</p>
                  
                  {question.options && (
                    <div className="mt-2 space-y-1">
                      {question.options.map((opt: string, i: number) => (
                        <div key={i} className="text-sm">
                          <span className={opt === question.correct_answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Metadata
        </Button>
        
        {questions.length >= 5 && (
          <Button onClick={onNext}>
            Next: Review & Publish
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {questions.length < 5 && questions.length > 0 && (
        <p className="text-sm text-orange-600 text-center">
          Add at least 5 questions to proceed (currently {questions.length}/5)
        </p>
      )}

      <QuestionEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuestion}
        question={editingQuestion}
      />
    </div>
  );
};
