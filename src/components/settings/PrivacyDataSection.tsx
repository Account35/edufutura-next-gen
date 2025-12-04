/**
 * Privacy & Data Management Section (POPIA Compliance)
 * Allows users to request data export or deletion
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Shield, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { toast } from 'sonner';
import { format } from 'date-fns';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-blue-600 border-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case 'completed':
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    case 'failed':
    case 'rejected':
      return <Badge variant="outline" className="text-red-600 border-red-600"><AlertCircle className="h-3 w-3 mr-1" />{status === 'failed' ? 'Failed' : 'Rejected'}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const PrivacyDataSection = () => {
  const { 
    dataRequestsStatus, 
    isLoading, 
    handleDataExportRequest, 
    handleDataDeletionRequest 
  } = useSecurityMonitoring();
  
  const [deletionReason, setDeletionReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onExportRequest = async () => {
    setIsExporting(true);
    try {
      const result = await handleDataExportRequest();
      if (result.success) {
        toast.success('Data export request submitted. You will receive an email when it\'s ready.');
      } else {
        toast.error(result.error || 'Failed to request data export');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const onDeletionRequest = async () => {
    setIsDeleting(true);
    try {
      const result = await handleDataDeletionRequest(deletionReason);
      if (result.success) {
        toast.success('Account deletion request submitted. Our team will review it within 7 days.');
        setDeletionReason('');
      } else {
        toast.error(result.error || 'Failed to request account deletion');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Privacy & Data Management
        </CardTitle>
        <CardDescription>
          Manage your personal data in accordance with POPIA (Protection of Personal Information Act)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Export Section */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">Export Your Data</h4>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your personal data including profile, progress, and activity history.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={onExportRequest}
              disabled={isExporting || isLoading}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Request Export
            </Button>
          </div>
          
          {dataRequestsStatus.exportRequests.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Recent Export Requests</p>
              {dataRequestsStatus.exportRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
                  </span>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Data Deletion Section */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-destructive">Delete Your Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || isLoading}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Request Deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will submit a request to permanently delete your account. 
                    Your personal data will be anonymized and your account will be deactivated.
                    This process takes up to 7 business days to complete.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                  <Label htmlFor="deletion-reason">Reason for leaving (optional)</Label>
                  <Textarea
                    id="deletion-reason"
                    placeholder="Help us improve by telling us why you're leaving..."
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={onDeletionRequest}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Submit Deletion Request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          {dataRequestsStatus.deletionRequests.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-destructive">Deletion Requests</p>
              {dataRequestsStatus.deletionRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
                  </span>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Privacy Information */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Your Privacy Rights (POPIA)
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Right to access your personal information</li>
            <li>Right to correct inaccurate information</li>
            <li>Right to request deletion of your data</li>
            <li>Right to object to processing of your information</li>
            <li>Right to data portability (export your data)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            For questions about data privacy, contact us at privacy@edufutura.co.za
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
