/**
 * Semantic icon and dismiss-control classes for tinted / dark surfaces.
 * Use these instead of raw palette utilities (`text-white`, `text-black`, …).
 */
import { appearanceChoiceClassName } from '@/lib/appearance-surface.ts';

/** Icons on `bg-brand` / brand-tinted panels (auth marketing shell). */
export const iconOnBrandSurface = 'text-brand-foreground';

/** Icons on `bg-sidebar` / sidebar chrome (nav rail, mobile drawer). */
export const iconOnSidebarSurface = 'text-sidebar-foreground';

/** Icons on solid `bg-primary` chips, FABs, and brand marks. */
export const iconOnPrimarySurface = 'text-primary-foreground';

/** Icons on solid semantic status chips (toast badges, status pills). */
export const iconOnSuccessSurface = 'text-success-foreground';
export const iconOnDestructiveSurface = 'text-destructive-foreground';
export const iconOnWarningSurface = 'text-warning-foreground';
export const iconOnInfoSurface = 'text-info-foreground';

/** Inline dismiss / mark-read controls — focus ring driven by `data-focus` axis. */
export const closeControlClassName =
  'text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors outline-none focus-visible:outline-hidden';

/** Theme-aware focus — pair with `data-slot="button"`; `data-focus` CSS owns the ring. */
export const focusControlClassName = 'outline-none focus-visible:outline-hidden';

/** Appearance / shuffle picker pill — pair with `data-slot="button"`. */
export const themeChoiceButtonClassName = appearanceChoiceClassName;

/** Decorative icon tile — pair with `data-slot="icon-chip"` for theme-aware radius. */
export const iconChipClassName = 'flex shrink-0 items-center justify-center';
