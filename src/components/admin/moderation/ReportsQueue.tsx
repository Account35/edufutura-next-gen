import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Flag, 
  User, 
  Clock, 
  CheckCircle,
  XCircle,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CommunityReport } from '@/hooks/useModeration';

interface ReportsQueueProps {
  reports: CommunityReport[];
  onResolve: (reportId: string, action: string, notes: string) => void;
}

export const ReportsQueue = ({ reports, onResolve }: ReportsQueueProps) => {
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  // Group reports by content
  const groupedReports = pendingReports.reduce((acc, report) => {
    const key = `${report.reported_content_type}-${report.reported_content_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(report);
    return acc;
  }, {} as Record<string, CommunityReport[]>);

  const handleResolve = () => {
    if (!selectedReport || !action) return;
    onResolve(selectedReport.id, action, notes);
    setSelectedReport(null);
    setAction('');
    setNotes('');
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'harassment': return 'destructive';
      case 'spam': return 'secondary';
      case 'inappropriate': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Reports */}
      <div>
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-600" />
          Pending Reports
          {pendingReports.length > 0 && (
            <Badge variant="destructive">{pendingReports.length}</Badge>
          )}
        </h3>

        {Object.keys(groupedReports).length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p className="font-medium">No Pending Reports</p>
            <p className="text-sm text-muted-foreground">All reports have been resolved</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedReports).map(([key, reportGroup]) => {
              const firstReport = reportGroup[0];
              const reportCount = reportGroup.length;

              return (
                <Card key={key} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {firstReport.reported_content_type.replace('_', ' ')}
                        </Badge>
                        {reportCount > 1 && (
                          <Badge variant="destructive">
                            {reportCount} reports
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-foreground mb-2 line-clamp-2">
                        {firstReport.content_preview || 'Content preview unavailable'}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {reportGroup.map((report, idx) => (
                          <Badge 
                            key={idx} 
                            variant={getReasonBadgeColor(report.report_reason) as any}
                            className="text-xs"
                          >
                            {report.report_reason}
                          </Badge>
                        ))}
                      </div>

                      {/* Reporter Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Reported by {reportGroup.map(r => r.reporter_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {firstReport.created_at && formatDistanceToNow(new Date(firstReport.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Report Descriptions */}
                      {reportGroup.some(r => r.report_description) && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Report details:</p>
                          {reportGroup.filter(r => r.report_description).slice(0, 2).map((report, idx) => (
                            <p key={idx} className="text-sm text-foreground mb-1">
                              "{report.report_description}"
                            </p>
                          ))}
                          {reportGroup.filter(r => r.report_description).length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{reportGroup.filter(r => r.report_description).length - 2} more descriptions
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedReport(firstReport)}
                      >
                        Review
                      </Button>
                      <Button size="sm" variant="outline">
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        View Content
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      {resolvedReports.length > 0 && (
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Recently Resolved
          </h3>
          <div className="space-y-2">
            {resolvedReports.slice(0, 5).map((report) => (
              <Card key={report.id} className="p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {report.reported_content_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {report.action_taken}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {report.reviewed_at && formatDistanceToNow(new Date(report.reviewed_at), { addSuffix: true })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content_removed">Content Removed</SelectItem>
                  <SelectItem value="user_warned">User Warned</SelectItem>
                  <SelectItem value="user_banned">User Banned</SelectItem>
                  <SelectItem value="dismissed">Dismissed (False Report)</SelectItem>
                  <SelectItem value="escalated">Escalated to Senior Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Notes</label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add resolution notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!action}>
              Resolve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
