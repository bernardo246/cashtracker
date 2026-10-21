/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sameOrigin = (url: URL) => url.origin === self.location.origin;

// Só assets estáticos são cacheados. Páginas (HTML dinâmico com nonce de CSP) e /api/* vão sempre à rede.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Primeira regra: dados do usuário nunca ficam em cache.
    { matcher: ({ url }) => sameOrigin(url) && url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    {
      matcher: ({ request, url }) =>
        sameOrigin(url) &&
        (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || request.destination === "font"),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
  ],
});

serwist.addEventListeners();
