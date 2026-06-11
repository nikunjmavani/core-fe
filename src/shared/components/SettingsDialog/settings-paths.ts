import type { SettingsSection } from './nav-items.ts';

export type { SettingsSection };

/**
 * Single source of truth for URL ↔ section mapping.
 *
 * Flat user sections at `/settings/<section>`; organization sub-sections
 * nested at `/settings/organization/<sub>`.
 */
export const SECTION_TO_PATH: Record<SettingsSection, string> = {
  profile: '/settings/profile',
  account: '/settings/account',
  security: '/settings/security',
  appearance: '/settings/appearance',
  notifications: '/settings/notifications',
  'org-general': '/settings/organization',
};

const PATH_TO_SECTION: Record<string, SettingsSection> = Object.fromEntries(
  Object.entries(SECTION_TO_PATH).map(([k, v]) => [v, k as SettingsSection]),
);

export const DEFAULT_SETTINGS_PATH = SECTION_TO_PATH.profile;
export const DEFAULT_SETTINGS_SECTION: SettingsSection = 'profile';

/** Returns true when the URL is inside the settings dialog space. */
export function isSettingsPath(pathname: string): boolean {
  return pathname === '/settings' || pathname.startsWith('/settings/');
}

/**
 * Resolve a pathname to its `SettingsSection`. Falls back to the default
 * when the pathname is not a known settings path (or is the bare `/settings`).
 */
export function sectionFromPath(pathname: string): SettingsSection {
  // Strip trailing slash for normalization (TanStack Router can emit either).
  const normalized = pathname.replace(/\/$/, '') || '/';
  // eslint-disable-next-line security/detect-object-injection -- normalized comes from router pathname; lookup is in a closed enum
  return PATH_TO_SECTION[normalized] ?? DEFAULT_SETTINGS_SECTION;
}

/** Path for a given section — never throws. */
export function pathForSection(section: SettingsSection): string {
  // eslint-disable-next-line security/detect-object-injection -- section is a typed union, the map is exhaustive
  return SECTION_TO_PATH[section];
}
