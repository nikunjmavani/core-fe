import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  CreditCard,
  GitBranch,
  MonitorSmartphone,
  Palette,
  Plug,
  Shield,
  User,
  UserCog,
  Users,
} from 'lucide-react';

/**
 * Settings registry — two scopes, one modal (routing-and-tenancy.md §7).
 * Account sections need only a signed-in user; organization sections also
 * need organization context + a permission (settings-permissions.ts).
 */
export type SettingsScope = 'account' | 'organization';

type AccountSettingsSection =
  | 'profile'
  | 'account'
  | 'security'
  | 'notifications'
  | 'appearance'
  | 'sessions';

export type OrganizationSettingsSection =
  | 'general'
  | 'members'
  | 'roles'
  | 'branches'
  | 'billing'
  | 'integrations';

export type SettingsSection = AccountSettingsSection | OrganizationSettingsSection;

/** A fully-qualified settings location: scope + section. */
export interface SettingsSectionRef {
  scope: SettingsScope;
  section: SettingsSection;
}

export const SECTIONS_BY_SCOPE: Record<SettingsScope, readonly SettingsSection[]> = {
  account: ['profile', 'account', 'security', 'notifications', 'appearance', 'sessions'],
  organization: ['general', 'members', 'roles', 'branches', 'billing', 'integrations'],
};

export const DEFAULT_SETTINGS: SettingsSectionRef = {
  scope: 'account',
  section: 'profile',
};

interface SettingsNavItem {
  scope: SettingsScope;
  section: SettingsSection;
  label: string;
  icon: LucideIcon;
  /** Keywords used by the search box; lowercase. */
  keywords: readonly string[];
}

export interface SettingsNavGroup {
  scope: SettingsScope;
  label: string;
  items: readonly SettingsNavItem[];
}

export const SETTINGS_NAV: readonly SettingsNavGroup[] = [
  {
    scope: 'account',
    label: 'Account',
    items: [
      {
        scope: 'account',
        section: 'profile',
        label: 'Profile',
        icon: User,
        keywords: ['profile', 'name', 'bio', 'avatar', 'timezone', 'location'],
      },
      {
        scope: 'account',
        section: 'account',
        label: 'Account',
        icon: UserCog,
        keywords: ['account', 'id', 'email', 'role', 'delete', 'deactivate'],
      },
      {
        scope: 'account',
        section: 'security',
        label: 'Security',
        icon: Shield,
        keywords: ['security', 'mfa', 'two-factor', 'passkey', 'password'],
      },
      {
        scope: 'account',
        section: 'notifications',
        label: 'Notifications',
        icon: Bell,
        keywords: ['notifications', 'email', 'alerts', 'push'],
      },
      {
        scope: 'account',
        section: 'appearance',
        label: 'Appearance',
        icon: Palette,
        keywords: ['appearance', 'theme', 'dark', 'light', 'system', 'color'],
      },
      {
        scope: 'account',
        section: 'sessions',
        label: 'Sessions',
        icon: MonitorSmartphone,
        keywords: ['sessions', 'devices', 'sign out', 'active'],
      },
    ],
  },
  {
    scope: 'organization',
    label: 'Organization',
    items: [
      {
        scope: 'organization',
        section: 'general',
        label: 'General',
        icon: Building2,
        keywords: ['organization', 'name', 'slug', 'general'],
      },
      {
        scope: 'organization',
        section: 'members',
        label: 'Members',
        icon: Users,
        keywords: ['members', 'invitations', 'people', 'team'],
      },
      {
        scope: 'organization',
        section: 'roles',
        label: 'Roles',
        icon: Shield,
        keywords: ['roles', 'permissions', 'rbac'],
      },
      {
        scope: 'organization',
        section: 'branches',
        label: 'Branches',
        icon: GitBranch,
        keywords: ['branches', 'locations', 'sites'],
      },
      {
        scope: 'organization',
        section: 'billing',
        label: 'Billing',
        icon: CreditCard,
        keywords: ['billing', 'plan', 'subscription', 'invoices', 'payment'],
      },
      {
        scope: 'organization',
        section: 'integrations',
        label: 'Integrations',
        icon: Plug,
        keywords: ['integrations', 'webhooks', 'api keys', 'connect'],
      },
    ],
  },
];

/**
 * Filter navigation by a search query — matches label + keywords.
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
