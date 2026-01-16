import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LocationStepProps {
  data: {
    province: string;
    district: string;
    city: string;
  };
  onUpdate: (data: Partial<LocationStepProps['data']>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

export function LocationStep({ data, onUpdate, onNext, onPrev }: LocationStepProps) {
  const isValid = data.province && data.city.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Set Your Location</h2>
        <p className="text-muted-foreground">
          This helps us connect you with local resources and communities
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Select
            value={data.province}
            onValueChange={(value) => onUpdate({ province: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your province" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="district">District (Optional)</Label>
          <Input
            id="district"
            value={data.district}
            onChange={(e) => onUpdate({ district: e.target.value })}
            placeholder="e.g. Johannesburg, Cape Town"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City/Town</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => onUpdate({ city: e.target.value })}
            placeholder="Enter your city or town"
          />
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