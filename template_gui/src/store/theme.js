const themeKey = 'tripmate_theme';
export function getTheme() {
  try { return localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}
export function saveTheme(theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem(themeKey, value);
  applyTheme(value);
}
