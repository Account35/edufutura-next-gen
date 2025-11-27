import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import ResourceCard from '@/components/community/ResourceCard';
import ResourceUploadModal from '@/components/community/ResourceUploadModal';
import { Search, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  resource_title: string;
  subject_name: string;
  resource_type: string;
  file_url: string;
  download_count: number;
  rating_average: number | null;
  rating_count: number | null;
  upload_date: string;
  user_id: string;
}

const SUBJECTS = [
  'Mathematics', 'Physical Sciences', 'Life Sciences', 'English',
  'Afrikaans', 'History', 'Geography', 'Business Studies',
  'Accounting', 'Economics'
];

const RESOURCE_TYPES = [
  'Notes', 'Summary', 'Diagram', 'Worksheet', 'Cheat Sheet', 'Flashcards'
];

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [gradeRange, setGradeRange] = useState([6, 12]);
  const [minRating, setMinRating] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadResources();
  }, [selectedSubjects, selectedTypes, gradeRange, minRating]);

  const loadResources = async () => {
    setLoading(true);

    let query = supabase
      .from('shared_resources')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('upload_date', { ascending: false })
      .range(0, 29);

    if (selectedSubjects.length > 0) {
      query = query.in('subject_name', selectedSubjects);
    }

    if (selectedTypes.length > 0) {
      query = query.in('resource_type', selectedTypes);
    }

    if (minRating > 0) {
      query = query.gte('rating_average', minRating);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      toast({
        title: 'Error loading resources',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setResources(data || []);
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedSubjects([]);
    setSelectedTypes([]);
    setGradeRange([6, 12]);
    setMinRating(0);
    setSearchQuery('');
  };

  const filteredResources = resources.filter(resource =>
    searchQuery === '' ||
    resource.resource_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display text-primary mb-2">Study Resources</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Community-contributed notes, summaries, and study aids
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>1,234 resources shared</span>
            <span>•</span>
            <span>45,678 downloads</span>
          </div>
        </div>

        {/* Search and Upload */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-secondary hover:bg-secondary/90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Share Resource
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">Filters</h3>
                {(selectedSubjects.length > 0 ||
                  selectedTypes.length > 0 ||
                  minRating > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Subjects */}
              <div className="mb-6">
                <Label className="text-sm font-semibold mb-2 block">Subject</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {SUBJECTS.map(subject => (
                    <div key={subject} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedSubjects.includes(subject)}
                        onCheckedChange={() => toggleSubject(subject)}
                      />
                      <span className="text-sm">{subject}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Type */}
              <div className="mb-6">
                <Label className="text-sm font-semibold mb-2 block">Resource Type</Label>
                <div className="space-y-2">
                  {RESOURCE_TYPES.map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleType(type)}
                      />
                      <span className="text-sm">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grade Level */}
              <div className="mb-6">
                <Label className="text-sm font-semibold mb-2 block">
                  Grade Level: {gradeRange[0]} - {gradeRange[1]}
                </Label>
                <Slider
                  value={gradeRange}
                  onValueChange={setGradeRange}
                  min={6}
                  max={12}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Rating */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Minimum Rating: {minRating > 0 ? `${minRating}+ stars` : 'Any'}
                </Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <Button
                      key={rating}
                      variant={minRating >= rating ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMinRating(rating)}
                      className="w-full"
                    >
                      {rating}★
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Resources Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No resources found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <ResourceUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={loadResources}
      />
    </div>
  );
}
