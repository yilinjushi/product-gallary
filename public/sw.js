const STATIC_CACHE = 'xianyue-static-v3';
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

    // --- Skip API requests entirely ---
    if (url.pathname.startsWith('/api/')) return;

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
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        cache.put(request, response.clone());
                        trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
                    }
                    return response;
                } catch (err) {
                    return new Response('', { status: 408, statusText: 'Offline' });
                }
            })
        );
        return;
    }

    // --- HTML navigation requests → Network first, fallback to cache ---
    // This prevents stale HTML from referencing old JS bundles after a deploy
    if (request.mode === 'navigate' || request.destination === 'document' ||
        url.pathname === '/' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline — serve cached HTML
                    return caches.match(request).then((cached) => cached || caches.match('/index.html'));
                })
        );
        return;
    }

    // --- All other static assets (JS, CSS, fonts) → Stale-while-revalidate ---
    event.respondWith(
        caches.open(STATIC_CACHE).then(async (cache) => {
            const cached = await cache.match(request);
            const fetchPromise = fetch(request).then((response) => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
