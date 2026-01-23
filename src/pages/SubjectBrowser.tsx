import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Subject } from '@/hooks/useCurriculumData';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Calculator, Atom, Dna, Globe, Clock, CheckCircle2, Plus } from 'lucide-react';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const iconMap: Record<string, any> = {
  Calculator: Calculator,
  Atom: Atom,
  Dna: Dna,
  Globe: Globe,
  Book: Book,
};

const ALL_GRADES = [6, 7, 8, 9, 10, 11, 12];

type SortOption = 'name_asc' | 'name_desc' | 'grade_asc' | 'grade_desc' | 'chapters_desc' | 'chapters_asc' | 'hours_desc' | 'hours_asc';

export default function SubjectBrowser() {
  const navigate = useNavigate();
  const { user, userProfile, refreshProfile } = useAuth();
  const { fetchSubjects } = useCurriculumData();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & controls
  const [search, setSearch] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<number[]>(ALL_GRADES);
  const [capsOnly, setCapsOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('name_asc');

  const studying: string[] = useMemo(() => {
    const arr = (userProfile?.subjects_studying as unknown as string[]) || [];
    return Array.isArray(arr) ? arr : [];
  }, [userProfile?.subjects_studying]);

  useEffect(() => {
    document.title = 'Browse Subjects | EduFutura';
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      const data = await fetchSubjects(); // fetch all published subjects
      setSubjects(data);
      setLoading(false);
    };

    loadSubjects();
  }, []);

  const filtered = useMemo(() => {
    let list = subjects.filter((s) => selectedGrades.includes(s.grade_level));

    if (capsOnly) list = list.filter((s) => s.caps_aligned);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.subject_name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'name_desc':
        list = [...list].sort((a, b) => b.subject_name.localeCompare(a.subject_name));
        break;
      case 'grade_asc':
        list = [...list].sort((a, b) => a.grade_level - b.grade_level);
        break;
      case 'grade_desc':
        list = [...list].sort((a, b) => b.grade_level - a.grade_level);
        break;
      case 'chapters_desc':
        list = [...list].sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0));
        break;
      case 'chapters_asc':
        list = [...list].sort((a, b) => (a.total_chapters || 0) - (b.total_chapters || 0));
        break;
      case 'hours_desc':
        list = [...list].sort((a, b) => (b.estimated_hours || 0) - (a.estimated_hours || 0));
        break;
      case 'hours_asc':
        list = [...list].sort((a, b) => (a.estimated_hours || 0) - (b.estimated_hours || 0));
        break;
      default:
        list = [...list].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    }

    return list;
  }, [subjects, selectedGrades, capsOnly, search, sort]);

  const toggleGrade = (grade: number) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const clearFilters = () => {
    setSelectedGrades(ALL_GRADES);
    setCapsOnly(false);
    setSearch('');
    setSort('name_asc');
  };

  const handleAddSubject = async (subject: Subject) => {
    if (!user || !userProfile) return;
    if (studying.includes(subject.subject_name)) return;

    const newSubjects = [...studying, subject.subject_name];

    const { error } = await supabase
      .from('users')
      .update({ subjects_studying: newSubjects })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to add subject. Please try again.', variant: 'destructive' });
      return;
    }

    await supabase.from('user_progress').insert({
      user_id: user.id,
      subject_name: subject.subject_name,
      total_chapters: subject.total_chapters || 0,
      chapters_completed: 0,
      progress_percentage: 0,
      last_accessed: new Date().toISOString(),
    });

    toast({ title: 'Subject added', description: `${subject.subject_name} added to your profile!` });
    await refreshProfile();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">Browse Subjects</h1>
          <p className="text-muted-foreground mt-2">Explore all CAPS-aligned subjects</p>
        </div>

        {/* Filters */}
        <div className="bg-background border border-border rounded-xl p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Search</label>
              <Input
                placeholder="Search by subject name or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Sort by</label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alphabetical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="grade_asc">Grade (low to high)</SelectItem>
                  <SelectItem value="grade_desc">Grade (high to low)</SelectItem>
                  <SelectItem value="chapters_desc">Chapters (most first)</SelectItem>
                  <SelectItem value="chapters_asc">Chapters (least first)</SelectItem>
                  <SelectItem value="hours_desc">Hours (longest first)</SelectItem>
                  <SelectItem value="hours_asc">Hours (shortest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Options</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="capsOnly" checked={capsOnly} onCheckedChange={(v) => setCapsOnly(!!v)} />
                  <label htmlFor="capsOnly" className="text-sm">CAPS aligned only</label>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Grades:</span>
            {ALL_GRADES.map((g) => (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                className={
                  `text-sm px-3 py-1 rounded-full border ${selectedGrades.includes(g) ? 'bg-secondary text-secondary-foreground border-secondary' : 'border-border text-muted-foreground hover:text-foreground'}`
                }
              >
                {g}
              </button>
            ))}
            <Badge variant="secondary" className="ml-auto">Showing {filtered.length} subjects</Badge>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No subjects match your filters. Try clearing filters or searching different terms.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((subject) => {
              const Icon = iconMap[subject.icon_name || 'Book'];
              const isStudying = studying.includes(subject.subject_name);

              return (
                <Card
                  key={subject.id}
                  className="relative group hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate(`/curriculum/${subject.subject_name}`)}
                >
                  {isStudying && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Studying
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div 
                      className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: 'hsl(var(--secondary) / 0.15)' }}
                    >
                      <Icon className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-serif text-primary">
                      {subject.subject_name}
                    </CardTitle>
                    <div className="flex justify-center gap-2 mt-2">
                      <CAPSBadge aligned={subject.caps_aligned} />
                      <Badge variant="outline">Grade {subject.grade_level}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-3">{subject.description}</CardDescription>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Book className="h-4 w-4" />
                        {subject.total_chapters} chapters
                      </span>
                      {subject.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {subject.estimated_hours}h
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isStudying}
                        onClick={(e) => { e.stopPropagation(); handleAddSubject(subject); }}
                      >
                        {isStudying ? 'Added' : (<span className="flex items-center gap-1"><Plus className="h-4 w-4" /> Add to My Subjects</span>)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/curriculum/${subject.subject_name}`); }}
                      >
                        Start Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
