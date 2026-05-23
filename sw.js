/**
 * Service Worker — Choo-Choo Puzzle Adventure PWA
 * Caches all assets for offline play. No server needed.
 */

const CACHE_NAME = 'choo-choo-v4';

/** All files to cache for offline play. */
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'css/index.css',
  'css/animations.css',
  'js/app.js',
  'js/engine/GameEngine.js',
  'js/engine/ScreenManager.js',
  'js/engine/InputManager.js',
  'js/engine/AnimationSystem.js',
  'js/engine/ParticleSystem.js',
  'js/engine/StorageManager.js',
  'js/engine/AudioManager.js',
  'js/engine/BasePuzzle.js',
  'js/levels.js',
  'js/puzzles/JigsawPuzzle.js',
  'js/puzzles/OrderingPuzzle.js',
  'js/puzzles/TrackBuilder.js',
  'js/puzzles/MatchingPuzzle.js',
  'js/puzzles/PathChooser.js',
  'assets/images/train_engine.png',
  'assets/images/train_tracks.png',
  'assets/images/game_background.png',
  'assets/images/train_wagons.png',
  'assets/images/game_ui_elements.png',
  'assets/images/level_select_map.png',
  'assets/images/celebration_confetti.png',
  'assets/images/train_station.png',
  'assets/images/game_characters.png',
  'assets/images/title_logo.png',
  'assets/images/scenery_elements.png',
  // Audio assets
  'assets/audio/click.wav',
  'assets/audio/snap.wav',
  'assets/audio/success.wav',
  'assets/audio/error.wav',
  'assets/audio/whistle.wav',
  'assets/audio/fanfare.wav',
  'assets/audio/star.wav',
  'assets/audio/button.wav',
  'assets/audio/chug.wav',
  'assets/audio/pop.wav',
  'assets/audio/slide.wav',
  'assets/audio/correct.wav',
  'assets/audio/wrong.wav',
  'assets/audio/levelstart.wav',
  'assets/audio/hint.wav',
];

/**
 * Install event — Pre-cache all game assets.
 * After this, the game works fully offline.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing and caching assets...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      console.log('[SW] All assets cached!');
      return self.skipWaiting();
    }).catch((err) => {
      console.warn('[SW] Cache failed for some assets:', err);
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event — Clean up old caches.
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated! Claiming clients...');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event — Serve from cache, fallback to network.
 * Strategy:
 *   - HTML: Network-first (to get updates), fallback to cache
 *   - Assets/CSS/JS: Cache-first (fast), fallback to network
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // HTML files: Network-first
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Everything else: Cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

/**
 * Notify clients when caching is complete (show offline-ready toast).
 */
self.addEventListener('message', (event) => {
  if (event.data === 'checkOfflineReady') {
    caches.has(CACHE_NAME).then((hasCache) => {
      event.source.postMessage({ type: 'offlineReady', ready: hasCache });
    });
  }
});
