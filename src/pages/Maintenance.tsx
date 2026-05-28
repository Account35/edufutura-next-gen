import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export default function MaintenancePage() {
  const { maintenanceMessage } = usePlatformSettings();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-heading text-primary">
            Under Maintenance
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {maintenanceMessage}
          </p>
        </div>

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
