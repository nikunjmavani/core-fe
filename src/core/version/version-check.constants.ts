/** Delay before the first /version.json poll (after app bootstrap). */
export const VERSION_CHECK_INITIAL_DELAY_MS = 2_000;

/** How long dismissing the update toast suppresses re-notification (per buildId). */
export const VERSION_UPDATE_SNOOZE_MS = 15 * 60 * 1_000;

export const VERSION_CHECK_RELOADED_FOR_KEY = 'core:version-check:reloaded-for';

export function versionUpdateSnoozeKey(buildId: string): string {
  return `core:version-check:snooze:${buildId}`;
}
