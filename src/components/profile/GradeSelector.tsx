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

export const GradeSelector = ({ userId, currentGrade, currentSchoolId }: GradeSelectorProps) => {
  const [selectedGrade, setSelectedGrade] = useState(currentGrade);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const grades = [6, 7, 8, 9, 10, 11, 12];

  const handleGradeClick = (grade: number) => {
    if (grade === currentGrade) return;
    setSelectedGrade(grade);
    setShowConfirmation(true);
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

        // Remove progress for subjects no longer offered
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('subject_name')
          .eq('user_id', userId);

        if (progressData) {
          const progressSubjects = progressData.map(p => p.subject_name);
          const subjectsToRemove = progressSubjects.filter(s => !subjectsForGrade.includes(s));

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
                ? 'bg-secondary text-white hover:bg-secondary/90'
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
            <AlertDialogDescription>
              Changing your grade from {currentGrade} to {selectedGrade} will update your subject list to match the subjects offered for Grade {selectedGrade}. 
              Any subjects not available in Grade {selectedGrade} will be removed from your profile. Are you sure you want to continue?
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
