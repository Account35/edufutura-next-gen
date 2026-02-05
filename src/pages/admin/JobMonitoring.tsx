import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Play, Trash2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface BackgroundJob {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  attempts_count: number;
  max_attempts: number;
  error_message?: string;
  created_at: string;
}

export default function JobMonitoring() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('background_jobs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedData = (data || []) as unknown as BackgroundJob[];
      setJobs(typedData);

      // Calculate stats
      const statusCounts = typedData.reduce(
        (acc, job) => {
          acc[job.status]++;
          return acc;
        },
        { pending: 0, processing: 0, completed: 0, failed: 0 }
      );
      setStats(statusCounts);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('background_jobs' as any)
        .update({
          status: 'pending',
          scheduled_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({ title: 'Job requeued for retry' });
      fetchJobs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry job',
        variant: 'destructive',
      });
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const { error } = await supabase
        .from('background_jobs' as any)
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({ title: 'Job deleted' });
      fetchJobs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete job',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: BackgroundJob['status']) => {
    const variants: Record<typeof status, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      processing: { variant: 'default', icon: RefreshCw },
      completed: { variant: 'default', icon: CheckCircle2 },
      failed: { variant: 'destructive', icon: XCircle },
    };

    const { variant, icon: Icon } = variants[status];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const filterJobs = (status?: BackgroundJob['status']) => {
    return status ? jobs.filter((j) => j.status === status) : jobs;
  };

  return (
    <AdminLayout title="Background Jobs" subtitle="Monitor and manage asynchronous tasks">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job Queue</CardTitle>
            <CardDescription>Recent background jobs and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <JobsTable jobs={filterJobs()} onRetry={retryJob} onDelete={deleteJob} getStatusBadge={getStatusBadge} />
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <JobsTable jobs={filterJobs('pending')} onRetry={retryJob} onDelete={deleteJob} getStatusBadge={getStatusBadge} />
              </TabsContent>
              <TabsContent value="failed" className="mt-4">
                <JobsTable jobs={filterJobs('failed')} onRetry={retryJob} onDelete={deleteJob} getStatusBadge={getStatusBadge} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function JobsTable({
  jobs,
  onRetry,
  onDelete,
  getStatusBadge,
}: {
  jobs: BackgroundJob[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  getStatusBadge: (status: BackgroundJob['status']) => JSX.Element;
}) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No jobs found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Error</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.job_type}</TableCell>
            <TableCell>{getStatusBadge(job.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </TableCell>
            <TableCell>
              {job.attempts_count} / {job.max_attempts}
            </TableCell>
            <TableCell>
              {job.error_message && (
                <div className="flex items-start gap-1 text-sm text-destructive max-w-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="truncate">{job.error_message}</span>
                </div>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
              {job.status === 'failed' && (
                <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDelete(job.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
