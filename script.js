const APIKEY = "e2ed71d6";
const itemPerPage = 6;

// state for pagination
let currentSearchResults = [];
let currentPage = 1;
const YEAR_MIN = 1888;
const YEAR_MAX = new Date().getFullYear();
let yearRangeMin = YEAR_MIN;
let yearRangeMax = YEAR_MAX;

/** Return currentSearchResults filtered by yearRangeMin/yearRangeMax */
function getFilteredResults() {
  if (!currentSearchResults || currentSearchResults.length === 0) return [];
  return currentSearchResults.filter((item) => {
    const yearText = item && item.Year ? String(item.Year) : '';
    const m = yearText.match(/\d{4}/);
    if (!m) return false;
    const y = parseInt(m[0], 10);
    if (Number.isNaN(y)) return false;
    return y >= yearRangeMin && y <= yearRangeMax;
  });
}

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

  // bounds (use filtered results)
  const filtered = getFilteredResults();
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemPerPage));
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage = page;

  // slice the items for the page
  const start = (page - 1) * itemPerPage;
  const end = start + itemPerPage;
  const pageItems = filtered.slice(start, end);

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

  /** Initialize the dual-range year filter UI and event handlers. */
  function initYearFilter() {
    const minInput = document.getElementById('yearMin');
    const maxInput = document.getElementById('yearMax');
    const minVal = document.getElementById('yearMinValue');
    const maxVal = document.getElementById('yearMaxValue');
    const rangeDisplay = document.getElementById('yearRangeDisplay');
    if (!minInput || !maxInput || !minVal || !maxVal || !rangeDisplay) return;

    minInput.min = YEAR_MIN;
    minInput.max = YEAR_MAX;
    maxInput.min = YEAR_MIN;
    maxInput.max = YEAR_MAX;

    // initialize values
    minInput.value = YEAR_MIN;
    maxInput.value = YEAR_MAX;
    yearRangeMin = YEAR_MIN;
    yearRangeMax = YEAR_MAX;
    minVal.textContent = yearRangeMin;
    maxVal.textContent = yearRangeMax;
    // rangeDisplay.textContent = `Showing years ${yearRangeMin} — ${yearRangeMax}`;

    // stacking so both thumbs are usable
    minInput.style.zIndex = 1;
    maxInput.style.zIndex = 2;

    function updateRangeDisplay() {
      minVal.textContent = yearRangeMin;
      maxVal.textContent = yearRangeMax;
      //rangeDisplay.textContent = `Showing years ${yearRangeMin} — ${yearRangeMax}`;
    }

    // visual track element (created after sliderWrap exists)
    let rangeTrack = null;
    function updateRangeTrack() {
      if (!rangeTrack) return;
      const minV = parseInt(minInput.value, 10);
      const maxV = parseInt(maxInput.value, 10);
      const total = YEAR_MAX - YEAR_MIN;
      const leftPercent = ((minV - YEAR_MIN) / total) * 100;
      const rightPercent = ((YEAR_MAX - maxV) / total) * 100;
      rangeTrack.style.left = leftPercent + '%';
      rangeTrack.style.right = rightPercent + '%';
    }

    function onMinInput() {
      let v = parseInt(minInput.value, 10);
      if (Number.isNaN(v)) v = YEAR_MIN;
      if (v > yearRangeMax) {
        v = yearRangeMax;
        minInput.value = v;
      }
      yearRangeMin = v;
      currentPage = 1;
      updateRangeDisplay();
      updateRangeTrack();
      renderPage(1);
    }

    function onMaxInput() {
      let v = parseInt(maxInput.value, 10);
      if (Number.isNaN(v)) v = YEAR_MAX;
      if (v < yearRangeMin) {
        v = yearRangeMin;
        maxInput.value = v;
      }
      yearRangeMax = v;
      currentPage = 1;
      updateRangeDisplay();
      updateRangeTrack();
      renderPage(1);
    }

    minInput.addEventListener('input', onMinInput);
    maxInput.addEventListener('input', onMaxInput);
    // Implement pointer-based thumb selection so thumbs can be perfectly aligned
    // Choose the thumb nearest the pointer on down, then track pointermove to update it.
    let activeThumb = null; // 'min' or 'max'

    function clientXToValue(clientX) {
      const rect = minInput.getBoundingClientRect();
      const rel = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const range = YEAR_MAX - YEAR_MIN;
      const v = Math.round(YEAR_MIN + (rel / rect.width) * range);
      return v;
    }

    function pickClosestThumb(clientX) {
      const v = clientXToValue(clientX);
      const minDiff = Math.abs(v - parseInt(minInput.value, 10));
      const maxDiff = Math.abs(v - parseInt(maxInput.value, 10));
      return (minDiff <= maxDiff) ? 'min' : 'max';
    }

    const onPointerDown = (ev) => {
      ev.preventDefault();
      const clientX = ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX);
      if (clientX == null) return;
      activeThumb = pickClosestThumb(clientX);
      // capture pointer for consistent move/up events
      try { ev.currentTarget.setPointerCapture && ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
      // update immediately
      const v = clientXToValue(clientX);
      if (activeThumb === 'min') {
        minInput.value = Math.min(v, parseInt(maxInput.value, 10));
        minInput.classList.add('active-thumb');
        onMinInput();
      } else {
        maxInput.value = Math.max(v, parseInt(minInput.value, 10));
        maxInput.classList.add('active-thumb');
        onMaxInput();
      }
    };

    const onPointerMove = (ev) => {
      if (!activeThumb) return;
      ev.preventDefault();
      const clientX = ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX);
      if (clientX == null) return;
      const v = clientXToValue(clientX);
      if (activeThumb === 'min') {
        const clamped = Math.min(v, parseInt(maxInput.value, 10));
        minInput.value = clamped;
        onMinInput();
      } else {
        const clamped = Math.max(v, parseInt(minInput.value, 10));
        maxInput.value = clamped;
        onMaxInput();
      }
    };

    const onPointerUp = (ev) => {
      activeThumb = null;
      try { ev.currentTarget.releasePointerCapture && ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (e) {}
      // remove active class from both thumbs
      minInput.classList.remove('active-thumb');
      maxInput.classList.remove('active-thumb');
    };

    // Attach pointer handlers to the slider container to capture events even when inputs overlap
    const sliderWrap = document.querySelector('.year-slider-wrap');
    if (sliderWrap) {
      // create range track if missing
      rangeTrack = sliderWrap.querySelector('.range-track');
      if (!rangeTrack) {
        rangeTrack = document.createElement('div');
        rangeTrack.className = 'range-track';
        sliderWrap.appendChild(rangeTrack);
      }
      updateRangeTrack();
      sliderWrap.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      // also support touch events
      sliderWrap.addEventListener('touchstart', onPointerDown, { passive: false });
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    } else {
      // fallback: attach to inputs directly
      minInput.addEventListener('pointerdown', onPointerDown);
      maxInput.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    }
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

// init year filter once DOM is ready (script is loaded with defer)
initYearFilter();