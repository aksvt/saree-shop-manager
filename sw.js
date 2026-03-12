// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — मनभावन वस्त्रालय Shop Manager
// Handles: Offline caching, Push Notifications, Background Sync
// ═══════════════════════════════════════════════════════════

const CACHE_NAME    = 'manabhavan-v1';
const OFFLINE_URL   = './offline.html';

const CACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
];

// ── Install: Cache all assets ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Clean old caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first with network fallback ───────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body:    data.body    || 'मनभावन वस्त्रालय से संदेश',
    icon:    './icons/icon-192.png',
    badge:   './icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag:     data.tag || 'manabhavan',
    data:    { url: data.url || './' },
    actions: data.actions || [
      { action: 'open',    title: 'खोलें' },
      { action: 'dismiss', title: 'बाद में' },
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || '🪷 मनभावन वस्त्रालय', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Scheduled Notification Triggers (via message) ──────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, tag } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon:  './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag,
        vibrate: [200, 100, 200],
      });
    }, delay || 0);
  }
});
