/* Tiny Factory offline cache — works on HTTPS (including GitHub Pages). */
'use strict';

const CACHE_NAME = 'tiny-factory-offline-v1';
const SCOPE = self.registration.scope;
const APP_SHELL = new URL('index.html', SCOPE).href;
const ROOT = new URL('./', SCOPE).href;
const PRECACHE = [
  ROOT,
  APP_SHELL,
  new URL('manifest.webmanifest', SCOPE).href,
  new URL('icon.svg', SCOPE).href
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Finish caching every asset before the offline worker activates.
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('tiny-factory-offline-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept other websites or requests outside this installed game.
  if (url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL(SCOPE).pathname)) return;

  if (request.mode === 'navigate') {
    // Check for the latest game when online; use the installed copy offline.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok &&
            (url.pathname === new URL(ROOT).pathname ||
             url.pathname === new URL(APP_SHELL).pathname)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_SHELL, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // Always prefer the newest saved app shell, even if the user opens
        // the site root rather than the explicit index.html address.
        return (await cache.match(APP_SHELL)) ||
          (await cache.match(request, { ignoreSearch: true })) ||
          Response.error();
      }
    })());
    return;
  }

  // Keep the manifest, icon and other app assets available without internet.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
