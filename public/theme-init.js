// Prevent theme FOUC: apply mode + saved accent/radius before React hydrates.
// Mirrors useThemeStore onRehydrateStorage (light/dark + preset/custom primary).
try {
  var raw = localStorage.getItem('theme-preference');
  var stored = raw ? JSON.parse(raw) : {};
  var state = stored.state || {};
  var theme = state.theme;
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark =
    theme === 'dark' || (theme === 'system' && prefersDark) || (!theme && prefersDark);

  var root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Named preset primaries — must match index.css [data-theme] blocks.
  var PRESET_PRIMARY = {
    violet: {
      light: ['oklch(0.55 0.22 290)', 'oklch(0.985 0 0)'],
      dark: ['oklch(0.62 0.19 290)', 'oklch(0.985 0 0)'],
    },
    emerald: {
      light: ['oklch(0.6 0.14 162)', 'oklch(0.985 0 0)'],
      dark: ['oklch(0.7 0.15 162)', 'oklch(0.205 0 0)'],
    },
    rose: {
      light: ['oklch(0.58 0.21 12)', 'oklch(0.985 0 0)'],
      dark: ['oklch(0.65 0.19 12)', 'oklch(0.985 0 0)'],
    },
    ocean: {
      light: ['oklch(0.55 0.16 230)', 'oklch(0.985 0 0)'],
      dark: ['oklch(0.62 0.14 230)', 'oklch(0.985 0 0)'],
    },
  };

  var CHROMA = {
    subtle: 0.06,
    muted: 0.1,
    balanced: 0.16,
    vibrant: 0.22,
    max: 0.28,
  };

  var RADII = {
    sharp: 0,
    default: 0.5,
    rounded: 0.75,
    round: 1,
  };

  var mode = isDark ? 'dark' : 'light';
  var preset = state.preset || 'default';
  var primary;
  var fg;

  if (preset === 'custom' && state.customTheme) {
    var look = state.customTheme;
    var hue = ((Math.round(look.hue) % 360) + 360) % 360;
    var chroma = CHROMA[look.intensityId] || 0.16;
    primary = 'oklch(0.58 ' + chroma + ' ' + hue + ')';
    // Boot-safe foreground — full contrast math lives in presets.ts applyAccent.
    fg = 'oklch(0.985 0 0)';
    if (look.radiusId && RADII[look.radiusId] !== undefined) {
      root.style.setProperty('--radius-lg', RADII[look.radiusId] + 'rem');
    }
  } else if (PRESET_PRIMARY[preset]) {
    root.dataset.theme = preset;
    primary = PRESET_PRIMARY[preset][mode][0];
    fg = PRESET_PRIMARY[preset][mode][1];
  }

  if (primary) {
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-foreground', fg);
  }
} catch (e) {}
