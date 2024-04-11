// Service Worker Script (sw.js)

// Define the URLs to cache
const cacheName = "anime-offline-database-cache-v1";
const urlsToCache = [
  "./pkg/assets/script.js",
  "./pkg/search_anime.js",
  "./pkg/search_anime_bg.wasm",
  "./search_anime.d.ts",
  "./pkg/package.json",
  "./pkg/search_anime_bg.wasm.d.ts",
  "./assets/style.css",
  "./assets/imgs/default.jpg",
  "./assets/imgs/default-anime-fall.png",
  "./assets/imgs/default-anime-spring.png",
  "./assets/imgs/default-anime-summer.png",
  "./assets/imgs/default-anime-winter.png",
  "https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json",
  "https://api.github.com/repos/manami-project/anime-offline-database/commits/master",
];

// Event listener for installing the service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

// Event listener for fetching and updating data
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => getData(event, response)),
  );
});

async function getData(event, response) {
  const checkUpdate =
    "https://api.github.com/repos/manami-project/anime-offline-database/commits/master";
  if (
    event.request.url ===
    "https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json"
  ) {
    try {
      const resp = await fetch(checkUpdate);
      const data = await resp.json();
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) throw new Error("No old data");
      const cachedData = await cachedResponse.json();
      if (data.sha !== cachedData.sha) {
        const cache = await caches.open(cacheName);
        let re = await fetch(event.request);
        await cache.put(event.request, re.clone());
        await cache.put(checkUpdate, resp.clone());
        return re;
      }
    } catch (error) {
      console.warn("failed to check for update: " + error);
    }
    let v = await check2(event, response);
    return v;
  }
}

function check2(event, response) {
  if (response) {
    return response;
  }
  return fetch(event.request);
}
