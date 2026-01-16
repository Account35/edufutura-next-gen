import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useCohortAnalytics } from '@/hooks/useCohortAnalytics';
import { useEffect } from 'react';

export const CohortAnalysisChart = () => {
  const { loading, cohorts, ltvData, calculateCohorts, calculateLTV } = useCohortAnalytics();

  useEffect(() => {
    calculateCohorts(6);
    calculateLTV(6);
  }, []);

  const getRetentionColor = (rate: number) => {
    if (rate >= 70) return 'bg-green-600';
    if (rate >= 50) return 'bg-yellow-500';
    if (rate >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading && cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
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
              <Users className="h-5 w-5" />
              Cohort Retention Analysis
            </CardTitle>
            <CardDescription>Track how users retain over time by registration month</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { calculateCohorts(6); calculateLTV(6); }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {cohorts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No cohort data available yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Cohort</th>
                    <th className="text-center py-2 px-3 font-medium">Users</th>
                    {[...Array(6)].map((_, i) => (
                      <th key={i} className="text-center py-2 px-3 font-medium">Month {i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((cohort) => (
                    <tr key={cohort.cohortMonth} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{cohort.cohortMonth}</td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline">{cohort.totalUsers}</Badge>
                      </td>
                      {[...Array(6)].map((_, i) => {
                        const retention = cohort.retentionByMonth.find(r => r.monthOffset === i);
                        return (
                          <td key={i} className="text-center py-2 px-3">
                            {retention ? (
                              <div 
                                className={`inline-flex items-center justify-center w-12 h-8 rounded text-white text-xs font-medium ${getRetentionColor(retention.rate)}`}
                              >
                                {retention.rate}%
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Lifetime Value by Cohort
          </CardTitle>
          <CardDescription>Projected and actual revenue per user cohort</CardDescription>
        </CardHeader>
        <CardContent>
          {ltvData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No LTV data available yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ltvData.map((data) => (
                <div key={data.cohortMonth} className="p-4 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">{data.cohortMonth}</p>
                  <p className="text-xl font-bold text-primary">R{data.avgLTV.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Actual LTV</p>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-secondary font-medium">R{data.projectedLTV.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Projected</p>
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {data.premiumConversions} premium
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
