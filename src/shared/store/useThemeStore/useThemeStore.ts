import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  applyGeneratedTheme,
  applyThemePreset,
  DEFAULT_PRESET,
  GENERATED_PRESET,
  type GeneratedTheme,
  generateTheme,
  isThemePreset,
} from '@/shared/theme/index.ts';

type Mode = 'light' | 'dark' | 'system';

interface ThemeStore {
  /** Light/dark mode (name kept for back-compat with existing consumers). */
  theme: Mode;
  /** Active named accent preset (see `shared/theme`); `custom` when generated. */
  preset: string;
  /** The last generated look (accent + font + radius), when `preset` is `custom`. */
  customTheme: GeneratedTheme | null;
  setTheme: (theme: Mode) => void;
  setPreset: (preset: string) => void;
  /** Generate + apply a fresh full look — colour, font, radius (shadcn-create style). */
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
      customTheme: null,
      setTheme: (theme) => {
        applyMode(theme);
        set({ theme });
      },
      setPreset: (preset) => {
        const next = isThemePreset(preset) ? preset : DEFAULT_PRESET;
        applyThemePreset(next);
        set({ preset: next, customTheme: null });
      },
      shuffleTheme: () => {
        // Generate a fresh full look each time (colour + font + radius,
        // shadcn-create style) rather than cycling a fixed preset list.
        const next = generateTheme(get().customTheme);
        applyGeneratedTheme(next);
        set({ preset: GENERATED_PRESET, customTheme: next });
      },
    }),
    {
      name: 'theme-preference',
      partialize: (state) => ({
        theme: state.theme,
        preset: state.preset,
        customTheme: state.customTheme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyMode(state.theme);
          if (state.preset === GENERATED_PRESET && state.customTheme != null) {
            applyGeneratedTheme(state.customTheme);
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
