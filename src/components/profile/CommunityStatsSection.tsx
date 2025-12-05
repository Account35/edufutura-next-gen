import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Trophy, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CommunityStats {
  groupsJoined: number;
  resourcesShared: number;
  reputationScore: number;
  reputationLevel: string;
  helpfulPosts: number;
}

interface CommunityStatsSectionProps {
  userId: string;
}

export const CommunityStatsSection = ({ userId }: CommunityStatsSectionProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CommunityStats>({
    groupsJoined: 0,
    resourcesShared: 0,
    reputationScore: 0,
    reputationLevel: 'Newcomer',
    helpfulPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunityStats();
  }, [userId]);

  const loadCommunityStats = async () => {
    try {
      // Groups joined
      const { count: groupCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Resources shared
      const { count: resourceCount } = await supabase
        .from('shared_resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Reputation
      const { data: reputation } = await supabase
        .from('user_reputation')
        .select('reputation_score, helpful_posts')
        .eq('user_id', userId)
        .single();

      // Calculate reputation level from score
      const score = reputation?.reputation_score || 0;
      let level = 'Newcomer';
      if (score >= 1000) level = 'Leader';
      else if (score >= 500) level = 'Trusted';
      else if (score >= 100) level = 'Contributor';

      setStats({
        groupsJoined: groupCount || 0,
        resourcesShared: resourceCount || 0,
        reputationScore: score,
        reputationLevel: level,
        helpfulPosts: reputation?.helpful_posts || 0,
      });
    } catch (error) {
      console.error('Error loading community stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Groups Joined',
      value: stats.groupsJoined,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      onClick: () => navigate('/community/groups'),
    },
    {
      label: 'Resources Shared',
      value: stats.resourcesShared,
      icon: FileText,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      onClick: () => navigate('/community/resources'),
    },
    {
      label: 'Forum Reputation',
      value: stats.reputationScore,
      icon: Trophy,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      badge: stats.reputationLevel,
      onClick: () => navigate('/community/forums'),
    },
    {
      label: 'Helpful Posts',
      value: stats.helpfulPosts,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      onClick: () => navigate('/community/forums'),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Contributions</CardTitle>
          <CardDescription>Your participation in the EduFutura community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Contributions</CardTitle>
        <CardDescription>Your participation in the EduFutura community</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  'p-6 rounded-xl border-2 border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md',
                  'flex flex-col items-center text-center space-y-3'
                )}
                onClick={stat.onClick}
              >
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                  <Icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  {stat.badge && (
                    <p className="text-xs text-secondary font-semibold mt-1">{stat.badge}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
