import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, ShieldCheck, ClipboardList } from 'lucide-react';

interface StudyGroupDetail {
  id: string;
  group_name: string;
  group_description: string | null;
  member_count: number | null;
  max_members: number | null;
  privacy_level: string | null;
  subject_names: string[] | null;
  created_by: string;
}

export default function CommunityGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [group, setGroup] = useState<StudyGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      loadGroup();
    }
  }, [groupId]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: 'Group not found', description: 'This study group does not exist.', variant: 'destructive' });
        navigate('/community/groups');
        return;
      }

      setGroup(data as StudyGroupDetail);
    } catch (error) {
      console.error('Failed to load group details:', error);
      toast({ title: 'Failed to load group', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="h-64 animate-pulse" />
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">{group.group_name}</h1>
            <p className="text-muted-foreground">Study group details and membership information.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/community/groups')}>
            Back to Groups
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
            <CardDescription>{group.group_description || 'No description provided.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Users className="h-4 w-4" /> Members
                </div>
                <p className="mt-2 text-2xl font-bold">{group.member_count || 0}</p>
                <p className="text-sm text-muted-foreground">of {group.max_members || '—'} allowed</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <ClipboardList className="h-4 w-4" /> Subject
                </div>
                <p className="mt-2 text-2xl font-bold">{group.subject_names?.join(', ') || 'N/A'}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" /> Privacy
                </div>
                <p className="mt-2 text-2xl font-bold">{group.privacy_level || 'public'}</p>
              </div>
            </div>

            <div className="rounded-lg border p-6 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Study group pages are now available. In the next release, you will be able to join members,
                start group quizzes, and collaborate with your classmates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
