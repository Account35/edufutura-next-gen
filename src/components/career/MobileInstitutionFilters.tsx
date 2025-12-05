import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SlidersHorizontal, MapPin, Building2, X } from 'lucide-react';

interface MobileInstitutionFiltersProps {
  provinceFilter: string;
  setProvinceFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  provinces: string[];
  institutionTypes: string[];
}

export function MobileInstitutionFilters({
  provinceFilter,
  setProvinceFilter,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  provinces,
  institutionTypes,
}: MobileInstitutionFiltersProps) {
  const activeFiltersCount = [
    provinceFilter !== 'All Provinces',
    typeFilter !== 'All Types',
  ].filter(Boolean).length;

  return (
    <>
      {/* Quick Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden scrollbar-hide">
        <Badge
          variant={provinceFilter === provinces[1] ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap h-9 px-3"
          onClick={() => setProvinceFilter(provinceFilter === provinces[1] ? 'All Provinces' : provinces[1])}
        >
          <MapPin className="h-3 w-3 mr-1" />
          Nearby
        </Badge>
        <Badge
          variant={typeFilter === 'University' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap h-9 px-3"
          onClick={() => setTypeFilter(typeFilter === 'University' ? 'All Types' : 'University')}
        >
          <Building2 className="h-3 w-3 mr-1" />
          Universities
        </Badge>
        <Badge
          variant={sortBy === 'match' ? 'default' : 'outline'}
          className="cursor-pointer whitespace-nowrap h-9 px-3"
          onClick={() => setSortBy('match')}
        >
          Best Match
        </Badge>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="md:hidden relative">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter Institutions</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            {/* Province Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Province</Label>
                {provinceFilter !== 'All Provinces' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProvinceFilter('All Provinces')}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <RadioGroup value={provinceFilter} onValueChange={setProvinceFilter}>
                <div className="space-y-3">
                  {provinces.map((province) => (
                    <div key={province} className="flex items-center">
                      <RadioGroupItem value={province} id={`province-${province}`} />
                      <Label htmlFor={`province-${province}`} className="ml-3 cursor-pointer flex-1 py-2">
                        {province}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Institution Type Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Institution Type</Label>
                {typeFilter !== 'All Types' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTypeFilter('All Types')}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <RadioGroup value={typeFilter} onValueChange={setTypeFilter}>
                <div className="space-y-3">
                  {institutionTypes.map((type) => (
                    <div key={type} className="flex items-center">
                      <RadioGroupItem value={type} id={`type-${type}`} />
                      <Label htmlFor={`type-${type}`} className="ml-3 cursor-pointer flex-1 py-2">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Sort By */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Sort By</Label>
              <RadioGroup value={sortBy} onValueChange={setSortBy}>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <RadioGroupItem value="match" id="sort-match" />
                    <Label htmlFor="sort-match" className="ml-3 cursor-pointer flex-1 py-2">
                      Best Match
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="location" id="sort-location" />
                    <Label htmlFor="sort-location" className="ml-3 cursor-pointer flex-1 py-2">
                      Location
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="name" id="sort-name" />
                    <Label htmlFor="sort-name" className="ml-3 cursor-pointer flex-1 py-2">
                      Name (A-Z)
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
