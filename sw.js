// Service Worker for Audio Player PWA
const CACHE_NAME = 'audio-player-v1';
const urlsToCache = [
  './',
  './index.html',
  './main.js',
  './analyzeTrack.js',
  './style.css',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for audio playback
self.addEventListener('sync', event => {
  if (event.tag === 'audio-sync') {
    event.waitUntil(
      // Handle background audio sync
      console.log('Background audio sync triggered')
    );
  }
});

// Handle background audio session
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'AUDIO_SESSION') {
    // Handle audio session management
    console.log('Audio session message received:', event.data);
  }
}); 