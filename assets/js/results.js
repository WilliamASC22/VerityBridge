// assets/js/results.js
(async function () {
  // favorites count in nav
  if (typeof Favorites !== "undefined") {
    Favorites.renderFavCount();
  }

  // DOM refs
  const searchForm = document.getElementById("resultsSearch");
  const searchInput = document.getElementById("q");

  const filtersCard = document.getElementById("filtersCard");
  const applyFiltersButton = document.getElementById("apply");
  const resetFiltersButton = document.getElementById("reset");

  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const minBedsSelect = document.getElementById("minBeds");
  const typeSelect = document.getElementById("type");
  const sortSelect = document.getElementById("sort");

  const headlineEl = document.getElementById("headline");
  const subheadEl = document.getElementById("subhead");

  const emptyStateCard = document.getElementById("empty");
  const listingGrid = document.getElementById("grid");

  const resultsLayout = document.getElementById("resultsLayout");

  // Map panel hidden until click
  const mapPanel = document.getElementById("mapPanel");
  const mapSubtitle = document.getElementById("mapSubtitle");
  const closeMapButton = document.getElementById("closeMap");

  // Sell/Mortgage panel
  const modePanel = document.getElementById("modePanel");
  const modeTitle = document.getElementById("modeTitle");
  const modeDesc = document.getElementById("modeDesc");
  const modeCallBtn = document.getElementById("modeCallBtn");

  // URL mode
  const url = new URL(location.href);

  let mode = url.searchParams.get("mode");
  if (!mode) {
    mode = "buy";
  }
  mode = String(mode).toLowerCase();

  function setActiveNav() {
    const ids = ["navBuy", "navRent", "navSell", "navMortgage"];

    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("active");
      }
    });

    const map = {
      buy: "navBuy",
      rent: "navRent",
      sell: "navSell",
      mortgage: "navMortgage"
    };

    let activeId = map[mode];
    if (!activeId) {
      activeId = "navBuy";
    }

    const activeEl = document.getElementById(activeId);
    if (activeEl) {
      activeEl.classList.add("active");
    }
  }

  function setHeadline() {
    if (mode === "rent") {
      headlineEl.textContent = "Homes for rent";
    }
    else if (mode === "sell") {
      headlineEl.textContent = "Sell with confidence";
    }
    else if (mode === "mortgage") {
      headlineEl.textContent = "Mortgage guidance";
    }
    else {
      headlineEl.textContent = "Homes for sale";
    }
  }

  function configureModePanels() {
    if (mode === "buy" || mode === "rent") {
      filtersCard.style.display = "block";
      modePanel.style.display = "none";
      return;
    }

    filtersCard.style.display = "none";
    modePanel.style.display = "block";

    if (mode === "sell") {
      modeTitle.textContent = "Sell directly";
      modeDesc.textContent = "Start a video consult to discuss pricing, negotiation strategy, and next steps.";
      modeCallBtn.href = "https://meet.jit.si/" + encodeURIComponent("veritybridge-sell-consult");
    }
    else {
      modeTitle.textContent = "Mortgage prep";
      modeDesc.textContent = "Start a video consult to go over rates, pre-approval, and affordability.";
      modeCallBtn.href = "https://meet.jit.si/" + encodeURIComponent("veritybridge-mortgage-consult");
    }
  }

  // init query
  let initialQuery = url.searchParams.get("q");
  if (!initialQuery) {
    initialQuery = "";
  }

  if (searchInput) {
    searchInput.value = initialQuery;
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    let text = s;

    if (text === null || text === undefined) {
      text = "";
    }
    else {
      text = String(text);
    }

    if (typeof App !== "undefined") {
      return App.escape(text);
    }
    else {
      return text;
    }
  }

  function formatMoney(n) {
    if (typeof App !== "undefined") {
      return App.money(n);
    }
    else {
      return "$" + Number(n || 0).toLocaleString();
    }
  }

  function formatNumber(n) {
    if (typeof App !== "undefined") {
      return App.num(n);
    }
    else {
      return Number(n || 0).toLocaleString();
    }
  }

  // fallback placeholder image
  function placeholderDataUrl(text) {
    let safe = text;
    if (!safe) {
      safe = "Photo unavailable";
    }

    safe = safe.slice(0, 60);

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">' +
      '<defs>' +
      '<linearGradient id="g" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#f8fbff"/>' +
      '<stop offset="1" stop-color="#eef2f7"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<circle cx="360" cy="260" r="220" fill="rgba(0,106,255,0.10)"/>' +
      '<circle cx="860" cy="360" r="240" fill="rgba(0,106,255,0.08)"/>' +
      '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" ' +
      'font-family="Arial" font-size="44" fill="#6b7280">' +
      safe +
      "</text>" +
      "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  // Try multiple photos before falling back
  function imageTagWithFallback(urls, alt) {
    const safeAlt = escapeHtml(alt || "Home photo");

    let list = [];
    if (Array.isArray(urls)) {
      list = urls.filter(function (x) {
        return Boolean(x);
      });
    }
    else {
      if (urls) {
        list = [urls];
      }
      else {
        list = [];
      }
    }

    let first = list[0];
    if (!first) {
      first = placeholderDataUrl("Photo unavailable");
    }

    const data = escapeHtml(JSON.stringify(list));

    return (
      '\n      <img class="home-img-img"\n' +
      '           src="' + escapeHtml(first) + '"\n' +
      '           alt="' + safeAlt + '"\n' +
      "           data-srcs='" + data + "'\n" +
      '           data-i="0"\n' +
      '           loading="lazy"\n' +
      '           onerror="\n' +
      "             try {\n" +
      "               const srcs = JSON.parse(this.getAttribute('data-srcs') || '[]');\n" +
      "               let i = parseInt(this.getAttribute('data-i') || '0', 10);\n" +
      "               i++;\n" +
      "               if (i < srcs.length) {\n" +
      "                 this.setAttribute('data-i', String(i));\n" +
      "                 this.src = srcs[i];\n" +
      "               } else {\n" +
      "                 this.onerror = null;\n" +
      "                 this.src = '" + placeholderDataUrl("Photo unavailable") + "';\n" +
      "               }\n" +
      "             } catch (e) {\n" +
      "               this.onerror = null;\n" +
      "               this.src = '" + placeholderDataUrl("Photo unavailable") + "';\n" +
      "             }\n" +
      '           "\n' +
      "      />\n    "
    );
  }

  // Mode routing for your 5 listings
  const MODE_BY_ID = {
    "hc-1001": "buy",
    "hc-1002": "buy",
    "hc-1003": "sell",
    "hc-1004": "rent",
    "hc-1005": "mortgage"
  };

  function listingMode(listing) {
    let fromJson = "";

    if (listing && listing.mode) {
      fromJson = listing.mode;
    }
    else if (listing && listing.listingMode) {
      fromJson = listing.listingMode;
    }
    else if (listing && listing.category) {
      fromJson = listing.category;
    }

    fromJson = String(fromJson).toLowerCase();

    if (fromJson) {
      return fromJson;
    }

    let mapped = MODE_BY_ID[listing.id];
    if (!mapped) {
      mapped = "buy";
    }

    return mapped;
  }

  function matchesSearch(listing, q) {
    if (!q) {
      return true;
    }

    const parts = [
      listing.address,
      listing.city,
      listing.state,
      listing.zip,
      listing.neighborhood,
      listing.type
    ];

    const hay = parts
      .filter(function (x) {
        return Boolean(x);
      })
      .join(" ")
      .toLowerCase();

    return hay.includes(q.toLowerCase());
  }

  function passesNumericFilters(listing) {
    // Only apply numeric filters in buy/rent
    if (!(mode === "buy" || mode === "rent")) {
      return true;
    }

    let minP = 0;
    if (minPriceInput) {
      minP = Number(minPriceInput.value || 0);
    }

    let maxP = 0;
    if (maxPriceInput) {
      maxP = Number(maxPriceInput.value || 0);
    }

    let minB = 0;
    if (minBedsSelect) {
      minB = Number(minBedsSelect.value || 0);
    }

    let type = "";
    if (typeSelect) {
      type = String(typeSelect.value || "").trim();
    }

    if (minP && Number(listing.price || 0) < minP) {
      return false;
    }
    if (maxP && Number(listing.price || 0) > maxP) {
      return false;
    }
    if (minB && Number(listing.beds || 0) < minB) {
      return false;
    }
    if (type && String(listing.type || "") !== type) {
      return false;
    }

    return true;
  }

  function sortListings(list) {
    let sort = "newest";
    if (sortSelect) {
      sort = String(sortSelect.value || "newest").toLowerCase();
    }

    const arr = list.slice();

    if (sort === "price_low") {
      arr.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    }
    else if (sort === "price_high") {
      arr.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    }
    else if (sort === "beds") {
      arr.sort(function (a, b) {
        return (b.beds || 0) - (a.beds || 0);
      });
    }
    else {
      // newest
      arr.sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    return arr;
  }

  function jitsiRoomForListing(listingId) {
    return ("veritybridge-" + listingId).replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function renderListingCard(listing) {
    const isFav = Favorites.has(listing.id);
    const alt = listing.address + ", " + listing.city;

    const detailsLine =
      listing.beds +
      " bd • " +
      listing.baths +
      " ba • " +
      formatNumber(listing.sqft) +
      " sqft • " +
      escapeHtml(listing.type);

    const listingHref = "listing.html?id=" + encodeURIComponent(listing.id);
    const callHref = "https://meet.jit.si/" + encodeURIComponent(jitsiRoomForListing(listing.id));

    return (
      '\n      <article class="home-card" data-listing-card data-id="' +
      escapeHtml(listing.id) +
      '">\n        <a class="home-img" href="' +
      listingHref +
      '" aria-label="View listing">\n          ' +
      imageTagWithFallback(listing.photos || [], alt) +
      '\n        </a>\n\n        <div class="home-body">\n          <div class="home-row">\n            <div class="home-price">' +
      formatMoney(listing.price) +
      '</div>\n            <button class="icon-btn" type="button" data-fav="' +
      escapeHtml(listing.id) +
      '" aria-label="Save listing">\n              ' +
      (isFav ? "❤️" : "♡") +
      "\n            </button>\n          </div>\n\n          <div class=\"home-facts muted\">" +
      detailsLine +
      "</div>\n\n          <a class=\"home-addr\" href=\"" +
      listingHref +
      "\">\n            " +
      escapeHtml(listing.address) +
      ", " +
      escapeHtml(listing.city) +
      ", " +
      escapeHtml(listing.state) +
      " " +
      escapeHtml(listing.zip) +
      '\n          </a>\n\n          <div class="home-sub muted">' +
      escapeHtml(listing.neighborhood || "") +
      '</div>\n\n          <div class="home-tags">\n            <a class="tag tag-btn" href="' +
      callHref +
      '" target="_blank" rel="noreferrer">Tour today</a>\n            <a class="tag tag-soft tag-btn" href="' +
      listingHref +
      '">Video negotiation</a>\n          </div>\n        </div>\n      </article>\n    '
    );
  }

  // ---- Leaflet map logic (hidden until click)
  let leafletMap = null;
  let markerLayer = null;

  function ensureMapInitialized() {
    if (leafletMap) {
      return;
    }

    leafletMap = L.map("leafletMap", { zoomControl: true }).setView([39.5, -98.35], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(leafletMap);

    markerLayer = L.layerGroup().addTo(leafletMap);
  }

  function openMapPanel() {
    mapPanel.classList.remove("is-hidden");
    resultsLayout.classList.add("map-open");
    ensureMapInitialized();
    setTimeout(function () {
      leafletMap.invalidateSize();
    }, 120);
  }

  function closeMapPanel() {
    mapPanel.classList.add("is-hidden");
    resultsLayout.classList.remove("map-open");
  }

  function showListingOnMap(listing) {
    openMapPanel();

    if (!listing || typeof listing.lat !== "number" || typeof listing.lng !== "number") {
      mapSubtitle.textContent = "No coordinates for this listing yet.";
      markerLayer.clearLayers();
      leafletMap.setView([39.5, -98.35], 4);
      return;
    }

    mapSubtitle.textContent = listing.address + ", " + listing.city;
    markerLayer.clearLayers();

    const marker = L.marker([listing.lat, listing.lng]).addTo(markerLayer);
    marker.bindPopup(
      '<div style="font-weight:900">' +
        formatMoney(listing.price) +
        '</div>' +
        '<div style="color:#6b7280;font-size:12px">' +
        listing.beds +
        " bd • " +
        listing.baths +
        " ba • " +
        formatNumber(listing.sqft) +
        " sqft" +
        "</div>" +
        '<div style="margin-top:6px;font-weight:850">' +
        escapeHtml(listing.address) +
        "</div>"
    );

    leafletMap.setView([listing.lat, listing.lng], 12, { animate: true });

    setTimeout(function () {
      marker.openPopup();
    }, 160);
  }

  // Hide map
  if (closeMapButton) {
    closeMapButton.addEventListener("click", closeMapPanel);
  }

  // Search submit
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();

      let q = "";
      if (searchInput) {
        q = String(searchInput.value || "").trim();
      }

      const u = new URL(location.href);

      if (q) {
        u.searchParams.set("q", q);
      }
      else {
        u.searchParams.delete("q");
      }

      history.replaceState({}, "", u);
      render();
    });
  }

  // Apply / Reset
  if (applyFiltersButton) {
    applyFiltersButton.addEventListener("click", render);
  }

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", function () {
      if (!minPriceInput || !maxPriceInput || !minBedsSelect || !typeSelect || !sortSelect) {
        return;
      }

      minPriceInput.value = "";
      maxPriceInput.value = "";
      minBedsSelect.value = "";
      typeSelect.value = "";
      sortSelect.value = "newest";
      render();
    });
  }

  // Load listings once
  const allListings = await Data.loadListings();

  // Click handlers: favorites + map-on-click
  if (listingGrid) {
    listingGrid.addEventListener("click", function (e) {
      const favButton = e.target.closest("[data-fav]");
      if (favButton) {
        e.preventDefault();
        e.stopPropagation();

        const id = favButton.getAttribute("data-fav");
        Favorites.toggle(id);

        if (Favorites.has(id)) {
          favButton.textContent = "❤️";
        }
        else {
          favButton.textContent = "♡";
        }

        Favorites.renderFavCount();
        return;
      }

      // If they click a link, let navigation happen (no map open)
      if (e.target.closest("a")) {
        return;
      }

      const listingCard = e.target.closest("[data-listing-card]");
      if (!listingCard) {
        return;
      }

      const listingId = listingCard.getAttribute("data-id");

      const listing = allListings.find(function (x) {
        return x.id === listingId;
      });

      if (listing) {
        showListingOnMap(listing);
      }
    });
  }

  function render() {
    let q = "";
    if (searchInput) {
      q = String(searchInput.value || "").trim();
    }

    // filter by mode FIRST
    const inMode = allListings.filter(function (l) {
      return listingMode(l) === mode;
    });

    const filtered = inMode
      .filter(function (l) {
        return matchesSearch(l, q);
      })
      .filter(function (l) {
        return passesNumericFilters(l);
      });

    const sorted = sortListings(filtered);

    subheadEl.textContent =
      sorted.length + " home" + (sorted.length === 1 ? "" : "s");

    if (!sorted.length) {
      emptyStateCard.style.display = "block";
      listingGrid.innerHTML = "";
      closeMapPanel();
      return;
    }

    emptyStateCard.style.display = "none";
    listingGrid.innerHTML = sorted.map(renderListingCard).join("");
  }

  // Init page
  setActiveNav();
  setHeadline();
  configureModePanels();
  closeMapPanel();
  render();
})();
