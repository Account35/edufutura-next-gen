import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Database, 
  Clock, 
  HardDrive, 
  Download,
  Upload,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export function BackupSettings() {
  const [autoBackup, setAutoBackup] = useState({
    enabled: true,
    schedule: '02:00',
    frequency: 'daily',
    retentionDays: 30,
    retentionMonths: 12,
  });

  const [storageUsage] = useState({
    used: 4.2,
    total: 10,
    percentage: 42,
  });

  const [backups] = useState([
    { id: 1, name: 'backup_20241210_020000.zip', size: '256 MB', timestamp: new Date(), status: 'success', type: 'auto' },
    { id: 2, name: 'backup_20241209_020000.zip', size: '254 MB', timestamp: new Date(Date.now() - 86400000), status: 'success', type: 'auto' },
    { id: 3, name: 'manual_backup_20241208.zip', size: '252 MB', timestamp: new Date(Date.now() - 172800000), status: 'success', type: 'manual' },
    { id: 4, name: 'backup_20241207_020000.zip', size: '250 MB', timestamp: new Date(Date.now() - 259200000), status: 'failed', type: 'auto' },
  ]);

  const [restoring, setRestoring] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    toast.success('Backup created successfully');
    setCreatingBackup(false);
  };

  const handleRestore = async (backupId: number) => {
    setRestoring(true);
    await new Promise(resolve => setTimeout(resolve, 5000));
    toast.success('Backup restored successfully');
    setRestoring(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Backup settings saved successfully');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Automatic Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Automatic Backup
          </CardTitle>
          <CardDescription>Configure scheduled database backups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Automatic Backups</p>
              <p className="text-sm text-muted-foreground">
                Automatically backup database on schedule
              </p>
            </div>
            <Switch
              checked={autoBackup.enabled}
              onCheckedChange={(checked) => setAutoBackup({ ...autoBackup, enabled: checked })}
            />
          </div>

          {autoBackup.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={autoBackup.frequency}
                  onValueChange={(value) => setAutoBackup({ ...autoBackup, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time (SAST)</Label>
                <Input
                  type="time"
                  value={autoBackup.schedule}
                  onChange={(e) => setAutoBackup({ ...autoBackup, schedule: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Retention (days)</Label>
                <Input
                  type="number"
                  value={autoBackup.retentionDays}
                  onChange={(e) => setAutoBackup({ ...autoBackup, retentionDays: parseInt(e.target.value) })}
                  min={7}
                  max={90}
                />
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>Next scheduled backup:</strong> Tomorrow at {autoBackup.schedule} SAST
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Backups are stored in Supabase Storage and retained for {autoBackup.retentionDays} days (daily) 
              and {autoBackup.retentionMonths} months (monthly)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>Backup storage utilization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{storageUsage.used} GB used</span>
              <span>{storageUsage.total} GB total</span>
            </div>
            <Progress value={storageUsage.percentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {storageUsage.percentage}% of backup storage used
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{backups.filter(b => b.type === 'auto').length}</p>
              <p className="text-xs text-muted-foreground">Auto Backups</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{backups.filter(b => b.type === 'manual').length}</p>
              <p className="text-xs text-muted-foreground">Manual Backups</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{backups.filter(b => b.status === 'success').length}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-destructive">{backups.filter(b => b.status === 'failed').length}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Manual Backup & Restore
          </CardTitle>
          <CardDescription>Create on-demand backups or restore from existing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {creatingBackup ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>View and manage existing backups</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell>
                    <Badge variant={backup.type === 'auto' ? 'outline' : 'secondary'}>
                      {backup.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {backup.status === 'success' ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(backup.timestamp, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={backup.status === 'failed' || restoring}
                        onClick={() => handleRestore(backup.id)}
                      >
                        <RefreshCw className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
