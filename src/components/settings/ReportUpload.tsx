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

export const ReportUpload = ({ userId }: ReportUploadProps) => {
  const { userProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setAnalysisResult(null);
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
          Upload Year-End Report
        </CardTitle>
        <CardDescription>
          Upload your school report card for AI analysis and progress tracking
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
          <div className="mt-4 p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold">Analysis Complete</p>
            </div>

            {analysisResult.passStatus && (
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{analysisResult.passStatus}</p>
              </div>
            )}

            {analysisResult.overallPercentage && (
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
                      <span className="font-medium">{grade as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};