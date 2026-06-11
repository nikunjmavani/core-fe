import type { Plugin } from 'vite';

import { formatCspApiConnectSrcFragment } from '../src/lib/csp-api-origin.ts';

/** Replaced in index.html connect-src with the API origin from VITE_API_BASE_URL. */
export const CSP_API_CONNECT_SRC_PLACEHOLDER = '<!-- CSP_API_CONNECT_SRC -->';

/**
 * Injects the production API origin into index.html Content-Security-Policy connect-src
 * at build/dev HTML transform time, using VITE_API_BASE_URL from the loaded env.
 */
export function cspApiOrigin(apiBaseUrl: string | undefined): Plugin {
  const fragment = formatCspApiConnectSrcFragment(apiBaseUrl);

  return {
    name: 'csp-api-origin',
    transformIndexHtml(html) {
      if (!html.includes(CSP_API_CONNECT_SRC_PLACEHOLDER)) {
        return html;
      }
      return html.replace(CSP_API_CONNECT_SRC_PLACEHOLDER, fragment);
    },
  };
}
