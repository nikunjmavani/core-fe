/// <reference lib="webworker" />
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

/** Heavy deferred chunks — precache shell only; fetch at runtime when needed. */
const DEFERRED_PRECACH_PATTERN =
  /\/(sentry|posthog|SettingsModal|dashboard\.route|iconset-phosphor|iconset-tabler|CommandPalette|AppearanceDialog|LanguageDialog)-/;

function shouldPrecache(entry: string | { url: string }): boolean {
  const url = typeof entry === 'string' ? entry : entry.url;
  return !DEFERRED_PRECACH_PATTERN.test(url);
}

// Clean old caches on SW update
cleanupOutdatedCaches();

const manifest = self.__WB_MANIFEST.filter(shouldPrecache);
precacheAndRoute(manifest);

// Lazy JS/CSS chunks — cache on first navigation, reuse on repeat visits
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'script' || request.destination === 'style'),
  new StaleWhileRevalidate({
    cacheName: 'app-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Cache fonts with CacheFirst
registerRoute(
  /^https:\/\/.*\.(woff2|ttf|otf)$/,
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match('/offline.html')
          .then((response) => response ?? new Response('Offline', { status: 503 })),
      ),
    );
  }
});
