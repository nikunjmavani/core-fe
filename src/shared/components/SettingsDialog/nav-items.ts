import type { LucideIcon } from 'lucide-react';
import { Bell, Building2, Palette, Shield, User, UserCog } from 'lucide-react';

/**
 * Settings dialog sections. Two top-level groups: **Settings** (per-user) and
 * **Organization** (light org config).
 */
export type SettingsSection =
  | 'profile'
  | 'account'
  | 'security'
  | 'appearance'
  | 'notifications'
  | 'org-general';

export interface SettingsNavItem {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  /** Keywords used by the search box; lowercase. */
  keywords: readonly string[];
}

export interface SettingsNavGroup {
  id: 'settings' | 'organization';
  label: string;
  items: readonly SettingsNavItem[];
}

export const SETTINGS_NAV: readonly SettingsNavGroup[] = [
  {
    id: 'settings',
    label: 'Settings',
    items: [
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        keywords: ['profile', 'name', 'bio', 'avatar', 'timezone', 'location'],
      },
      {
        id: 'account',
        label: 'Account',
        icon: UserCog,
        keywords: ['account', 'id', 'email', 'role', 'delete', 'deactivate'],
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        keywords: ['security', 'mfa', 'two-factor', 'passkey', 'sessions', 'password'],
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        keywords: ['appearance', 'theme', 'dark', 'light', 'system', 'color'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        keywords: ['notifications', 'email', 'alerts', 'push'],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    items: [
      {
        id: 'org-general',
        label: 'General',
        icon: Building2,
        keywords: ['organization', 'org', 'name', 'slug', 'general'],
      },
    ],
  },
];

/**
 * Filter navigation by a search query — matches against label + keywords.
 * Empty query returns the original groups.
 */
export function filterNav(
  groups: readonly SettingsNavGroup[],
  query: string,
): readonly SettingsNavGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
