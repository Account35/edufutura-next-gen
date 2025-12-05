import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, MapPin } from 'lucide-react';

interface CareerBuddy {
  id: string;
  user_id: string;
  full_name: string;
  profile_picture_url: string | null;
  grade_level: number;
  common_careers: string[];
  common_institutions: string[];
  match_score: number;
}

export const CareerBuddySection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState<CareerBuddy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCareerBuddies();
    }
  }, [user]);

  const loadCareerBuddies = async () => {
    try {
      // This would be enhanced with actual career matching algorithm
      // For now, showing placeholder structure
      const { data: potentialBuddies } = await supabase
        .from('users')
        .select('id, full_name, profile_picture_url, grade_level')
        .neq('id', user?.id)
        .limit(3);

      if (potentialBuddies) {
        const enrichedBuddies = potentialBuddies.map((buddy: any) => ({
          ...buddy,
          user_id: buddy.id,
          common_careers: ['Engineering', 'Medicine'],
          common_institutions: ['UCT', 'Wits'],
          match_score: 85,
        }));
        setBuddies(enrichedBuddies);
      }
    } catch (error) {
      console.error('Error loading career buddies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || buddies.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-orange-500" />
          Application Buddies
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect with students applying to the same universities
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {buddies.map((buddy) => (
          <div
            key={buddy.id}
            className="p-4 rounded-lg border hover:border-orange-300 transition-colors cursor-pointer"
            onClick={() => navigate(`/profile/${buddy.user_id}`)}
          >
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{buddy.full_name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {buddy.match_score}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Grade {buddy.grade_level}</p>
                {buddy.common_institutions.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <MapPin className="h-3 w-3 text-orange-500" />
                    <p className="text-xs text-muted-foreground">
                      Also applying to {buddy.common_institutions.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/community/study-buddies')}
        >
          Find More Application Buddies
        </Button>
      </CardContent>
    </Card>
  );
};
