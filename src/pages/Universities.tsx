import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Building2, MapPin, Search, BookmarkPlus, Bookmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Institution = {
  id: string;
  institution_name: string;
  institution_type: string;
  province: string;
  city: string;
  courses_offered: any;
  institution_logo_url: string | null;
};

type InstitutionRecommendation = {
  institution_id: string;
  program_name: string;
  match_score: number;
  match_factors: any;
  admission_probability: string;
  saved: boolean;
};

const SA_PROVINCES = [
  'All Provinces',
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const INSTITUTION_TYPES = [
  'All Types',
  'University',
  'University of Technology',
  'College',
  'TVET College',
  'Private Institution',
];

const PROGRAM_TYPES = [
  'All Programs',
  'Engineering',
  'Commerce',
  'Health Sciences',
  'Education',
  'Technology',
  'Law',
  'Arts & Humanities',
  'Science',
];

export default function Universities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [recommendations, setRecommendations] = useState<Map<string, InstitutionRecommendation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('All Provinces');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [sortBy, setSortBy] = useState<'match' | 'location' | 'name'>('match');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all institutions
      const { data: instData, error: instError } = await supabase
        .from('tertiary_institutions')
        .select('*')
        .order('institution_name');

      if (instError) throw instError;
      setInstitutions(instData || []);

      // Fetch user's recommendations
      const { data: recData, error: recError } = await supabase
        .from('institution_recommendations')
        .select('*')
        .eq('user_id', user.id);

      if (recError) throw recError;
      
      const recMap = new Map<string, InstitutionRecommendation>();
      (recData || []).forEach((rec: any) => {
        recMap.set(rec.institution_id, rec);
      });
      setRecommendations(recMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading institutions',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedInstitutions = useMemo(() => {
    let filtered = institutions;

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inst.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (provinceFilter !== 'All Provinces') {
      filtered = filtered.filter((inst) => inst.province === provinceFilter);
    }

    if (typeFilter !== 'All Types') {
      filtered = filtered.filter((inst) => inst.institution_type === typeFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'match') {
        const scoreA = recommendations.get(a.id)?.match_score || 0;
        const scoreB = recommendations.get(b.id)?.match_score || 0;
        return scoreB - scoreA;
      } else if (sortBy === 'location') {
        return a.province.localeCompare(b.province);
      } else {
        return a.institution_name.localeCompare(b.institution_name);
      }
    });

    return sorted;
  }, [institutions, recommendations, searchTerm, provinceFilter, typeFilter, sortBy]);

  const handleToggleSave = async (institutionId: string) => {
    if (!user) return;

    const rec = recommendations.get(institutionId);
    const newSavedState = !rec?.saved;

    try {
      if (rec) {
        // Update existing recommendation
        const { error } = await supabase
          .from('institution_recommendations')
          .update({ saved: newSavedState })
          .eq('institution_id', institutionId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new recommendation
        const { error } = await supabase
          .from('institution_recommendations')
          .insert({
            user_id: user.id,
            institution_id: institutionId,
            saved: true,
            match_score: 0,
          });

        if (error) throw error;
      }

      // Update local state
      const updatedRecs = new Map(recommendations);
      updatedRecs.set(institutionId, {
        ...rec,
        institution_id: institutionId,
        program_name: rec?.program_name || '',
        match_score: rec?.match_score || 0,
        match_factors: rec?.match_factors || {},
        admission_probability: rec?.admission_probability || '',
        saved: newSavedState,
      });
      setRecommendations(updatedRecs);

      toast({
        title: newSavedState ? 'Added to shortlist' : 'Removed from shortlist',
        description: newSavedState ? 'Institution saved to your shortlist' : 'Institution removed from shortlist',
      });
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shortlist',
        variant: 'destructive',
      });
    }
  };

  const getMatchPercentage = (institutionId: string) => {
    const rec = recommendations.get(institutionId);
    return rec?.match_score ? Math.round(rec.match_score * 100) : null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Tertiary Institutions</h1>
          <p className="text-muted-foreground mt-2">
            Explore universities and colleges across South Africa
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search institutions or cities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SA_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Best Match</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Loading institutions...
            </div>
          ) : filteredAndSortedInstitutions.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No institutions found matching your criteria.
            </div>
          ) : (
            filteredAndSortedInstitutions.map((inst) => {
              const matchPercentage = getMatchPercentage(inst.id);
              const isSaved = recommendations.get(inst.id)?.saved || false;

              return (
                <Card key={inst.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <Badge variant="outline">{inst.institution_type}</Badge>
                        </div>
                        <CardTitle className="text-lg">{inst.institution_name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSave(inst.id)}
                      >
                        {isSaved ? (
                          <Bookmark className="h-4 w-4 fill-secondary text-secondary" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {inst.city}, {inst.province}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {matchPercentage !== null && (
                      <div className="bg-secondary/10 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Match Score</div>
                        <div className="text-2xl font-bold text-secondary">{matchPercentage}%</div>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/institutions/${encodeURIComponent(inst.institution_name)}`)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
