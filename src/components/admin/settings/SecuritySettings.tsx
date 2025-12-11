import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Shield, 
  Globe, 
  FileText, 
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  Ban
} from 'lucide-react';

export function SecuritySettings() {
  const [ipAllowlist, setIpAllowlist] = useState<string[]>([
    '203.0.113.0/24',
    '198.51.100.0/24',
  ]);
  const [ipBlocklist, setIpBlocklist] = useState<string[]>([
    '192.0.2.100',
  ]);
  const [newIp, setNewIp] = useState('');

  const [auditSettings, setAuditSettings] = useState({
    retentionDays: 365,
    logLevel: 'info',
    piiLogging: false,
  });

  const [mfaRequired, setMfaRequired] = useState(true);
  const [geofencing, setGeofencing] = useState({
    enabled: false,
    allowedCountries: ['ZA'],
  });

  const [securityIncidents] = useState([
    { id: 1, type: 'login_failure', source: '192.0.2.50', count: 15, timestamp: new Date() },
    { id: 2, type: 'rate_limit', source: '198.51.100.25', count: 100, timestamp: new Date(Date.now() - 3600000) },
    { id: 3, type: 'content_violation', source: 'user_123', count: 3, timestamp: new Date(Date.now() - 7200000) },
  ]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Security settings saved successfully');
    setSaving(false);
  };

  const addToAllowlist = () => {
    if (newIp && !ipAllowlist.includes(newIp)) {
      setIpAllowlist([...ipAllowlist, newIp]);
      setNewIp('');
      toast.success('IP added to allowlist');
    }
  };

  const addToBlocklist = () => {
    if (newIp && !ipBlocklist.includes(newIp)) {
      setIpBlocklist([...ipBlocklist, newIp]);
      setNewIp('');
      toast.success('IP added to blocklist');
    }
  };

  const removeFromAllowlist = (ip: string) => {
    setIpAllowlist(ipAllowlist.filter(i => i !== ip));
  };

  const removeFromBlocklist = (ip: string) => {
    setIpBlocklist(ipBlocklist.filter(i => i !== ip));
  };

  return (
    <div className="space-y-6">
      {/* Security Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Policies
          </CardTitle>
          <CardDescription>Configure platform security requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">MFA Required for Admins</p>
              <p className="text-sm text-muted-foreground">
                Force two-factor authentication for admin accounts
              </p>
            </div>
            <Switch
              checked={mfaRequired}
              onCheckedChange={setMfaRequired}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Current Security Configuration</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Password: Minimum 10 characters with complexity requirements</li>
              <li>• Session: 30 minute idle timeout, 7 day maximum</li>
              <li>• Lockout: After 5 failed attempts for 30 minutes</li>
              <li>• Concurrent sessions: Limited to 3 devices</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* IP Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            IP Restrictions
          </CardTitle>
          <CardDescription>Control access by IP address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter IP address or CIDR (e.g., 203.0.113.0/24)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={addToAllowlist}>
              <Plus className="w-4 h-4 mr-1" />
              Allowlist
            </Button>
            <Button variant="outline" onClick={addToBlocklist}>
              <Ban className="w-4 h-4 mr-1" />
              Blocklist
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Allowlist */}
            <div className="space-y-2">
              <Label className="text-green-600">IP Allowlist (Admin Only)</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {ipAllowlist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No IPs in allowlist</p>
                ) : (
                  ipAllowlist.map((ip) => (
                    <div key={ip} className="flex items-center justify-between">
                      <code className="text-sm">{ip}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromAllowlist(ip)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blocklist */}
            <div className="space-y-2">
              <Label className="text-red-600">IP Blocklist</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {ipBlocklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No IPs in blocklist</p>
                ) : (
                  ipBlocklist.map((ip) => (
                    <div key={ip} className="flex items-center justify-between">
                      <code className="text-sm">{ip}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromBlocklist(ip)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Geofencing */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Geofencing</p>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific countries
                </p>
              </div>
              <Switch
                checked={geofencing.enabled}
                onCheckedChange={(checked) => setGeofencing({ ...geofencing, enabled: checked })}
              />
            </div>
            {geofencing.enabled && (
              <div className="ml-4 pl-4 border-l-2 border-secondary/30">
                <Label className="text-sm">Allowed Countries</Label>
                <Select defaultValue="ZA">
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="BW">Botswana</SelectItem>
                    <SelectItem value="NA">Namibia</SelectItem>
                    <SelectItem value="ZW">Zimbabwe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Logging
          </CardTitle>
          <CardDescription>Configure security audit trail settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retention Period (days)</Label>
              <Input
                type="number"
                value={auditSettings.retentionDays}
                onChange={(e) => setAuditSettings({ ...auditSettings, retentionDays: parseInt(e.target.value) })}
                min={30}
                max={730}
              />
              <p className="text-xs text-muted-foreground">
                Keep logs for compliance (1-2 years recommended)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select
                value={auditSettings.logLevel}
                onValueChange={(value) => setAuditSettings({ ...auditSettings, logLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error only</SelectItem>
                  <SelectItem value="warning">Warning and above</SelectItem>
                  <SelectItem value="info">Info and above</SelectItem>
                  <SelectItem value="debug">Debug (verbose)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/30 bg-destructive/5">
            <div>
              <p className="font-medium">PII Logging</p>
              <p className="text-sm text-muted-foreground">
                Include personal information in logs (requires justification)
              </p>
            </div>
            <Switch
              checked={auditSettings.piiLogging}
              onCheckedChange={(checked) => setAuditSettings({ ...auditSettings, piiLogging: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Security Incidents
          </CardTitle>
          <CardDescription>Detected attacks and suspicious activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securityIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <Badge 
                      variant={
                        incident.type === 'login_failure' ? 'default' :
                        incident.type === 'rate_limit' ? 'secondary' : 'destructive'
                      }
                    >
                      {incident.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm">{incident.source}</code>
                  </TableCell>
                  <TableCell>{incident.count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(incident.timestamp, 'HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Ban className="w-4 h-4 mr-1" />
                      Block
                    </Button>
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
