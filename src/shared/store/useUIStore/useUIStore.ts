import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  /** The dedicated Appearance dialog (opened by the floating handle / Customize). */
  appearanceOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setAppearanceOpen: (open: boolean) => void;
  toggleAppearance: () => void;
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
  appearanceOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setAppearanceOpen: (appearanceOpen) => set({ appearanceOpen }),
  toggleAppearance: () => set((s) => ({ appearanceOpen: !s.appearanceOpen })),
}));
