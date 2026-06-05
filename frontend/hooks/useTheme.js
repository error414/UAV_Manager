import { useState, useCallback, useEffect } from 'react';
import { getStoredTheme, setStoredTheme, applyTheme } from '../utils/themeUtils';

// Manages the light/dark theme. Persistence is cookie-only (see themeUtils).
const useTheme = () => {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  // Keep the <html> class in sync if the theme state changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setStoredTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
};

export default useTheme;
