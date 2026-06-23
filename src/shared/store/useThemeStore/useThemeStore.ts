import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  applyThemePreset,
  DEFAULT_PRESET,
  isThemePreset,
  THEME_PRESETS,
} from '@/shared/theme/index.ts';

type Mode = 'light' | 'dark' | 'system';

interface ThemeStore {
  /** Light/dark mode (name kept for back-compat with existing consumers). */
  theme: Mode;
  /** Active named accent preset (see `shared/theme`). */
  preset: string;
  setTheme: (theme: Mode) => void;
  setPreset: (preset: string) => void;
  /** Pick a random preset different from the current one. */
  shuffleTheme: () => void;
}

function applyMode(theme: Mode) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && systemDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      preset: DEFAULT_PRESET,
      setTheme: (theme) => {
        applyMode(theme);
        set({ theme });
      },
      setPreset: (preset) => {
        const next = isThemePreset(preset) ? preset : DEFAULT_PRESET;
        applyThemePreset(next);
        set({ preset: next });
      },
      shuffleTheme: () => {
        const others = THEME_PRESETS.filter((p) => p.id !== get().preset);
        const pool = others.length > 0 ? others : THEME_PRESETS;
        // eslint-disable-next-line sonarjs/pseudo-random -- cosmetic theme shuffle, not security-sensitive
        const next = pool[Math.floor(Math.random() * pool.length)];
        if (next) {
          applyThemePreset(next.id);
          set({ preset: next.id });
        }
      },
    }),
    {
      name: 'theme-preference',
      partialize: (state) => ({ theme: state.theme, preset: state.preset }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyMode(state.theme);
          applyThemePreset(state.preset);
        }
      },
    },
  ),
);

// Listen for system theme changes with proper cleanup via AbortController
const themeListenerController = new AbortController();

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') applyMode('system');
  };

  mediaQuery.addEventListener('change', handler, {
    signal: themeListenerController.signal,
  });

  // Cleanup on HMR
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      themeListenerController.abort();
    });
  }
}
