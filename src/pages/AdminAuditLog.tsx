import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { 
  Search, Filter, Download, ChevronDown, ChevronUp, 
  Activity, AlertTriangle, Clock, User, Shield, Eye,
  Users, FileText, Settings, BarChart3, RefreshCw
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuditLog } from '@/hooks/useAdminAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  user_created: 'bg-green-100 text-green-800',
  user_suspended: 'bg-red-100 text-red-800',
  user_updated: 'bg-blue-100 text-blue-800',
  content_approved: 'bg-emerald-100 text-emerald-800',
  content_rejected: 'bg-orange-100 text-orange-800',
  settings_changed: 'bg-purple-100 text-purple-800',
  login: 'bg-gray-100 text-gray-800',
  logout: 'bg-gray-100 text-gray-800',
  impersonation_start: 'bg-yellow-100 text-yellow-800',
  impersonation_end: 'bg-yellow-100 text-yellow-800',
};

const ENTITY_ICONS: Record<string, typeof User> = {
  users: Users,
  quizzes: FileText,
  chapters: FileText,
  settings: Settings,
  content: FileText,
};

const CHART_COLORS = ['#1B4332', '#D4AF37', '#800020', '#3B82F6', '#10B981', '#F97316'];

export default function AdminAuditLog() {
  const { logs, loading, refreshLogs } = useAdminAuditLog(500);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [admins, setAdmins] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  const [impersonationLogs, setImpersonationLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('logs');

  // Fetch admin users for filter
  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (data) {
        const userIds = data.map(r => r.user_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', userIds);
        
        if (users) setAdmins(users);
      }
    };
    fetchAdmins();
  }, []);

  // Fetch impersonation logs
  useEffect(() => {
    const fetchImpersonationLogs = async () => {
      const { data } = await supabase
        .from('impersonation_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (data) setImpersonationLogs(data);
    };
    fetchImpersonationLogs();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('audit-log-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_audit_log' },
        () => refreshLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.target_type === entityFilter;
    const matchesAdmin = adminFilter === 'all' || log.user_id === adminFilter;
    
    const logDate = new Date(log.created_at);
    const matchesDate = (!dateRange.from || logDate >= dateRange.from) &&
                        (!dateRange.to || logDate <= dateRange.to);

    return matchesSearch && matchesAction && matchesEntity && matchesAdmin && matchesDate;
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  // Calculate statistics for dashboard
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const actionChartData = Object.entries(actionCounts)
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const adminActionCounts = logs.reduce((acc, log) => {
    const admin = admins.find(a => a.id === log.user_id);
    const name = admin?.full_name || admin?.email || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const adminChartData = Object.entries(adminActionCounts)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Daily activity trend
  const dailyActivity = logs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'MMM dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyChartData = Object.entries(dailyActivity)
    .slice(-7)
    .map(([date, count]) => ({ date, count }));

  // Detect suspicious patterns
  const suspiciousPatterns = logs.filter(log => {
    const hour = new Date(log.created_at).getHours();
    return hour >= 0 && hour <= 5; // Off-hours access
  });

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Admin', 'Action', 'Entity', 'Description', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        admins.find(a => a.id === log.user_id)?.email || 'Unknown',
        log.action_type,
        log.target_type || '',
        `"${log.action_description || ''}"`,
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const uniqueActions = [...new Set(logs.map(l => l.action_type))];
  const uniqueEntities = [...new Set(logs.map(l => l.target_type).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Audit Log</h1>
            <p className="text-muted-foreground">Monitor all admin actions and system events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="impersonation" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Impersonation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search actions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Select value={adminFilter} onValueChange={setAdminFilter}>
                    <SelectTrigger className="w-[180px]">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Admins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Admins</SelectItem>
                      {admins.map(admin => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.full_name || admin.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>
                          {action.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <FileText className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      {uniqueEntities.map(entity => (
                        <SelectItem key={entity} value={entity!}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px]">
                        <Clock className="h-4 w-4 mr-2" />
                        {dateRange.from ? format(dateRange.from, 'MMM dd') : 'Start'} - {dateRange.to ? format(dateRange.to, 'MMM dd') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Log entries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Activity Log ({filteredLogs.length} entries)</span>
                  <Badge variant="outline" className="animate-pulse">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Live
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No audit log entries found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogs.map((log) => {
                        const admin = admins.find(a => a.id === log.user_id);
                        const isExpanded = expandedLogs.has(log.id);
                        const EntityIcon = ENTITY_ICONS[log.target_type || ''] || FileText;

                        return (
                          <div
                            key={log.id}
                            className={cn(
                              "border rounded-lg p-4 transition-colors",
                              log.severity === 'critical' && "border-red-300 bg-red-50",
                              log.severity === 'warning' && "border-yellow-300 bg-yellow-50"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {admin?.full_name?.charAt(0) || 'A'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {admin?.full_name || admin?.email || 'System'}
                                    </span>
                                    <Badge className={ACTION_COLORS[log.action_type] || 'bg-gray-100'}>
                                      {log.action_type.replace(/_/g, ' ')}
                                    </Badge>
                                    {log.severity === 'critical' && (
                                      <Badge variant="destructive">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Critical
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {log.action_description}
                                  </p>
                                  {log.target_type && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <EntityIcon className="h-3 w-3" />
                                      <span>{log.target_type}</span>
                                      {log.target_id && (
                                        <code className="bg-muted px-1 rounded text-xs">
                                          {log.target_id.slice(0, 8)}...
                                        </code>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right text-sm">
                                  <p className="font-medium" title={format(new Date(log.created_at), 'PPpp')}>
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                  </p>
                                  {log.ip_address && (
                                    <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(log.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Metadata</p>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.user_agent && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">User Agent</p>
                                    <p className="text-xs text-muted-foreground">{log.user_agent}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Actions</p>
                      <p className="text-3xl font-bold">{logs.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Admins</p>
                      <p className="text-3xl font-bold">{admins.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-secondary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Actions</p>
                      <p className="text-3xl font-bold">
                        {logs.filter(l => 
                          format(new Date(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ).length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className={suspiciousPatterns.length > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Suspicious Activity</p>
                      <p className="text-3xl font-bold">{suspiciousPatterns.length}</p>
                    </div>
                    <AlertTriangle className={cn(
                      "h-8 w-8 opacity-50",
                      suspiciousPatterns.length > 0 ? 'text-yellow-600' : 'text-muted-foreground'
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actions by Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={adminChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1B4332" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={actionChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {actionChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Daily Activity Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="impersonation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Sessions</p>
                      <p className="text-3xl font-bold">
                        {impersonationLogs.filter(l => !l.ended_at).length}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-3xl font-bold">{impersonationLogs.length}</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Duration</p>
                      <p className="text-3xl font-bold">
                        {impersonationLogs.length > 0 
                          ? Math.round(impersonationLogs.reduce((a, b) => a + (b.duration_minutes || 0), 0) / impersonationLogs.length)
                          : 0} min
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Impersonation Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {impersonationLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No impersonation sessions recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {impersonationLogs.map((session) => {
                      const admin = admins.find(a => a.id === session.admin_id);
                      const isActive = !session.ended_at;

                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "border rounded-lg p-4",
                            isActive && "border-yellow-300 bg-yellow-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {admin?.full_name?.charAt(0) || 'A'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {admin?.full_name || admin?.email || 'Admin'}
                                  </span>
                                  {isActive ? (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Ended</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Impersonating user: {session.target_user_id.slice(0, 8)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Reason: {session.reason}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p>Started: {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}</p>
                              {session.ended_at && (
                                <p className="text-muted-foreground">
                                  Duration: {session.duration_minutes} minutes
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
