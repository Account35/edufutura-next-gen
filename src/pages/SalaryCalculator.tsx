import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, MapPin, Calculator } from 'lucide-react';

const provinces = [
  { name: 'Gauteng', costOfLiving: 1.0 },
  { name: 'Western Cape', costOfLiving: 1.05 },
  { name: 'KwaZulu-Natal', costOfLiving: 0.85 },
  { name: 'Eastern Cape', costOfLiving: 0.75 },
  { name: 'Free State', costOfLiving: 0.80 },
  { name: 'Limpopo', costOfLiving: 0.70 },
  { name: 'Mpumalanga', costOfLiving: 0.75 },
  { name: 'North West', costOfLiving: 0.75 },
  { name: 'Northern Cape', costOfLiving: 0.80 },
];

const experienceLevels = [
  { label: 'Entry Level (0-2 years)', multiplier: 1.0 },
  { label: 'Junior (2-5 years)', multiplier: 1.3 },
  { label: 'Mid-Level (5-10 years)', multiplier: 1.7 },
  { label: 'Senior (10-15 years)', multiplier: 2.2 },
  { label: 'Executive (15+ years)', multiplier: 3.0 },
];

const calculateTax = (annualSalary: number): number => {
  // Simplified SARS tax brackets for 2024
  let tax = 0;
  if (annualSalary <= 237100) {
    tax = annualSalary * 0.18;
  } else if (annualSalary <= 370500) {
    tax = 42678 + (annualSalary - 237100) * 0.26;
  } else if (annualSalary <= 512800) {
    tax = 77362 + (annualSalary - 370500) * 0.31;
  } else if (annualSalary <= 673000) {
    tax = 121475 + (annualSalary - 512800) * 0.36;
  } else if (annualSalary <= 857900) {
    tax = 179147 + (annualSalary - 673000) * 0.39;
  } else if (annualSalary <= 1817000) {
    tax = 251258 + (annualSalary - 857900) * 0.41;
  } else {
    tax = 644489 + (annualSalary - 1817000) * 0.45;
  }
  return Math.max(0, tax - 17235); // Primary rebate
};

export default function SalaryCalculator() {
  const [baseSalary, setBaseSalary] = useState<number>(300000);
  const [experienceLevel, setExperienceLevel] = useState<number>(0);
  const [province, setProvince] = useState<string>('Gauteng');

  const selectedExperience = experienceLevels[experienceLevel];
  const selectedProvince = provinces.find(p => p.name === province)!;
  
  const adjustedSalary = baseSalary * selectedExperience.multiplier;
  const annualTax = calculateTax(adjustedSalary);
  const takeHome = adjustedSalary - annualTax;
  const monthlyTakeHome = takeHome / 12;
  const adjustedForCOL = monthlyTakeHome / selectedProvince.costOfLiving;

  const lifetimeEarnings = takeHome * 35; // 35 year career

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Salary Calculator</h1>
          <p className="text-muted-foreground">
            Estimate your potential earnings and understand take-home pay across South Africa
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-secondary" />
              Input Your Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Base Annual Salary (Entry Level)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">R</span>
                <Input
                  id="salary"
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="pl-8"
                  step="10000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select value={experienceLevel.toString()} onValueChange={(val) => setExperienceLevel(Number(val))}>
                <SelectTrigger id="experience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger id="province">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((prov) => (
                    <SelectItem key={prov.name} value={prov.name}>
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-secondary" />
                Annual Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Annual Salary</span>
                  <span className="font-semibold">R {adjustedSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Income Tax (SARS)</span>
                  <span>- R {annualTax.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t flex justify-between text-lg font-bold text-secondary">
                  <span>Net Annual Income</span>
                  <span>R {takeHome.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                Monthly Take-Home
              </CardTitle>
              <CardDescription>Adjusted for {province}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Net Pay</span>
                  <span className="font-semibold">R {monthlyTakeHome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost of Living Factor</span>
                  <Badge variant={selectedProvince.costOfLiving > 1 ? 'destructive' : 'default'}>
                    {selectedProvince.costOfLiving}x
                  </Badge>
                </div>
                <div className="pt-2 border-t flex justify-between text-lg font-bold text-primary">
                  <span>Effective Monthly Value</span>
                  <span>R {adjustedForCOL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Career Earnings Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {experienceLevels.map((level, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{level.label.split(' ')[0]}</p>
                    <p className="font-bold text-primary">
                      R {((baseSalary * level.multiplier) / 1000).toFixed(0)}k
                    </p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estimated Lifetime Earnings (35 years)</span>
                  <span className="text-2xl font-bold text-secondary">
                    R {(lifetimeEarnings / 1000000).toFixed(1)}M
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Excludes inflation adjustments and assumes steady progression
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Understanding Your Salary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Cost of Living:</strong> {province} has a {selectedProvince.costOfLiving}x cost of living multiplier. 
              {selectedProvince.costOfLiving > 1 ? ' Your salary goes less far here than in other provinces.' : ' Your money stretches further here.'}
            </p>
            <p>
              <strong>Tax Bracket:</strong> You're paying approximately {((annualTax / adjustedSalary) * 100).toFixed(1)}% effective tax rate.
            </p>
            <p>
              <strong>Career Growth:</strong> At {selectedExperience.label.toLowerCase()}, you're earning {selectedExperience.multiplier}x the entry-level salary.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
