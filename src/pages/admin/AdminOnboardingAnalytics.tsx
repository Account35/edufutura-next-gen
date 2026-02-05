 import { useState, useEffect } from 'react';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { Skeleton } from '@/components/ui/skeleton';
 import { supabase } from '@/integrations/supabase/client';
 import { Users, CheckCircle, Clock, AlertTriangle, RefreshCw, TrendingUp, Mail, UserX } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface OnboardingStats {
   total_started: number;
   total_completed: number;
   completion_rate: number;
   avg_completion_time_hours: number;
   abandoned_24h: number;
   abandoned_72h: number;
   abandoned_7d: number;
 }
 
 interface IncompleteUser {
   user_id: string;
   email: string;
   full_name: string;
   onboarding_started_at: string;
   onboarding_step: number | null;
 }
 
 interface ReminderLog {
   id: string;
   reminder_type: string;
   channel: string;
   sent_at: string;
   success: boolean;
   clicked_at: string | null;
   completed_after: boolean;
 }
 
 export default function AdminOnboardingAnalytics() {
   const [stats, setStats] = useState<OnboardingStats | null>(null);
   const [incompleteUsers, setIncompleteUsers] = useState<IncompleteUser[]>([]);
   const [recentReminders, setRecentReminders] = useState<ReminderLog[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isSendingReminders, setIsSendingReminders] = useState(false);
 
   const fetchData = async () => {
     setIsLoading(true);
     try {
       const { data: statsData } = await supabase.rpc('get_onboarding_stats');
       if (statsData?.[0]) setStats(statsData[0] as OnboardingStats);
 
       const { data: usersData } = await supabase.rpc('get_incomplete_onboarding_users', {
         hours_since_start: 24,
         max_reminders_per_day: 1,
       });
       setIncompleteUsers((usersData || []) as IncompleteUser[]);
 
       const { data: remindersData } = await supabase
         .from('onboarding_reminder_log' as any)
         .select('*')
         .order('sent_at', { ascending: false })
         .limit(20);
       setRecentReminders((remindersData || []) as unknown as ReminderLog[]);
     } catch (error) {
       console.error('Error fetching onboarding analytics:', error);
       toast.error('Failed to load analytics');
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => { fetchData(); }, []);
 
   const handleSendReminders = async () => {
     setIsSendingReminders(true);
     try {
       const { data, error } = await supabase.functions.invoke('send-onboarding-reminders', {
         body: { hours_since_start: 24, dry_run: false },
       });
       if (error) throw error;
       toast.success(`Processed ${data?.processed || 0} users`);
       fetchData();
     } catch (error) {
       toast.error('Failed to send reminders');
     } finally {
       setIsSendingReminders(false);
     }
   };
 
   const formatTimeAgo = (dateStr: string) => {
     const diffHours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
     if (diffHours < 1) return 'Less than 1 hour ago';
     if (diffHours < 24) return `${diffHours} hours ago`;
     return `${Math.floor(diffHours / 24)} days ago`;
   };
 
   if (isLoading) {
     return (
       <AdminLayout>
         <div className="space-y-6">
           <Skeleton className="h-8 w-64" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
           </div>
         </div>
       </AdminLayout>
     );
   }
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold text-foreground">Onboarding Analytics</h1>
             <p className="text-muted-foreground">Monitor user onboarding completion</p>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
             <Button onClick={handleSendReminders} disabled={isSendingReminders}>
               <Mail className="w-4 h-4 mr-2" />{isSendingReminders ? 'Sending...' : 'Send Reminders'}
             </Button>
           </div>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Total Started</CardTitle>
               <Users className="w-4 h-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats?.total_started || 0}</div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
               <TrendingUp className="w-4 h-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats?.completion_rate || 0}%</div>
               <Progress value={stats?.completion_rate || 0} className="h-2 mt-2" />
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
               <Clock className="w-4 h-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats?.avg_completion_time_hours ? `${stats.avg_completion_time_hours.toFixed(1)}h` : 'N/A'}</div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Abandoned (7d)</CardTitle>
               <UserX className="w-4 h-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-destructive">{stats?.abandoned_7d || 0}</div>
             </CardContent>
           </Card>
         </div>
 
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Users Needing Reminders</CardTitle>
             </CardHeader>
             <CardContent>
               {incompleteUsers.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground"><CheckCircle className="w-12 h-12 mx-auto mb-2 text-primary/30" /><p>All caught up!</p></div>
               ) : (
                 <div className="space-y-2 max-h-[300px] overflow-y-auto">
                   {incompleteUsers.map((u) => (
                     <div key={u.user_id} className="flex justify-between p-2 bg-muted/50 rounded">
                       <div><p className="font-medium truncate">{u.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                       <Badge variant="outline">Step {u.onboarding_step || 0}</Badge>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Recent Reminders</CardTitle>
             </CardHeader>
             <CardContent>
               {recentReminders.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground"><Mail className="w-12 h-12 mx-auto mb-2 text-primary/30" /><p>No reminders yet</p></div>
               ) : (
                 <div className="space-y-2 max-h-[300px] overflow-y-auto">
                   {recentReminders.map((r) => (
                     <div key={r.id} className="flex justify-between p-2 bg-muted/50 rounded">
                       <div><Badge variant={r.success ? 'default' : 'destructive'}>{r.reminder_type}</Badge><p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(r.sent_at)}</p></div>
                       {r.clicked_at && <Badge variant="secondary">Clicked</Badge>}
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
         </div>
       </div>
     </AdminLayout>
   );
 }