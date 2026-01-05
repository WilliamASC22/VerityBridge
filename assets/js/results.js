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

  // If we arrived with a query in the URL (ex: landing page city chips),
  // reflect it in the input so filtering actually applies.
  const initialQ = url.searchParams.get("q") || "";
  if (searchInput && initialQ) {
    searchInput.value = String(initialQ);
  }

  // ---------- helpers ----------
  function normalizeSearchText(s) {
    // Lowercase, remove punctuation, collapse spaces.
    // This makes "San Jose, CA" match "San Jose CA".
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHtml(s) {
    if (typeof App !== "undefined" && App.escape) {
      return App.escape(s);
    }
    else {
      if (s === null || s === undefined) {
        return "";
      }
      else {
        return String(s);
      }
    }
  }

  function formatMoney(n) {
    if (typeof App !== "undefined" && App.money) {
      return App.money(n);
    }
    else {
      const v = Number(n || 0);
      return "$" + v.toLocaleString();
    }
  }

  function formatNumber(n) {
    if (typeof App !== "undefined" && App.num) {
      return App.num(n);
    }
    else {
      const v2 = Number(n || 0);
      return v2.toLocaleString();
    }
  }

  function listingMode(l) {
    let raw = "";
    if (l && l.mode) {
      raw = String(l.mode).toLowerCase();
    }

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
    const nq = normalizeSearchText(q);
    if (!nq) {
      return true;
    }

    const hay =
      String(listing.address || "") + " " +
      String(listing.city || "") + " " +
      String(listing.state || "") + " " +
      String(listing.zip || "");

    return normalizeSearchText(hay).includes(nq);
  }

  function passesNumericFilters(listing) {
    let minPrice = 0;
    let maxPrice = 0;
    let minBeds = 0;

    if (minPriceInput && minPriceInput.value) {
      minPrice = Number(minPriceInput.value) || 0;
    }
    if (maxPriceInput && maxPriceInput.value) {
      maxPrice = Number(maxPriceInput.value) || 0;
    }
    if (minBedsSelect && minBedsSelect.value) {
      minBeds = Number(minBedsSelect.value) || 0;
    }

    let typeVal = "";
    if (typeSelect && typeSelect.value) {
      typeVal = String(typeSelect.value);
    }

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
    let sortVal = "newest";
    if (sortSelect && sortSelect.value) {
      sortVal = String(sortSelect.value);
    }

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
      // newest: keep JSON/Firestore order
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

  function jitsiRoomForListing(id) {
    return "veritybridge-" + String(id || "");
  }

  function renderListingCard(listing) {
    let isFav = false;

    if (typeof Favorites !== "undefined" && Favorites.has) {
      if (Favorites.has(listing.id)) {
        isFav = true;
      }
      else {
        isFav = false;
      }
    }

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

    let heart = "♡";
    if (isFav) {
      heart = "❤️";
    }
    else {
      heart = "♡";
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
              heart +
            "</button>" +
          "</div>" +
          '<div class="home-facts muted">' + detailsLine + "</div>" +
          '<div class="home-addr">' +
            escapeHtml(listing.address) + ", " + escapeHtml(listing.city) + ", " + escapeHtml(listing.state) +
          "</div>" +
          '<div class="home-actions">' +
            '<a class="btn btn-ghost btn-sm js-video-tour" href="' + callHref + '">Video tour</a>' +
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

    const layout2 = document.querySelector(".results-layout");
    if (layout2) {
      layout2.classList.add("map-open");
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
      if (searchInput && searchInput.value) {
        q = String(searchInput.value).trim();
      }
      else {
        q = "";
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
      // Video tour (open only after confirmation)
      var videoLink = e.target.closest("a.js-video-tour");
      if (videoLink) {
        e.preventDefault();
        e.stopPropagation();

        var msg =
          "This will open a live video tour in a new tab.\n\n" +
          "You may be asked to allow camera and microphone access.\n\n" +
          "Continue?";

        var ok = confirm(msg);
        if (ok) {
          window.open(videoLink.href, "_blank");
        }

        return;
      }

      const favButton = e.target.closest("[data-fav]");
      if (favButton) {
        e.preventDefault();
        e.stopPropagation();

        const id = favButton.getAttribute("data-fav");

        if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
          Favorites.waitUntilReady();
        }

        if (typeof Favorites !== "undefined" && Favorites.ensureLoggedIn) {
          if (!Favorites.ensureLoggedIn()) {
            return;
          }
        }

        if (typeof Favorites !== "undefined" && Favorites.toggle) {
          Favorites.toggle(id).then(function (res) {
            if (res && res.ok) {
              if (Favorites.has(id)) {
                favButton.textContent = "❤️";
              }
              else {
                favButton.textContent = "♡";
              }

              Favorites.renderFavCount();
            }
          });
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

  function setActiveNav() {
    const ids = ["navBuy", "navRent", "navSell", "navMortgage"];

    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("active");
      }
    });

    let activeId = "navBuy";
    if (mode === "rent") {
      activeId = "navRent";
    }
    else if (mode === "mortgage") {
      activeId = "navMortgage";
    }
    else if (mode === "sell") {
      activeId = "navSell";
    }
    else {
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
    else {
      filtersCard.style.display = "none";
      modePanel.style.display = "block";
    }

    if (!modeTitle || !modeDesc || !modeCallBtn) {
      return;
    }

    if (mode === "sell") {
      modeTitle.textContent = "Sell with clarity";
      modeDesc.textContent = "Post a listing and schedule real-time tours.";
      modeCallBtn.textContent = "Create a listing";
      modeCallBtn.href = "sell.html";
    }
    else if (mode === "mortgage") {
      modeTitle.textContent = "Mortgage guidance";
      modeDesc.textContent = "Estimate payments and compare options.";
      modeCallBtn.textContent = "Browse homes";
      modeCallBtn.href = "results.html?mode=buy";
    }
    else {
      modeTitle.textContent = "Browse listings";
      modeDesc.textContent = "";
      modeCallBtn.textContent = "Browse homes";
      modeCallBtn.href = "results.html?mode=buy";
    }
  }

  function render() {
    let q = "";
    if (searchInput && searchInput.value) {
      q = String(searchInput.value).trim();
    }
    else {
      q = "";
    }

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
      let suffix = "s";
      if (sorted.length === 1) {
        suffix = "";
      }
      else {
        suffix = "s";
      }

      subheadEl.textContent = String(sorted.length) + " home" + suffix;
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
      const html = [];
      for (let i = 0; i < sorted.length; i = i + 1) {
        html.push(renderListingCard(sorted[i]));
      }
      listingGrid.innerHTML = html.join("");
    }
  }

  // Init
  setActiveNav();
  setHeadline();
  configureModePanels();
  closeMapPanel();
  render();

})();
