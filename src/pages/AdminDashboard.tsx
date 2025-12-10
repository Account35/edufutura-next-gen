import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed';
import { AdminAlerts } from '@/components/admin/AdminAlerts';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminEngagementChart } from '@/components/admin/AdminEngagementChart';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAdminAuditLog } from '@/hooks/useAdminAuditLog';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import { useAdminRole } from '@/hooks/useAdminRole';

export default function AdminDashboard() {
  const { stats, engagement, health, loading: statsLoading } = useAdminStats();
  const { logs, loading: logsLoading } = useAdminAuditLog(20);
  const { alerts, loading: alertsLoading, acknowledgeAlert } = useAdminAlerts();
  const { isAdmin } = useAdminRole();

  // Simple permission check for now - admins have all permissions
  const hasPermission = (key: string) => isAdmin;

  return (
    <AdminLayout 
      title="Admin Dashboard" 
      subtitle="Overview of platform health and activity"
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <AdminStatsGrid stats={stats} loading={statsLoading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <AdminEngagementChart 
              data={engagement.dailyActiveUsers} 
              loading={statsLoading} 
            />
            <AdminQuickActions 
              pendingReviews={stats.pendingReviews} 
              hasPermission={hasPermission}
            />
          </div>

          {/* Right Column - Alerts, Health, Activity */}
          <div className="space-y-6">
            <AdminAlerts 
              alerts={alerts} 
              loading={alertsLoading} 
              onAcknowledge={acknowledgeAlert}
            />
            <AdminSystemHealth 
              health={health} 
              loading={statsLoading}
            />
          </div>
        </div>

        {/* Activity Feed - Full Width */}
        <AdminActivityFeed logs={logs} loading={logsLoading} />
      </div>
    </AdminLayout>
  );
}
