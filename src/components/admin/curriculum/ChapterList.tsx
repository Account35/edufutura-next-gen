import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  GripVertical,
  ArrowLeft,
  Clock,
  FileText
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Chapter, Subject } from '@/hooks/useAdminCurriculum';
import { formatDistanceToNow } from 'date-fns';

interface ChapterListProps {
  subject: Subject;
  chapters: Chapter[];
  isLoading: boolean;
  onBack: () => void;
  onCreateChapter: () => void;
  onEditChapter: (chapter: Chapter) => void;
  onDeleteChapter: (chapter: Chapter) => void;
  onReorder: (chapters: Chapter[]) => void;
}

export const ChapterList = ({
  subject,
  chapters,
  isLoading,
  onBack,
  onCreateChapter,
  onEditChapter,
  onDeleteChapter,
  onReorder,
}: ChapterListProps) => {
  const [deleteChapter, setDeleteChapter] = useState<Chapter | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newChapters = [...chapters];
    const [removed] = newChapters.splice(draggedIndex, 1);
    newChapters.splice(index, 0, removed);
    
    setDraggedIndex(index);
    onReorder(newChapters);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getStatusBadge = (chapter: Chapter) => {
    if (chapter.is_published) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Published</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    if (!difficulty) return null;
    const colors: Record<string, string> = {
      easy: 'bg-green-500/10 text-green-600 border-green-200',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      hard: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return (
      <Badge className={colors[difficulty.toLowerCase()] || ''}>
        {difficulty}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{subject.subject_name}</h2>
            <p className="text-muted-foreground">
              {chapters.length} chapters • Grade {subject.grade_level}
            </p>
          </div>
        </div>
        <Button onClick={onCreateChapter}>
          <Plus className="w-4 h-4 mr-2" />
          Add Chapter
        </Button>
      </div>

      {/* Chapters Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading chapters...
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No chapters yet</p>
              <Button onClick={onCreateChapter}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Chapter
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter, index) => (
                  <TableRow
                    key={chapter.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={draggedIndex === index ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {chapter.chapter_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{chapter.chapter_title}</p>
                        {chapter.chapter_description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {chapter.chapter_description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(chapter)}</TableCell>
                    <TableCell>{getDifficultyBadge(chapter.difficulty_level)}</TableCell>
                    <TableCell>
                      {chapter.estimated_duration_minutes ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {chapter.estimated_duration_minutes} min
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {chapter.updated_at 
                        ? formatDistanceToNow(new Date(chapter.updated_at), { addSuffix: true })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditChapter(chapter)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteChapter(chapter)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteChapter} onOpenChange={() => setDeleteChapter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteChapter?.chapter_title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteChapter) {
                  onDeleteChapter(deleteChapter);
                  setDeleteChapter(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
