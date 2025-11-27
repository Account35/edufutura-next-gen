import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Filter, Heart, X } from 'lucide-react';

interface PotentialBuddy {
  id: string;
  full_name: string;
  grade_level: number;
  province: string;
  school_name: string;
  subjects_studying: string[];
  profile_picture_url: string | null;
  match_score: number;
  match_reasons: string[];
  common_subjects: string[];
}

export default function StudyBuddyFinder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<PotentialBuddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      calculateMatches();
    }
  }, [user]);

  const calculateMatches = async () => {
    try {
      setLoading(true);

      // Get current user's data
      const { data: userData } = await supabase
        .from('users')
        .select('*, study_preferences(*), user_progress(*)')
        .eq('id', user?.id)
        .single();

      if (!userData) return;

      // Get potential buddies (same grade, not current user)
      const { data: potentialBuddies } = await supabase
        .from('users')
        .select('*')
        .neq('id', user?.id)
        .eq('grade_level', userData.grade_level)
        .limit(100);

      if (!potentialBuddies) return;

      // Filter out existing connections
      const { data: existingConnections } = await supabase
        .from('study_buddies')
        .select('requester_id, recipient_id')
        .or(`requester_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .in('status', ['accepted', 'pending']);

      const connectedIds = new Set(
        existingConnections?.flatMap(conn => [conn.requester_id, conn.recipient_id]) || []
      );

      // Calculate match scores
      const scoredMatches = potentialBuddies
        .filter(buddy => !connectedIds.has(buddy.id))
        .map(buddy => {
          const userSubjects = Array.isArray(userData.subjects_studying) ? userData.subjects_studying : [];
          const buddySubjects = Array.isArray(buddy.subjects_studying) ? buddy.subjects_studying : [];
          
          const commonSubjects = userSubjects.filter(
            (subject: string) => buddySubjects.includes(subject)
          );

          const totalDistinctSubjects = new Set([
            ...userSubjects,
            ...buddySubjects
          ]).size;

          // Weighted scoring (simplified without study_preferences relation)
          const subjectScore = (commonSubjects.length / Math.max(totalDistinctSubjects, 1)) * 40;
          const locationScore = (userData.province === buddy.province) ? 20 : 0;
          const learningStyleScore = 15; // Default score
          const paceScore = 10; // Default score
          const goalScore = 15; // Default score

          const matchScore = Math.round(subjectScore + locationScore + learningStyleScore + paceScore + goalScore);

          const matchReasons = [];
          if (commonSubjects.length > 0) {
            matchReasons.push(`You both study ${commonSubjects.slice(0, 2).join(', ')}`);
          }
          if (locationScore > 0) {
            matchReasons.push(`Both in ${userData.province}`);
          }

          return {
            id: buddy.id,
            full_name: buddy.full_name || '',
            grade_level: buddy.grade_level || 10,
            province: buddy.province || '',
            school_name: 'Grade ' + (buddy.grade_level || 10),
            subjects_studying: buddySubjects as string[],
            profile_picture_url: buddy.profile_picture_url || null,
            match_score: matchScore,
            match_reasons: matchReasons,
            common_subjects: commonSubjects as string[],
          };
        })
        .filter(match => match.match_score > 30) // Minimum threshold
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 15); // Top 15 matches

      setMatches(scoredMatches);
    } catch (error) {
      console.error('Error calculating matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to find study buddies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (buddyId: string) => {
    navigate(`/community/study-buddies/request/${buddyId}`);
  };

  const handleNotInterested = async (buddyId: string) => {
    setMatches(matches.filter(m => m.id !== buddyId));
    toast({
      title: 'Removed',
      description: 'This suggestion has been removed',
    });
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = searchQuery === '' || 
      match.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubjects = selectedSubjects.length === 0 ||
      selectedSubjects.some(subject => match.common_subjects.includes(subject));
    
    return matchesSearch && matchesSubjects;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Find Study Buddies</h1>
          <p className="text-muted-foreground">
            Connect with classmates who share your academic interests
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button variant="outline" className="sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Finding your perfect study matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">No matches found</p>
            <p className="text-muted-foreground">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <Card key={match.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold">
                      {match.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{match.full_name.split(' ')[0]} {match.full_name.split(' ')[1]?.[0]}.</h3>
                      <p className="text-sm text-muted-foreground">Grade {match.grade_level}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">{match.match_score}%</div>
                    <p className="text-xs text-muted-foreground">Match</p>
                  </div>
                </div>

                <Progress value={match.match_score} className="mb-4" />

                <div className="space-y-3 mb-4">
                  {match.common_subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {match.common_subjects.slice(0, 3).map((subject) => (
                        <Badge key={subject} variant="secondary">{subject}</Badge>
                      ))}
                      {match.common_subjects.length > 3 && (
                        <Badge variant="outline">+{match.common_subjects.length - 3}</Badge>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">{match.school_name}</p>
                  
                  {match.match_reasons.length > 0 && (
                    <p className="text-sm text-foreground">{match.match_reasons[0]}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSendRequest(match.id)}
                    className="flex-1"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Send Request
                  </Button>
                  <Button 
                    onClick={() => handleNotInterested(match.id)}
                    variant="outline"
                    size="icon"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}