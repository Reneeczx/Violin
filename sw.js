const CACHE_NAME = 'violin-practice-v8';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './author.html',
  './author/index.html',
  './manifest.json',
  './favicon.ico',
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
  './js/practice-player.js',
  './js/practice-player-state.js',
  './js/score-utils.js',
  './js/open-string-data.js',
  './js/timer.js',
  './js/tracking.js',
  './js/music-theory.js',
  './js/lesson-catalog.js',
  './js/week-package-store.js',
  './js/week-package-utils.js',
  './js/source-asset-store.js',
  './js/staff-notation.js',
  './js/ui/nav.js',
  './js/ui/components.js',
  './js/ui/home-view.js',
  './js/ui/plan-view.js',
  './js/ui/staff-display.js',
  './js/ui/tuner-view.js',
  './js/ui/progress-view.js',
  './js/ui/theory-view.js',
  './data/lesson-current.js',
  './author/css/author.css',
  './author/js/app.js',
  './author/js/ui/author-view.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

function isAppShellRequest(url) {
  return url.pathname === '/'
    || url.pathname.endsWith('/index.html')
    || url.pathname.endsWith('/manifest.json')
    || url.pathname.endsWith('/data/lesson-current.js')
    || /\/js\/.+\.js$/.test(url.pathname)
    || /\/css\/.+\.css$/.test(url.pathname);
}

function isIconRequest(url) {
  return url.pathname.endsWith('/favicon.ico')
    || /\/icons\/.+\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw _;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isAppShellRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isIconRequest(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});
