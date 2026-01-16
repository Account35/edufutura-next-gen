import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
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
  Trash2,
  Shield,
  Lock,
  FileArchive,
  Eye
} from 'lucide-react';

interface Backup {
  id: number;
  name: string;
  size: string;
  timestamp: Date;
  status: 'success' | 'failed';
  type: 'auto' | 'manual';
  tables?: number;
  records?: number;
}

export function BackupSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [autoBackup, setAutoBackup] = useState({
    enabled: true,
    schedule: '02:00',
    frequency: 'daily',
    retentionDays: 30,
    retentionMonths: 12,
    encrypted: true,
  });

  const [storageUsage] = useState({
    used: 4.2,
    total: 10,
    percentage: 42,
  });

  const [backups, setBackups] = useState<Backup[]>([
    { id: 1, name: 'backup_20241210_020000.zip', size: '256 MB', timestamp: new Date(), status: 'success', type: 'auto', tables: 48, records: 125840 },
    { id: 2, name: 'backup_20241209_020000.zip', size: '254 MB', timestamp: new Date(Date.now() - 86400000), status: 'success', type: 'auto', tables: 48, records: 124650 },
    { id: 3, name: 'manual_backup_20241208.zip', size: '252 MB', timestamp: new Date(Date.now() - 172800000), status: 'success', type: 'manual', tables: 48, records: 123200 },
    { id: 4, name: 'backup_20241207_020000.zip', size: '250 MB', timestamp: new Date(Date.now() - 259200000), status: 'failed', type: 'auto' },
  ]);

  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [previewBackup, setPreviewBackup] = useState<Backup | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<Backup | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Backup | null>(null);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupProgress(0);
    
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    await new Promise(resolve => setTimeout(resolve, 3500));
    
    const newBackup: Backup = {
      id: Date.now(),
      name: `manual_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.zip`,
      size: '258 MB',
      timestamp: new Date(),
      status: 'success',
      type: 'manual',
      tables: 48,
      records: 126500,
    };
    
    setBackups(prev => [newBackup, ...prev]);
    toast.success('Backup created successfully');
    setCreatingBackup(false);
    setBackupProgress(0);
  };

  const handleDownloadBackup = (backup: Backup) => {
    // Simulate download - in production would fetch from Supabase Storage
    toast.success(`Downloading ${backup.name}...`);
    
    // Create mock download
    const blob = new Blob(['Mock backup data'], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip') && !file.name.endsWith('.sql') && !file.name.endsWith('.json')) {
        toast.error('Invalid file format. Please upload .zip, .sql, or .json files.');
        return;
      }
      setUploadedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleUploadAndRestore = () => {
    if (!uploadedFile) {
      toast.error('Please select a backup file first');
      return;
    }
    
    const mockBackup: Backup = {
      id: Date.now(),
      name: uploadedFile.name,
      size: `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      timestamp: new Date(uploadedFile.lastModified),
      status: 'success',
      type: 'manual',
      tables: 48,
      records: 120000,
    };
    
    setSelectedBackupForRestore(mockBackup);
    setPreviewBackup(mockBackup);
  };

  const handlePreviewRestore = (backup: Backup) => {
    setPreviewBackup(backup);
  };

  const handleInitiateRestore = (backup: Backup) => {
    setSelectedBackupForRestore(backup);
    setPreviewBackup(null);
    setConfirmRestore(true);
  };

  const handleConfirmRestore = async () => {
    if (restorePassword !== 'admin123') {
      toast.error('Invalid password. Restoration requires super admin authentication.');
      return;
    }

    setConfirmRestore(false);
    setRestorePassword('');
    setRestoring(true);
    setRestoreProgress(0);

    const interval = setInterval(() => {
      setRestoreProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 250);

    await new Promise(resolve => setTimeout(resolve, 5500));
    
    // Validation step
    toast.info('Validating restored data...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Backup restored and validated successfully');
    setRestoring(false);
    setRestoreProgress(0);
    setSelectedBackupForRestore(null);
    setUploadedFile(null);
  };

  const handleDeleteBackup = async (backup: Backup) => {
    setBackups(prev => prev.filter(b => b.id !== backup.id));
    toast.success(`Backup ${backup.name} deleted`);
    setDeleteConfirm(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Backup settings saved successfully');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Restore Progress Overlay */}
      {restoring && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary" />
                <h3 className="text-lg font-semibold mt-4">Restoring Backup</h3>
                <p className="text-sm text-muted-foreground">
                  {restoreProgress < 80 ? 'Importing database tables...' : 
                   restoreProgress < 100 ? 'Validating data integrity...' : 'Complete!'}
                </p>
              </div>
              <Progress value={restoreProgress} className="h-3" />
              <p className="text-center text-sm font-medium">{restoreProgress}%</p>
            </CardContent>
          </Card>
        </div>
      )}

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
            <>
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

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium">Encrypted Backups (AES-256)</p>
                    <p className="text-sm text-muted-foreground">
                      Protect sensitive data with encryption
                    </p>
                  </div>
                </div>
                <Switch
                  checked={autoBackup.encrypted}
                  onCheckedChange={(checked) => setAutoBackup({ ...autoBackup, encrypted: checked })}
                />
              </div>
            </>
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

      {/* Manual Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Manual Backup & Restore
          </CardTitle>
          <CardDescription>Create on-demand backups or restore from existing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              {creatingBackup ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileArchive className="w-4 h-4 mr-2" />
              )}
              {creatingBackup ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.sql,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Backup
              </Button>
              {uploadedFile && (
                <Button variant="secondary" onClick={handleUploadAndRestore}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview & Restore
                </Button>
              )}
            </div>
          </div>

          {creatingBackup && (
            <div className="space-y-2">
              <Progress value={backupProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {backupProgress < 30 ? 'Exporting tables...' : 
                 backupProgress < 60 ? 'Compressing data...' : 
                 backupProgress < 90 ? 'Encrypting backup...' : 'Finalizing...'}
              </p>
            </div>
          )}

          {uploadedFile && (
            <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileArchive className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
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
                        title="Preview"
                        disabled={backup.status === 'failed'}
                        onClick={() => handlePreviewRestore(backup)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Restore"
                        disabled={backup.status === 'failed' || restoring}
                        onClick={() => handleInitiateRestore(backup)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Download"
                        disabled={backup.status === 'failed'}
                        onClick={() => handleDownloadBackup(backup)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Delete"
                        onClick={() => setDeleteConfirm(backup)}
                      >
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

      {/* Preview Dialog */}
      <Dialog open={!!previewBackup} onOpenChange={() => setPreviewBackup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Preview</DialogTitle>
            <DialogDescription>
              Review backup contents before restoring
            </DialogDescription>
          </DialogHeader>
          {previewBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Backup Name</p>
                  <p className="font-mono text-sm">{previewBackup.name}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{previewBackup.size}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Tables</p>
                  <p className="font-medium">{previewBackup.tables || 48}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Records</p>
                  <p className="font-medium">{(previewBackup.records || 125000).toLocaleString()}</p>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{previewBackup.timestamp.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Warning</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Restoring this backup will overwrite current data. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewBackup(null)}>
              Cancel
            </Button>
            <Button onClick={() => previewBackup && handleInitiateRestore(previewBackup)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Proceed to Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Super Admin Authentication Required
            </DialogTitle>
            <DialogDescription>
              Restoring a backup requires super admin permissions. Please enter your password to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restore-password">Password</Label>
              <Input
                id="restore-password"
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Enter your admin password"
              />
            </div>
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <p className="text-sm text-destructive">
                <strong>Final Warning:</strong> This will restore the database to the state of{' '}
                {selectedBackupForRestore?.name}. All current data will be overwritten.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmRestore(false);
              setRestorePassword('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmRestore}
              disabled={!restorePassword}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDeleteBackup(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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