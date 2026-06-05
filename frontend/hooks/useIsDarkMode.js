import { useEffect, useState } from 'react';

// Reactively tracks whether the app is in dark mode by watching the `dark`
// class on <html>. Useful for components that render with inline styles or
// SVG fills where Tailwind's `dark:` variants can't be applied.
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

export default useIsDarkMode;
