(async function () {

  // Wait for favorites/auth to initialize (safe even if it resolves fast)
  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
  }

  if (typeof Favorites !== "undefined" && Favorites.renderFavCount) {
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

  // Sell/Mortgage panel (exists in results.html)
  const modePanel = document.getElementById("modePanel");
  const modeTitle = document.getElementById("modeTitle");
  const modeDesc = document.getElementById("modeDesc");
  const modeCallBtn = document.getElementById("modeCallBtn");

  // URL + mode
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
      mortgage: "navMortgage",
      sell: "navSell"
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
    if (!headlineEl) {
      return;
    }

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
    if (!filtersCard || !modePanel) {
      return;
    }

    if (mode === "buy" || mode === "rent") {
      filtersCard.style.display = "block";
      modePanel.style.display = "none";
      return;
    }

    filtersCard.style.display = "none";
    modePanel.style.display = "block";

    if (!modeTitle || !modeDesc || !modeCallBtn) {
      return;
    }

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

  // Init query
  let initialQuery = url.searchParams.get("q");
  if (!initialQuery) {
    initialQuery = "";
  }

  if (searchInput) {
    searchInput.value = initialQuery;
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    if (typeof App !== "undefined" && App.escape) {
      return App.escape(s);
    }

    // fallback basic escape
    let t = s;
    if (t === null || t === undefined) {
      t = "";
    }
    else {
      t = String(t);
    }

    t = t.replaceAll("&", "&amp;");
    t = t.replaceAll("<", "&lt;");
    t = t.replaceAll(">", "&gt;");
    t = t.replaceAll('"', "&quot;");
    t = t.replaceAll("'", "&#039;");
    return t;
  }

  function formatMoney(n) {
    if (typeof App !== "undefined" && App.money) {
      return App.money(n);
    }
    return "$" + Number(n || 0).toLocaleString();
  }

  function formatNumber(n) {
    if (typeof App !== "undefined" && App.num) {
      return App.num(n);
    }
    return Number(n || 0).toLocaleString();
  }

  function jitsiRoomForListing(id) {
    return "veritybridge-tour-" + String(id || "");
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
      // newest: keep JSON order
    }

    return copy;
  }

  function firstPhoto(listing) {
    if (listing && listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      if (listing.photos[0]) {
        return listing.photos[0];
      }
    }
    return "";
  }

  function renderListingCard(listing) {
    const isFav =
      (typeof Favorites !== "undefined" && Favorites.has)
        ? Favorites.has(listing.id)
        : false;

    const alt = String(listing.address || "") + ", " + String(listing.city || "");

    const detailsLine =
      String(listing.beds || 0) + " bd • " +
      String(listing.baths || 0) + " ba • " +
      formatNumber(listing.sqft) + " sqft • " +
      escapeHtml(listing.type || "");

    const listingHref = "listing.html?id=" + encodeURIComponent(listing.id);
    const callHref = "https://meet.jit.si/" + encodeURIComponent(jitsiRoomForListing(listing.id));

    const photo = firstPhoto(listing);
    let imgHtml = "";

    if (photo) {
      imgHtml =
        '<img class="home-img-img" src="' + photo + '" alt="' + escapeHtml(alt) + '" loading="lazy" />';
    }
    else {
      imgHtml =
        '<div class="home-img-img" aria-label="Photo unavailable"></div>';
    }

    return (
      '<article class="home-card" data-listing-card data-id="' + escapeHtml(listing.id) + '">' +
        '<a class="home-img" href="' + listingHref + '" aria-label="Open listing">' +
          imgHtml +
        "</a>" +
        '<div class="home-body">' +
          '<div class="home-top">' +
            '<div class="home-price">' + formatMoney(listing.price) + "</div>" +
            '<button class="icon-btn" type="button" data-fav="' + escapeHtml(listing.id) + '" aria-label="Save">' +
              (isFav ? "❤️" : "♡") +
            "</button>" +
          "</div>" +
          '<div class="home-facts muted">' + detailsLine + "</div>" +
          '<div class="home-addr">' +
            escapeHtml(listing.address) + ", " + escapeHtml(listing.city) + ", " + escapeHtml(listing.state) +
          "</div>" +
          '<div class="home-actions">' +
            '<a class="btn btn-ghost btn-sm" href="' + callHref + '">Video tour</a>' +
            '<a class="btn btn-primary btn-sm" href="' + listingHref + '">Details</a>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  // ----- Map -----
  let leafletMap = null;
  let marker = null;

  function closeMapPanel() {
    if (mapPanel) {
      mapPanel.classList.add("is-hidden");
    }

    const layout = document.querySelector(".results-layout");
    if (layout) {
      layout.classList.remove("map-open");
    }
  }

  function openMapPanel() {
    if (mapPanel) {
      mapPanel.classList.remove("is-hidden");
    }

    const layout = document.querySelector(".results-layout");
    if (layout) {
      layout.classList.add("map-open");
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

    openMapPanel();

    marker = L.marker([listing.lat, listing.lng]).addTo(leafletMap);
    marker.bindPopup(escapeHtml(listing.address || "Listing"));
    leafletMap.setView([listing.lat, listing.lng], 12, { animate: true });

    setTimeout(function () {
      marker.openPopup();
    }, 160);

    if (mapSubtitle) {
      mapSubtitle.textContent = "Previewing: " + String(listing.city || "");
    }
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
      if (minPriceInput) {
        minPriceInput.value = "";
      }
      if (maxPriceInput) {
        maxPriceInput.value = "";
      }
      if (minBedsSelect) {
        minBedsSelect.value = "";
      }
      if (typeSelect) {
        typeSelect.value = "";
      }
      if (sortSelect) {
        sortSelect.value = "newest";
      }
      render();
    });
  }

  // Load listings once
  const allListings = await Data.loadListings();

  // Favorites toggle + map-on-card click
  if (listingGrid) {
    listingGrid.addEventListener("click", function (e) {
      const favButton = e.target.closest("[data-fav]");
      if (favButton) {
        e.preventDefault();
        e.stopPropagation();

        const id = favButton.getAttribute("data-fav");

        if (typeof Favorites !== "undefined" && Favorites.toggle) {
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

      // If they click a link or a button, do not open map
      if (e.target.closest("a")) {
        return;
      }
      if (e.target.closest("button")) {
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

    // filter by mode first
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

    if (subheadEl) {
      subheadEl.textContent =
        sorted.length + " home" + (sorted.length === 1 ? "" : "s");
    }

    if (!sorted.length) {
      if (emptyStateCard) {
        emptyStateCard.style.display = "block";
      }
      if (listingGrid) {
        listingGrid.innerHTML = "";
      }
      closeMapPanel();
      return;
    }

    if (emptyStateCard) {
      emptyStateCard.style.display = "none";
    }
    if (listingGrid) {
      listingGrid.innerHTML = sorted.map(renderListingCard).join("");
    }
  }

  // Init
  setActiveNav();
  setHeadline();
  configureModePanels();
  closeMapPanel();
  render();

})();
