import init, {search, search_count, tag_search, initialize} from './search_anime.js';

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    return response;
}
async function run() {
    await init();
    //
    let data = await fetchWithTimeout("https://raw.githubusercontent.com/manami-project/anime-offline-database/master/anime-offline-database-minified.json", { timeout: 3600 });
    initialize(await data.text());
    document.getElementById("loading-screen").remove();
    document.getElementById("container").classList.remove("hidden");
    const searchResults = document.getElementById("searchResults");
    const titleSearch = document.getElementById("titleSearch");
    const tagSearch = document.getElementById("tagSearch");
    const tagNot = document.getElementById("tagNot");
    const tagPreview = document.getElementById("tagPreview");
    const count = document.getElementById("count");

    let currentPage = 1;
    let page = 0;
    const itemsPerPage = 20;
    const open = 0;
    let search_data = {
        typ: {items: [], or: false},
        tag: {items: [], or: false},

        status: {
            items: [], or: false
        },
        title: "",
        episodes: {number: 0, operation: "BiggerEq"}
    };

    function updateQuery() {
        search_data.title = titleSearch.value;
        search_data.tag.items = tagSearch.value.split(",").map(v => {
            let res = {
                not: false,
                value: v
            }
            if (v.startsWith("!")) {
                res.not = true;
                res.value = v.substring(1);
            }
            return res;
        })
        search_data.tag.items.pop();
        search_data.tag.or = tagNot.checked;
        return JSON.stringify(search_data);
    }

    function setSuggestion(v) {
        if (v != null) {
            tagSearch.value = v;
        }
        tagPreview.style.display = 'none';
        searchResults.innerHTML = "";
        currentPage = 1;
        page = 0;
        count.innerHTML = search_count(updateQuery()).toString();
        loadSearchResults();
    }

    function loadSearchResults(reload = false) {
        const oldQuery = JSON.stringify(search_data);
        const query = updateQuery();
        if (oldQuery === query && !reload && searchResults.innerHTML !== "") {
            return;
        }
        const items = search(query, currentPage, itemsPerPage).map(item => {
            const openid = item.sources.length < open ? item.sources.length - 1 : open;
            return `<a href="${item.sources[openid]}" target="_blank" class="search-result-item" onclick="alert('${item.sources[0]}')">
                        <img src="${item.picture.replace("https://cdn.anime-planet.com/images/anime/default", "./imgs").replace("https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg", "./imgs/default.jpg")}" alt="${item.title}" loading="lazy">
                        <h3>${item.title}</h3>
                    </a>`;
        });

        searchResults.innerHTML += items.join('');
        currentPage++;
    }

    function handleInfiniteScroll() {
        const endOfPage = window.innerHeight + window.pageYOffset + 300 >= document.body.offsetHeight;
        if (endOfPage) {
            loadSearchResults(true);
        }
    }

    window.setSuggestion = setSuggestion;
    window.addEventListener("scroll", handleInfiniteScroll);
    tagSearch.addEventListener('input', (e) => {
        tagPreview.style.display = 'block';
        tagPreview.innerHTML = tag_search(e.target.value, 1, itemsPerPage).map(tag => `<div id="suggestion" onclick="setSuggestion('${tag}')">${tag}</div>`).join('');
        searchResults.innerHTML = "";
        currentPage = 1;
        page = 0;
        count.innerHTML = search_count(updateQuery()).toString();
        loadSearchResults();
    });
    titleSearch.addEventListener('input', (_) => {
        setSuggestion(null);
    });
    tagNot.addEventListener('change', (e) => {
        setSuggestion(null);
    });

    // Load initial search results
    loadSearchResults();
}

run();