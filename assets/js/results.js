(async function () {

  // Wait for favorites/auth to initialize (safe even if it resolves fast)
  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
  }

  if (typeof Favorites !== "undefined" && Favorites.renderFavCount) {
    Favorites.renderFavCount();
  }

  async function waitForAuthReady() {
    if (!window.auth || typeof window.auth.onAuthStateChanged !== "function") {
      return;
    }
    await new Promise((resolve) => {
      let done = false;
      window.auth.onAuthStateChanged(() => {
        if (!done) {
          done = true;
          resolve();
        }
      });
    });
  }

  // DOM refs
  const searchForm = document.getElementById("resultsSearch");
  const searchInput = document.getElementById("q");

  const filtersCard = document.getElementById("filtersCard");
  const filtersToggleBtn = document.getElementById("filtersToggle"); // (not in results.html, harmless)

  const filtersApplyBtn = document.getElementById("apply");  // ✅ matches results.html
  const filtersResetBtn = document.getElementById("reset");  // ✅ matches results.html

  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const minBedsSelect = document.getElementById("minBeds");
  const typeSelect = document.getElementById("type");
  const sortSelect = document.getElementById("sort");

  const headlineEl = document.getElementById("headline");
  const subheadEl = document.getElementById("subhead");

  const emptyStateCard = document.getElementById("empty");
  const listingGrid = document.getElementById("grid");

  // Video tour 
  const vbModal = document.getElementById("vbModal");
  const vbOk = document.getElementById("vbOk");
  const vbCancel = document.getElementById("vbCancel");
  let pendingTourUrl = "";

  function openTourModal(url) {
    if (!vbModal || !vbOk || !vbCancel) {
      window.open(url, "_blank");
      return;
    }
    pendingTourUrl = String(url || "").trim();
    if (!pendingTourUrl) return;

    vbModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeTourModal() {
    if (!vbModal) return;
    vbModal.classList.remove("is-open");
    document.body.style.overflow = "";
    pendingTourUrl = "";
  }

  if (vbCancel) vbCancel.addEventListener("click", closeTourModal);

  if (vbModal) {
    vbModal.addEventListener("click", function (e) {
      if (e.target === vbModal) closeTourModal();
    });
  }

  if (vbOk) {
    vbOk.addEventListener("click", function () {
      const url = pendingTourUrl;
      closeTourModal();
      if (url) window.open(url, "_blank");
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeTourModal();
  });

  // Map panel
  const mapPanel = document.getElementById("mapPanel");
  const mapCloseBtn = document.getElementById("closeMap");        // ✅ matches results.html
  const mapSubEl = document.getElementById("mapSubtitle");        // ✅ matches results.html
  const mapContainer = document.getElementById("leafletMap");     // ✅ matches results.html

  // Helpers
  function parseQuery() {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    const mode = params.get("mode") || "buy";

    const minPrice = params.get("minPrice") || "";
    const maxPrice = params.get("maxPrice") || "";
    const minBeds = params.get("minBeds") || "";
    const type = params.get("type") || "";
    const sort = params.get("sort") || "newest"; // matches results.html options

    return { q, mode, minPrice, maxPrice, minBeds, type, sort };
  }

  function setQuery(newQuery) {
    const params = new URLSearchParams();

    if (newQuery.q) params.set("q", newQuery.q);
    if (newQuery.mode) params.set("mode", newQuery.mode);

    if (newQuery.minPrice) params.set("minPrice", newQuery.minPrice);
    if (newQuery.maxPrice) params.set("maxPrice", newQuery.maxPrice);
    if (newQuery.minBeds) params.set("minBeds", newQuery.minBeds);
    if (newQuery.type) params.set("type", newQuery.type);
    if (newQuery.sort) params.set("sort", newQuery.sort);

    const next = "results.html" + (params.toString() ? "?" + params.toString() : "");
    history.replaceState({}, "", next);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMoney(n) {
    const v = Number(n || 0);
    return "$" + v.toLocaleString();
  }

  function formatNumber(n) {
    const v = Number(n || 0);
    return v.toLocaleString();
  }

  function normalize(text) {
    // Make sure we are always working with a string
    let result = String(text || "");

    // Convert everything to lowercase
    result = result.toLowerCase();

    // Replace commas, punctuation, and symbols with spaces
    // (so "Austin, TX" becomes "austin  tx")
    result = result.replace(/[^a-z0-9]+/g, " ");

    // Remove spaces at the beginning and end
    result = result.trim();

    // Replace multiple spaces with a single space
    result = result.replace(/\s+/g, " ");

    return result;
  }


  function includesQuery(listing, q) {
    const query = normalize(q);
    if (!query) return true;

    const hay = [
      listing.title,
      listing.address,
      listing.city,
      listing.state,
      listing.zip,
      listing.neighborhood,
      listing.description,
      listing.type,
      listing.parking,
      listing.mode,
    ].map(normalize).join(" ");

    return hay.indexOf(query) !== -1;
  }

  function firstPhoto(listing) {
    if (!listing) return "";
    if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      return listing.photos[0] || "";
    }
    return "";
  }

  const WAITING_3_WORDS = "Video tour not yet available";

  function renderListingCard(listing) {
    let isFav = false;
    if (typeof Favorites !== "undefined" && Favorites.has) {
      isFav = !!Favorites.has(listing.id);
    }

    const alt = String(listing.address || "") + ", " + String(listing.city || "");

    const detailsLine =
      String(listing.beds || 0) + " bd • " +
      String(listing.baths || 0) + " ba • " +
      formatNumber(listing.sqft || 0) + " sqft";

    const listingHref = "listing.html?id=" + encodeURIComponent(listing.id);
    const tourLink = String(listing.tourLink || "").trim();

    const currentUser = (window.auth && window.auth.currentUser) ? window.auth.currentUser : null;
    const myUid = currentUser ? String(currentUser.uid || "") : "";
    const ownerId = String(listing.ownerId || "");
    const isOwner = (myUid && ownerId && myUid === ownerId);

    let tourButtonHtml = "";
    if (tourLink) {
      tourButtonHtml =
        '<button class="btn btn-ghost btn-sm js-video-tour" type="button" data-tour-link="' +
        escapeHtml(tourLink) + '">Video tour</button>';
    } else if (isOwner) {
      tourButtonHtml =
        '<button class="btn btn-ghost btn-sm js-start-tour" type="button">Start video tour</button>';
    } else {
      tourButtonHtml =
        '<button class="btn btn-ghost btn-sm" type="button" disabled>' + WAITING_3_WORDS + '</button>';
    }

    const photo = firstPhoto(listing);
    const imgHtml = photo
      ? '<img class="home-img-img" src="' + escapeHtml(photo) + '" alt="' + escapeHtml(alt) + '" loading="lazy" />'
      : '<div class="home-img-img" aria-label="Photo unavailable"></div>';

    const heart = isFav ? "❤️" : "♡";

    return (
      '<article class="home-card" data-listing-card data-id="' + escapeHtml(listing.id) + '">' +
        '<a class="home-img" href="' + listingHref + '" aria-label="Open listing">' +
          imgHtml +
        '</a>' +
        '<div class="home-body">' +
          '<div class="home-top">' +
            '<div class="home-price">' + formatMoney(listing.price) + '</div>' +
            '<button class="icon-btn" type="button" data-fav="' + escapeHtml(listing.id) + '" aria-label="Save">' +
              heart +
            '</button>' +
          '</div>' +
          '<div class="home-facts muted">' + detailsLine + '</div>' +
          '<div class="home-addr">' +
            escapeHtml(listing.address) + ', ' + escapeHtml(listing.city) + ', ' + escapeHtml(listing.state) +
          '</div>' +
          '<div class="home-actions">' +
            tourButtonHtml +
            '<a class="btn btn-primary btn-sm" href="' + listingHref + '">Details</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  // ----- Map -----
  let leafletMap = null;
  let marker = null;

  function closeMapPanel() {
    if (mapPanel) mapPanel.classList.add("is-hidden");
  }

  function openMapPanel(listing) {
    if (!mapPanel || !mapContainer) return;

    mapPanel.classList.remove("is-hidden");

    if (mapSubEl) {
      mapSubEl.textContent = String(listing.city || "") + ", " + String(listing.state || "");
    }

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (!isFinite(lat) || !isFinite(lng)) return;

    if (!leafletMap) {
      leafletMap = L.map(mapContainer).setView([lat, lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(leafletMap);
    } else {
      leafletMap.setView([lat, lng], 13);
    }

    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(leafletMap);

    setTimeout(function () {
      leafletMap.invalidateSize();
    }, 120);
  }

  if (mapCloseBtn) mapCloseBtn.addEventListener("click", closeMapPanel);

  // ----- Data load -----
  async function loadListings() {
    if (window.db) {
      const snap = await window.db.collection("listings").get();
      const out = [];
      snap.forEach(function (doc) {
        const d = doc.data();
        if (d) {
          if (!d.id) d.id = doc.id;
          out.push(d);
        }
      });
      return out;
    } else {
      const res = await fetch("data/listings.json", { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.listings)) return json.listings;
      return [];
    }
  }

  // ----- Filtering + sorting -----
  function applyFilters(listings, query) {
    let out = listings.slice();

    // Mode
    out = out.filter(function (l) {
      return String(l.mode || "buy") === String(query.mode || "buy");
    });

    // Search
    out = out.filter(function (l) {
      return includesQuery(l, query.q);
    });

    const minPrice = query.minPrice ? Number(query.minPrice) : null;
    const maxPrice = query.maxPrice ? Number(query.maxPrice) : null;

    if (minPrice !== null && isFinite(minPrice)) {
      out = out.filter(function (l) { return Number(l.price || 0) >= minPrice; });
    }
    if (maxPrice !== null && isFinite(maxPrice)) {
      out = out.filter(function (l) { return Number(l.price || 0) <= maxPrice; });
    }

    const minBeds = query.minBeds ? Number(query.minBeds) : null;
    if (minBeds !== null && isFinite(minBeds) && minBeds > 0) {
      out = out.filter(function (l) { return Number(l.beds || 0) >= minBeds; });
    }

    if (query.type) {
      out = out.filter(function (l) { return String(l.type || "") === String(query.type); });
    }

    // Sort values match results.html
    const sort = query.sort || "newest";
    if (sort === "price_asc") {
      out.sort(function (a, b) { return Number(a.price || 0) - Number(b.price || 0); });
    } else if (sort === "price_desc") {
      out.sort(function (a, b) { return Number(b.price || 0) - Number(a.price || 0); });
    } else if (sort === "sqft_desc") {
      out.sort(function (a, b) { return Number(b.sqft || 0) - Number(a.sqft || 0); });
    } else if (sort === "newest") {
      out.sort(function (a, b) {
        const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : Number(a.createdAt || 0);
        const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : Number(b.createdAt || 0);
        return tb - ta;
      });
    }

    return out;
  }

  function render(listings, query) {
    if (!listingGrid || !emptyStateCard) return;

    if (headlineEl) {
      const mode = String(query.mode || "buy");
      if (mode === "rent") headlineEl.textContent = "Rent homes";
      else if (mode === "mortgage") headlineEl.textContent = "Mortgage";
      else headlineEl.textContent = "Buy homes";
    }

    if (subheadEl) {
      subheadEl.textContent = listings.length + " result" + (listings.length === 1 ? "" : "s");
    }

    if (listings.length === 0) {
      emptyStateCard.style.display = "block";
      listingGrid.innerHTML = "";
      return;
    } else {
      emptyStateCard.style.display = "none";
    }

    listingGrid.innerHTML = listings.map(renderListingCard).join("");
  }

  function setFormFromQuery(query) {
    if (searchInput) searchInput.value = query.q || "";

    if (minPriceInput) minPriceInput.value = query.minPrice || "";
    if (maxPriceInput) maxPriceInput.value = query.maxPrice || "";
    if (minBedsSelect) minBedsSelect.value = query.minBeds || "";
    if (typeSelect) typeSelect.value = query.type || "";
    if (sortSelect) sortSelect.value = query.sort || "newest";
  }

  function collectQueryFromForm(current) {
    const out = Object.assign({}, current);

    out.q = searchInput ? String(searchInput.value || "").trim() : (current.q || "");

    out.minPrice = minPriceInput ? String(minPriceInput.value || "").trim() : "";
    out.maxPrice = maxPriceInput ? String(maxPriceInput.value || "").trim() : "";
    out.minBeds = minBedsSelect ? String(minBedsSelect.value || "").trim() : "";
    out.type = typeSelect ? String(typeSelect.value || "").trim() : "";
    out.sort = sortSelect ? String(sortSelect.value || "newest") : "newest";

    return out;
  }

  // ----- Event handlers -----
  if (filtersToggleBtn && filtersCard) {
    filtersToggleBtn.addEventListener("click", function () {
      filtersCard.classList.toggle("is-collapsed");
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const current = parseQuery();
      const next = collectQueryFromForm(current);
      setQuery(next);
      run();
    });
  }

  if (filtersApplyBtn) {
    filtersApplyBtn.addEventListener("click", function () {
      const current = parseQuery();
      const next = collectQueryFromForm(current);
      setQuery(next);
      run();
    });
  }

  if (filtersResetBtn) {
    filtersResetBtn.addEventListener("click", function () {
      const current = parseQuery();
      const next = {
        q: current.q || "",
        mode: current.mode || "buy",
        minPrice: "",
        maxPrice: "",
        minBeds: "",
        type: "",
        sort: "newest",
      };
      setFormFromQuery(next);
      setQuery(next);
      run();
    });
  }

  // Card interactions
  if (listingGrid) {
    listingGrid.addEventListener("click", function (e) {
      var startBtn = e.target.closest(".js-start-tour");
      if (startBtn) {
        e.preventDefault();
        e.stopPropagation();
        openTourModal("https://meet.google.com/new");
        return;
      }

      var tourBtn = e.target.closest(".js-video-tour");
      if (tourBtn) {
        e.preventDefault();
        e.stopPropagation();
        var url = String(tourBtn.getAttribute("data-tour-link") || "").trim();
        if (!url) return;
        openTourModal(url);
        return;
      }

      const favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = String(favBtn.getAttribute("data-fav") || "").trim();
        if (!id) return;

        if (typeof Favorites !== "undefined" && Favorites.toggle) {
          Favorites.toggle(id);
          Favorites.renderFavCount();
          run(false);
        }
        return;
      }

      const card = e.target.closest("[data-listing-card]");
      if (card && e.target.closest("a.home-img") === null && e.target.closest("a.btn") === null) {
        const id = String(card.getAttribute("data-id") || "").trim();
        if (!id) return;

        const current = window.__VB_RESULTS__ || [];
        const listing = current.find(function (l) { return String(l.id) === id; });

        if (listing && listing.lat && listing.lng && mapPanel) {
          openMapPanel(listing);
        }
      }
    });
  }

  // ----- Main run -----
  async function run(scrollToTop) {
    if (scrollToTop === undefined) scrollToTop = true;

    const query = parseQuery();
    setFormFromQuery(query);

    const all = await loadListings();
    const filtered = applyFilters(all, query);

    window.__VB_RESULTS__ = filtered;
    render(filtered, query);

    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  await waitForAuthReady();
  await run();

  if (window.auth && typeof window.auth.onAuthStateChanged === "function") {
    window.auth.onAuthStateChanged(function () {
      run(false);
    });
  }

})();
