import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GradeSelectorProps {
  userId: string;
  currentGrade: number;
  currentSchoolId?: string;
}

interface UnfinishedCourse {
  subject_name: string;
}

export const GradeSelector = ({ userId, currentGrade, currentSchoolId }: GradeSelectorProps) => {
  const [selectedGrade, setSelectedGrade] = useState(currentGrade);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [unfinishedCourses, setUnfinishedCourses] = useState<UnfinishedCourse[]>([]);

  const grades = [6, 7, 8, 9, 10, 11, 12];

  const handleGradeClick = async (grade: number) => {
    if (grade === currentGrade) return;

    setSelectedGrade(grade);

    try {
      const { data: incompleteData, error: incompleteError } = await supabase
        .from('user_progress')
        .select('subject_name')
        .eq('user_id', userId)
        .lt('progress_percentage', 100)
        .limit(20);

      if (incompleteError) throw incompleteError;

      setUnfinishedCourses(incompleteData || []);
    } catch (error) {
      console.error('Error checking unfinished courses:', error);
      setUnfinishedCourses([]);
    } finally {
      setShowConfirmation(true);
    }
  };

  const handleConfirmGradeChange = async () => {
    try {
      setIsLoading(true);

      // Update grade in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ grade_level: selectedGrade })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Get school's subjects for new grade
      if (currentSchoolId) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('subjects_per_grade')
          .eq('id', currentSchoolId)
          .single();

        if (schoolError) throw schoolError;

        // Extract subjects for new grade
        const subjectsForGrade = schoolData.subjects_per_grade?.[`grade_${selectedGrade}`] || [];

        // Update subjects_studying
        await supabase
          .from('users')
          .update({ subjects_studying: subjectsForGrade })
          .eq('id', userId);

        // Remove unfinished progress for subjects no longer offered
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('subject_name, is_completed')
          .eq('user_id', userId);

        if (progressData) {
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

      toast.success(`Grade updated to ${selectedGrade}. Your subjects have been updated.`);
      setShowConfirmation(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating grade:', error);
      toast.error('Failed to update grade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-primary font-medium">Grade Level</Label>
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
        {grades.map((grade) => (
          <Button
            key={grade}
            variant={grade === currentGrade ? 'default' : 'outline'}
            className={`min-h-[44px] ${
              grade === currentGrade
                ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                : 'hover:border-primary'
            }`}
            onClick={() => handleGradeClick(grade)}
            disabled={isLoading}
          >
            {grade}
          </Button>
        ))}
      </div>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Grade Level?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              Changing your grade from {currentGrade} to {selectedGrade} will update your subject list to match the subjects offered for Grade {selectedGrade}.
              {unfinishedCourses.length > 0 ? (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                  <p className="font-semibold">Important:</p>
                  <p>
                    You have unfinished course progress. Only completed subject progress, badges, and certificates will remain. Any unfinished courses will not be saved, and if you return later you will need to restart those courses from scratch.
                  </p>
                </div>
              ) : null}
              <p>Any subjects not available in Grade {selectedGrade} will be removed from your profile.</p>
              <p>Do you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGradeChange} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Change Grade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
