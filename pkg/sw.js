// Service Worker Script (sw.js)

// Define the URLs to cache
const cacheName = 'anime-offline-database-cache-v1';
const urlsToCache = [
    '/',
    'index.html',
    'script.js',
    'search_anime.js',
    'search_anime_bg.wasm',
    'search_anime.d.ts',
    'package.json',
    'search_anime_bg.wasm.d.ts',
    'style.css',
    'imgs/default.jpg',
    'imgs/default-anime-fall.png',
    'imgs/default-anime-spring.png',
    'imgs/default-anime-summer.png',
    'imgs/default-anime-winter.png',
    'https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json',
    'https://api.github.com/repos/manami-project/anime-offline-database/commits/master'
];

// Event listener for installing the service worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheName).then(async (cache) => {
            try {
                ok = await cache.addAll(urlsToCache);
            } catch (err) {
                for (let i of urlsToCache) {
                    try {
                        ok = await cache.add(i);
                    } catch (err) {
                        console.warn('sw: cache.add', i);
                    }
                }
            }
            return ok;
        })
    );
});

// Event listener for fetching and updating data
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(async (response) => getData(event, response))
    );
});


async function getData(event, response) {
    const checkUpdate = "https://api.github.com/repos/manami-project/anime-offline-database/commits/master";
    if (event.request.url === 'https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json') {
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
                return re
            }
        } catch (error) {
            console.warn("failed to check for update: " + error);
        }
        return check2(event, response);
    }

}

function check2(event, response) {
    if (response) {
        return response
    }
    return fetch(event.request);
}
