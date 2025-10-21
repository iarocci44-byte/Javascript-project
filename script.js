const APIKEY = "e2ed71d6";
const itemPerPage = 6;

// state for pagination
let currentSearchResults = [];
let currentPage = 1;

/* event listener for searchBox enter key
document.getElementById('searchBox').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    console.log('Enter key pressed');
    sendDataToJS();
  } */

/**
 * Render a specific page of currentSearchResults
 * @param {number} page
 */
function renderPage(page) {
  const resultsList = document.getElementById('results__list');
  const resultsSection = document.querySelector('.results__section');
  if (!resultsList || !resultsSection) return;

  // bounds
  const totalItems = currentSearchResults.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemPerPage));
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage = page;

  // slice the items for the page
  const start = (page - 1) * itemPerPage;
  const end = start + itemPerPage;
  const pageItems = currentSearchResults.slice(start, end);

  // render
  resultsList.innerHTML = '';

  if (!pageItems || pageItems.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No results on this page.';
    empty.className = 'no__results';
    resultsList.appendChild(empty);
  } else {
    pageItems.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'result__item';

      const img = document.createElement('img');
      img.src = item.Poster !== 'N/A' ? item.Poster : './assets/filmreel.png';
      img.onerror = function() { this.src = './assets/filmreel.png'; };
      img.alt = item.Title;
      img.width = 80;
      img.height = 120;
      img.className = 'result__poster';

      const meta = document.createElement('div');
      meta.className = 'result__meta';

      const title = document.createElement('h3');
      title.textContent = item.Title;

      const year = document.createElement('p');
      year.textContent = item.Year;

      meta.appendChild(title);
      meta.appendChild(year);

      li.appendChild(img);
      li.appendChild(meta);

      resultsList.appendChild(li);
    });
  }

  // render pagination controls
  renderPaginationControls(resultsSection, totalPages, page);
}

/**
 * Create or update pagination controls inside the results section
 * @param {HTMLElement} container - the results section element
 * @param {number} totalPages
 * @param {number} activePage
 */
function renderPaginationControls(container, totalPages, activePage) {
  let pager = container.querySelector('.pagination');
  if (!pager) {
    pager = document.createElement('div');
    pager.className = 'pagination';
    container.appendChild(pager);
  }

  // clear existing
  pager.innerHTML = '';

  if (totalPages <= 1) return; // no controls needed

  const addButton = (text, disabled, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page__btn';
    btn.textContent = text;
    if (disabled) btn.disabled = true;
    btn.addEventListener('click', onClick);
    return btn;
  };

  // Prev
  pager.appendChild(addButton('Prev', activePage === 1, () => renderPage(activePage - 1)));

  // Page info (e.g., "Page 2 of 5")
  const info = document.createElement('span');
  info.className = 'page__info';
  info.textContent = `Page ${activePage} of ${totalPages}`;
  pager.appendChild(info);

  // Next
  pager.appendChild(addButton('Next', activePage === totalPages, () => renderPage(activePage + 1)));
}


/**
 * Top-level fetch helper that returns parsed JSON.
 * @param {string} url
 */
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // console.log(data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Fetch all pages of OMDb search results for a given baseUrl (without page param)
 * Aggregates results.Search arrays until OMDb returns no more pages.
 * @param {string} baseUrl - e.g. 'https://www.omdbapi.com/?apikey=KEY&s=Term'
 * @returns {Promise<Array>} aggregated Search array
 */
async function fetchAllPages(baseUrl) {
  const allItems = [];
  let page = 1;
  while (true) {
    const pageUrl = baseUrl + '&page=' + page;
    const data = await fetchData(pageUrl);
    if (!data || data.Response === 'False' || !data.Search || data.Search.length === 0) {
      break;
    }
    allItems.push(...data.Search);
    // OMDb returns totalResults; we can stop early if we've fetched them all
    const totalResults = parseInt(data.totalResults, 10) || null;
    if (totalResults && allItems.length >= totalResults) break;
    page += 1;
    // OMDb caps pages; to be safe, stop if page would be too large
    if (page > 100) break; // safety cap
  }
  return allItems;
}

function sendDataToJS() {
  const textBoxValue = document.getElementById('searchBox').value;
  // console.log(textBoxValue);
  const url = `https://www.omdbapi.com/?apikey=${APIKEY}&s=`;
  const fullUrl = url + encodeURIComponent(textBoxValue);
  console.log(fullUrl);
  // call the top-level fetch function
  const resultsList = document.getElementById('results__list');
  if (!resultsList) return;

  // show loading state
  resultsList.innerHTML = '';
  const loadingItem = document.createElement('li');
  loadingItem.className = 'loading';
  const reel = document.createElement('div');
  reel.className = 'loading-reel';
  loadingItem.appendChild(reel);
  resultsList.appendChild(loadingItem);

  // fetch all pages and aggregate
  fetchAllPages(fullUrl).then((allItems) => {
    // clear loading
    resultsList.innerHTML = '';

    if (!allItems || allItems.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No results found.';
      empty.className = 'no__results';
      resultsList.appendChild(empty);
      // clear pagination state
      currentSearchResults = [];
      renderPaginationControls(document.querySelector('.results__section'), 0, 1);
      return;
    }

    // set aggregated results and render first page
    currentSearchResults = allItems;
    renderPage(1);
  }).catch((err) => {
    // show error in UI
    resultsList.innerHTML = '';
    const errLi = document.createElement('li');
    errLi.textContent = 'Error fetching results. See console for details.';
    errLi.className = 'error';
    resultsList.appendChild(errLi);
    console.error('Error fetching data from OMDb:', err);
  });
}

document.getElementById('searchBox').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    console.log('Enter key pressed');
    sendDataToJS();
  }
});