import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Edit, 
  Trash2, 
  BookOpen, 
  Clock, 
  Download,
  Copy,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Subject } from '@/hooks/useAdminCurriculum';
import * as LucideIcons from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  onSelect: (subject: Subject) => void;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  onExport: (subjectId: string) => void;
  onDuplicate: (subject: Subject) => void;
  onTogglePublish?: (subject: Subject, value: boolean) => void;
  onToggleCapsAligned?: (subject: Subject, value: boolean) => void;
}

export const SubjectCard = ({
  subject,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  onDuplicate,
  onTogglePublish,
  onToggleCapsAligned,
}: SubjectCardProps) => {
  const IconComponent = subject.icon_name 
    ? (LucideIcons as any)[subject.icon_name] || LucideIcons.BookOpen
    : LucideIcons.BookOpen;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onSelect(subject)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${subject.color_scheme || '#1B4332'}20` }}
          >
            <IconComponent 
              className="w-6 h-6" 
              style={{ color: subject.color_scheme || '#1B4332' }} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={subject.is_published ? 'default' : 'secondary'}>
              {subject.is_published ? 'Published' : 'Draft'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(subject); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Subject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExport(subject.id); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(subject); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(subject); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <h3 className="font-semibold text-lg text-foreground mb-1">
          {subject.subject_name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {subject.description || 'No description'}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {subject.total_chapters || 0} chapters
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {subject.estimated_hours || 0}h
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">Grade {subject.grade_level}</Badge>
          </div>
          <div
            className="flex items-center justify-between gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Switch
                id={`publish-${subject.id}`}
                checked={!!subject.is_published}
                onCheckedChange={(v) => onTogglePublish?.(subject, v)}
                disabled={!onTogglePublish}
              />
              <Label htmlFor={`publish-${subject.id}`} className="text-xs cursor-pointer">
                Publish
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`caps-${subject.id}`}
                checked={!!subject.caps_aligned}
                onCheckedChange={(v) => onToggleCapsAligned?.(subject, v)}
                disabled={!onToggleCapsAligned}
              />
              <Label htmlFor={`caps-${subject.id}`} className="text-xs cursor-pointer">
                CAPS Aligned
              </Label>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
