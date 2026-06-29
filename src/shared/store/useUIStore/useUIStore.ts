import { create } from 'zustand';

import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';

interface UIStore {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  /** The dedicated Appearance dialog (opened by the floating handle / Customize). */
  appearanceOpen: boolean;
  /** The dedicated Language & region dialog (opened by the floating handle). */
  languageOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleShortcuts: () => void;
  setShortcutsOpen: (open: boolean) => void;
  setAppearanceOpen: (open: boolean) => void;
  toggleAppearance: () => void;
  setLanguageOpen: (open: boolean) => void;
  toggleLanguage: () => void;
}

/**
 * Sidebar starts open on tablet/desktop (≥ md) and closed on mobile so it does
 * not cover content as an overlay on first paint. Below `md` it is a toggled overlay.
 */
function initialSidebarOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 768px)').matches;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: initialSidebarOpen(),
  commandPaletteOpen: false,
  shortcutsOpen: false,
  appearanceOpen: false,
  languageOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleCommandPalette: () =>
    set((s) => {
      const next = !s.commandPaletteOpen;
      if (next) captureAnalyticsEvent(ANALYTICS_EVENTS.commandPaletteOpened);
      return { commandPaletteOpen: next };
    }),
  setCommandPaletteOpen: (commandPaletteOpen) => {
    if (commandPaletteOpen) captureAnalyticsEvent(ANALYTICS_EVENTS.commandPaletteOpened);
    set({ commandPaletteOpen });
  },
  toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  // Appearance + Language are mutually exclusive side panels — opening one closes the other.
  setAppearanceOpen: (appearanceOpen) => {
    if (appearanceOpen) captureAnalyticsEvent(ANALYTICS_EVENTS.appearanceDialogOpened);
    set(appearanceOpen ? { appearanceOpen, languageOpen: false } : { appearanceOpen });
  },
  toggleAppearance: () =>
    set((s) => {
      const next = !s.appearanceOpen;
      if (next) captureAnalyticsEvent(ANALYTICS_EVENTS.appearanceDialogOpened);
      return { appearanceOpen: next, languageOpen: false };
    }),
  setLanguageOpen: (languageOpen) => {
    if (languageOpen) captureAnalyticsEvent(ANALYTICS_EVENTS.languageDialogOpened);
    set(languageOpen ? { languageOpen, appearanceOpen: false } : { languageOpen });
  },
  toggleLanguage: () =>
    set((s) => {
      const next = !s.languageOpen;
      if (next) captureAnalyticsEvent(ANALYTICS_EVENTS.languageDialogOpened);
      return { languageOpen: next, appearanceOpen: false };
    }),
}));
