import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Chapter } from '@/hooks/useAdminCurriculum';
import { 
  Loader2, 
  Plus, 
  X, 
  GripVertical, 
  Eye,
  Save,
  FileText,
  Target,
  BookOpen,
  Settings,
  Upload
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChapterEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  subjectId: string;
  existingChapters: Chapter[];
  nextChapterNumber: number;
  onSave: (data: Partial<Chapter>) => Promise<unknown>;
  isSaving: boolean;
}

export const ChapterEditorModal = ({
  open,
  onOpenChange,
  chapter,
  subjectId,
  existingChapters,
  nextChapterNumber,
  onSave,
  isSaving,
}: ChapterEditorModalProps) => {
  const defaultDifficulty = 'Intermediate';
  const [activeTab, setActiveTab] = useState('metadata');
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    chapter_title: '',
    chapter_number: nextChapterNumber,
    chapter_description: '',
    content_markdown: '',
    difficulty_level: defaultDifficulty,
    estimated_duration_minutes: 30,
    is_published: false,
    caps_code: '',
    caps_description: '',
    key_concepts: [] as string[],
    learning_outcomes: [] as string[],
    glossary_terms: {} as Record<string, string>,
    content_url: '' as string,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [newConcept, setNewConcept] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newTermKey, setNewTermKey] = useState('');
  const [newTermValue, setNewTermValue] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: formData.content_markdown,
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, content_markdown: editor.getHTML() }));
    },
  });

  useEffect(() => {
    if (chapter) {
      setFormData({
        chapter_title: chapter.chapter_title || '',
        chapter_number: chapter.chapter_number || nextChapterNumber,
        chapter_description: chapter.chapter_description || '',
        content_markdown: chapter.content_markdown || '',
        difficulty_level: chapter.difficulty_level || defaultDifficulty,
        estimated_duration_minutes: chapter.estimated_duration_minutes || 30,
        is_published: chapter.is_published || false,
        caps_code: chapter.caps_code || '',
        caps_description: chapter.caps_description || '',
        key_concepts: chapter.key_concepts || [],
        learning_outcomes: chapter.learning_outcomes || [],
        glossary_terms: (chapter.glossary_terms as Record<string, string>) || {},
        content_url: chapter.content_url || '',
      });
      editor?.commands.setContent(chapter.content_markdown || '');
    } else {
      setFormData({
        chapter_title: '',
        chapter_number: nextChapterNumber,
        chapter_description: '',
        content_markdown: '',
        difficulty_level: defaultDifficulty,
        estimated_duration_minutes: 30,
        is_published: false,
        caps_code: '',
        caps_description: '',
        key_concepts: [],
        learning_outcomes: [],
        glossary_terms: {},
        content_url: '',
      });
      editor?.commands.setContent('');
    }
    setPdfFile(null);
  }, [chapter, open, nextChapterNumber, editor, defaultDifficulty]);

  const handleUploadPdf = async () => {
    if (!pdfFile) return;
    setUploadingPdf(true);
    try {
      const ext = pdfFile.name.split('.').pop() || 'pdf';
      const path = `${subjectId}/${formData.chapter_number}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('curriculum-pdfs')
        .upload(path, pdfFile, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('curriculum-pdfs').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, content_url: urlData.publicUrl }));
      setPdfFile(null);
      toast.success('PDF uploaded');
    } catch (err: any) {
      toast.error(`PDF upload failed: ${err.message || 'unknown error'}`);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSave = async () => {
    const data = chapter 
      ? { id: chapter.id, subject_id: subjectId, ...formData }
      : { subject_id: subjectId, ...formData };
    
    await onSave(data);
    onOpenChange(false);
  };

  const addConcept = () => {
    if (newConcept.trim()) {
      setFormData(prev => ({
        ...prev,
        key_concepts: [...prev.key_concepts, newConcept.trim()],
      }));
      setNewConcept('');
    }
  };

  const removeConcept = (index: number) => {
    setFormData(prev => ({
      ...prev,
      key_concepts: prev.key_concepts.filter((_, i) => i !== index),
    }));
  };

  const addOutcome = () => {
    if (newOutcome.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_outcomes: [...prev.learning_outcomes, newOutcome.trim()],
      }));
      setNewOutcome('');
    }
  };

  const removeOutcome = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.filter((_, i) => i !== index),
    }));
  };

  const addGlossaryTerm = () => {
    if (newTermKey.trim() && newTermValue.trim()) {
      setFormData(prev => ({
        ...prev,
        glossary_terms: {
          ...prev.glossary_terms,
          [newTermKey.trim()]: newTermValue.trim(),
        },
      }));
      setNewTermKey('');
      setNewTermValue('');
    }
  };

  const removeGlossaryTerm = (key: string) => {
    setFormData(prev => {
      const { [key]: removed, ...rest } = prev.glossary_terms;
      return { ...prev, glossary_terms: rest };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {chapter ? 'Edit Chapter' : 'Create New Chapter'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !formData.chapter_title}
                size="sm"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="metadata" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Metadata
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Learning Outcomes
            </TabsTrigger>
            <TabsTrigger value="concepts" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Key Concepts
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter_title">Chapter Title *</Label>
                  <Input
                    id="chapter_title"
                    value={formData.chapter_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, chapter_title: e.target.value }))}
                    placeholder="e.g., Introduction to Algebra"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapter_number">Chapter Number</Label>
                  <Input
                    id="chapter_number"
                    type="number"
                    min={1}
                    value={formData.chapter_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, chapter_number: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter_description">Description</Label>
                <Textarea
                  id="chapter_description"
                  value={formData.chapter_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, chapter_description: e.target.value }))}
                  placeholder="Brief overview of what this chapter covers..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Published</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {formData.is_published ? 'Visible to students' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CAPS Alignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="caps_code">CAPS Code</Label>
                    <Input
                      id="caps_code"
                      value={formData.caps_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, caps_code: e.target.value }))}
                      placeholder="e.g., MATH-G10-ALG-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caps_description">CAPS Description</Label>
                    <Textarea
                      id="caps_description"
                      value={formData.caps_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, caps_description: e.target.value }))}
                      placeholder="Official CAPS curriculum description..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>PDF File (uploads to curriculum library)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleUploadPdf}
                        disabled={!pdfFile || uploadingPdf}
                      >
                        {uploadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload
                      </Button>
                    </div>
                    {formData.content_url && /\.pdf($|\?)/i.test(formData.content_url) && (
                      <p className="text-xs text-muted-foreground break-all">
                        Current PDF: <a href={formData.content_url} target="_blank" rel="noreferrer" className="underline">{formData.content_url}</a>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="video_url">Video URL (YouTube / Vimeo)</Label>
                    <Input
                      id="video_url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={/\.pdf($|\?)/i.test(formData.content_url) ? '' : formData.content_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content_url: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      A chapter can have either an attached PDF or a video URL — not both.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-0">
              <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className="space-y-2">
                  <Label>Chapter Content</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-2 border-b flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={editor?.isActive('bold') ? 'bg-accent' : ''}
                      >
                        B
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={editor?.isActive('italic') ? 'bg-accent' : ''}
                      >
                        I
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={editor?.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
                      >
                        H2
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={editor?.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
                      >
                        H3
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={editor?.isActive('bulletList') ? 'bg-accent' : ''}
                      >
                        • List
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={editor?.isActive('orderedList') ? 'bg-accent' : ''}
                      >
                        1. List
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                        className={editor?.isActive('codeBlock') ? 'bg-accent' : ''}
                      >
                        Code
                      </Button>
                    </div>
                    <EditorContent 
                      editor={editor} 
                      className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
                    />
                  </div>
                </div>

                {showPreview && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="border rounded-lg p-4 min-h-[400px] bg-background overflow-y-auto prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: formData.content_markdown }} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Learning Outcomes Tab */}
            <TabsContent value="outcomes" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Define what students should be able to do after completing this chapter.
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="e.g., Students will be able to solve quadratic equations..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                />
                <Button onClick={addOutcome} variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {formData.learning_outcomes.length > 0 ? (
                <ul className="space-y-2">
                  {formData.learning_outcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <GripVertical className="w-4 h-4 mt-1 text-muted-foreground cursor-grab" />
                      <span className="flex-1">{outcome}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOutcome(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No learning outcomes defined yet.
                </p>
              )}
            </TabsContent>

            {/* Key Concepts Tab */}
            <TabsContent value="concepts" className="mt-0 space-y-6">
              {/* Key Concepts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Concepts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newConcept}
                      onChange={(e) => setNewConcept(e.target.value)}
                      placeholder="e.g., Quadratic formula"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addConcept())}
                    />
                    <Button onClick={addConcept} variant="secondary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {formData.key_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.key_concepts.map((concept, index) => (
                        <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                          {concept}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConcept(index)}
                            className="h-4 w-4 p-0 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Glossary Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Glossary Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-[1fr,2fr,auto] gap-2">
                    <Input
                      value={newTermKey}
                      onChange={(e) => setNewTermKey(e.target.value)}
                      placeholder="Term"
                    />
                    <Input
                      value={newTermValue}
                      onChange={(e) => setNewTermValue(e.target.value)}
                      placeholder="Definition"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGlossaryTerm())}
                    />
                    <Button onClick={addGlossaryTerm} variant="secondary">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {Object.keys(formData.glossary_terms).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(formData.glossary_terms).map(([term, definition]) => (
                        <div key={term} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{term}</p>
                            <p className="text-sm text-muted-foreground">{definition}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGlossaryTerm(term)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
