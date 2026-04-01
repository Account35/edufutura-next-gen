import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Progress } from '@/components/ui/progress';
import { Mail, Download, Trash2, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

interface BulkUserActionsProps {
  selectedUsers: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkUserActions({ selectedUsers, onClearSelection, onActionComplete }: BulkUserActionsProps) {
  const { hasPermission } = useAdminPermissions();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExportUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('email, full_name, grade_level, account_type, subscription_status, created_at')
        .in('id', selectedUsers);

      if (error) throw error;

      // Convert to CSV
      const headers = ['Email', 'Name', 'Grade', 'Account Type', 'Status', 'Registered'];
      const csvContent = [
        headers.join(','),
        ...(users || []).map(u => [
          u.email,
          u.full_name || '',
          u.grade_level || '',
          u.account_type,
          u.subscription_status || '',
          u.created_at,
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${users?.length || 0} users`);
    } catch (error) {
      toast.error('Failed to export users');
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermission('users.delete')) return;
    
    setProcessing(true);
    setProgress(0);
    
    try {
      let completed = 0;
      for (const userId of selectedUsers) {
        await supabase
          .from('users')
          .update({
            subscription_status: 'deleted',
            subscription_plan: null,
            subscription_start_date: null,
            subscription_end_date: null,
          })
          .eq('id', userId);
        
        completed++;
        setProgress((completed / selectedUsers.length) * 100);
      }

      await supabase.from('admin_audit_log').insert({
        action_type: 'bulk_delete',
        action_description: `Bulk deleted ${selectedUsers.length} users`,
        severity: 'critical',
        metadata: { user_ids: selectedUsers },
      });

      toast.success(`Successfully deleted ${selectedUsers.length} users`);
      onActionComplete();
      onClearSelection();
    } catch (error) {
      toast.error('Failed to delete users');
      console.error(error);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  if (selectedUsers.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
        <span className="font-medium">{selectedUsers.length} users selected</span>
        
        <div className="flex-1" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Actions
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportUsers}>
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmAction('delete')}
              disabled={!hasPermission('users.delete')}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={onClearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {processing && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm mb-2">Processing...</p>
          <Progress value={progress} />
        </div>
      )}

      <AlertDialog open={confirmAction === 'delete'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedUsers.length} Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the selected accounts as deleted in the app and removes active subscription access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
