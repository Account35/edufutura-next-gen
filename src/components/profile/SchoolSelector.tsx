import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, School } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolSelectorProps {
  userId: string;
  currentSchoolId?: string;
  currentGrade: number;
}

export const SchoolSelector = ({ userId, currentSchoolId, currentGrade }: SchoolSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [currentSchool, setCurrentSchool] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [removedSubjects, setRemovedSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (currentSchoolId) {
      loadCurrentSchool();
    }
  }, [currentSchoolId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchSchools();
    }
  }, [searchTerm]);

  const loadCurrentSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentSchoolId)
        .single();

      if (error) throw error;
      setCurrentSchool(data);
    } catch (error) {
      console.error('Error loading current school:', error);
    }
  };

  const searchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .ilike('school_name', `%${searchTerm}%`)
        .contains('grades_offered', [currentGrade])
        .limit(10);

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error searching schools:', error);
    }
  };

  const handleSchoolSelect = async (school: any) => {
    if (school.id === currentSchoolId) {
      setOpen(false);
      return;
    }

    setSelectedSchool(school);

    // Check if subjects match
    const newSchoolSubjects = school.subjects_per_grade?.[`grade_${currentGrade}`] || [];
    
    const { data: userData } = await supabase
      .from('users')
      .select('subjects_studying')
      .eq('id', userId)
      .single();

    const currentSubjects = (userData?.subjects_studying as string[]) || [];
    const removed = currentSubjects.filter((s: string) => !newSchoolSubjects.includes(s));

    if (removed.length > 0) {
      setRemovedSubjects(removed);
      setShowConfirmation(true);
      setOpen(false);
    } else {
      await confirmSchoolChange();
    }
  };

  const confirmSchoolChange = async () => {
    if (!selectedSchool) return;

    try {
      setIsLoading(true);

      const newSchoolSubjects = selectedSchool.subjects_per_grade?.[`grade_${currentGrade}`] || [];

      // Update school and subjects
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          school_id: selectedSchool.id,
          subjects_studying: newSchoolSubjects,
          province: selectedSchool.province,
          district: selectedSchool.district
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Remove progress for subjects no longer offered
      if (removedSubjects.length > 0) {
        await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', userId)
          .in('subject_name', removedSubjects);
      }

      toast.success(`School updated to ${selectedSchool.school_name}. Your subjects have been updated.`);
      setShowConfirmation(false);
      setUnderstood(false);
      setRemovedSubjects([]);
      window.location.reload();
    } catch (error) {
      console.error('Error updating school:', error);
      toast.error('Failed to update school');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-primary font-medium flex items-center gap-2">
        <School className="h-4 w-4" />
        School
      </Label>
      
      {currentSchool && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium">{currentSchool.school_name}</p>
          <p className="text-sm text-muted-foreground">
            {currentSchool.province} • {currentSchool.district}
          </p>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Change School
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search schools..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No schools found.</CommandEmpty>
              <CommandGroup>
                {schools.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.school_name}
                    onSelect={() => handleSchoolSelect(school)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentSchoolId === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <p className="font-medium">{school.school_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {school.province} • {school.district}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change School?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                The following subjects are not offered at <strong>{selectedSchool?.school_name}</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {removedSubjects.map((subject) => (
                  <li key={subject} className="text-red-600 font-medium">{subject}</li>
                ))}
              </ul>
              <p>
                These subjects will be removed from your profile. Do you want to continue?
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="understand" 
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <label
                  htmlFor="understand"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand that my subjects will be updated
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={() => setUnderstood(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSchoolChange} 
              disabled={isLoading || !understood}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
