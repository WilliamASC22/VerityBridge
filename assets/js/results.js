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
  const filtersToggleBtn = document.getElementById("filtersToggle");
  const filtersApplyBtn = document.getElementById("applyFilters");
  const filtersResetBtn = document.getElementById("resetFilters");

  const modeTabs = document.querySelectorAll("[data-mode-tab]");
  const modeHiddenInput = document.getElementById("modeHidden");

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
      // Fallback if modal is missing
      window.open(url, "_blank");
      return;
    }

    pendingTourUrl = String(url || "").trim();
    if (!pendingTourUrl) {
      return;
    }

    vbModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeTourModal() {
    if (!vbModal) {
      return;
    }
    vbModal.classList.remove("is-open");
    document.body.style.overflow = "";
    pendingTourUrl = "";
  }

  if (vbCancel) {
    vbCancel.addEventListener("click", function () {
      closeTourModal();
    });
  }

  if (vbModal) {
    vbModal.addEventListener("click", function (e) {
      if (e.target === vbModal) {
        closeTourModal();
      }
    });
  }

  if (vbOk) {
    vbOk.addEventListener("click", function () {
      const url = pendingTourUrl;
      closeTourModal();
      if (url) {
        window.open(url, "_blank");
      }
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeTourModal();
    }
  });

  // Map panel
  const mapPanel = document.getElementById("mapPanel");
  const mapCloseBtn = document.getElementById("mapClose");
  const mapTitleEl = document.getElementById("mapTitle");
  const mapSubEl = document.getElementById("mapSub");
  const mapContainer = document.getElementById("map");

  // Load favorites count pill
  if (typeof Favorites !== "undefined" && Favorites.renderFavCount) {
    Favorites.renderFavCount();
  }

  // Helpers
  function parseQuery() {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    const mode = params.get("mode") || "buy";

    const minPrice = params.get("minPrice") || "";
    const maxPrice = params.get("maxPrice") || "";
    const minBeds = params.get("minBeds") || "";
    const type = params.get("type") || "";
    const sort = params.get("sort") || "relevance";

    return {
      q,
      mode,
      minPrice,
      maxPrice,
      minBeds,
      type,
      sort,
    };
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

  function normalize(s) {
    return String(s || "").trim().toLowerCase();
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

  function jitsiRoomForListing(listingId) {
    // legacy helper (kept for backwards compatibility)
    const safe = String(listingId || "").replaceAll(" ", "-");
    return "Veritybridge-" + safe;
  }

  function firstPhoto(listing) {
    if (!listing) return "";
    if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      if (listing.photos[0]) {
        return listing.photos[0];
      }
    }
    return "";
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
    }
    else if (isOwner) {
      tourButtonHtml =
        '<button class="btn btn-ghost btn-sm js-start-tour" type="button">Start video tour</button>';
    }
    else {
      tourButtonHtml =
        '<button class="btn btn-ghost btn-sm" type="button" disabled>Waiting for seller</button>';
    }

    const photo = firstPhoto(listing);
    let imgHtml = "";

    if (photo) {
      imgHtml =
        '<img class="home-img-img" src="' + escapeHtml(photo) + '" alt="' + escapeHtml(alt) + '" loading="lazy" />';
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
      '<article class="home-card" data-listing-card data-id="' +
        escapeHtml(listing.id) + '">' +
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
            tourButtonHtml +
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
  }

  function openMapPanel(listing) {
    if (!mapPanel || !mapContainer) return;

    mapPanel.classList.remove("is-hidden");

    if (mapTitleEl) {
      mapTitleEl.textContent = String(listing.address || "Listing");
    }
    if (mapSubEl) {
      mapSubEl.textContent = String(listing.city || "") + ", " + String(listing.state || "");
    }

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);

    if (!leafletMap) {
      leafletMap = L.map(mapContainer).setView([lat, lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(leafletMap);
    }
    else {
      leafletMap.setView([lat, lng], 13);
    }

    if (marker) {
      marker.remove();
      marker = null;
    }

    marker = L.marker([lat, lng]).addTo(leafletMap);

    // Fix: map needs a resize after opening panel
    setTimeout(function () {
      leafletMap.invalidateSize();
    }, 120);
  }

  if (mapCloseBtn) {
    mapCloseBtn.addEventListener("click", function () {
      closeMapPanel();
    });
  }

  // ----- Data load -----
  async function loadListings() {
    // Prefer Firestore if present; otherwise fall back to local JSON
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
    }
    else {
      const res = await fetch("data/listings.json", { cache: "no-store" });
      const json = await res.json();
      if (json && Array.isArray(json)) {
        return json;
      }
      if (json && Array.isArray(json.listings)) {
        return json.listings;
      }
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

    // Min/Max price
    const minPrice = query.minPrice ? Number(query.minPrice) : null;
    const maxPrice = query.maxPrice ? Number(query.maxPrice) : null;

    if (minPrice !== null && isFinite(minPrice)) {
      out = out.filter(function (l) {
        return Number(l.price || 0) >= minPrice;
      });
    }

    if (maxPrice !== null && isFinite(maxPrice)) {
      out = out.filter(function (l) {
        return Number(l.price || 0) <= maxPrice;
      });
    }

    // Min beds
    const minBeds = query.minBeds ? Number(query.minBeds) : null;
    if (minBeds !== null && isFinite(minBeds) && minBeds > 0) {
      out = out.filter(function (l) {
        return Number(l.beds || 0) >= minBeds;
      });
    }

    // Type
    if (query.type) {
      out = out.filter(function (l) {
        return String(l.type || "") === String(query.type);
      });
    }

    // Sort
    const sort = query.sort || "relevance";
    if (sort === "priceLow") {
      out.sort(function (a, b) {
        return Number(a.price || 0) - Number(b.price || 0);
      });
    }
    else if (sort === "priceHigh") {
      out.sort(function (a, b) {
        return Number(b.price || 0) - Number(a.price || 0);
      });
    }
    else if (sort === "newest") {
      out.sort(function (a, b) {
        const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : Number(a.createdAt || 0);
        const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : Number(b.createdAt || 0);
        return tb - ta;
      });
    }
    // relevance = keep order

    return out;
  }

  function render(listings, query) {
    if (!listingGrid || !emptyStateCard) {
      return;
    }

    if (headlineEl) {
      const mode = query.mode || "buy";
      if (mode === "rent") headlineEl.textContent = "Rent homes";
      else if (mode === "mortgage") headlineEl.textContent = "Mortgage options";
      else headlineEl.textContent = "Buy homes";
    }

    if (subheadEl) {
      const count = listings.length;
      subheadEl.textContent = count + " result" + (count === 1 ? "" : "s");
    }

    if (listings.length === 0) {
      emptyStateCard.style.display = "block";
      listingGrid.innerHTML = "";
      return;
    }
    else {
      emptyStateCard.style.display = "none";
    }

    const html = listings.map(function (l) {
      return renderListingCard(l);
    });

    listingGrid.innerHTML = html.join("");
  }

  function setFormFromQuery(query) {
    if (searchInput) searchInput.value = query.q || "";
    if (modeHiddenInput) modeHiddenInput.value = query.mode || "buy";

    if (minPriceInput) minPriceInput.value = query.minPrice || "";
    if (maxPriceInput) maxPriceInput.value = query.maxPrice || "";
    if (minBedsSelect) minBedsSelect.value = query.minBeds || "";
    if (typeSelect) typeSelect.value = query.type || "";
    if (sortSelect) sortSelect.value = query.sort || "relevance";

    // Tabs
    if (modeTabs && modeTabs.length) {
      modeTabs.forEach(function (btn) {
        const m = btn.getAttribute("data-mode-tab");
        if (m === (query.mode || "buy")) {
          btn.classList.add("is-active");
        }
        else {
          btn.classList.remove("is-active");
        }
      });
    }
  }

  function collectQueryFromForm(current) {
    const out = Object.assign({}, current);

    out.q = searchInput ? String(searchInput.value || "").trim() : (current.q || "");
    out.mode = modeHiddenInput ? String(modeHiddenInput.value || "buy") : (current.mode || "buy");

    out.minPrice = minPriceInput ? String(minPriceInput.value || "").trim() : "";
    out.maxPrice = maxPriceInput ? String(maxPriceInput.value || "").trim() : "";
    out.minBeds = minBedsSelect ? String(minBedsSelect.value || "").trim() : "";
    out.type = typeSelect ? String(typeSelect.value || "").trim() : "";
    out.sort = sortSelect ? String(sortSelect.value || "relevance") : "relevance";

    return out;
  }

  // ----- Event handlers -----
  if (filtersToggleBtn && filtersCard) {
    filtersToggleBtn.addEventListener("click", function () {
      filtersCard.classList.toggle("is-collapsed");
    });
  }

  if (modeTabs && modeTabs.length && modeHiddenInput) {
    modeTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const mode = btn.getAttribute("data-mode-tab") || "buy";
        modeHiddenInput.value = mode;

        // Update active tab UI
        modeTabs.forEach(function (b2) {
          b2.classList.remove("is-active");
        });
        btn.classList.add("is-active");

        // Apply
        const current = parseQuery();
        const next = collectQueryFromForm(current);
        next.mode = mode;
        setQuery(next);
        run();
      });
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
        sort: "relevance",
      };

      setFormFromQuery(next);
      setQuery(next);
      run();
    });
  }

  // Card interactions: favorites, map, and video tours
  if (listingGrid) {
    listingGrid.addEventListener("click", function (e) {
      var startBtn = e.target.closest(".js-start-tour");
      if (startBtn) {
        e.preventDefault();
        e.stopPropagation();
        openTourModal("https://meet.google.com/new");
        return;
      }

      // Video tour (custom modal)
      var tourBtn = e.target.closest(".js-video-tour");
      if (tourBtn) {
        e.preventDefault();
        e.stopPropagation();

        var url = "";
        if (tourBtn.getAttribute("data-tour-link")) {
          url = String(tourBtn.getAttribute("data-tour-link") || "").trim();
        }
        else if (tourBtn.href) {
          url = String(tourBtn.href || "").trim();
        }

        if (!url) {
          return;
        }

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
        // Click card body -> open map panel if listing has coords
        const id = String(card.getAttribute("data-id") || "").trim();
        if (!id) return;

        // Find listing in current render (cheap search)
        const current = window.__VB_RESULTS__ || [];
        const listing = current.find(function (l) {
          return String(l.id) === id;
        });

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

    // Keep for click handlers (map)
    window.__VB_RESULTS__ = filtered;

    render(filtered, query);

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Start
  run();

})();
