import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, DollarSign, UserX, Server, 
  RefreshCw, Lightbulb, AlertTriangle, CheckCircle
} from 'lucide-react';
import { usePlatformForecasting } from '@/hooks/usePlatformForecasting';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, ComposedChart, Legend
} from 'recharts';
import { format } from 'date-fns';

export const PredictiveForecasting = () => {
  const { 
    loading, forecasts, insights,
    generateUserGrowthForecast, generateRevenueForecast,
    predictChurn, generateInsights, fetchStoredForecasts
  } = usePlatformForecasting();

  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [churnData, setChurnData] = useState<any>(null);

  useEffect(() => {
    loadAllForecasts();
  }, []);

  const loadAllForecasts = async () => {
    const [growth, revenue, churn] = await Promise.all([
      generateUserGrowthForecast(30),
      generateRevenueForecast(30),
      predictChurn(),
    ]);

    setUserGrowthData(growth);
    setRevenueData(revenue);
    setChurnData(churn);
    await generateInsights();
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-destructive bg-destructive/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-muted bg-muted/30';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'medium': return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      default: return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading && userGrowthData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Predictive Analytics & Forecasting
            </CardTitle>
            <CardDescription>AI-powered predictions with confidence intervals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAllForecasts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Forecasts
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="growth">
            <TabsList className="mb-4">
              <TabsTrigger value="growth" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                User Growth
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="churn" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Churn Risk
              </TabsTrigger>
            </TabsList>

            <TabsContent value="growth">
              <div className="h-80">
                {userGrowthData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No forecast data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={userGrowthData}>
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
                      <Area
                        type="monotone"
                        dataKey="confidenceUpper"
                        stackId="confidence"
                        stroke="none"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.1}
                        name="Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceLower"
                        stackId="confidence"
                        stroke="none"
                        fill="hsl(var(--background))"
                        name="Lower Bound"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Predicted Users"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">7-Day Forecast</p>
                  <p className="text-2xl font-bold">
                    {userGrowthData.slice(0, 7).reduce((sum, d) => sum + d.predicted, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">new users</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">14-Day Forecast</p>
                  <p className="text-2xl font-bold">
                    {userGrowthData.slice(0, 14).reduce((sum, d) => sum + d.predicted, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">new users</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">30-Day Forecast</p>
                  <p className="text-2xl font-bold">
                    {userGrowthData.reduce((sum, d) => sum + d.predicted, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">new users</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="revenue">
              <div className="h-80">
                {revenueData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No revenue forecast data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `R${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value as string), 'PPP')}
                        formatter={(value: number) => [`R${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceUpper"
                        stackId="confidence"
                        stroke="none"
                        fill="hsl(var(--secondary))"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceLower"
                        stackId="confidence"
                        stroke="none"
                        fill="hsl(var(--background))"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        dot={false}
                        name="Predicted Revenue"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>

            <TabsContent value="churn">
              {!churnData ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Calculating churn risk...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <UserX className="h-12 w-12 mx-auto mb-2 text-destructive" />
                        <p className="text-4xl font-bold text-destructive">{churnData.churnRiskRate}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Churn Risk Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-orange-500" />
                        <p className="text-4xl font-bold">{churnData.atRiskCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">At-Risk Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <DollarSign className="h-12 w-12 mx-auto mb-2 text-red-500" />
                        <p className="text-4xl font-bold text-red-600">{churnData.premiumAtRisk}</p>
                        <p className="text-sm text-muted-foreground mt-1">Premium At-Risk</p>
                        <p className="text-xs text-muted-foreground">
                          Potential loss: R{churnData.premiumAtRisk * 60}/month
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>Actionable insights based on predictive analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No critical insights at this time. Your metrics look healthy!
            </p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border-l-4 ${getImpactColor(insight.impact)}`}
                >
                  <div className="flex items-start gap-3">
                    {getImpactIcon(insight.impact)}
                    <div>
                      <Badge variant="outline" className="mb-2">{insight.type}</Badge>
                      <p className="text-sm">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
