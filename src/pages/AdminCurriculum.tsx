import { useState, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminCurriculum, Subject, Chapter } from '@/hooks/useAdminCurriculum';
import { SubjectCard } from '@/components/admin/curriculum/SubjectCard';
import { SubjectEditorModal } from '@/components/admin/curriculum/SubjectEditorModal';
import { ChapterList } from '@/components/admin/curriculum/ChapterList';
import { ChapterEditorModal } from '@/components/admin/curriculum/ChapterEditorModal';
import { ContentImportWizard } from '@/components/admin/curriculum/ContentImportWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { 
  Plus, 
  Search, 
  Upload, 
  BookOpen,
  Filter,
  Loader2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function AdminCurriculum() {
  const {
    subjects,
    chapters,
    selectedSubject,
    selectedChapter,
    subjectsLoading,
    chaptersLoading,
    subjectsError,
    chaptersError,
    refetchSubjects,
    refetchChapters,
    setSelectedSubject,
    setSelectedChapter,
    createSubject,
    updateSubject,
    deleteSubject,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    exportSubject,
    importSubject,
    duplicateSubject,
    isCreatingSubject,
    isUpdatingSubject,
    isCreatingChapter,
    isUpdatingChapter,
    togglePublish,
    toggleCapsAligned,
  } = useAdminCurriculum();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [subjectEditorOpen, setSubjectEditorOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [chapterEditorOpen, setChapterEditorOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deleteSubjectDialog, setDeleteSubjectDialog] = useState<Subject | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<Subject | null>(null);
  const [duplicateGrade, setDuplicateGrade] = useState<number>(10);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const normalizedQuery = searchQuery.toLowerCase();
    const subjectName = (subject.subject_name || '').toLowerCase();
    const subjectDescription = (subject.description || '').toLowerCase();
    const matchesSearch = subjectName.includes(normalizedQuery) || subjectDescription.includes(normalizedQuery);
    const matchesGrade = gradeFilter === 'all' || subject.grade_level === Number(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  // Handlers
  const handleCreateSubject = () => {
    setEditingSubject(null);
    setSubjectEditorOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectEditorOpen(true);
  };

  const handleSaveSubject = async (data: Partial<Subject>) => {
    if (editingSubject) {
      await updateSubject({ id: editingSubject.id, ...data });
    } else {
      await createSubject(data);
    }
  };

  const handleDeleteSubject = async () => {
    if (deleteSubjectDialog) {
      await deleteSubject(deleteSubjectDialog.id);
      setDeleteSubjectDialog(null);
    }
  };

  const handleDuplicateSubject = async () => {
    if (duplicateDialog) {
      await duplicateSubject(duplicateDialog.id, duplicateGrade);
      setDuplicateDialog(null);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importSubject(file);
      e.target.value = '';
    }
  };

  const handleCreateChapter = () => {
    setEditingChapter(null);
    setChapterEditorOpen(true);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterEditorOpen(true);
  };

  const handleSaveChapter = async (data: Partial<Chapter>) => {
    if (editingChapter) {
      await updateChapter({ id: editingChapter.id, ...data });
    } else {
      await createChapter(data);
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    await deleteChapter(chapter.id);
  };

  // Render chapter view when subject is selected
  if (selectedSubject) {
    return (
      <AdminLayout title="Curriculum Management" subtitle="Edit subject chapters">
        {chaptersError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load chapters</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                {chaptersError.message || 'There was a problem loading this subject.'}
              </span>
              <Button variant="outline" size="sm" onClick={() => void refetchChapters()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <ChapterList
          subject={selectedSubject}
          chapters={chapters}
          isLoading={chaptersLoading}
          onBack={() => setSelectedSubject(null)}
          onCreateChapter={handleCreateChapter}
          onEditChapter={handleEditChapter}
          onDeleteChapter={handleDeleteChapter}
          onReorder={reorderChapters}
        />

        <ChapterEditorModal
          open={chapterEditorOpen}
          onOpenChange={setChapterEditorOpen}
          chapter={editingChapter}
          subjectId={selectedSubject.id}
          existingChapters={chapters}
          nextChapterNumber={chapters.length + 1}
          onSave={handleSaveChapter}
          isSaving={isCreatingChapter || isUpdatingChapter}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Curriculum Management" subtitle="Manage subjects and chapters">
      {subjectsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load curriculum subjects</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {subjectsError.message || 'The curriculum data could not be loaded.'}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetchSubjects()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                <SelectItem key={grade} value={String(grade)}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>

          <Button variant="secondary" onClick={() => setImportWizardOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Import
          </Button>
          
          <Button onClick={handleCreateSubject}>
            <Plus className="w-4 h-4 mr-2" />
            New Subject
          </Button>
        </div>
      </div>

      {/* Subject Grid */}
      {subjectsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || gradeFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first subject to get started'}
          </p>
          {!searchQuery && gradeFilter === 'all' && (
            <Button onClick={handleCreateSubject}>
              <Plus className="w-4 h-4 mr-2" />
              Create Subject
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map(subject => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onSelect={setSelectedSubject}
              onEdit={handleEditSubject}
              onDelete={setDeleteSubjectDialog}
              onExport={exportSubject}
              onDuplicate={setDuplicateDialog}
              onTogglePublish={(s, v) => void togglePublish(s.id, v)}
              onToggleCapsAligned={(s, v) => void toggleCapsAligned(s.id, v)}
            />
          ))}
        </div>
      )}

      {/* Subject Editor Modal */}
      <SubjectEditorModal
        open={subjectEditorOpen}
        onOpenChange={setSubjectEditorOpen}
        subject={editingSubject}
        onSave={handleSaveSubject}
        isSaving={isCreatingSubject || isUpdatingSubject}
      />

      {/* Delete Subject Dialog */}
      <AlertDialog open={!!deleteSubjectDialog} onOpenChange={() => setDeleteSubjectDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSubjectDialog?.subject_name}"? 
              This will also delete all chapters within this subject. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSubject}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Subject Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Subject</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Create a copy of "{duplicateDialog?.subject_name}" with all its chapters for a different grade level.
            </p>
            <div className="space-y-2">
              <Label>Target Grade Level</Label>
              <Select
                value={String(duplicateGrade)}
                onValueChange={(value) => setDuplicateGrade(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                    <SelectItem key={grade} value={String(grade)}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateSubject}>
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Content Import Wizard */}
      <ContentImportWizard
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
        subjects={subjects}
        defaultSubjectId={selectedSubject?.id}
        onCreateSubject={createSubject}
        onComplete={() => {
          void refetchSubjects();
        }}
      />
    </AdminLayout>
  );
}
