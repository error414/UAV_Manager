// Theme (light/dark) management persisted in a cookie only.

const THEME_COOKIE = 'theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

// Read a cookie value by name, or null if not set.
export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// Write a cookie that persists for a year.
export const setCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
};

// Return the stored theme ('dark' | 'light'). Defaults to 'light'.
export const getStoredTheme = () => (getCookie(THEME_COOKIE) === 'dark' ? 'dark' : 'light');

// Toggle the `dark` class on <html> so Tailwind's dark: variants apply.
export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// Persist the theme in a cookie and apply it immediately.
export const setStoredTheme = (theme) => {
  setCookie(THEME_COOKIE, theme);
  applyTheme(theme);
};

// Read the cookie and apply the theme. Call once before the app renders
// to avoid a flash of the wrong theme.
export const initTheme = () => {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
};
