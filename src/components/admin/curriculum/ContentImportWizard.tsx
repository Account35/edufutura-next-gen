import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Sparkles, CheckCircle2, FileText, PlusCircle } from 'lucide-react';
import {
  useCurriculumImport,
  type ExtractionResult,
  type ExtractedChapter,
  type ExtractionGroup,
} from '@/hooks/useCurriculumImport';
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

const CREATE_NEW = '__create__';

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const groupKeyOf = (group: { grade_level: number; subject: string }) =>
  `${group.grade_level}|${normalizeText(group.subject || '')}`;

/** Score existing subjects against a detected grade + subject name. */
const scoreSubjects = (subjects: Subject[], detectedSubject: string, detectedGrade: number) => {
  const detected = normalizeText(detectedSubject || '');

  return [...subjects]
    .map((subject) => {
      const subjectName = normalizeText(subject.subject_name || '');
      let score = 0;

      if (subject.grade_level === detectedGrade) score += 5;
      if (subjectName === detected) score += 10;
      if (detected && (subjectName.includes(detected) || detected.includes(subjectName))) score += 6;

      const detectedWords = detected.split(' ').filter(Boolean);
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
  const [groupTargets, setGroupTargets] = useState<Record<string, string>>({});
  const [isSavingGroups, setIsSavingGroups] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setFile(null);
      setResult(null);
      setChapters([]);
      setSelected([]);
      setGroupTargets({});
      setIsSavingGroups(false);
    }
  }, [open]);

  // Groups, each holding the global indexes of its chapters in `chapters`.
  const groups = useMemo(() => {
    if (!result) return [] as Array<ExtractionGroup & { key: string; indices: number[] }>;

    const source: ExtractionGroup[] = result.groups?.length
      ? result.groups
      : [{
          grade_level: result.detected_grade,
          subject: result.detected_subject,
          chapters: result.chapters,
        }];

    let offset = 0;
    return source.map((group) => {
      const indices = group.chapters.map((_, i) => offset + i);
      offset += group.chapters.length;
      return { ...group, key: groupKeyOf(group), indices };
    });
  }, [result]);

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

    // Pre-match each grade group to an existing subject.
    const source: ExtractionGroup[] = res.groups?.length
      ? res.groups
      : [{ grade_level: res.detected_grade, subject: res.detected_subject, chapters: res.chapters }];

    const targets: Record<string, string> = {};
    for (const group of source) {
      const best = scoreSubjects(subjects, group.subject, group.grade_level)[0]?.subject;
      targets[groupKeyOf(group)] =
        best?.id || (source.length === 1 && defaultSubjectId ? defaultSubjectId : CREATE_NEW);
    }
    setGroupTargets(targets);

    setStep('review');
  };

  const handleSave = async () => {
    const payload = groups
      .map((group) => ({
        group,
        picked: group.indices.filter((i) => selected[i]).map((i) => chapters[i]),
      }))
      .filter(({ picked }) => picked.length > 0);

    if (payload.length === 0) {
      toast.error('Select at least one chapter.');
      return;
    }

    setIsSavingGroups(true);
    let savedGroups = 0;
    let savedChapters = 0;

    try {
      for (const { group, picked } of payload) {
        let subjectId = groupTargets[group.key];

        if (!subjectId || subjectId === CREATE_NEW) {
          const grade = group.grade_level >= 1 && group.grade_level <= 12 ? group.grade_level : 10;
          const created = await onCreateSubject({
            subject_name: group.subject || 'Imported Curriculum',
            grade_level: grade,
            description: `Created from AI import for Grade ${grade} ${group.subject || 'curriculum'}.`,
            is_published: false,
            caps_aligned: true,
          });
          subjectId = created.id;
          setGroupTargets((prev) => ({ ...prev, [group.key]: created.id }));
        }

        const ok = await saveChapters(subjectId, picked, { silent: true });
        if (ok) {
          savedGroups += 1;
          savedChapters += picked.length;
        }
      }
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      setIsSavingGroups(false);
      return;
    }

    setIsSavingGroups(false);

    if (savedGroups === 0) return;

    toast.success(
      `${savedChapters} chapter(s) saved as drafts across ${savedGroups} subject(s).`
    );
    onComplete();
    onOpenChange(false);
  };

  const updateChapter = (idx: number, patch: Partial<ExtractedChapter>) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const toggleChapter = (idx: number) => {
    setSelected((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const hasSubjects = subjects.length > 0;
  const totalSelected = selected.filter(Boolean).length;
  const busy = isSaving || isSavingGroups;

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
                Our AI reads the file page by page, keeps every grade it finds separate, and splits the
                material into chapters for your review before anything is saved.
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
                  Pages are read in small groups so no grade is missed. Please keep this window open.
                </p>
              </div>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {result.provider_used === 'openrouter'
                    ? 'OpenRouter'
                    : result.provider_used === 'lovable'
                      ? 'Lovable AI'
                      : 'Local extraction'}
                </Badge>
                <Badge variant="outline">
                  {groups.length} grade group(s) | {chapters.length} chapter(s)
                </Badge>
                <Badge variant="outline">
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </Badge>
              </div>

              {result.ai_error && (
                <Alert>
                  <AlertTitle>Some sections were skipped</AlertTitle>
                  <AlertDescription>{result.ai_error}</AlertDescription>
                </Alert>
              )}

              {!hasSubjects && (
                <Alert>
                  <PlusCircle className="h-4 w-4" />
                  <AlertTitle>No subjects yet</AlertTitle>
                  <AlertDescription>
                    A new draft subject will be created for each grade group below when you save.
                  </AlertDescription>
                </Alert>
              )}

              {groups.map((group) => {
                const target = groupTargets[group.key] || CREATE_NEW;
                const suggestions = scoreSubjects(subjects, group.subject, group.grade_level)
                  .slice(0, 3)
                  .map((match) => match.subject.id);
                const groupSelected = group.indices.filter((i) => selected[i]).length;

                return (
                  <div key={group.key} className="space-y-3 border rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>Grade {group.grade_level}</Badge>
                      <span className="font-medium">{group.subject || 'Imported Curriculum'}</span>
                      <Badge variant="outline">
                        {groupSelected} of {group.indices.length} chapter(s) selected
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <Label>Save this grade into</Label>
                      <Select
                        value={target}
                        onValueChange={(v) => setGroupTargets((prev) => ({ ...prev, [group.key]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose target subject..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CREATE_NEW}>
                            Create new: {group.subject || 'Imported Curriculum'} (Grade {group.grade_level})
                          </SelectItem>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.subject_name} (Grade {subject.grade_level})
                              {suggestions.includes(subject.id) ? ' - Suggested' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Chapters are saved as <strong>drafts</strong> - you can publish them later.
                      </p>
                    </div>

                    <ExtractedChapterReview
                      chapters={chapters}
                      selected={selected}
                      indices={group.indices}
                      onToggle={toggleChapter}
                      onChange={updateChapter}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 'upload' && (
              <Button onClick={handleExtract} disabled={!file || isUploading || isExtracting}>
                <Upload className="w-4 h-4 mr-2" />
                Upload &amp; Extract
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleSave} disabled={busy || totalSelected === 0}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save {totalSelected} Chapter(s)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
