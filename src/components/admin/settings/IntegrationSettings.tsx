import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Key, 
  CreditCard, 
  Mail, 
  MessageSquare,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export function IntegrationSettings() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const [apiKeys, setApiKeys] = useState({
    openaiApiKey: 'sk-••••••••••••••••••••••••••••••••',
    cerebrasApiKey: 'csk-••••••••••••••••••••••••••••••••',
    elevenlabsApiKey: 'el-••••••••••••••••••••••••••••••••',
  });

  const [apiStatus, setApiStatus] = useState({
    openai: { connected: true, lastCheck: new Date() },
    cerebras: { connected: true, lastCheck: new Date() },
    elevenlabs: { connected: false, lastCheck: new Date() },
  });

  const [payfast, setPayfast] = useState({
    merchantId: '10000100',
    merchantKey: '••••••••••••••••',
    passphrase: '••••••••••••••••',
    testMode: true,
    webhookUrl: 'https://api.edufutura.co.za/webhooks/payfast',
  });

  const [email, setEmail] = useState({
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUsername: 'apikey',
    smtpPassword: '••••••••••••••••',
  });

  const [sms, setSms] = useState({
    accountSid: 'AC••••••••••••••••••••••••••••••••',
    authToken: '••••••••••••••••••••••••••••••••',
    phoneNumber: '+27123456789',
  });

  const [webhookHistory] = useState([
    { id: 1, timestamp: new Date(), event: 'payment_complete', status: 'success' },
    { id: 2, timestamp: new Date(Date.now() - 3600000), event: 'subscription_cancelled', status: 'success' },
    { id: 3, timestamp: new Date(Date.now() - 7200000), event: 'payment_failed', status: 'failed' },
  ]);

  const [saving, setSaving] = useState(false);

  const handleTestConnection = async (service: string) => {
    setTesting({ ...testing, [service]: true });
    await new Promise(resolve => setTimeout(resolve, 2000));
    setApiStatus({
      ...apiStatus,
      [service]: { connected: true, lastCheck: new Date() },
    });
    toast.success(`${service} connection successful`);
    setTesting({ ...testing, [service]: false });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Integration settings saved successfully');
    setSaving(false);
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys({ ...showKeys, [key]: !showKeys[key] });
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </CardTitle>
          <CardDescription>Manage external service API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenAI */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">OpenAI</h4>
                {apiStatus.openai.connected ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('openai')}
                disabled={testing.openai}
              >
                {testing.openai ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type={showKeys.openai ? 'text' : 'password'}
                value={apiKeys.openaiApiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleKeyVisibility('openai')}
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Cerebras */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Cerebras</h4>
                {apiStatus.cerebras.connected ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('cerebras')}
                disabled={testing.cerebras}
              >
                {testing.cerebras ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type={showKeys.cerebras ? 'text' : 'password'}
                value={apiKeys.cerebrasApiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, cerebrasApiKey: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleKeyVisibility('cerebras')}
              >
                {showKeys.cerebras ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* ElevenLabs */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">ElevenLabs</h4>
                {apiStatus.elevenlabs.connected ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('elevenlabs')}
                disabled={testing.elevenlabs}
              >
                {testing.elevenlabs ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type={showKeys.elevenlabs ? 'text' : 'password'}
                value={apiKeys.elevenlabsApiKey}
                onChange={(e) => setApiKeys({ ...apiKeys, elevenlabsApiKey: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleKeyVisibility('elevenlabs')}
              >
                {showKeys.elevenlabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PayFast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            PayFast Payment Gateway
          </CardTitle>
          <CardDescription>Configure South African payment processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Test Mode</span>
              <Badge variant={payfast.testMode ? 'secondary' : 'default'}>
                {payfast.testMode ? 'Sandbox' : 'Production'}
              </Badge>
            </div>
            <Switch
              checked={payfast.testMode}
              onCheckedChange={(checked) => setPayfast({ ...payfast, testMode: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Merchant ID</Label>
              <Input
                value={payfast.merchantId}
                onChange={(e) => setPayfast({ ...payfast, merchantId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Merchant Key</Label>
              <Input
                type="password"
                value={payfast.merchantKey}
                onChange={(e) => setPayfast({ ...payfast, merchantKey: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Passphrase</Label>
            <Input
              type="password"
              value={payfast.passphrase}
              onChange={(e) => setPayfast({ ...payfast, passphrase: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={payfast.webhookUrl}
                readOnly
                className="flex-1 bg-muted"
              />
              <Button variant="outline" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Recent Webhooks</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookHistory.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="text-sm">
                      {format(webhook.timestamp, 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>{webhook.event}</TableCell>
                    <TableCell>
                      <Badge variant={webhook.status === 'success' ? 'default' : 'destructive'}>
                        {webhook.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {webhook.status === 'failed' && (
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Email (SMTP) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration (SMTP)
          </CardTitle>
          <CardDescription>Configure transactional email delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={email.smtpHost}
                onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input
                type="number"
                value={email.smtpPort}
                onChange={(e) => setEmail({ ...email, smtpPort: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={email.smtpUsername}
                onChange={(e) => setEmail({ ...email, smtpUsername: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={email.smtpPassword}
                onChange={(e) => setEmail({ ...email, smtpPassword: e.target.value })}
              />
            </div>
          </div>

          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Send Test Email
          </Button>
        </CardContent>
      </Card>

      {/* SMS (Twilio) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Configuration (Twilio)
          </CardTitle>
          <CardDescription>Configure SMS notifications and OTP delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account SID</Label>
              <Input
                value={sms.accountSid}
                onChange={(e) => setSms({ ...sms, accountSid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={sms.authToken}
                onChange={(e) => setSms({ ...sms, authToken: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={sms.phoneNumber}
              onChange={(e) => setSms({ ...sms, phoneNumber: e.target.value })}
            />
          </div>

          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Test SMS
          </Button>
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
