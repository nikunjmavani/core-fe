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

/**
 * Settings hash path only — `settings/<scope>/<section>` with any trailing
 * `?query` or `#fragment` removed. Page-level search params (`?q=…` before
 * `#`) are untouched; only garbage appended to the hash itself is stripped.
 */
export function settingsHashPath(hash: string): string {
  const h = normalize(hash);
  if (!isSettingsHash(h)) return h;
  return h.split(/[?#]/)[0] ?? h;
}

/** Normalized hash path (no leading `#`, no trailing `?…`). */
export function normalizeSettingsHash(hash: string): string {
  return settingsHashPath(hash);
}

/** True when the location hash exactly matches the canonical deep link for `ref`. */
export function isCanonicalSettingsHash(hash: string, ref: SettingsSectionRef): boolean {
  return normalize(hash) === settingsHash(ref.scope, ref.section);
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
 * (modal closed). Malformed scope/section pairs fall back to account/profile.
 * Context-aware availability (permissions, org type) is applied in
 * {@link resolveSettingsSection} inside the modal.
 */
export function parseSettingsHash(hash: string): SettingsSectionRef | null {
  const h = settingsHashPath(hash);
  if (!isSettingsHash(h)) return null;

  const [, scope, section] = h.split('/');
  // Legacy deep links: billing moved from organization → account scope.
  if (scope === 'organization' && section === 'billing') {
    return { scope: 'account', section: 'billing' };
  }
  if (scope === 'account' || scope === 'organization') {
    if (section && isSectionOf(scope, section)) {
      return { scope, section };
    }
  }
  return DEFAULT_SETTINGS;
}
