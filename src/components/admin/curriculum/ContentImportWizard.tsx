import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Sparkles, CheckCircle2, FileText, PlusCircle } from 'lucide-react';
import { useCurriculumImport, type ExtractionResult, type ExtractedChapter } from '@/hooks/useCurriculumImport';
import { ExtractedChapterReview } from './ExtractedChapterReview';
import type { Subject } from '@/hooks/useAdminCurriculum';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: Subject[];
  defaultSubjectId?: string;
  onCreateSubject: (data: Partial<Subject>) => Promise<Subject>;
  onComplete: () => void;
}

type Step = 'upload' | 'extracting' | 'review';

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getBestSubjectMatches = (subjects: Subject[], result: ExtractionResult) => {
  const detectedSubject = normalizeText(result.detected_subject || '');

  return [...subjects]
    .map((subject) => {
      const subjectName = normalizeText(subject.subject_name || '');
      let score = 0;

      if (subject.grade_level === result.detected_grade) score += 5;
      if (subjectName === detectedSubject) score += 10;
      if (subjectName.includes(detectedSubject) || detectedSubject.includes(subjectName)) score += 6;

      const detectedWords = detectedSubject.split(' ').filter(Boolean);
      if (detectedWords.some((word) => subjectName.includes(word))) score += 3;

      return { subject, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
};

export const ContentImportWizard = ({
  open,
  onOpenChange,
  subjects,
  defaultSubjectId,
  onCreateSubject,
  onComplete,
}: Props) => {
  const { isUploading, isExtracting, isSaving, progress, uploadAndExtract, saveChapters } = useCurriculumImport();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [chapters, setChapters] = useState<ExtractedChapter[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState<string>(defaultSubjectId || '');
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setFile(null);
      setResult(null);
      setChapters([]);
      setSelected([]);
      setTargetSubjectId(defaultSubjectId || '');
      setIsCreatingSubject(false);
    }
  }, [open, defaultSubjectId]);

  const handleExtract = async () => {
    if (!file) return;

    setStep('extracting');
    const res = await uploadAndExtract(file);
    if (!res) {
      setStep('upload');
      return;
    }

    setResult(res);
    setChapters(res.chapters);
    setSelected(res.chapters.map(() => true));

    const matches = getBestSubjectMatches(subjects, res);
    const bestMatch = matches[0]?.subject;

    if (bestMatch) {
      setTargetSubjectId(bestMatch.id);
    } else if (defaultSubjectId) {
      setTargetSubjectId(defaultSubjectId);
    } else {
      setTargetSubjectId('');
    }

    setStep('review');
  };

  const handleCreateDetectedSubject = async () => {
    if (!result) return;

    setIsCreatingSubject(true);
    try {
      const newSubject = await onCreateSubject({
        subject_name: result.detected_subject || 'New Subject',
        grade_level: result.detected_grade >= 4 && result.detected_grade <= 12 ? result.detected_grade : 10,
        description: `Created from AI import for Grade ${result.detected_grade || 10} ${result.detected_subject || 'subject'}.`,
        is_published: false,
        caps_aligned: true,
      });

      setTargetSubjectId(newSubject.id);
      toast.success(`Created subject "${newSubject.subject_name}"`);
    } catch {
      toast.error('Could not create the detected subject.');
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleSave = async () => {
    if (!targetSubjectId) {
      toast.error('Please choose a target subject.');
      return;
    }

    const picked = chapters.filter((_, i) => selected[i]);
    if (picked.length === 0) {
      toast.error('Select at least one chapter.');
      return;
    }

    const ok = await saveChapters(targetSubjectId, picked);
    if (ok) {
      onComplete();
      onOpenChange(false);
    }
  };

  const updateChapter = (idx: number, patch: Partial<ExtractedChapter>) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const toggleChapter = (idx: number) => {
    setSelected((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const matchingSubjects = result ? getBestSubjectMatches(subjects, result) : [];
  const hasSubjects = subjects.length > 0;
  const selectedSubject = subjects.find((subject) => subject.id === targetSubjectId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Assisted Content Import
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <Badge variant={step === 'upload' ? 'default' : 'outline'}>1. Upload</Badge>
          <span>{'->'}</span>
          <Badge variant={step === 'extracting' ? 'default' : 'outline'}>2. AI Extract</Badge>
          <span>{'->'}</span>
          <Badge variant={step === 'review' ? 'default' : 'outline'}>3. Review &amp; Save</Badge>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <Label htmlFor="import-file" className="cursor-pointer">
                    <span className="text-primary font-medium hover:underline">Choose a file</span>
                    <span className="text-muted-foreground"> to upload</span>
                  </Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls,.md,.txt"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, CSV, XLSX, MD, or TXT - up to 50MB. Large PDFs are auto-split for AI extraction.
                </p>
                {file && (
                  <Badge variant="secondary" className="mt-2">
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Our AI will read the file, detect the grade and subject, and split it into chapters for your review before anything is saved.
              </p>
            </div>
          )}

          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">
                  {progress?.label ?? (isUploading ? 'Uploading file...' : 'AI is reading your content...')}
                </p>
                {progress && progress.total > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Part {progress.current} of {progress.total}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Large PDFs are split and processed in parts. Please keep this window open.
                </p>
              </div>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {result.provider_used === 'openrouter' ? 'OpenRouter' : 'Lovable AI (fallback)'}
                </Badge>
                <Badge variant="outline">
                  Detected: Grade {result.detected_grade} | {result.detected_subject}
                </Badge>
                <Badge variant="outline">
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Save chapters into subject</Label>
                <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hasSubjects ? (
                      subjects.map((subject) => {
                        const isSuggested = matchingSubjects.some((match, index) => index < 3 && match.subject.id === subject.id);
                        return (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.subject_name} (Grade {subject.grade_level}){isSuggested ? ' - Suggested' : ''}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-subjects" disabled>
                        No subjects available yet
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedSubject && (
                  <p className="text-xs text-muted-foreground">
                    Selected target: <strong>{selectedSubject.subject_name}</strong> for Grade {selectedSubject.grade_level}.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Chapters will be saved as <strong>drafts</strong> - you can publish them later.
                </p>
              </div>

              {!targetSubjectId && (
                <Alert>
                  <PlusCircle className="h-4 w-4" />
                  <AlertTitle>No target subject selected</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      The AI detected <strong>{result.detected_subject}</strong> for Grade <strong>{result.detected_grade}</strong>, but there is no matching subject selected yet.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCreateDetectedSubject}
                      disabled={isCreatingSubject}
                    >
                      {isCreatingSubject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create "{result.detected_subject}" and use it
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <ExtractedChapterReview
                chapters={chapters}
                selected={selected}
                onToggle={toggleChapter}
                onChange={updateChapter}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isCreatingSubject}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 'upload' && (
              <Button onClick={handleExtract} disabled={!file || isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                Upload &amp; Extract
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleSave} disabled={isSaving || isCreatingSubject || !targetSubjectId}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save {selected.filter(Boolean).length} Chapter(s)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
