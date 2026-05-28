import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeftCircle } from 'lucide-react';

export default function AdminPreviewBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Do not depend on role loading here; the preview flag is only set by admin UI.
  const [visible, setVisible] = useState(false);
  const [fromPath, setFromPath] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      try {
        const flag = sessionStorage.getItem('admin_preview');
        const from = sessionStorage.getItem('admin_preview_from');
        if (flag && from) {
          setFromPath(from);
          setVisible(true);
        } else {
          setFromPath(null);
          setVisible(false);
        }
      } catch (e) {
        // ignore storage errors
      }
    };

    check();

    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        if (detail && detail.admin_preview === '1') {
          setFromPath(detail.from || sessionStorage.getItem('admin_preview_from'));
          setVisible(true);
        } else {
          check();
        }
      } catch (err) {
        check();
      }
    };

    window.addEventListener('adminPreviewChanged', handler as EventListener);
    return () => window.removeEventListener('adminPreviewChanged', handler as EventListener);
  }, []);

  const handleReturn = useCallback(() => {
    try {
      sessionStorage.removeItem('admin_preview');
      const to = sessionStorage.getItem('admin_preview_from') || '/admin';
      sessionStorage.removeItem('admin_preview_from');
      try {
        window.dispatchEvent(new CustomEvent('adminPreviewChanged', { detail: { admin_preview: '0' } }));
      } catch (e) {}
      navigate(to);
      setVisible(false);
    } catch (e) {
      navigate('/admin');
      setVisible(false);
    }
  }, [navigate]);

  if (!visible) return null;
  if (!user) return null;
  // Only show when a user is present and the preview flag was set by the admin UI

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button variant="secondary" onClick={handleReturn} className="flex items-center gap-2">
        <ArrowLeftCircle className="w-5 h-5" />
        Return to admin
      </Button>
    </div>
  );
}
