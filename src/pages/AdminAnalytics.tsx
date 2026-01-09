import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FullPageLoader } from '@/components/ui/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, TrendingUp, DollarSign, Target,
  Download, Calendar as CalendarIcon, RefreshCw,
  BookOpen, FileQuestion, MessageSquare, Bot, FlaskConical, Filter, BarChart3
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { CohortAnalysisChart, FunnelAnalysisView, ABTestingDashboard, PredictiveForecasting } from '@/components/admin/analytics';

const COLORS = ['#1B4332', '#D4AF37', '#800020', '#3B82F6', '#10B981', '#F97316', '#9333EA', '#EF4444', '#14B8A6'];

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
  
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date(),
  });

  useEffect(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        setDateRange({ start: now, end: now });
        break;
      case 'week':
        setDateRange({ start: subDays(now, 7), end: now });
        break;
      case 'month':
        setDateRange({ start: startOfMonth(now), end: now });
        break;
      case 'quarter':
        setDateRange({ start: subMonths(now, 3), end: now });
        break;
      case 'year':
        setDateRange({ start: subMonths(now, 12), end: now });
        break;
    }
  }, [datePreset]);

  const { 
    platformStats, 
    userGrowth, 
    engagement, 
    subjectStats, 
    provinceStats,
    loading, 
    refresh, 
    exportReport 
  } = useAdminAnalytics(dateRange);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin && !isEducator) {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, isEducator, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return <FullPageLoader message="Loading analytics..." />;
  }

  if (!isAdmin && !isEducator) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Platform Analytics</h1>
            <p className="text-muted-foreground">Monitor platform performance and user engagement</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-40">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats?.totalUsers.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">+{platformStats?.newUsersThisWeek || 0} this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Premium Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats?.premiumUsers.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">{platformStats?.conversionRate.toFixed(1) || 0}% conversion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{platformStats?.monthlyRevenue.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Based on active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quiz Completion</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats?.quizCompletionRate.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">Of all attempts</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different analytics views */}
        <Tabs defaultValue="growth" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="growth">User Growth</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Cohorts
            </TabsTrigger>
            <TabsTrigger value="funnels" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Funnels
            </TabsTrigger>
            <TabsTrigger value="abtesting" className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              A/B Tests
            </TabsTrigger>
            <TabsTrigger value="forecasting" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Forecasting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registration Trends</CardTitle>
                <CardDescription>Daily user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                {userGrowth.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available for selected period
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value as string), 'PPP')}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="registrations" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Total"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="premiumUsers" 
                          stroke="hsl(var(--secondary))" 
                          strokeWidth={2}
                          name="Premium"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Adoption</CardTitle>
                  <CardDescription>User engagement with platform features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engagement} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                        <YAxis type="category" dataKey="feature" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Adoption']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage</CardTitle>
                  <CardDescription>Unique users per feature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {engagement.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {item.feature === 'Curriculum' && <BookOpen className="h-4 w-4 text-primary" />}
                            {item.feature === 'Quizzes' && <FileQuestion className="h-4 w-4 text-secondary" />}
                            {item.feature === 'Forums' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                            {item.feature === 'AI Tutor' && <Bot className="h-4 w-4 text-purple-600" />}
                            <span>{item.feature}</span>
                          </div>
                          <span className="font-medium">{item.uniqueUsers.toLocaleString()} users</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Quiz performance breakdown by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No quiz data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Attempts</TableHead>
                        <TableHead className="text-center">Students</TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead>Pass Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectStats.map((subject) => (
                        <TableRow key={subject.subjectName}>
                          <TableCell className="font-medium">{subject.subjectName}</TableCell>
                          <TableCell className="text-center">{subject.totalAttempts}</TableCell>
                          <TableCell className="text-center">{subject.uniqueStudents}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={subject.avgScore >= 70 ? 'default' : subject.avgScore >= 50 ? 'secondary' : 'destructive'}>
                              {subject.avgScore.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={subject.passRate} className="h-2 flex-1" />
                              <span className="text-sm text-muted-foreground w-12">
                                {subject.passRate.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geographic" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users by Province</CardTitle>
                  <CardDescription>Geographic distribution of users</CardDescription>
                </CardHeader>
                <CardContent>
                  {provinceStats.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No geographic data available
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={provinceStats.map((p, i) => ({ name: p.province || 'Unknown', value: p.users, fill: COLORS[i % COLORS.length] }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {provinceStats.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [value, 'Users']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Provincial Breakdown</CardTitle>
                  <CardDescription>User count per province</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {provinceStats.sort((a, b) => b.users - a.users).map((province, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                          />
                          <span className="text-sm">{province.province || 'Unknown'}</span>
                        </div>
                        <span className="font-medium">{province.users.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cohorts" className="space-y-4">
            <CohortAnalysisChart />
          </TabsContent>

          <TabsContent value="funnels" className="space-y-4">
            <FunnelAnalysisView />
          </TabsContent>

          <TabsContent value="abtesting" className="space-y-4">
            <ABTestingDashboard />
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4">
            <PredictiveForecasting />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
