import type { PageManifest } from './page-manifest.ts';

/** Product name — the title suffix on every page (and the `/` fallback). */
export const APP_TITLE = 'Core Admin';

/** "Sign in · Core Admin" — the one composition rule for document titles. */
export function composePageTitle(pageTitle: string): string {
  return `${pageTitle} · ${APP_TITLE}`;
}

/**
 * TanStack Router `head` option for a route island: renders the manifest's
 * `title` as the document title through the root `<HeadContent />`. The
 * deepest matched route wins, so a leaf's title overrides its layout's.
 */
export function manifestHead(
  manifest: Pick<PageManifest, 'title'>,
): () => { meta: [{ title: string }] } {
  return () => ({ meta: [{ title: composePageTitle(manifest.title) }] });
}
