import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReputationBadge } from '@/components/community/ReputationBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FullPageLoader } from '@/components/ui/loading';
import { toast } from 'sonner';

interface LeaderboardUser {
  user_id: string;
  reputation_score: number;
  current_level: string;
  helpful_posts: number;
  quality_resources: number;
  solutions_marked: number;
  users: {
    full_name: string;
    profile_picture_url: string | null;
    grade_level: number;
  };
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all-time' | 'month' | 'week'>('all-time');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, gradeFilter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('user_reputation')
        .select(`
          user_id,
          reputation_score,
          current_level,
          helpful_posts,
          quality_resources,
          solutions_marked,
          users!inner (
            full_name,
            profile_picture_url,
            grade_level
          )
        `)
        .order('reputation_score', { ascending: false })
        .limit(100);

      // Apply grade filter
      if (gradeFilter !== 'all') {
        query = query.eq('users.grade_level', gradeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeaderboard(data || []);

      // Fetch user's rank if logged in
      if (user) {
        const { count } = await supabase
          .from('user_reputation')
          .select('*', { count: 'exact', head: true })
          .gt('reputation_score', data?.[0]?.reputation_score || 0);

        const { count: totalCount } = await supabase
          .from('user_reputation')
          .select('*', { count: 'exact', head: true });

        if (count !== null && totalCount !== null) {
          setUserRank({ rank: count + 1, total: totalCount });
        }
      }
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getPodiumStyles = (rank: number) => {
    switch (rank) {
      case 0:
        return 'bg-gradient-to-br from-yellow-100 to-secondary/20 border-2 border-secondary shadow-lg';
      case 1:
        return 'bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400 shadow-md';
      case 2:
        return 'bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-400 shadow-md';
      default:
        return '';
    }
  };

  const getPodiumIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="h-6 w-6 text-secondary" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-600" />;
      case 2:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <FullPageLoader message="Loading leaderboard..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Community Leaderboard</h1>
          <p className="text-muted-foreground">
            Top contributors who make EduFutura a better place to learn
          </p>
        </div>

        {/* User's Rank Card */}
        {user && userRank && (
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-secondary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Rank</p>
                  <p className="text-3xl font-bold text-primary">
                    #{userRank.rank}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    out of {userRank.total} members
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={gradeFilter.toString()} onValueChange={(v) => setGradeFilter(v === 'all' ? 'all' : parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[6, 7, 8, 9, 10, 11, 12].map((grade) => (
                <SelectItem key={grade} value={grade.toString()}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {leaderboard.map((member, index) => (
            <Card
              key={member.user_id}
              className={`p-6 transition-all hover:shadow-md ${getPodiumStyles(index)}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background">
                  {index < 3 ? (
                    getPodiumIcon(index)
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-14 w-14 border-2 border-secondary">
                  <AvatarImage src={member.users.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-secondary/20 text-primary font-semibold">
                    {member.users.full_name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {member.users.full_name}
                    </h3>
                    <ReputationBadge
                      level={member.current_level}
                      score={member.reputation_score}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Grade {member.users.grade_level}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {member.reputation_score}
                    </p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {member.helpful_posts}
                    </p>
                    <p className="text-xs text-muted-foreground">Helpful Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {member.solutions_marked}
                    </p>
                    <p className="text-xs text-muted-foreground">Solutions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">
                      {member.quality_resources}
                    </p>
                    <p className="text-xs text-muted-foreground">Resources</p>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="flex md:hidden flex-col items-end">
                  <p className="text-2xl font-bold text-primary">
                    {member.reputation_score}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {leaderboard.length === 0 && (
          <Card className="p-12 text-center">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Rankings Yet
            </h3>
            <p className="text-muted-foreground">
              Be the first to contribute and earn reputation points!
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
