// Define the URLs to cache
const cacheName = "anime-offline-database-cache-v1";
const urlsToCache = [
  "./pkg/assets/script.js",
  "./pkg/search_anime.js",
  "./pkg/search_anime_bg.wasm",
  "./pkg/search_anime.d.ts",
  "./pkg/package.json",
  "./pkg/search_anime_bg.wasm.d.ts",
  "./assets/style.css",
  "./assets/imgs/default.jpg",
  "./assets/imgs/default-anime-fall.png",
  "./assets/imgs/default-anime-spring.png",
  "./assets/imgs/default-anime-summer.png",
  "./assets/imgs/default-anime-winter.png",
];

/* Start the service worker and cache all of the app's content */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(filesToCache);
    }),
  );
});

/* Serve cached content when offline */
self.addEventListener("fetch", function (e) {
  e.respondWith(
    caches.match(e.request).then(function (response) {
      return response || fetch(e.request);
    }),
  );
});
