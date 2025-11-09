import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DateOfBirthPickerProps {
  userId: string;
  initialValue?: string;
}

export const DateOfBirthPicker = ({ userId, initialValue }: DateOfBirthPickerProps) => {
  const [date, setDate] = useState<Date | undefined>(
    initialValue ? new Date(initialValue) : undefined
  );

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    setDate(selectedDate);

    try {
      const { error } = await supabase
        .from('users')
        .update({ date_of_birth: format(selectedDate, 'yyyy-MM-dd') })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Date of birth updated');
    } catch (error) {
      console.error('Error updating date of birth:', error);
      toast.error('Failed to update date of birth');
    }
  };

  const maxDate = subYears(new Date(), 10); // At least 10 years old
  const minDate = subYears(new Date(), 25); // Max 25 years old

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-2">
      <Label className="text-primary font-medium">Date of Birth</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'dd/MM/yyyy') : 'Select your date of birth'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) =>
              date > maxDate || date < minDate
            }
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={minDate.getFullYear()}
            toYear={maxDate.getFullYear()}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <p className="text-sm text-muted-foreground">
          {format(date, 'd MMMM yyyy')} • Age: {calculateAge(date)} years
        </p>
      )}
    </div>
  );
};
