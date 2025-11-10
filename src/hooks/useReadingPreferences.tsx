import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export const useReadingPreferences = () => {
  const { user } = useAuth();
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load preferences from localStorage and database
  useEffect(() => {
    const loadPreferences = async () => {
      // Load from localStorage first (instant)
      const storedFontSize = localStorage.getItem('curriculum-font-size') as FontSize;
      const storedDarkMode = localStorage.getItem('curriculum-dark-mode') === 'true';
      
      if (storedFontSize) setFontSize(storedFontSize);
      if (storedDarkMode !== null) setIsDarkMode(storedDarkMode);

      // Then sync from database if user is logged in
      if (user) {
        const { data } = await supabase
          .from('study_preferences')
          .select('reading_font_size, dark_mode_enabled')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.reading_font_size) {
            const size = data.reading_font_size as FontSize;
            setFontSize(size);
            localStorage.setItem('curriculum-font-size', size);
          }
          if (data.dark_mode_enabled !== null) {
            setIsDarkMode(data.dark_mode_enabled);
            localStorage.setItem('curriculum-dark-mode', String(data.dark_mode_enabled));
          }
        }
      }
    };

    loadPreferences();
  }, [user]);

  const updateFontSize = async (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('curriculum-font-size', size);

    // Background sync to database
    if (user) {
      await supabase
        .from('study_preferences')
        .upsert(
          { user_id: user.id, reading_font_size: size },
          { onConflict: 'user_id' }
        );
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    localStorage.setItem('curriculum-dark-mode', String(newValue));

    // Apply dark mode to document
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Background sync to database
    if (user) {
      await supabase
        .from('study_preferences')
        .upsert(
          { user_id: user.id, dark_mode_enabled: newValue },
          { onConflict: 'user_id' }
        );
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-base'; // 16px
      case 'medium': return 'text-lg'; // 18px
      case 'large': return 'text-xl'; // 20px
      case 'xlarge': return 'text-2xl'; // 24px
      default: return 'text-lg';
    }
  };

  return {
    fontSize,
    isDarkMode,
    updateFontSize,
    toggleDarkMode,
    getFontSizeClass
  };
};
