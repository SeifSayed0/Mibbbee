const CACHE = 'mine-os-shell-v2'
const BASE = '/Mibbbee/'
const CORE = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('mine-os-shell-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  const requestUrl = new URL(event.request.url)
  const isDocument = event.request.mode === 'navigate' || requestUrl.pathname === BASE || requestUrl.pathname === `${BASE}index.html`
  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) void caches.open(CACHE).then(cache => cache.put(event.request, response.clone()))
          return response
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match(`${BASE}index.html`))),
    )
    return
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) void caches.open(CACHE).then(cache => cache.put(event.request, response.clone()))
      return response
    }).catch(() => caches.match(`${BASE}index.html`))),
  )
})
