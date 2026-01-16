import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  ai_confidence: number;
  issues_detected: string[];
  moderation_decision: string;
  reviewed: boolean;
  created_at: string;
}

export default function ModerationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'removed'>('flagged');

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    // Check if user has admin or moderator role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator']);

    if (!roles || roles.length === 0) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
      // Navigate to admin root instead of student dashboard
      navigate('/admin');
      return;
    }

    loadModerationQueue();
  };

  const loadModerationQueue = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('content_moderation_log')
        .select('*')
        .eq('reviewed', false)
        .order('ai_confidence', { ascending: false })
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('moderation_decision', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading moderation queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load moderation queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('content_moderation_log')
        .update({
          reviewed: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          moderation_decision: 'approved',
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Content Approved',
        description: 'The content has been approved and published',
      });

      loadModerationQueue();
    } catch (error) {
      console.error('Error approving content:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve content',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (item: ModerationItem) => {
    try {
      // Update moderation log
      const { error: logError } = await supabase
        .from('content_moderation_log')
        .update({
          reviewed: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          moderation_decision: 'removed',
        })
        .eq('id', item.id);

      if (logError) throw logError;

      // Issue warning to user
      const { error: warningError } = await supabase
        .from('user_warnings')
        .insert({
          user_id: item.user_id,
          warning_reason: `Content violated community guidelines: ${item.issues_detected.join(', ')}`,
          content_type: item.content_type,
          content_id: item.content_id,
          warned_by: user?.id,
        });

      if (warningError) throw warningError;

      toast({
        title: 'Content Removed',
        description: 'The content has been removed and user has been warned',
      });

      loadModerationQueue();
    } catch (error) {
      console.error('Error removing content:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove content',
        variant: 'destructive',
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.9) return 'text-red-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <AdminLayout title="Moderation Dashboard" subtitle="Review and manage flagged content">
      <div className="space-y-6">

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="flagged">
              Flagged
              {items.filter(i => i.moderation_decision === 'flagged').length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {items.filter(i => i.moderation_decision === 'flagged').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="removed">Removed</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading moderation queue...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">All Clear!</p>
            <p className="text-muted-foreground">No items pending moderation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={item.moderation_decision === 'removed' ? 'destructive' : 'secondary'}>
                        {item.content_type}
                      </Badge>
                      <Badge variant="outline">
                        User ID: {item.user_id.substring(0, 8)}
                      </Badge>
                      <span className={`text-sm font-semibold ${getConfidenceColor(item.ai_confidence)}`}>
                        {Math.round(item.ai_confidence * 100)}% Confidence
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.issues_detected.map((issue, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {issue}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Flagged {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      onClick={() => handleApprove(item.id)}
                      variant="outline" 
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleRemove(item)}
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}