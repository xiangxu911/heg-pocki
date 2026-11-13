const CACHE = 'pocki-shell-v8'
const FALLBACK = '/heg-pocki/phase8.html?v=1'
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/heg-pocki/phase8.html?v=1', '/heg-pocki/pocki.svg']).catch(() => {}))) })
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', event => { if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)) } return response }).catch(() => caches.match(FALLBACK)))) })
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting() })
self.addEventListener('push', event => { const data = event.data?.json?.() ?? { title: 'POCKI', body: '你有一条新的提醒。' }; event.waitUntil(self.registration.showNotification(data.title || 'POCKI', { body: data.body || '你有一条新的提醒。', icon: '/heg-pocki/pocki.svg', badge: '/heg-pocki/pocki.svg', tag: data.tag || 'pocki-push' })) })
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list[0] ? list[0].focus() : self.clients.openWindow(FALLBACK))) })
