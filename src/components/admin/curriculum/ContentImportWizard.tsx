import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import { useCurriculumImport, type ExtractionResult, type ExtractedChapter } from '@/hooks/useCurriculumImport';
import { ExtractedChapterReview } from './ExtractedChapterReview';
import type { Subject } from '@/hooks/useAdminCurriculum';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: Subject[];
  defaultSubjectId?: string;
  onComplete: () => void;
}

type Step = 'upload' | 'extracting' | 'review';

export const ContentImportWizard = ({ open, onOpenChange, subjects, defaultSubjectId, onComplete }: Props) => {
  const { isUploading, isExtracting, isSaving, progress, uploadAndExtract, saveChapters } = useCurriculumImport();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [chapters, setChapters] = useState<ExtractedChapter[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState<string>(defaultSubjectId || '');

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setFile(null);
      setResult(null);
      setChapters([]);
      setSelected([]);
      setTargetSubjectId(defaultSubjectId || '');
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

    // Auto-match subject by detected grade + subject name
    const match = subjects.find(
      (s) =>
        s.grade_level === res.detected_grade &&
        s.subject_name.toLowerCase().includes(res.detected_subject.toLowerCase().split(' ')[0])
    );
    if (match) setTargetSubjectId(match.id);
    setStep('review');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Assisted Content Import
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <Badge variant={step === 'upload' ? 'default' : 'outline'}>1. Upload</Badge>
          <span>→</span>
          <Badge variant={step === 'extracting' ? 'default' : 'outline'}>2. AI Extract</Badge>
          <span>→</span>
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
                  PDF, CSV, XLSX, MD, or TXT — max 25MB
                </p>
                {file && (
                  <Badge variant="secondary" className="mt-2">
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Our AI will read the file, detect the grade and subject, and split it into chapters
                for your review before anything is saved.
              </p>
            </div>
          )}

          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">
                  {isUploading ? 'Uploading file…' : 'AI is reading your content…'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This usually takes 10–30 seconds.
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
                  Detected: Grade {result.detected_grade} · {result.detected_subject}
                </Badge>
                <Badge variant="outline">
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Save chapters into subject</Label>
                <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject_name} (Grade {s.grade_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Chapters will be saved as <strong>drafts</strong> — you can publish them later.
                </p>
              </div>

              <ExtractedChapterReview
                chapters={chapters}
                selected={selected}
                onToggle={toggleChapter}
                onChange={updateChapter}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
              <Button onClick={handleSave} disabled={isSaving || !targetSubjectId}>
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
