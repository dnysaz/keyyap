self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // A minimal fetch event listener is required for some browsers
  // to recognize the app as a PWA and show the install prompt.
  // Real offline caching can be added later if needed.
  event.respondWith(fetch(event.request).catch(() => new Response('Network error')))
})
