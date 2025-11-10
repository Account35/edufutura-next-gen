import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentUploadForm } from '@/components/admin/ContentUploadForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function AdminContent() {
  const navigate = useNavigate();
  const { isAdminOrEducator, loading: roleLoading } = useAdminRole();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdminOrEducator) {
      navigate('/dashboard');
    }
  }, [isAdminOrEducator, roleLoading, navigate]);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .order('subject_name');

      if (error) {
        console.error('Error fetching subjects:', error);
      } else {
        setSubjects(data || []);
        if (data && data.length > 0) {
          setSelectedSubject(data[0].id);
        }
      }
      setLoading(false);
    };

    if (isAdminOrEducator) {
      fetchSubjects();
    }
  }, [isAdminOrEducator]);

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminOrEducator) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-primary font-serif">Content Management</h1>
            <p className="text-muted-foreground">Upload and manage curriculum content</p>
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You have administrator access. Use this interface to upload curriculum content for students.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="manage">Manage Chapters</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Chapter</CardTitle>
                <CardDescription>
                  Upload curriculum content in Markdown format with optional PDFs and videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Select Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subject_name} (Grade {subject.grade_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSubject && (
                  <ContentUploadForm
                    subjectId={selectedSubject}
                    onSuccess={() => {
                      // Refresh or navigate
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Manage Chapters</CardTitle>
                <CardDescription>
                  View, edit, and delete existing chapters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chapter management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
