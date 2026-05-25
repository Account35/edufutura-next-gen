import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Subject } from '@/hooks/useAdminCurriculum';
import { Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const ICON_OPTIONS = [
  'BookOpen', 'Calculator', 'FlaskConical', 'Globe', 'Palette', 
  'Music', 'Dumbbell', 'Code', 'Languages', 'History',
  'Atom', 'Brain', 'Lightbulb', 'PenTool', 'Briefcase',
  'TrendingUp', 'Building', 'Scale', 'Heart', 'Leaf'
];

const COLOR_OPTIONS = [
  { name: 'Forest Green', value: '#1B4332' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#9333EA' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Brown', value: '#92400E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gold', value: '#D4AF37' },
  { name: 'Navy', value: '#1E3A8A' },
];

interface SubjectEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: (data: Partial<Subject>) => Promise<any>;
  isSaving: boolean;
}

export const SubjectEditorModal = ({
  open,
  onOpenChange,
  subject,
  onSave,
  isSaving,
}: SubjectEditorModalProps) => {
  const [formData, setFormData] = useState({
    subject_name: '',
    description: '',
    icon_name: 'BookOpen',
    color_scheme: '#1B4332',
    grade_level: 10,
    estimated_hours: 0,
    is_published: false,
    caps_aligned: true,
    learning_objectives: [] as string[],
  });
  const [objectiveInput, setObjectiveInput] = useState('');

  useEffect(() => {
    if (subject) {
      setFormData({
        subject_name: subject.subject_name || '',
        description: subject.description || '',
        icon_name: subject.icon_name || 'BookOpen',
        color_scheme: subject.color_scheme || '#1B4332',
        grade_level: subject.grade_level || 10,
        estimated_hours: subject.estimated_hours || 0,
        is_published: subject.is_published || false,
        caps_aligned: subject.caps_aligned ?? true,
        learning_objectives: subject.learning_objectives || [],
      });
    } else {
      setFormData({
        subject_name: '',
        description: '',
        icon_name: 'BookOpen',
        color_scheme: '#1B4332',
        grade_level: 10,
        estimated_hours: 0,
        is_published: false,
        caps_aligned: true,
        learning_objectives: [],
      });
    }
  }, [subject, open]);

  const handleSave = async () => {
    const data = subject 
      ? { id: subject.id, ...formData }
      : formData;
    
    await onSave(data);
    onOpenChange(false);
  };

  const addObjective = () => {
    if (objectiveInput.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_objectives: [...prev.learning_objectives, objectiveInput.trim()],
      }));
      setObjectiveInput('');
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter((_, i) => i !== index),
    }));
  };

  const SelectedIcon = (LucideIcons as any)[formData.icon_name] || LucideIcons.BookOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {subject ? 'Edit Subject' : 'Create New Subject'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label htmlFor="subject_name">Subject Name *</Label>
            <Input
              id="subject_name"
              value={formData.subject_name}
              onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
              placeholder="e.g., Mathematics"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the subject..."
              rows={3}
            />
          </div>

          {/* Icon and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="w-4 h-4" />
                      {formData.icon_name}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => {
                    const Icon = (LucideIcons as any)[icon];
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Theme</Label>
              <Select
                value={formData.color_scheme}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color_scheme: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: formData.color_scheme }}
                      />
                      {COLOR_OPTIONS.find(c => c.value === formData.color_scheme)?.name || 'Custom'}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grade Level and Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade_level">Grade Level *</Label>
              <Select
                value={String(formData.grade_level)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade_level: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12].map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                min={0}
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>CAPS Aligned</Label>
              <p className="text-sm text-muted-foreground">
                This subject follows CAPS curriculum
              </p>
            </div>
            <Switch
              checked={formData.caps_aligned}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, caps_aligned: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Published</Label>
              <p className="text-sm text-muted-foreground">
                Make visible to students
              </p>
            </div>
            <Switch
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
            />
          </div>

          {/* Learning Objectives */}
          <div className="space-y-2">
            <Label>Learning Objectives</Label>
            <div className="flex gap-2">
              <Input
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="Add a learning objective..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
              />
              <Button type="button" onClick={addObjective} variant="secondary">
                Add
              </Button>
            </div>
            {formData.learning_objectives.length > 0 && (
              <ul className="space-y-2 mt-2">
                {formData.learning_objectives.map((objective, index) => (
                  <li key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="flex-1 text-sm">{objective}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObjective(index)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !formData.subject_name}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {subject ? 'Update Subject' : 'Create Subject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
