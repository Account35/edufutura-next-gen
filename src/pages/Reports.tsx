import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Download, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Reports() {
  const navigate = useNavigate();
  const { user, loading: isLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      loadReports();
    }
  }, [user, isLoading, navigate]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('year_end_reports')
        .select('*')
        .eq('user_id', user!.id)
        .order('academic_year', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return <FullPageLoader message="Loading reports..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Reports</h1>
            <p className="text-muted-foreground">
              View your uploaded year-end reports and AI analysis
            </p>
          </div>
          <Button onClick={() => navigate('/settings?tab=subscription')}>
            Upload New Report
          </Button>
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Upload your year-end report cards to track your academic progress"
            action={{
              label: 'Upload Report',
              onClick: () => navigate('/settings?tab=subscription')
            }}
          />
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {report.academic_year} - Grade {report.grade_level}
                      </CardTitle>
                      <CardDescription>
                        Uploaded {formatDistanceToNow(new Date(report.upload_date), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <Badge variant={report.pass_status === 'passed' ? 'default' : 'destructive'}>
                      {report.pass_status || 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.overall_percentage && (
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Average</p>
                      <p className="text-2xl font-bold">{report.overall_percentage}%</p>
                    </div>
                  )}

                  {report.subject_grades && Object.keys(report.subject_grades).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Subject Grades</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(report.subject_grades).map(([subject, grade]) => (
                          <div key={subject} className="flex justify-between p-2 rounded bg-muted/50">
                            <span className="text-sm">{subject}</span>
                            <span className="text-sm font-medium">{grade as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={report.report_file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        View Report
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={report.report_file_url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}