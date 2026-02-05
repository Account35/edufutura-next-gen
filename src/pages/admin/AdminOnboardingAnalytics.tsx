 import { useState, useEffect } from 'react';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { supabase } from '@/integrations/supabase/client';
 import { Loader2, Users, Clock, CheckCircle, XCircle, Mail, TrendingUp } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
 
 interface OnboardingStats {
   totalUsers: number;
   completedOnboarding: number;
   inProgress: number;
   abandoned24h: number;
   abandoned72h: number;
   abandoned7d: number;
   completionRate: number;
   avgCompletionTime: number;
 }
 
 export default function AdminOnboardingAnalytics() {
   const [stats, setStats] = useState<OnboardingStats | null>(null);
   const [recentReminders, setRecentReminders] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     loadStats();
     loadRecentReminders();
   }, []);
 
   const loadStats = async () => {
     try {
       // Fetch onboarding stats using RPC if available, otherwise calculate
       const { data: usersData, error } = await supabase
         .from('users')
         .select('id, onboarding_completed, onboarding_started_at, created_at');
 
       if (error) throw error;
 
       const now = new Date();
       const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
       const h72Ago = new Date(now.getTime() - 72 * 60 * 60 * 1000);
       const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 
       const total = usersData?.length || 0;
       const completed = usersData?.filter(u => u.onboarding_completed).length || 0;
       const inProgress = usersData?.filter(u => !u.onboarding_completed && u.onboarding_started_at).length || 0;
 
       // Users who started but didn't complete within timeframes
       const abandoned24h = usersData?.filter(u => {
         if (u.onboarding_completed) return false;
         const started = u.onboarding_started_at ? new Date(u.onboarding_started_at) : new Date(u.created_at);
         return started < h24Ago;
       }).length || 0;
 
       const abandoned72h = usersData?.filter(u => {
         if (u.onboarding_completed) return false;
         const started = u.onboarding_started_at ? new Date(u.onboarding_started_at) : new Date(u.created_at);
         return started < h72Ago;
       }).length || 0;
 
       const abandoned7d = usersData?.filter(u => {
         if (u.onboarding_completed) return false;
         const started = u.onboarding_started_at ? new Date(u.onboarding_started_at) : new Date(u.created_at);
         return started < d7Ago;
       }).length || 0;
 
       setStats({
         totalUsers: total,
         completedOnboarding: completed,
         inProgress,
         abandoned24h,
         abandoned72h,
         abandoned7d,
         completionRate: total > 0 ? (completed / total) * 100 : 0,
         avgCompletionTime: 0, // Would need more data to calculate
       });
     } catch (error) {
       console.error('Error loading onboarding stats:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const loadRecentReminders = async () => {
     try {
       const { data, error } = await supabase
         .from('onboarding_reminder_log')
         .select('*, users(full_name, email)')
         .order('sent_at', { ascending: false })
         .limit(20);
 
       if (error) throw error;
       setRecentReminders(data || []);
     } catch (error) {
       console.error('Error loading reminders:', error);
     }
   };
 
   if (loading) {
     return (
       <AdminLayout>
         <div className="flex items-center justify-center min-h-[400px]">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </AdminLayout>
     );
   }
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         <div>
           <h1 className="text-2xl font-bold text-foreground">Onboarding Analytics</h1>
           <p className="text-muted-foreground">Track student onboarding completion and engagement</p>
         </div>
 
         {/* Stats Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <Users className="h-4 w-4" />
                 Total Users
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <CheckCircle className="h-4 w-4 text-green-500" />
                 Completed
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">{stats?.completedOnboarding || 0}</div>
               <div className="mt-2">
                 <Progress value={stats?.completionRate || 0} className="h-2" />
                 <p className="text-xs text-muted-foreground mt-1">{stats?.completionRate.toFixed(1)}% completion rate</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <Clock className="h-4 w-4 text-amber-500" />
                 In Progress
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-amber-600">{stats?.inProgress || 0}</div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <XCircle className="h-4 w-4 text-red-500" />
                 Abandoned (7d+)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-red-600">{stats?.abandoned7d || 0}</div>
             </CardContent>
           </Card>
         </div>
 
         {/* Abandonment Breakdown */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5" />
               Abandonment Timeline
             </CardTitle>
             <CardDescription>Users who haven't completed onboarding</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                 <div className="text-3xl font-bold text-amber-600">{stats?.abandoned24h || 0}</div>
                 <p className="text-sm text-muted-foreground">After 24 hours</p>
               </div>
               <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                 <div className="text-3xl font-bold text-orange-600">{stats?.abandoned72h || 0}</div>
                 <p className="text-sm text-muted-foreground">After 72 hours</p>
               </div>
               <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                 <div className="text-3xl font-bold text-red-600">{stats?.abandoned7d || 0}</div>
                 <p className="text-sm text-muted-foreground">After 7 days</p>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Recent Reminders */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Mail className="h-5 w-5" />
               Recent Reminder Emails
             </CardTitle>
             <CardDescription>Last 20 onboarding reminder emails sent</CardDescription>
           </CardHeader>
           <CardContent>
             {recentReminders.length === 0 ? (
               <p className="text-muted-foreground text-center py-8">No reminders sent yet</p>
             ) : (
               <div className="space-y-2">
                 {recentReminders.map((reminder) => (
                   <div
                     key={reminder.id}
                     className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                   >
                     <div>
                       <p className="font-medium">{reminder.users?.full_name || 'Unknown User'}</p>
                       <p className="text-sm text-muted-foreground">{reminder.users?.email}</p>
                     </div>
                     <div className="text-right">
                       <span className={`px-2 py-1 text-xs rounded-full ${
                         reminder.status === 'sent' 
                           ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                           : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                       }`}>
                         {reminder.status}
                       </span>
                       <p className="text-xs text-muted-foreground mt-1">
                         {new Date(reminder.sent_at).toLocaleDateString()}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </AdminLayout>
   );
 }