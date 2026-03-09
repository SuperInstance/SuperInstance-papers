/**
 * POLLN Spreadsheet - Service Worker
 *
 * Progressive Web App service worker with caching strategies.
 *
 * Caching strategies:
 * - Cache-first for static assets (JS, CSS, images)
 * - Network-first for API calls
 * - Stale-while-revalidate for HTML
 * - Offline fallback page
 * - Background sync for cell updates
 *
 * Performance targets:
 * - First Contentful Paint < 1.5s
 * - Time to Interactive < 3s
 * - Offline functionality
 */

/// <reference lib="webworker" />

// Extend ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope;

/**
 * Cache names
 */
const CACHE_PREFIX = 'polln-spreadsheet';
const CACHE_VERSION = 'v1';
const CACHES = {
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}-api-${CACHE_VERSION}`,
  html: `${CACHE_PREFIX}-html-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
};

/**
 * Cache timeouts (in seconds)
 */
const CACHE_TIMEOUTS = {
  static: 60 * 60 * 24 * 30, // 30 days
  api: 60 * 5, // 5 minutes
  html: 60 * 60 * 24, // 1 day
  images: 60 * 60 * 24 * 7, // 7 days
};

/**
 * URLs to cache immediately
 */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other static assets as needed
];

/**
 * API routes (network-first)
 */
const API_ROUTES = [
  '/api/cells',
  '/api/colonies',
  '/api/agents',
  '/api/debug',
];

/**
 * Static file extensions (cache-first)
 */
const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
];

/**
 * Install event - precache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    (async () => {
      try {
        // Create caches
        const cacheNames = Object.values(CACHES);
        await Promise.all(
          cacheNames.map((name) => caches.open(name))
        );

        // Precache static assets
        const staticCache = await caches.open(CACHES.static);
        await staticCache.addAll(PRECACHE_URLS);

        console.log('[SW] Service worker installed');
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();

        // Delete old caches
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(name))
            .map((name) => caches.delete(name))
        );

        console.log('[SW] Service worker activated');
        await self.clients.claim();
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch event - routing and caching strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Route to appropriate strategy
  if (isApiRoute(url)) {
    event.respondWith(networkFirst(request, CACHES.api));
  } else if (isStaticFile(url)) {
    event.respondWith(cacheFirst(request, CACHES.static));
  } else if (isImageFile(url)) {
    event.respondWith(cacheFirst(request, CACHES.images));
  } else if (isNavigationRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, CACHES.html));
  } else {
    event.respondWith(networkFirst(request, CACHES.api));
  }
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { data, ports } = event;

  switch (data?.type) {
    case 'SKIP_WAITING':
      handleSkipWaiting();
      break;
    case 'CLEAR_CACHE':
      handleClearCache(data?.cacheName);
      break;
    case 'GET_CACHE_INFO':
      handleGetCacheInfo(ports[0]);
      break;
    case 'PRELOAD':
      handlePreload(data?.urls);
      break;
    default:
      console.log('[SW] Unknown message type:', data?.type);
  }
});

/**
 * Background sync event
 */
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'cell-updates') {
    event.waitUntil(syncCellUpdates());
  }
});

/**
 * Push event
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');

  event.waitUntil(
    (async () => {
      const options = {
        body: event.data?.text() || 'New update available',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
          url: '/',
        },
      };

      await self.registration.showNotification('POLLN Spreadsheet', options);
    })()
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});

// ============================================================================
// Caching Strategies
// ============================================================================

/**
 * Cache-first strategy
 * - Check cache first
 * - Fall back to network
 * - Update cache for next time
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Update cache in background
    fetchAndUpdate(request, cacheName);
    return cached;
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline fallback if available
    return getOfflineFallback(request);
  }
}

/**
 * Network-first strategy
 * - Try network first
 * - Fall back to cache
 * - Update cache on success
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // No cache, return offline fallback
    return getOfflineFallback(request);
  }
}

/**
 * Stale-while-revalidate strategy
 * - Serve from cache immediately
 * - Update cache in background
 * - Always fresh content on next load
 */
async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch and update cache in background
  const fetchPromise = fetchAndUpdate(request, cacheName);

  // Return cached version immediately or wait for network
  return cached || (await fetchPromise);
}

/**
 * Fetch and update cache
 */
async function fetchAndUpdate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// Route Helpers
// ============================================================================

/**
 * Check if URL is an API route
 */
function isApiRoute(url: URL): boolean {
  return API_ROUTES.some((route) => url.pathname.startsWith(route));
}

/**
 * Check if URL is a static file
 */
function isStaticFile(url: URL): boolean {
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Check if URL is an image file
 */
function isImageFile(url: URL): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request: Request): boolean {
  return request.mode === 'navigate';
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request: Request): Promise<Response> {
  // Try to serve offline page for navigation requests
  if (isNavigationRequest(request)) {
    const cache = await caches.open(CACHES.html);
    const offlinePage = await cache.match('/offline.html');

    if (offlinePage) {
      return offlinePage;
    }
  }

  // Return custom offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'No network connection available',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle skip waiting message
 */
function handleSkipWaiting(): void {
  self.skipWaiting();
}

/**
 * Handle clear cache message
 */
async function handleClearCache(cacheName?: string): Promise<void> {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX))
        .map((name) => caches.delete(name))
    );
  }
}

/**
 * Handle get cache info message
 */
async function handleGetCacheInfo(port: MessagePort): Promise<void> {
  const cacheNames = await caches.keys();
  const info = [];

  for (const name of cacheNames) {
    if (!name.startsWith(CACHE_PREFIX)) continue;

    const cache = await caches.open(name);
    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    info.push({
      name,
      entries: keys.length,
      size: totalSize,
    });
  }

  port.postMessage({ info });
}

/**
 * Handle preload message
 */
async function handlePreload(urls?: string[]): Promise<void> {
  if (!urls) return;

  const cache = await caches.open(CACHES.static);
  await Promise.all(
    urls.map((url) =>
      fetch(url).then((response) => {
        if (response.ok) {
          return cache.put(url, response);
        }
      })
    )
  );
}

// ============================================================================
// Background Sync
// ============================================================================

/**
 * Sync pending cell updates
 */
async function syncCellUpdates(): Promise<void> {
  try {
    // Get pending updates from IndexedDB
    const pendingUpdates = await getPendingUpdates();

    // Send updates to server
    await Promise.all(
      pendingUpdates.map((update) => sendUpdateToServer(update))
    );

    // Clear pending updates
    await clearPendingUpdates();
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Get pending updates from IndexedDB
 */
async function getPendingUpdates(): Promise<any[]> {
  // Implementation would read from IndexedDB
  return [];
}

/**
 * Send update to server
 */
async function sendUpdateToServer(update: any): Promise<void> {
  // Implementation would send to server
  console.log('[SW] Sending update:', update);
}

/**
 * Clear pending updates
 */
async function clearPendingUpdates(): Promise<void> {
  // Implementation would clear IndexedDB
}

// ============================================================================
// Periodic Cache Cleanup
// ============================================================================

/**
 * Periodically clean up old cache entries
 */
setInterval(() => {
  cleanOldCacheEntries();
}, 60 * 60 * 1000); // Every hour

/**
 * Clean old cache entries
 */
async function cleanOldCacheEntries(): Promise<void> {
  const now = Date.now();

  for (const [cacheName, timeout] of Object.entries(CACHE_TIMEOUTS)) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;

      const dateHeader = response.headers.get('date');
      if (!dateHeader) continue;

      const cachedTime = new Date(dateHeader).getTime();
      const age = (now - cachedTime) / 1000;

      if (age > timeout) {
        await cache.delete(request);
      }
    }
  }
}

export {};
