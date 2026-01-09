import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowDown, Filter, RefreshCw, TrendingDown } from 'lucide-react';
import { useFunnelAnalytics } from '@/hooks/useFunnelAnalytics';
import { subDays } from 'date-fns';

export const FunnelAnalysisView = () => {
  const { loading, funnels, analysis, fetchFunnels, analyzeFunnel } = useFunnelAnalytics();
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchFunnels();
  }, []);

  useEffect(() => {
    if (funnels.length > 0 && !selectedFunnel) {
      setSelectedFunnel(funnels[0].id);
    }
  }, [funnels, selectedFunnel]);

  useEffect(() => {
    if (selectedFunnel) {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      analyzeFunnel(selectedFunnel, subDays(new Date(), days), new Date());
    }
  }, [selectedFunnel, dateRange]);

  if (loading && !analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel Analysis</CardTitle>
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
              <Filter className="h-5 w-5" />
              Conversion Funnel Analysis
            </CardTitle>
            <CardDescription>Track user progression through key conversion steps</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select funnel" />
              </SelectTrigger>
              <SelectContent>
                {funnels.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => selectedFunnel && analyzeFunnel(
                selectedFunnel, 
                subDays(new Date(), dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90), 
                new Date()
              )}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!analysis ? (
            <p className="text-center text-muted-foreground py-8">Select a funnel to see analysis</p>
          ) : (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Overall Conversion</p>
                  <p className="text-3xl font-bold text-primary">{analysis.overallConversion}%</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Total Steps</p>
                  <p className="text-3xl font-bold">{analysis.steps.length}</p>
                </div>
                {analysis.biggestDropOff && (
                  <div className="p-4 rounded-lg border bg-destructive/10">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Biggest Drop-off
                    </p>
                    <p className="text-lg font-bold text-destructive">{analysis.biggestDropOff.step}</p>
                    <p className="text-sm text-muted-foreground">{analysis.biggestDropOff.rate}% drop-off</p>
                  </div>
                )}
              </div>

              {/* Funnel Visualization */}
              <div className="space-y-4">
                {analysis.steps.map((step, idx) => {
                  const widthPercent = analysis.steps[0].totalUsers > 0
                    ? (step.totalUsers / analysis.steps[0].totalUsers) * 100
                    : 0;

                  return (
                    <div key={step.stepName} className="relative">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {step.stepOrder}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{step.stepName}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{step.totalUsers.toLocaleString()} users</Badge>
                              {idx > 0 && (
                                <Badge variant={step.conversionRate >= 50 ? 'default' : 'destructive'}>
                                  {step.conversionRate}% converted
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/60 rounded-lg transition-all duration-500"
                              style={{ width: `${widthPercent}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {Math.round(widthPercent)}% of total
                            </div>
                          </div>
                        </div>
                      </div>
                      {idx < analysis.steps.length - 1 && step.dropOffRate > 0 && (
                        <div className="ml-4 pl-8 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowDown className="h-4 w-4" />
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          <span className="text-destructive">{step.dropOffRate}% drop-off</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
