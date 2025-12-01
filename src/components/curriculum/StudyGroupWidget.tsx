import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StudyGroupWidgetProps {
  subjectName: string;
  chapterId: string;
}

interface StudyGroup {
  id: string;
  group_name: string;
  member_count: number;
  max_members: number;
  group_avatar_url: string | null;
}

export const StudyGroupWidget = ({ subjectName, chapterId }: StudyGroupWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelevantGroups();
  }, [subjectName, chapterId]);

  const loadRelevantGroups = async () => {
    try {
      const { data } = await supabase
        .from('study_groups')
        .select('id, group_name, member_count, max_members, group_avatar_url')
        .contains('subject_names', [subjectName])
        .eq('is_active', true)
        .eq('privacy_level', 'public')
        .order('member_count', { ascending: false })
        .limit(3);

      setGroups(data || []);
    } catch (error) {
      console.error('Error loading study groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Study Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to start a study group for this chapter
            </p>
            <Button onClick={() => navigate('/community/groups')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/community/groups/${group.id}`)}
              >
                <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{group.group_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.member_count}/{group.max_members} members
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">Join</Badge>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/community/groups')}
            >
              See All Groups
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
