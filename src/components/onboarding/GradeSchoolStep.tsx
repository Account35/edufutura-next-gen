import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, School } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradeSchoolStepProps {
  data: {
    grade_level: number | null;
    school_id: string | null;
  };
  onUpdate: (data: Partial<GradeSchoolStepProps['data']>) => void;
  onNext: () => void;
  onPrev: () => void;
  userId: string;
}

export function GradeSchoolStep({ data, onUpdate, onNext, onPrev, userId }: GradeSchoolStepProps) {
  const [isValid, setIsValid] = useState(!!data.grade_level && !!data.school_id);
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchSchools();
    }
  }, [searchTerm]);

  const searchSchools = async () => {
    try {
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('id, school_name, province, district')
        .or(`school_name.ilike.%${searchTerm}%,province.ilike.%${searchTerm}%,district.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSchools(schoolData || []);
    } catch (error) {
      console.error('Error searching schools:', error);
    }
  };

  const handleGradeChange = (grade: number) => {
    onUpdate({ grade_level: grade });
    setIsValid(grade > 0 && !!data.school_id);
  };

  const handleSchoolSelect = (school: any) => {
    onUpdate({ school_id: school.id });
    setOpen(false);
    setIsValid(!!data.grade_level && !!school.id);
  };

  const selectedSchool = schools.find(s => s.id === data.school_id);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Select Your Grade & School</h2>
        <p className="text-muted-foreground">
          This helps us provide curriculum content appropriate for your level
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>What grade are you in?</Label>
          <div className="grid grid-cols-4 gap-2">
            {[8, 9, 10, 11, 12].map((grade) => (
              <Button
                key={grade}
                variant={data.grade_level === grade ? "default" : "outline"}
                onClick={() => handleGradeChange(grade)}
                className="h-12"
              >
                Grade {grade}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Which school do you attend?</Label>
          <div className="text-sm text-muted-foreground mb-2">
            Search and select your school from the list
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedSchool ? selectedSchool.school_name : "Select your school..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search schools..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandEmpty>
                  {searchTerm.length < 2 ? "Type at least 2 characters to search..." : "No schools found."}
                </CommandEmpty>
                <CommandList>
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
                            selectedSchool?.id === school.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center">
                          <School className="mr-2 h-4 w-4" />
                          <div>
                            <div className="font-medium">{school.school_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {school.district}, {school.province}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Next
        </Button>
      </div>
    </div>
  );
}