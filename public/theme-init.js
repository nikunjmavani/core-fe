// Prevent theme FOUC: apply dark class before React hydrates
try {
  var stored = JSON.parse(localStorage.getItem('theme-preference') || '{}');
  var theme = stored.state && stored.state.theme;
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (
    theme === 'dark' ||
    (theme === 'system' && prefersDark) ||
    (!theme && prefersDark)
  ) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
