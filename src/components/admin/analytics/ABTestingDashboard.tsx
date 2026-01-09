import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FlaskConical, Play, Pause, CheckCircle, Archive, 
  Plus, RefreshCw, TrendingUp, AlertCircle 
} from 'lucide-react';
import { useABTesting } from '@/hooks/useABTesting';
import { format } from 'date-fns';

export const ABTestingDashboard = () => {
  const { 
    loading, experiments, results, 
    fetchExperiments, createExperiment, updateExperimentStatus, 
    analyzeExperiment, rolloutWinner 
  } = useABTesting();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    variantAName: 'Control',
    variantBName: 'Treatment',
    targetMetric: 'conversion',
    trafficPercentage: 50,
  });

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleCreate = async () => {
    await createExperiment({
      ...newExperiment,
      variantAConfig: {},
      variantBConfig: {},
    });
    setShowCreate(false);
    setNewExperiment({
      name: '',
      description: '',
      variantAName: 'Control',
      variantBName: 'Treatment',
      targetMetric: 'conversion',
      trafficPercentage: 50,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-600">Running</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-600">Completed</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (loading && experiments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Testing</CardTitle>
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
              <FlaskConical className="h-5 w-5" />
              A/B Testing Framework
            </CardTitle>
            <CardDescription>Measure feature effectiveness with controlled experiments</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchExperiments} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Experiment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Experiment</DialogTitle>
                  <DialogDescription>Set up a new A/B test to measure feature effectiveness</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Experiment Name</Label>
                    <Input 
                      value={newExperiment.name}
                      onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                      placeholder="e.g., New Onboarding Flow"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={newExperiment.description}
                      onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                      placeholder="Describe what you're testing..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Variant A Name</Label>
                      <Input 
                        value={newExperiment.variantAName}
                        onChange={(e) => setNewExperiment({ ...newExperiment, variantAName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Variant B Name</Label>
                      <Input 
                        value={newExperiment.variantBName}
                        onChange={(e) => setNewExperiment({ ...newExperiment, variantBName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Target Metric</Label>
                    <Input 
                      value={newExperiment.targetMetric}
                      onChange={(e) => setNewExperiment({ ...newExperiment, targetMetric: e.target.value })}
                      placeholder="e.g., signup, quiz_completion, upgrade"
                    />
                  </div>
                  <div>
                    <Label>Traffic Percentage (to Variant B): {newExperiment.trafficPercentage}%</Label>
                    <input 
                      type="range"
                      min="10"
                      max="90"
                      value={newExperiment.trafficPercentage}
                      onChange={(e) => setNewExperiment({ ...newExperiment, trafficPercentage: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!newExperiment.name}>
                    Create Experiment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {experiments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No experiments yet. Create your first A/B test!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Traffic Split</TableHead>
                  <TableHead>Significance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exp.name}</p>
                        <p className="text-xs text-muted-foreground">{exp.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exp.targetMetric}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={100 - exp.trafficPercentage} className="w-16 h-2" />
                        <span className="text-xs">{100 - exp.trafficPercentage}/{exp.trafficPercentage}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {exp.isSignificant ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Significant
                        </Badge>
                      ) : exp.pValue ? (
                        <span className="text-xs text-muted-foreground">p={exp.pValue.toFixed(4)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {exp.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateExperimentStatus(exp.id, 'running')}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {exp.status === 'running' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateExperimentStatus(exp.id, 'paused')}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedExperiment(exp.id);
                                analyzeExperiment(exp.id);
                              }}
                            >
                              <TrendingUp className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {exp.isSignificant && exp.status !== 'archived' && (
                          <Button 
                            size="sm" 
                            onClick={() => rolloutWinner(exp.id)}
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Rollout
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results Panel */}
      {results && selectedExperiment && (
        <Card>
          <CardHeader>
            <CardTitle>Experiment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Variant A (Control)</h4>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{results.variantA.rate}%</p>
                  <p className="text-sm text-muted-foreground">
                    {results.variantA.conversions} / {results.variantA.users} users
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Variant B (Treatment)</h4>
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{results.variantB.rate}%</p>
                  <p className="text-sm text-muted-foreground">
                    {results.variantB.conversions} / {results.variantB.users} users
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                {results.isSignificant ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {results.isSignificant ? 'Statistically Significant' : 'Not Yet Significant'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Relative improvement: <strong>{results.relativeImprovement > 0 ? '+' : ''}{results.relativeImprovement}%</strong>
                {' | '}p-value: <strong>{results.pValue}</strong>
              </p>
              <p className="text-sm font-medium text-primary">{results.recommendedAction}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
