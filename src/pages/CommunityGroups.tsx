import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Users, Plus, Globe } from 'lucide-react';

interface StudyGroup {
  id: string;
  group_name: string;
  group_description: string | null;
  member_count: number | null;
  max_members: number | null;
  privacy_level: string | null;
  subject_names: string[] | null;
}

export default function CommunityGroups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const subjectParam = searchParams.get('subject') || '';
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [form, setForm] = useState({
    group_name: '',
    group_description: '',
    subject_name: subjectParam || '',
    privacy_level: 'public',
    max_members: 8,
  });
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadGroups();
    loadSubjects();
  }, [subjectParam, user, userProfile]);

  const loadGroups = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('study_groups')
        .select('id, group_name, group_description, member_count, max_members, privacy_level, subject_names')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (subjectParam) {
        query = query.contains('subject_names', [subjectParam]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error('Error loading study groups:', error);
      setLoadError(error?.message || 'Unable to load study groups');
      toast.error(error?.message || 'Unable to load study groups');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      let query = supabase
        .from('curriculum_subjects')
        .select('subject_name')
        .eq('is_published', true)
        .order('subject_name');

      if (userProfile?.grade_level) {
        query = query.eq('grade_level', userProfile.grade_level);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubjects((data || []).map((subject: any) => subject.subject_name));
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) {
      toast.error('Please sign in to create a group');
      return;
    }

    if (!form.group_name.trim() || !form.subject_name.trim()) {
      toast.error('Please provide a group name and subject');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .insert({
          group_name: form.group_name.trim(),
          group_description: form.group_description.trim(),
          created_by: user.id,
          is_active: true,
          member_count: 1,
          max_members: form.max_members,
          privacy_level: form.privacy_level,
          subject_names: [form.subject_name.trim()],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Study group created successfully');
      navigate(`/community/groups/${data.id}`);
    } catch (error: any) {
      console.error('Error creating study group:', error);
      toast.error(error?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Study Groups</h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse existing study groups or create a new one to collaborate with classmates.
            </p>
            {loadError && (
              <p className="mt-2 text-sm text-destructive">{loadError}</p>
            )}
          </div>
          <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
            <Plus className="mr-2 h-4 w-4" /> Create New Group
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start a Study Group</CardTitle>
            <CardDescription>Create a new group for your subject and invite classmates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  placeholder="e.g. Grade 11 Physics Study Group"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject</Label>
                <Select
                  value={form.subject_name}
                  onValueChange={(value) => setForm({ ...form, subject_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={2}
                  max={50}
                  value={form.max_members}
                  onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacyLevel">Privacy</Label>
                <Select
                  value={form.privacy_level}
                  onValueChange={(value) => setForm({ ...form, privacy_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">Group Description</Label>
              <Textarea
                id="groupDescription"
                value={form.group_description}
                onChange={(e) => setForm({ ...form, group_description: e.target.value })}
                placeholder="Describe the goals of this group and who should join."
                rows={4}
              />
            </div>

            <Button onClick={handleCreateGroup} loading={isCreating} className="w-full">
              Create Study Group
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/community/groups/${group.id}`)}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{group.group_name}</h2>
                    <p className="text-sm text-muted-foreground truncate">{group.group_description || 'No description provided'}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {group.privacy_level || 'public'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{group.subject_names?.join(', ') || 'Unspecified subject'}</span>
                  <span>{group.member_count || 0}/{group.max_members || 0} members</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {groups.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-10">
                <Users className="mx-auto mb-4 h-10 w-10 text-primary" />
                <p className="text-muted-foreground">No study groups are available yet. Create the first one!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
