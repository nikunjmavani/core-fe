/** Preload Command Palette chunk (e.g. on search button hover) for faster first open. */
export function preloadCommandPalette(): void {
  // Fire-and-forget: intentionally ignoring the promise
  import('@/shared/components/command-palette.tsx').catch(() => {});
}
