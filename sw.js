// Service worker: Î· ÎµÏ†Î±ÏÎ¼Î¿Î³Î® Î±Î½Î¿Î¯Î³ÎµÎ¹ ÎºÎ±Î¹ Ï‡Ï‰ÏÎ¯Ï‚ internet.
// ÎœÎµ internet Ï†Î­ÏÎ½ÎµÎ¹ Ï€Î¬Î½Ï„Î± Ï„Î·Î½ Ï€Î¹Î¿ Î½Î­Î± Î­ÎºÎ´Î¿ÏƒÎ· (ÎºÎ±Î¹ Ï„Î·Î½ ÎºÏÎ±Ï„Î¬ Î±Ï€Î¿Î¸Î·ÎºÎµÏ…Î¼Î­Î½Î·)Â·
// Ï‡Ï‰ÏÎ¯Ï‚ internet Î´Î¯Î½ÎµÎ¹ Ï„Î·Î½ Î±Ï€Î¿Î¸Î·ÎºÎµÏ…Î¼Î­Î½Î·. Î†Î»Î»Î±Î¾Îµ Ï„Î¿ CACHE ÏŒÏ„Î±Î½ Ï€ÏÎ¿ÏƒÏ„ÎµÎ¸Î¿ÏÎ½/Î±Ï†Î±Î¹ÏÎµÎ¸Î¿ÏÎ½ Î±ÏÏ‡ÎµÎ¯Î±.
const CACHE = 'ta-lefta-mou-v14';
const FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo-header.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Î Î¬Ï„Î·Î¼Î± ÏƒÏ„Î·Î½ ÎµÎ¹Î´Î¿Ï€Î¿Î¯Î·ÏƒÎ· Ï€Î»Î·ÏÏ‰Î¼Î®Ï‚ â†’ Î±Î½Î¿Î¯Î³ÎµÎ¹ (Î® Ï†Î­ÏÎ½ÎµÎ¹ Î¼Ï€ÏÎ¿ÏƒÏ„Î¬) Ï„Î·Î½ ÎµÏ†Î±ÏÎ¼Î¿Î³Î®
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).origin === location.origin);
      return open ? open.focus() : self.clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request, { cache: 'no-cache' });
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(e.request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })
  );
});
