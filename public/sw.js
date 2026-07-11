// Minimal service worker: cache app shell, network-first for everything else.
const CACHE = 'alacrity-dota-v1'
self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(clients.claim()) })
self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
  e.respondWith(
    fetch(request).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(c => c.put(request, copy)).catch(()=>{})
      return res
    }).catch(() => caches.match(request).then(m => m || caches.match('/')))
  )
})
