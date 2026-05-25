import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExtractedChapter } from '@/hooks/useCurriculumImport';

interface Props {
  chapters: ExtractedChapter[];
  selected: boolean[];
  onToggle: (idx: number) => void;
  onChange: (idx: number, patch: Partial<ExtractedChapter>) => void;
}

export const ExtractedChapterReview = ({ chapters, selected, onToggle, onChange }: Props) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-3">
      {chapters.map((c, idx) => {
        const isOpen = expanded[idx] ?? idx === 0;
        return (
          <Card key={idx} className={selected[idx] ? '' : 'opacity-60'}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected[idx]}
                  onCheckedChange={() => onToggle(idx)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">Ch. {c.chapter_number}</Badge>
                    <span className="truncate">{c.chapter_title || '(untitled)'}</span>
                  </CardTitle>
                  {c.chapter_description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {c.chapter_description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((p) => ({ ...p, [idx]: !isOpen }))}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>

            {isOpen && selected[idx] && (
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={c.chapter_title}
                      onChange={(e) => onChange(idx, { chapter_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Number</Label>
                    <Input
                      type="number"
                      min={1}
                      value={c.chapter_number}
                      onChange={(e) => onChange(idx, { chapter_number: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={c.chapter_description}
                    onChange={(e) => onChange(idx, { chapter_description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Difficulty</Label>
                    <Select
                      value={c.difficulty_level || 'Intermediate'}
                      onValueChange={(v) => onChange(idx, { difficulty_level: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={c.estimated_duration_minutes || 30}
                      onChange={(e) => onChange(idx, { estimated_duration_minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CAPS Code</Label>
                    <Input
                      value={c.caps_code || ''}
                      onChange={(e) => onChange(idx, { caps_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Key Concepts (comma-separated)</Label>
                  <Input
                    value={(c.key_concepts || []).join(', ')}
                    onChange={(e) =>
                      onChange(idx, {
                        key_concepts: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Content (Markdown)</Label>
                  <Textarea
                    rows={8}
                    value={c.content_markdown}
                    onChange={(e) => onChange(idx, { content_markdown: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
