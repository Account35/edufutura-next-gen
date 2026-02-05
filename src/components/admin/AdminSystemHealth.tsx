import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Database, 
  HardDrive, 
  Cloud,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface SystemHealthProps {
  health: {
    databaseConnected: boolean;
    storageUsagePercent: number;
    lastBackup: string | null;
  };
  loading: boolean;
  onRefresh?: () => void;
}

export const AdminSystemHealth = ({ health, loading, onRefresh }: SystemHealthProps) => {
  const services = [
    {
      name: 'Database',
      icon: Database,
      status: health.databaseConnected ? 'operational' : 'down',
      statusText: health.databaseConnected ? 'Operational' : 'Connection Failed'
    },
    {
      name: 'Storage',
      icon: HardDrive,
      status: health.storageUsagePercent < 80 ? 'operational' : health.storageUsagePercent < 90 ? 'warning' : 'critical',
      statusText: `${health.storageUsagePercent}% used`
    },
    {
      name: 'Edge Functions',
      icon: Zap,
      status: 'operational',
      statusText: 'All systems go'
    },
    {
      name: 'Cloud Services',
      icon: Cloud,
      status: 'operational',
      statusText: 'Connected'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-secondary bg-secondary/10';
      case 'warning':
        return 'text-secondary bg-secondary/10';
      case 'down':
      case 'critical':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return CheckCircle;
      case 'warning':
      case 'down':
      case 'critical':
        return XCircle;
      default:
        return CheckCircle;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">System Health</CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service) => {
            const StatusIcon = getStatusIcon(service.status);
            const statusColor = getStatusColor(service.status);

            return (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <service.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.statusText}</p>
                  </div>
                </div>
                <Badge className={statusColor}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {service.status === 'operational' ? 'OK' : service.status.toUpperCase()}
                </Badge>
              </div>
            );
          })}

          {/* Storage Usage Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Storage Usage</span>
              <span className="font-medium">{health.storageUsagePercent}%</span>
            </div>
            <Progress 
              value={health.storageUsagePercent} 
              className={`h-2 ${health.storageUsagePercent > 80 ? '[&>div]:bg-orange-500' : ''}`}
            />
          </div>

          {/* Last Backup */}
          {health.lastBackup && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Backup</span>
                <span className="text-secondary">
                  {formatDistanceToNow(new Date(health.lastBackup), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
