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
  const [showSchoolCreate, setShowSchoolCreate] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolProvince, setNewSchoolProvince] = useState('');
  const [newSchoolDistrict, setNewSchoolDistrict] = useState('');

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
      setSchools([]);
    }
  };

  const createSchool = async () => {
    if (!newSchoolName.trim()) {
      toast.error('School name is required');
      return;
    }

    try {
      setIsLoading(true);

      const { data: newSchool, error: insertError } = await supabase
        .from('schools')
        .insert([{
          school_name: newSchoolName.trim(),
          school_type: 'Custom',
          province: newSchoolProvince.trim() || null,
          district: newSchoolDistrict.trim() || null,
          grades_offered: [currentGrade],
          subjects_per_grade: { [`grade_${currentGrade}`]: [] },
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newSchool) throw new Error('Failed to create school');

      setSelectedSchool(newSchool);
      setSearchTerm(newSchool.school_name);
      setShowSchoolCreate(false);
      setSchools([newSchool]);
      setOpen(false);
      toast.success(`${newSchool.school_name} added and selected.`);
      await confirmSchoolChange(newSchool);
    } catch (error) {
      console.error('Error creating school:', error);
      toast.error('Failed to save new school');
    } finally {
      setIsLoading(false);
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
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subjects_studying')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error loading user subjects:', userError);
    }

    const currentSubjects = (userData?.subjects_studying as string[]) || [];
    const removed = currentSubjects.filter((s: string) => !newSchoolSubjects.includes(s));

    if (removed.length > 0) {
      setRemovedSubjects(removed);
      setShowConfirmation(true);
      setOpen(false);
    } else {
      await confirmSchoolChange(school);
    }
  };

  const confirmSchoolChange = async (schoolToConfirm?: any) => {
    const school = schoolToConfirm || selectedSchool;
    if (!school) return;

    try {
      setIsLoading(true);

      const newSchoolSubjects = school.subjects_per_grade?.[`grade_${currentGrade}`] || [];

      // Load current user subjects so we can delete any unfinished progress for removed subjects.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subjects_studying')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const currentSubjects = (userData?.subjects_studying as string[]) || [];
      const subjectsToRemove = currentSubjects.filter((subject) => !newSchoolSubjects.includes(subject));

      // Update school and subjects
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          school_id: school.id,
          subjects_studying: newSchoolSubjects,
          province: school.province,
          district: school.district
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Remove unfinished progress for subjects no longer offered
      if (subjectsToRemove.length > 0) {
        await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', userId)
          .in('subject_name', subjectsToRemove)
          .eq('is_completed', false);
      }

      toast.success(`School updated to ${school.school_name}. Your subjects have been updated.`);
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
              <CommandEmpty>
                <div className="space-y-2 text-center">
                  {searchTerm.trim() ? (
                    <>
                      <p>No schools found for that search.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowSchoolCreate(true);
                          setNewSchoolName(searchTerm.trim());
                        }}
                      >
                        {`Add "${searchTerm}" as a new school`}
                      </Button>
                    </>
                  ) : (
                    <p>Start typing a school name to search.</p>
                  )}
                </div>
              </CommandEmpty>
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
                        {school.province || 'Unknown province'} • {school.district || 'Unknown district'}
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

      <AlertDialog open={showSchoolCreate} onOpenChange={setShowSchoolCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a new school</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                No school matched your search. Add this school so it can be selected now and found by other learners.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="new-school-name" className="text-sm">
                    School name
                  </Label>
                  <Input
                    id="new-school-name"
                    value={newSchoolName}
                    onChange={(event) => setNewSchoolName(event.target.value)}
                    className="mt-2"
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-school-province" className="text-sm">
                    Province (optional)
                  </Label>
                  <Input
                    id="new-school-province"
                    value={newSchoolProvince}
                    onChange={(event) => setNewSchoolProvince(event.target.value)}
                    className="mt-2"
                    placeholder="Enter province"
                  />
                </div>
                <div>
                  <Label htmlFor="new-school-district" className="text-sm">
                    District (optional)
                  </Label>
                  <Input
                    id="new-school-district"
                    value={newSchoolDistrict}
                    onChange={(event) => setNewSchoolDistrict(event.target.value)}
                    className="mt-2"
                    placeholder="Enter district"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={() => setShowSchoolCreate(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={createSchool} disabled={isLoading || !newSchoolName.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save school
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
