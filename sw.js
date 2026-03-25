const CACHE_NAME = 'violin-practice-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/event-bus.js',
  './js/state.js',
  './js/router.js',
  './js/audio-engine.js',
  './js/metronome.js',
  './js/recorder.js',
  './js/practice-plan.js',
  './js/timer.js',
  './js/tracking.js',
  './js/ui/nav.js',
  './js/ui/components.js',
  './js/ui/home-view.js',
  './js/ui/plan-view.js',
  './js/ui/tuner-view.js',
  './js/ui/progress-view.js',
  './data/lesson-current.js',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
