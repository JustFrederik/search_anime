import init, {
  search,
  search_count,
  tag_search,
  initialize,
} from "/pkg/search_anime.js";

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}

const manualCacheName = "anime-offline-database-manual-cache";
async function save_json(name, data) {
  const newCache = await caches.open(manualCacheName);
  save_string(name, JSON.stringify(data));
}

async function save_string(name, data) {
  const newCache = await caches.open(manualCacheName);
  const response = new Response(data);
  await newCache.put("/storage/" + name, response);
}

async function load_string_from_zip(zipFileBlob) {
  const zipFileReader = new zip.BlobReader(zipFileBlob);
  const writer = new zip.TextWriter();
  const zipReader = new zip.ZipReader(zipFileReader);
  const firstEntry = (await zipReader.getEntries()).shift();
  const text = await firstEntry.getData(writer);
  await zipReader.close();
  return text;
}

async function delete_json(name) {
  const newCache = await caches.open(manualCacheName);
  let v = await newCache.delete("/storage/" + name);
  return await v.json();
}

async function load_json(name) {
  let v = await load_response(name);
  return await v.json();
}

async function load_response(name) {
  const newCache = await caches.open(manualCacheName);
  return await newCache.match("/storage/" + name);
}

async function get_latest_version() {
  const url =
    "https://api.github.com/repos/manami-project/anime-offline-database/commits/master";
  const resp = await fetch(url);
  const data = await resp.json();
  return data.sha;
}

async function load_data() {
  let url =
    "https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database.zip";
  let server_sha = await get_latest_version();
  try {
    let local_sha = await load_json("github_sha");
    if (local_sha !== server_sha) {
      await delete_json("animes");
      let data = await fetchWithTimeout(url, {
        timeout: 3600,
      });
      let blob = await data.blob();
      let data_str = await load_string_from_zip(blob);
      await save_string("animes", data_str);
      await save_json("github_sha", server_sha);
      return data_str;
    } else {
      let data = await load_response("animes");
      return await data.text();
    }
  } catch (error) {
    console.warn("no local version: " + error);
  }
  let resp = await fetchWithTimeout(url, {
    timeout: 3600,
  });
  let blob = await resp.blob();
  let str = await load_string_from_zip(blob);
  await save_string("animes", str);
  await save_json("github_sha", server_sha);
  return str;
}

async function run() {
  await init();
  initialize(await load_data());
  document.getElementById("loading-screen").remove();
  document.getElementById("container").classList.remove("hidden");
  const searchResults = document.getElementById("searchResults");
  const titleSearch = document.getElementById("titleSearch");
  const tagSearch = document.getElementById("tagSearch");
  const tagNot = document.getElementById("tagNot");
  const tagPreview = document.getElementById("tagPreview");
  const count = document.getElementById("count");

  let currentPage = 1;
  const itemsPerPage = 20;
  const open = 0;
  let search_data = {
    typ: { items: [], or: false },
    tag: { items: [], or: false },
    status: {
      items: [],
      or: false,
    },
    title: "",
    episodes: { number: 0, operation: "BiggerEq" },
  };

  function updateQuery() {
    search_data.title = titleSearch.value;
    search_data.tag.items = tagSearch.value.split(",").map((v) => {
      let res = {
        not: false,
        value: v,
      };
      if (v.startsWith("!")) {
        res.not = true;
        res.value = v.substring(1);
      }
      return res;
    });
    search_data.tag.items.pop();
    search_data.tag.or = tagNot.checked;
    return JSON.stringify(search_data);
  }

  function setSuggestion(v) {
    if (v != null) {
      tagSearch.value = v;
    }
    tagPreview.style.display = "none";
    searchResults.innerHTML = "";
    currentPage = 1;
    count.innerHTML = search_count(updateQuery()).toString();
    loadSearchResults();
  }

  function loadSearchResults(reload = false) {
    const oldQuery = JSON.stringify(search_data);
    const query = updateQuery();
    if (oldQuery === query && !reload && searchResults.innerHTML !== "") {
      return;
    }
    const items = search(query, currentPage, itemsPerPage).map((item) => {
      const openid =
        item.sources.length < open ? item.sources.length - 1 : open;
      return `<a href="${item.sources[openid]}" target="_blank" class="search-result-item" onclick="alert('${item.sources[0]}')">
                        <img src="${item.picture.replace("https://cdn.anime-planet.com/images/anime/default", "/assets/imgs").replace("https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg", "/assets/imgs/default.jpg")}" alt="${item.title}" loading="lazy">
                        <h3>${item.title}</h3>
                    </a>`;
    });

    searchResults.innerHTML += items.join("");
    currentPage++;
  }

  function handleInfiniteScroll() {
    const endOfPage =
      window.innerHeight + window.scrollY + 300 >= document.body.offsetHeight;
    if (endOfPage) {
      loadSearchResults(true);
    }
  }

  window.setSuggestion = setSuggestion;
  window.addEventListener("scroll", handleInfiniteScroll);
  tagSearch.addEventListener("input", (e) => {
    tagPreview.style.display = "block";
    tagPreview.innerHTML = tag_search(e.target.value, 1, itemsPerPage)
      .map(
        (tag) =>
          `<div id="suggestion" onclick="setSuggestion('${tag}')">${tag}</div>`,
      )
      .join("");
    searchResults.innerHTML = "";
    currentPage = 1;
    count.innerHTML = search_count(updateQuery()).toString();
    loadSearchResults();
  });
  titleSearch.addEventListener("input", (_) => {
    setSuggestion(null);
  });
  tagNot.addEventListener("change", (_) => {
    setSuggestion(null);
  });

  // Load initial search results
  loadSearchResults();
}

run();
