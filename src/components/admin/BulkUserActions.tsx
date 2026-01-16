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
import { Mail, Download, Ban, Trash2, ChevronDown, X } from 'lucide-react';
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

  const handleBulkSuspend = async () => {
    if (!hasPermission('users.edit')) return;
    
    setProcessing(true);
    setProgress(0);
    
    try {
      let completed = 0;
      for (const userId of selectedUsers) {
        await supabase
          .from('users')
          .update({ subscription_status: 'inactive' })
          .eq('id', userId);
        
        completed++;
        setProgress((completed / selectedUsers.length) * 100);
      }

      await supabase.from('admin_audit_log').insert({
        action_type: 'bulk_suspend',
        action_description: `Bulk suspended ${selectedUsers.length} users`,
        severity: 'warning',
        metadata: { user_ids: selectedUsers },
      });

      toast.success(`Successfully suspended ${selectedUsers.length} users`);
      onActionComplete();
      onClearSelection();
    } catch (error) {
      toast.error('Failed to suspend users');
      console.error(error);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermission('users.delete')) return;
    
    setProcessing(true);
    setProgress(0);
    
    try {
      let completed = 0;
      for (const userId of selectedUsers) {
        // Soft delete by updating status to cancelled
        await supabase
          .from('users')
          .update({ subscription_status: 'cancelled' })
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
              onClick={() => setConfirmAction('suspend')}
              disabled={!hasPermission('users.edit')}
              className="text-amber-600"
            >
              <Ban className="w-4 h-4 mr-2" />
              Suspend Selected
            </DropdownMenuItem>
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

      <AlertDialog open={confirmAction === 'suspend'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {selectedUsers.length} Users?</AlertDialogTitle>
            <AlertDialogDescription>
              These users will not be able to log in until reactivated. This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSuspend} className="bg-amber-600 hover:bg-amber-700">
              Suspend Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'delete'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedUsers.length} Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All user data will be permanently deleted.
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
