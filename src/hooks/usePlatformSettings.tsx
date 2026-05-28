import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface PlatformSettingsState {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  branding: BrandingSettings;
}

interface PlatformSettingsContextValue extends PlatformSettingsState {
  updateSettings: (settings: Partial<PlatformSettingsState>) => void;
  updateBranding: (branding: Partial<BrandingSettings>) => void;
}

const STORAGE_KEY = 'edufutura_platform_settings';

const DEFAULT_SETTINGS: PlatformSettingsState = {
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
  branding: {
    primaryColor: '#1B4332',
    secondaryColor: '#D4AF37',
    accentColor: '#800020',
  },
};

// Convert hex color to HSL string for CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandingToDom(branding: BrandingSettings) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToHsl(branding.primaryColor));
  root.style.setProperty('--secondary', hexToHsl(branding.secondaryColor));
  root.style.setProperty('--accent', hexToHsl(branding.accentColor));
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettingsState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Apply branding on mount and whenever it changes
  useEffect(() => {
    applyBrandingToDom(settings.branding);
  }, [settings.branding]);

  const updateSettings = (partial: Partial<PlatformSettingsState>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateBranding = (partial: Partial<BrandingSettings>) => {
    setSettings(prev => {
      const next = { ...prev, branding: { ...prev.branding, ...partial } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <PlatformSettingsContext.Provider value={{ ...settings, updateSettings, updateBranding }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error('usePlatformSettings must be used within PlatformSettingsProvider');
  return ctx;
}
