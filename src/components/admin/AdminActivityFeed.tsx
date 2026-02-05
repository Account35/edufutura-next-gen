import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  UserPlus, 
  Shield, 
  FileQuestion, 
  BookOpen, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLogEntry {
  id: string;
  action_type: string;
  action_description: string | null;
  severity: string;
  created_at: string;
}

interface AdminActivityFeedProps {
  logs: AuditLogEntry[];
  loading: boolean;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'user_registration':
    case 'admin_login':
      return UserPlus;
    case 'content_moderation':
    case 'user_warning':
      return Shield;
    case 'quiz_created':
    case 'quiz_published':
      return FileQuestion;
    case 'chapter_created':
    case 'content_updated':
      return BookOpen;
    default:
      return Clock;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-destructive bg-destructive/10';
    case 'warning':
      return 'text-secondary bg-secondary/10';
    case 'info':
    default:
      return 'text-primary bg-primary/10';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return CheckCircle;
  }
};

export const AdminActivityFeed = ({ logs, loading }: AdminActivityFeedProps) => {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {logs.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {logs.map((log) => {
                const ActionIcon = getActionIcon(log.action_type);
                const SeverityIcon = getSeverityIcon(log.severity);
                const severityColor = getSeverityColor(log.severity);

                return (
                  <div key={log.id} className="flex items-start gap-3 group">
                    <div className={`p-2 rounded-full ${severityColor}`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {log.action_description || log.action_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <SeverityIcon className={`h-4 w-4 ${severityColor.split(' ')[0]} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
