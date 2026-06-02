import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ReportUploadProps {
  userId: string;
}

interface ReportAnalysis {
  term?: string | null;
  passStatus?: string | null;
  overallPercentage?: number | null;
  subjectGrades?: Record<string, string | number>;
  achievements?: string[];
  analysis?: string;
}

export const ReportUpload = ({ userId }: ReportUploadProps) => {
  const { userProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gradeChangeLoading, setGradeChangeLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReportAnalysis | null>(null);
  const [isEndOfYear, setIsEndOfYear] = useState<'yes' | 'no' | null>(null);

  const getGradeTarget = () => {
    const currentGrade = userProfile?.grade_level;
    if (!currentGrade || currentGrade >= 12) return null;
    return currentGrade + 1;
  };

  const parseGradePercent = (grade: string | number) => {
    if (typeof grade === 'number') return grade;
    const parsed = parseFloat(grade.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getFocusAdvice = (subjectGrades: Record<string, string> = {}) => {
    const topicFocusMap: Record<string, string[]> = {
      maths: ['algebra', 'geometry', 'functions', 'probability', 'trigonometry'],
      mathematics: ['algebra', 'geometry', 'functions', 'probability', 'trigonometry'],
      'physical science': ['chemical equations', 'mechanics', 'electricity', 'waves', 'periodic trends'],
      'life science': ['cell biology', 'genetics', 'ecology', 'human body systems', 'ecosystems'],
      english: ['comprehension', 'essay writing', 'grammar', 'vocabulary', 'literature analysis'],
      'home language': ['comprehension', 'essay writing', 'grammar', 'vocabulary', 'literature analysis'],
      afrikaans: ['reading comprehension', 'essay writing', 'grammar', 'vocabulary', 'language rules'],
      history: ['source analysis', 'timeline events', 'essay structure', 'historical causes and effects'],
      geography: ['map skills', 'climate systems', 'economic geography', 'human-environment interaction'],
      accounting: ['financial statements', 'journal entries', 'ledgers', 'budgeting', 'costing'],
      'business studies': ['business environments', 'marketing', 'operations management', 'financial literacy'],
      'computer science': ['programming fundamentals', 'algorithms', 'data structures', 'systems concepts'],
    };

    const advice: string[] = [];

    Object.entries(subjectGrades).forEach(([subject, grade]) => {
      const percent = grade && typeof grade === 'string' ? parseGradePercent(grade) : null;
      if (percent === null) return;

      const normalized = subject.toLowerCase();
      const topics = Object.entries(topicFocusMap).find(([key]) => normalized.includes(key))?.[1];
      const topicText = topics ? topics.slice(0, 3).join(', ') : 'the core concepts and exam practice';

      if (percent < 75) {
        advice.push(
          `For ${subject}, focus on ${topicText}. Your current score of ${percent}% shows this subject needs reinforcement.`
        );
      } else if (percent < 85) {
        advice.push(
          `For ${subject}, strengthen your understanding of ${topicText} and practice past papers to move from good to great.`
        );
      }
    });

    return advice.length
      ? advice
      : ['Your subject performance is strong. Keep reviewing the core concepts and practice papers to stay on track.'];
  };

  const handleChangeGrade = async () => {
    const newGrade = getGradeTarget();
    if (!newGrade) return;

    try {
      setGradeChangeLoading(true);

      const { error: updateError } = await supabase.from('users').update({ grade_level: newGrade }).eq('id', userId);
      if (updateError) throw updateError;

      if (userProfile?.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('subjects_per_grade')
          .eq('id', userProfile.school_id)
          .single();

        if (!schoolError && schoolData) {
          const subjectsForGrade = (schoolData.subjects_per_grade?.[`grade_${newGrade}`] || []) as string[];

          const { error: subjectUpdateError } = await supabase
            .from('users')
            .update({ subjects_studying: subjectsForGrade })
            .eq('id', userId);

          if (subjectUpdateError) throw subjectUpdateError;

          const { data: progressData, error: progressError } = await supabase
            .from('user_progress')
            .select('subject_name, is_completed')
            .eq('user_id', userId);

          if (!progressError && progressData) {
            const subjectsToRemove = progressData
              .filter((progress: any) => !subjectsForGrade.includes(progress.subject_name) && !progress.is_completed)
              .map((progress: any) => progress.subject_name);

            if (subjectsToRemove.length > 0) {
              await supabase
                .from('user_progress')
                .delete()
                .eq('user_id', userId)
                .in('subject_name', subjectsToRemove);
            }
          }
        }
      }

      toast.success(`Grade updated to ${newGrade}.`);
      window.location.reload();
    } catch (error) {
      console.error('Grade update failed:', error);
      toast.error('Failed to update grade.');
    } finally {
      setGradeChangeLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setAnalysisResult(null);
      setIsEndOfYear(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile || !userProfile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setIsUploading(true);

      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      setIsUploading(false);
      setIsAnalyzing(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;

          // Call edge function to analyze
          const { data, error: functionError } = await supabase.functions.invoke('analyze-report', {
            body: {
              imageBase64: base64,
              academicYear: parseInt(academicYear),
              gradeLevel: userProfile.grade_level,
            },
          });

          if (functionError) throw functionError;

          if (data.success) {
            // Save to database
            const { error: dbError } = await supabase
              .from('year_end_reports')
              .insert({
                user_id: userId,
                academic_year: parseInt(academicYear),
                grade_level: userProfile.grade_level,
                report_file_url: urlData.publicUrl,
                file_type: fileExt?.toLowerCase() || 'unknown',
                pass_status: data.analysis.passStatus,
                ai_analysis: data.analysis,
                subject_grades: data.analysis.subjectGrades,
                overall_percentage: data.analysis.overallPercentage,
              });

            if (dbError) throw dbError;

            setAnalysisResult(data.analysis);
            toast.success('Report uploaded and analyzed successfully!');
          } else {
            throw new Error(data.error || 'Analysis failed');
          }
        } catch (error) {
          console.error('Error analyzing report:', error);
          toast.error('Failed to analyze report');
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (error) {
      console.error('Error uploading report:', error);
      toast.error('Failed to upload report');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload School Report
        </CardTitle>
        <CardDescription>
          Upload your report card for term/academic analysis and personalized advice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Academic Year Selection */}
        <div className="space-y-2">
          <Label htmlFor="year">Academic Year</Label>
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="report">Report Card File</Label>
          <Input
            id="report"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            disabled={isUploading || isAnalyzing}
          />
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUploadAndAnalyze}
          disabled={!selectedFile || isUploading || isAnalyzing}
          className="w-full"
        >
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isUploading && !isAnalyzing && <Upload className="mr-2 h-4 w-4" />}
          {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing with AI...' : 'Upload & Analyze'}
        </Button>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-4 p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold">Analysis Complete</p>
            </div>

            {analysisResult.term && (
              <div>
                <p className="text-sm text-muted-foreground">Detected Report Type</p>
                <p className="font-medium capitalize">{analysisResult.term}</p>
              </div>
            )}

            {analysisResult.passStatus && (
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{analysisResult.passStatus}</p>
              </div>
            )}

            {analysisResult.overallPercentage !== undefined && analysisResult.overallPercentage !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Overall Percentage</p>
                <p className="font-medium">{analysisResult.overallPercentage}%</p>
              </div>
            )}

            {analysisResult.subjectGrades && Object.keys(analysisResult.subjectGrades).length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Subject Grades</p>
                <div className="space-y-1">
                  {Object.entries(analysisResult.subjectGrades).map(([subject, grade]) => (
                    <div key={subject} className="flex justify-between text-sm">
                      <span>{subject}</span>
                      <span className="font-medium">{grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.achievements && analysisResult.achievements.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Achievements</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {analysisResult.achievements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysisResult.analysis && (
              <div>
                <p className="text-sm text-muted-foreground">AI Summary</p>
                <p className="text-sm">{analysisResult.analysis}</p>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Is this an end-of-year report?</p>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={isEndOfYear === 'yes' ? 'secondary' : 'outline'}
                    onClick={() => setIsEndOfYear('yes')}
                    size="sm"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={isEndOfYear === 'no' ? 'secondary' : 'outline'}
                    onClick={() => setIsEndOfYear('no')}
                    size="sm"
                  >
                    No
                  </Button>
                </div>
              </div>

              {isEndOfYear === 'yes' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  {analysisResult.passStatus?.toLowerCase() === 'passed' ? (
                    <>
                      <p className="font-medium">You passed this year-end report.</p>
                      {getGradeTarget() ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Would you like to update your grade level based on your result?
                          </p>
                          <Button
                            onClick={handleChangeGrade}
                            disabled={gradeChangeLoading}
                            className="w-full"
                          >
                            {gradeChangeLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating grade...</>
                            ) : (
                              `Promote to Grade ${getGradeTarget()}`
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          You are already in Grade 12. Keep preparing for exam success or contact your school for next-year options.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <p className="font-medium">This looks like a year-end report without a passing status.</p>
                      <p className="text-sm text-muted-foreground">
                        Review the weaker subjects below and speak with your teacher about how to improve before the next term.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isEndOfYear === 'no' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="font-medium">Focus Advice for current terms</p>
                  {getFocusAdvice(analysisResult.subjectGrades || {}).map((advice, index) => (
                    <p key={index} className="text-sm">{advice}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};