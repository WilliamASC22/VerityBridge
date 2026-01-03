(async function () {
  // Wait for Favorites to connect to auth + Firestore
  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
  }

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

  // Map panel
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

  // Require login for Sell mode
  if (mode === "sell") {
    if (typeof Favorites !== "undefined" && Favorites.isLoggedIn) {
      if (!Favorites.isLoggedIn()) {
        const returnTo = encodeURIComponent("results.html?mode=sell");
        location.href = "login.html?returnTo=" + returnTo;
        return;
      }
    }
  }

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
      modeDesc.textContent =
        "Start a video consult to discuss pricing, negotiation strategy, and next steps.";
      modeCallBtn.href =
        "https://meet.jit.si/" + encodeURIComponent("veritybridge-sell-consult");
    }
    else {
      modeTitle.textContent = "Mortgage prep";
      modeDesc.textContent =
        "Start a video consult to go over rates, pre-approval, and affordability.";
      modeCallBtn.href =
        "https://meet.jit.si/" + encodeURIComponent("veritybridge-mortgage-consult");
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

    return '<img src="' + first + '" alt="' + safeAlt + '" loading="lazy" />';
  }

  function listingMode(listing) {
    const raw = String((listing && listing.mode) || "").toLowerCase();

    if (raw === "rent") {
      return "rent";
    }
    if (raw === "sell") {
      return "sell";
    }
    if (raw === "mortgage") {
      return "mortgage";
    }
    return "buy";
  }

  function matchesSearch(listing, q) {
    if (!q) {
      return true;
    }

    const hay =
      String(listing.address || "") + " " +
      String(listing.city || "") + " " +
      String(listing.state || "") + " " +
      String(listing.zip || "");

    return hay.toLowerCase().includes(String(q).toLowerCase());
  }

  function passesNumericFilters(listing) {
    const minPrice = Number(minPriceInput ? minPriceInput.value : 0) || 0;
    const maxPrice = Number(maxPriceInput ? maxPriceInput.value : 0) || 0;

    const minBeds = Number(minBedsSelect ? minBedsSelect.value : 0) || 0;
    const typeVal = String(typeSelect ? typeSelect.value : "");

    const price = Number(listing.price || 0) || 0;
    const beds = Number(listing.beds || 0) || 0;

    if (minPrice && price < minPrice) {
      return false;
    }

    if (maxPrice && price > maxPrice) {
      return false;
    }

    if (minBeds && beds < minBeds) {
      return false;
    }

    if (typeVal) {
      if (String(listing.type || "") !== typeVal) {
        return false;
      }
    }

    return true;
  }

  function sortListings(list) {
    const sortVal = String(sortSelect ? sortSelect.value : "newest");

    const copy = list.slice();

    if (sortVal === "price_asc") {
      copy.sort(function (a, b) {
        return Number(a.price || 0) - Number(b.price || 0);
      });
    }
    else if (sortVal === "price_desc") {
      copy.sort(function (a, b) {
        return Number(b.price || 0) - Number(a.price || 0);
      });
    }
    else if (sortVal === "sqft_desc") {
      copy.sort(function (a, b) {
        return Number(b.sqft || 0) - Number(a.sqft || 0);
      });
    }
    else {
      // newest: keep file order
    }

    return copy;
  }

  function renderListingCard(listing) {
    const id = escapeHtml(listing.id);
    const title =
      escapeHtml(listing.address) + ", " +
      escapeHtml(listing.city) + ", " +
      escapeHtml(listing.state);

    const beds = Number(listing.beds || 0) || 0;
    const baths = Number(listing.baths || 0) || 0;

    const favOn =
      (typeof Favorites !== "undefined" && Favorites.has)
        ? Favorites.has(listing.id)
        : false;

    const favIcon = favOn ? "❤️" : "♡";

    const img = imageTagWithFallback(listing.photos, title);

    return (
      '<div class="card listing-card" data-listing-card="1" data-id="' + id + '">' +
        '<a class="listing-link" href="listing.html?id=' + encodeURIComponent(listing.id) + '">' +
          '<div class="listing-img">' + img + "</div>" +
          '<div class="listing-body">' +
            '<div class="listing-price">' + formatMoney(listing.price) + "</div>" +
            '<div class="listing-facts muted">' +
              beds + " bd • " + baths + " ba • " + formatNumber(listing.sqft) + " sqft" +
            "</div>" +
            '<div class="listing-addr">' + title + "</div>" +
          "</div>" +
        "</a>" +
        '<button class="fav-btn" type="button" data-fav="' + id + '" aria-label="Save">' +
          favIcon +
        "</button>" +
      "</div>"
    );
  }

  // ----- Map -----
  let leafletMap = null;
  let marker = null;

  function closeMapPanel() {
    if (mapPanel) {
      mapPanel.classList.add("is-hidden");
    }
  }

  function showListingOnMap(listing) {
    if (!listing || !listing.lat || !listing.lng) {
      if (mapSubtitle) {
        mapSubtitle.textContent = "No map coordinates for this listing.";
      }
      return;
    }

    if (!leafletMap) {
      leafletMap = L.map("leafletMap");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
      }).addTo(leafletMap);
    }

    if (marker) {
      marker.remove();
      marker = null;
    }

    if (mapPanel) {
      mapPanel.classList.remove("is-hidden");
    }

    marker = L.marker([listing.lat, listing.lng]).addTo(leafletMap);
    marker.bindPopup(escapeHtml(listing.address || "Listing"));
    leafletMap.setView([listing.lat, listing.lng], 12, { animate: true });

    setTimeout(function () {
      marker.openPopup();
    }, 160);
  }

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

        if (typeof Favorites !== "undefined") {
          Favorites.toggle(id);

          if (Favorites.has(id)) {
            favButton.textContent = "❤️";
          }
          else {
            favButton.textContent = "♡";
          }

          Favorites.renderFavCount();
        }

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
