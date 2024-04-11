// Service Worker Script (sw.js)

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
  "https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json",
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

async function get_latest_version() {
  const url =
    "https://api.github.com/repos/manami-project/anime-offline-database/commits/master";
  const resp = await fetch(url);
  const data = await resp.json();
  return data.sha;
}

async function get_stored_version() {
  const cachedResponse = await caches.match("temp://stored_version");
  if (cachedResponse === undefined) throw new Error("No old data");
  const cachedData = await cachedResponse.json();
  return cachedData.sha;
}

async function set_stored_version(sha) {
  const cache = await caches.open(cacheName);
  const newData = { sha: sha };
  const response = new Response(JSON.stringify(newData));
  await cache.put("temp://stored_version", response);
}

async function delete_stored_manga_data(req) {
  const cache = await caches.open(cacheName);
  cache.delete(req);
}

async function getData(event, response) {
  if (
    event.request.url ===
    "https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json"
  ) {
    try {
      let local_sha = get_stored_version();
      let server_sha = get_latest_version();
      if (local_sha !== server_sha) {
        delete_stored_manga_data(event.request);
        set_stored_version(server_sha);
        return fetch(event.request);
      }
    } catch (error) {
      console.warn("no local version: " + error);
    }
  }
  return response || fetch(event.request);
}
