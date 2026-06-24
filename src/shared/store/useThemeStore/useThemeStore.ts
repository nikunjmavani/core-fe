import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  applyBaseColor,
  applyGeneratedTheme,
  applyIconWeight,
  applyMenuStyle,
  applyThemePreset,
  DEFAULT_BASE,
  DEFAULT_ICON_LIBRARY,
  DEFAULT_ICON_WEIGHT,
  DEFAULT_MENU,
  DEFAULT_PRESET,
  DEFAULT_TOAST_VARIANT,
  GENERATED_PRESET,
  type GeneratedTheme,
  generateTheme,
  isThemePreset,
  nextAppVariant,
  nextAuthVariant,
  nextToastVariant,
  normalizeLook,
  shuffleIcons,
} from '@/shared/theme/index.ts';

type Mode = 'light' | 'dark' | 'system';

interface ThemeStore {
  /** Light/dark mode (name kept for back-compat with existing consumers). */
  theme: Mode;
  /** Active named accent preset (see `shared/theme`); `custom` when generated. */
  preset: string;
  /** The active generated look (accent + chart + fonts + radius) when custom. */
  customTheme: GeneratedTheme | null;
  /** Neutral base colour (orthogonal — applies under any preset). */
  baseId: string;
  /** Menu surface style (orthogonal). */
  menu: string;
  /** Icon weight — Lucide stroke-width (orthogonal). */
  iconWeight: string;
  /** Icon library — lucide (default) | tabler | phosphor (orthogonal). */
  iconLibrary: string;
  /** TEMP: AuthLayout preview design index (0..2); rolled by shuffle. */
  authVariant: number;
  /** TEMP: AppLayout preview shell index (0..2); rolled by shuffle. */
  appVariant: number;
  /** TEMP: custom-toast design index (0..N-1); rolled by shuffle + the picker. */
  toastVariant: number;
  setTheme: (theme: Mode) => void;
  setPreset: (preset: string) => void;
  /** Set one axis of the custom look (accent/chart/font/radius); switches to custom. */
  updateLook: (partial: Partial<GeneratedTheme>) => void;
  setBaseColor: (id: string) => void;
  setMenu: (id: string) => void;
  setIconWeight: (id: string) => void;
  setIconLibrary: (id: string) => void;
  /** TEMP: set the custom-toast design index (Appearance preview). */
  setToastVariant: (index: number) => void;
  /** Generate + apply a fresh full look (shadcn-create style). */
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
      baseId: DEFAULT_BASE,
      menu: DEFAULT_MENU,
      iconWeight: DEFAULT_ICON_WEIGHT,
      iconLibrary: DEFAULT_ICON_LIBRARY,
      authVariant: 0,
      appVariant: 0,
      toastVariant: DEFAULT_TOAST_VARIANT,
      setTheme: (theme) => {
        applyMode(theme);
        set({ theme });
      },
      setPreset: (preset) => {
        const next = isThemePreset(preset) ? preset : DEFAULT_PRESET;
        applyThemePreset(next);
        set({ preset: next, customTheme: null });
      },
      updateLook: (partial) => {
        // Seed from the current custom look (or defaults when on a named preset),
        // change one axis, and switch to the custom look.
        const next = { ...normalizeLook(get().customTheme), ...partial };
        applyGeneratedTheme(next);
        set({ preset: GENERATED_PRESET, customTheme: next });
      },
      setBaseColor: (id) => {
        applyBaseColor(id);
        set({ baseId: id });
      },
      setMenu: (id) => {
        applyMenuStyle(id);
        set({ menu: id });
      },
      setIconWeight: (id) => {
        applyIconWeight(id);
        set({ iconWeight: id });
      },
      setIconLibrary: (id) => {
        // The @/shared/icons barrel subscribes to this and lazy-loads the set.
        set({ iconLibrary: id });
      },
      setToastVariant: (index) => set({ toastVariant: index }),
      shuffleTheme: () => {
        // Generate a fresh full look each time (colour + chart + fonts + radius,
        // shadcn-create style) rather than cycling a fixed preset list. Icons
        // ride along: sometimes a new weight, sometimes a different library.
        const next = generateTheme(get().customTheme);
        applyGeneratedTheme(next);
        const icons = shuffleIcons({
          weight: get().iconWeight,
          library: get().iconLibrary,
        });
        applyIconWeight(icons.weight);
        set({
          preset: GENERATED_PRESET,
          customTheme: next,
          iconWeight: icons.weight,
          iconLibrary: icons.library,
          // TEMP: cycle the Auth + App layout + toast preview designs on shuffle.
          authVariant: nextAuthVariant(get().authVariant),
          appVariant: nextAppVariant(get().appVariant),
          toastVariant: nextToastVariant(get().toastVariant),
        });
      },
    }),
    {
      name: 'theme-preference',
      partialize: (state) => ({
        theme: state.theme,
        preset: state.preset,
        customTheme: state.customTheme,
        baseId: state.baseId,
        menu: state.menu,
        iconWeight: state.iconWeight,
        iconLibrary: state.iconLibrary,
        authVariant: state.authVariant,
        appVariant: state.appVariant,
        toastVariant: state.toastVariant,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyMode(state.theme);
          applyBaseColor(state.baseId ?? DEFAULT_BASE);
          applyMenuStyle(state.menu ?? DEFAULT_MENU);
          applyIconWeight(state.iconWeight ?? DEFAULT_ICON_WEIGHT);
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
