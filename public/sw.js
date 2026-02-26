const STATIC_CACHE = 'xianyue-static-v2';
const IMAGE_CACHE = 'xianyue-images-v2';
const IMAGE_CACHE_LIMIT = 200;

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/index.css'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    const VALID_CACHES = [STATIC_CACHE, IMAGE_CACHE];
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => !VALID_CACHES.includes(key)).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Trim image cache to stay within limit
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // Delete oldest entries (first in = first out)
        const toDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
}

// Fetch handler with multi-strategy routing
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // --- Supabase API requests (REST, Auth, RPC) → Network only, never cache ---
    if (url.hostname.includes('supabase') && !url.pathname.includes('/storage/')) {
        return;
    }

    // --- Supabase Storage images → Cache first, fallback to network ---
    if (url.pathname.includes('/storage/') || url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) {
                    return cached;
                }
                // Not in cache — fetch from network and cache it
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        cache.put(request, response.clone());
                        // Trim in background
                        trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
                    }
                    return response;
                } catch (err) {
                    // Offline and not cached — return a fallback or error
                    return new Response('', { status: 408, statusText: 'Offline' });
                }
            })
        );
        return;
    }

    // --- All other requests (static assets) → Stale-while-revalidate ---
    event.respondWith(
        caches.open(STATIC_CACHE).then(async (cache) => {
            const cached = await cache.match(request);
            const fetchPromise = fetch(request).then((response) => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            }).catch(() => cached);

            // Return cached immediately if available, otherwise wait for network
            return cached || fetchPromise;
        })
    );
});
