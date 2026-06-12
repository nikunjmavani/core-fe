import type {
  SettingsScope,
  SettingsSection,
  SettingsSectionRef,
} from './settings-sections.ts';
import { DEFAULT_SETTINGS, SECTIONS_BY_SCOPE } from './settings-sections.ts';

/**
 * Hash grammar for the global settings modal: `#settings/<scope>/<section>`.
 *
 * Hash state (not a path) on purpose: the modal must overlay ANY page —
 * including deep organization URLs — without re-running route matching or
 * unmounting the page behind it. Copy-link reproduces page + modal, refresh
 * survives, back/Esc closes. Route guards never see hashes, so all gating
 * lives inside the modal (settings-permissions.ts). routing-and-tenancy.md §7.
 */
const SETTINGS_HASH_PREFIX = 'settings';

/** Build the hash value (without `#`) for a settings location. */
export function settingsHash(scope: SettingsScope, section: SettingsSection): string {
  return `${SETTINGS_HASH_PREFIX}/${scope}/${section}`;
}

function normalize(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

/** True when the hash addresses the settings modal at all. */
export function isSettingsHash(hash: string): boolean {
  const h = normalize(hash);
  return h === SETTINGS_HASH_PREFIX || h.startsWith(`${SETTINGS_HASH_PREFIX}/`);
}

function isSectionOf(scope: SettingsScope, section: string): section is SettingsSection {
  // eslint-disable-next-line security/detect-object-injection -- scope is a typed two-value union; the map is exhaustive
  return (SECTIONS_BY_SCOPE[scope] as readonly string[]).includes(section);
}

/**
 * Parse a location hash. Returns `null` when the hash is not settings-related
 * (modal closed). Invalid scope/section combinations fall back to
 * `account/profile` rather than erroring — a mistyped deep link still opens
 * something useful.
 */
export function parseSettingsHash(hash: string): SettingsSectionRef | null {
  const h = normalize(hash);
  if (!isSettingsHash(h)) return null;

  const [, scope, section] = h.split('/');
  if (scope === 'account' || scope === 'organization') {
    if (section && isSectionOf(scope, section)) {
      return { scope, section };
    }
  }
  return DEFAULT_SETTINGS;
}
