import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ReputationBadge } from '@/components/community/ReputationBadge';
import { Award, TrendingUp, Star, Shield, MessageSquare, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ReputationData {
  reputation_score: number;
  current_level: string;
  helpful_posts: number;
  quality_resources: number;
  positive_ratings: number;
  solutions_marked: number;
  warnings_received: number;
}

interface ReputationChange {
  change_type: string;
  points_change: number;
  description: string;
  created_at: string;
}

interface ReputationDisplayProps {
  userId: string;
}

const levelThresholds = {
  Newcomer: 0,
  Contributor: 100,
  Trusted: 500,
  Leader: 1000,
};

const levelNames = ['Newcomer', 'Contributor', 'Trusted', 'Leader'] as const;

export function ReputationDisplay({ userId }: ReputationDisplayProps) {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [recentChanges, setRecentChanges] = useState<ReputationChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReputation();
  }, [userId]);

  const fetchReputation = async () => {
    try {
      // Fetch reputation data
      const { data: repData, error: repError } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (repError && repError.code !== 'PGRST116') throw repError;

      // If no reputation record exists, create default one
      if (!repData) {
        const { data: newRep } = await supabase
          .from('user_reputation')
          .insert([{ user_id: userId }])
          .select()
          .single();
        setReputation(newRep || null);
      } else {
        setReputation(repData);
      }

      // Fetch recent changes
      const { data: changes, error: changesError } = await supabase
        .from('reputation_changes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (changesError) throw changesError;
      setRecentChanges(changes || []);
    } catch (error: any) {
      console.error('Error fetching reputation:', error);
      toast.error('Failed to load reputation data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !reputation) {
    return <Card className="p-6">Loading reputation...</Card>;
  }

  const currentLevel = reputation.current_level as keyof typeof levelThresholds;
  const currentIndex = levelNames.indexOf(currentLevel);
  const nextLevel = levelNames[currentIndex + 1];
  const currentThreshold = levelThresholds[currentLevel];
  const nextThreshold = nextLevel ? levelThresholds[nextLevel] : Infinity;
  const progressToNext = nextLevel
    ? ((reputation.reputation_score - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  const contributionBreakdown = [
    { label: 'Helpful Posts', value: reputation.helpful_posts, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Quality Resources', value: reputation.quality_resources, icon: FileText, color: 'text-green-600' },
    { label: 'Solutions Marked', value: reputation.solutions_marked, icon: Shield, color: 'text-primary' },
    { label: 'Positive Ratings', value: reputation.positive_ratings, icon: Star, color: 'text-secondary' },
  ];

  return (
    <div className="space-y-6">
      {/* Main Reputation Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-secondary/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Reputation Score</h2>
            <p className="text-4xl font-bold text-primary">{reputation.reputation_score}</p>
          </div>
          <ReputationBadge
            level={reputation.current_level}
            score={reputation.reputation_score}
            size="lg"
          />
        </div>

        {/* Progress to Next Level */}
        {nextLevel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextLevel}</span>
              <span className="font-semibold text-foreground">
                {reputation.reputation_score} / {nextThreshold}
              </span>
            </div>
            <Progress value={progressToNext} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {nextThreshold - reputation.reputation_score} points to go!
            </p>
          </div>
        )}
      </Card>

      {/* Contribution Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Contribution Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {contributionBreakdown.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-lg bg-background ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentChanges.length > 0 ? (
            recentChanges.map((change) => (
              <div
                key={change.created_at}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    change.points_change > 0
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  <span className="text-sm font-bold">
                    {change.points_change > 0 ? '+' : ''}
                    {change.points_change}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{change.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reputation activity yet. Start contributing to earn points!
            </p>
          )}
        </div>
      </Card>

      {/* Warnings (if any) */}
      {reputation.warnings_received > 0 && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <Award className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {reputation.warnings_received} Warning{reputation.warnings_received > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Each warning deducts 50 reputation points
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
