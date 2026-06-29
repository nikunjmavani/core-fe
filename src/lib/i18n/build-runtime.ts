import type { I18nBuildMode } from './build-config.ts';
import { readInjectedI18nMode } from './build-env.ts';

/**
 * Resolve the active i18n build mode at runtime.
 * BUILD_I18N_MODE is injected by the Vite plugin; Vitest uses `multi` so lazy JSON tests work.
 */
export function resolveRuntimeI18nBuildMode(): I18nBuildMode {
  if (import.meta.env.MODE === 'test') return 'multi';
  return readInjectedI18nMode();
}

export function isMultiLocaleBuild(): boolean {
  return resolveRuntimeI18nBuildMode() === 'multi';
}

export function isSingleLocaleBuild(): boolean {
  return resolveRuntimeI18nBuildMode() === 'single';
}

/** @deprecated Prefer `resolveRuntimeI18nBuildMode()` — kept for barrel exports. */
export const I18N_BUILD_MODE: I18nBuildMode = resolveRuntimeI18nBuildMode();
