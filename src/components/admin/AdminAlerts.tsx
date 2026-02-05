import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  XCircle, 
  Info,
  X,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminAlert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

interface AdminAlertsProps {
  alerts: AdminAlert[];
  loading: boolean;
  onAcknowledge: (id: string) => void;
}

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-destructive/10 border-destructive/30',
        icon: XCircle,
        iconColor: 'text-destructive',
        badge: 'bg-destructive/10 text-destructive'
      };
    case 'warning':
      return {
        bg: 'bg-secondary/10 border-secondary/30',
        icon: AlertTriangle,
        iconColor: 'text-secondary',
        badge: 'bg-secondary/10 text-secondary'
      };
    default:
      return {
        bg: 'bg-primary/10 border-primary/30',
        icon: Info,
        iconColor: 'text-primary',
        badge: 'bg-primary/10 text-primary'
      };
  }
};

export const AdminAlerts = ({ alerts, loading, onAcknowledge }: AdminAlertsProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {alerts.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-secondary/10 mb-4">
                <Info className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-muted-foreground">All clear! No active alerts.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {alerts.map((alert) => {
                const styles = getSeverityStyles(alert.severity);
                const Icon = styles.icon;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${styles.bg} relative`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${styles.iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <Badge className={`text-xs ${styles.badge}`}>
                            {alert.severity}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {alert.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-1"
                        onClick={() => onAcknowledge(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
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
