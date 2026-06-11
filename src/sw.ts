/// <reference lib="webworker" />
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Clean old caches on SW update
cleanupOutdatedCaches();

// Precache all assets from the build manifest injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

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
