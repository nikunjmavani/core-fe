import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  applyGeneratedTheme,
  applyThemePreset,
  DEFAULT_PRESET,
  GENERATED_PRESET,
  isThemePreset,
  nextRandomHue,
} from '@/shared/theme/index.ts';

type Mode = 'light' | 'dark' | 'system';

interface ThemeStore {
  /** Light/dark mode (name kept for back-compat with existing consumers). */
  theme: Mode;
  /** Active named accent preset (see `shared/theme`); `custom` when generated. */
  preset: string;
  /** Hue (0–359) of the last generated theme, when `preset` is `custom`. */
  customHue: number | null;
  setTheme: (theme: Mode) => void;
  setPreset: (preset: string) => void;
  /** Generate + apply a fresh random accent theme (shadcn-create style). */
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
      customHue: null,
      setTheme: (theme) => {
        applyMode(theme);
        set({ theme });
      },
      setPreset: (preset) => {
        const next = isThemePreset(preset) ? preset : DEFAULT_PRESET;
        applyThemePreset(next);
        set({ preset: next, customHue: null });
      },
      shuffleTheme: () => {
        // Generate a fresh random accent each time (shadcn-create style) rather
        // than cycling a fixed preset list.
        const hue = nextRandomHue(get().customHue);
        applyGeneratedTheme(hue);
        set({ preset: GENERATED_PRESET, customHue: hue });
      },
    }),
    {
      name: 'theme-preference',
      partialize: (state) => ({
        theme: state.theme,
        preset: state.preset,
        customHue: state.customHue,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyMode(state.theme);
          if (state.preset === GENERATED_PRESET && state.customHue != null) {
            applyGeneratedTheme(state.customHue);
          } else {
            applyThemePreset(state.preset);
          }
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
