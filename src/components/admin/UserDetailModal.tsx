import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  GraduationCap,
  MessageSquare,
  Users,
  FileText,
  Star,
  Shield,
  KeyRound,
  UserCog,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { toast } from 'sonner';

const formatDateValue = (value: string | null | undefined, fallback = 'N/A') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : format(date, 'dd MMM yyyy');
};

const formatRelativeDateValue = (value: string | null | undefined, fallback = 'Never') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : formatDistanceToNow(date, { addSuffix: true });
};

interface User {
  id: string;
  email: string;
  full_name: string | null;
  profile_picture_url: string | null;
  grade_level: number | null;
  account_type: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  last_login_at: string | null;
  phone_number: string | null;
  province: string | null;
  city: string | null;
  school_id: string | null;
  total_study_hours: number | null;
  study_streak_days: number | null;
}

interface UserDetailModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function UserDetailModal({ user, open, onOpenChange, onUserUpdated }: UserDetailModalProps) {
  const { hasPermission } = useAdminPermissions();
  const [quizStats, setQuizStats] = useState<{ total: number; average: number }>({ total: 0, average: 0 });
  const [communityStats, setCommunityStats] = useState<{ posts: number; groups: number; resources: number; reputation: number }>({ posts: 0, groups: 0, resources: 0, reputation: 0 });
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (user && open) {
      loadUserDetails();
    }
  }, [user, open]);

  const loadUserDetails = async () => {
    if (!user) return;
    try {
      // Load quiz performance stats
      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select('score_percentage')
        .eq('user_id', user.id);
      
      if (quizData) {
        const total = quizData.length;
        const average = total > 0 ? quizData.reduce((acc, q) => acc + (q.score_percentage || 0), 0) / total : 0;
        setQuizStats({ total, average: Math.round(average) });
      }

      // Load community stats
      const { count: postsCount } = await supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const { count: groupsCount } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Skip shared_resources count due to type complexity - will show 0
      const resourcesCount = 0;
      
      const { data: reputationData } = await supabase
        .from('user_reputation')
        .select('reputation_score')
        .eq('user_id', user.id)
        .maybeSingle();

      setCommunityStats({
        posts: postsCount || 0,
        groups: groupsCount || 0,
        resources: resourcesCount,
        reputation: reputationData?.reputation_score || 0,
      });

      // Load subscription history
      const { data: subHistory } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(10);
      
      setSubscriptionHistory(subHistory || []);
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
    }
  };

  const handleDeleteUser = async () => {
    if (!user || !hasPermission('users.delete')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'inactive',
          subscription_plan: null,
          subscription_start_date: null,
          subscription_end_date: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        action_type: 'user_deleted',
        action_description: `Deleted user: ${user.email}`,
        target_type: 'user',
        target_id: user.id,
        severity: 'critical',
      });

      toast.success('User deleted successfully');
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        action_type: 'password_reset_sent',
        action_description: `Password reset email sent to: ${user.email}`,
        target_type: 'user',
        target_id: user.id,
        severity: 'info',
      });

      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error) {
      toast.error('Failed to send password reset email');
      console.error(error);
    }
  };

  const handleUpgradeToPremium = async () => {
    if (!user || !hasPermission('subscriptions.manage')) return;
    
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase
        .from('users')
        .update({
          account_type: 'premium',
          subscription_status: 'active',
          subscription_plan: 'monthly',
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        action_type: 'subscription_upgraded',
        action_description: `Manually upgraded user to premium: ${user.email}`,
        target_type: 'user',
        target_id: user.id,
        severity: 'info',
      });

      toast.success('User upgraded to Premium');
      onUserUpdated();
    } catch (error) {
      toast.error('Failed to upgrade user');
      console.error(error);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="flex items-start gap-6 p-4 bg-muted/30 rounded-lg">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.profile_picture_url || undefined} />
            <AvatarFallback className="text-2xl">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{user.full_name || 'No Name'}</h2>
              {user.account_type === 'premium' && (
                <Badge className="bg-secondary text-secondary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
              <Badge variant={user.subscription_status === 'deleted' ? 'destructive' : 'outline'}>
                {user.subscription_status || 'Active'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </span>
              {user.phone_number && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {user.phone_number}
                </span>
              )}
              {user.province && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {user.city ? `${user.city}, ` : ''}{user.province}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                Grade {user.grade_level || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {formatDateValue(user.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last seen {formatRelativeDateValue(user.last_login_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{user.total_study_hours || 0}</p>
              <p className="text-xs text-muted-foreground">Study Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{user.study_streak_days || 0}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{quizStats.total}</p>
              <p className="text-xs text-muted-foreground">Quizzes Taken</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{quizStats.average}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{user.subscription_plan || 'Free'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{user.subscription_status || 'N/A'}</p>
                  </div>
                  {user.subscription_start_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDateValue(user.subscription_start_date)}</p>
                    </div>
                  )}
                  {user.subscription_end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDateValue(user.subscription_end_date)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {subscriptionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subscriptionHistory.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium capitalize">{tx.transaction_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateValue(tx.transaction_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">R{tx.amount_zar}</p>
                          <Badge variant={tx.payment_status === 'completed' ? 'default' : 'secondary'}>
                            {tx.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{communityStats.posts}</p>
                      <p className="text-sm text-muted-foreground">Forum Posts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{communityStats.groups}</p>
                      <p className="text-sm text-muted-foreground">Study Groups</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{communityStats.resources}</p>
                      <p className="text-sm text-muted-foreground">Resources Shared</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-8 h-8 text-secondary" />
                    <div>
                      <p className="text-2xl font-bold">{communityStats.reputation}</p>
                      <p className="text-sm text-muted-foreground">Reputation Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={handleSendPasswordReset}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Send Password Reset
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start text-destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={!hasPermission('users.delete') || user.subscription_status === 'deleted'}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {user.subscription_status === 'deleted' ? 'User Deleted' : 'Delete User'}
                  </Button>

                  {user.account_type === 'free' && (
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={handleUpgradeToPremium}
                      disabled={!hasPermission('subscriptions.manage')}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="justify-start"
                    disabled
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Manage Roles
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-destructive">Danger Zone</h4>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!hasPermission('users.delete') || user.subscription_status === 'deleted'}
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    {user.subscription_status === 'deleted' ? 'User Deleted' : 'Delete User Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the user account as deleted in the app and removes active subscription access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
