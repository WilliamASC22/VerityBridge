(async function () {

  // Wait for favorites/auth to initialize
  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
  }

  if (typeof Favorites !== "undefined" && Favorites.renderFavCount) {
    Favorites.renderFavCount();
  }

  // ---------- Nice modal confirm (instead of browser confirm) ----------
  function vbConfirmVideoTour(onOk) {
    var overlay = document.getElementById("vbModal");
    var cancelBtn = document.getElementById("vbCancel");
    var okBtn = document.getElementById("vbOk");

    if (!overlay || !cancelBtn || !okBtn) {
      // fallback if modal not present
      var msg =
        "This will open a live video tour in a new tab.\n\n" +
        "You may be asked to allow camera and microphone access.\n\n" +
        "Continue";

      var ok = confirm(msg);

      if (ok) {
        onOk();
      }
      else {
        // do nothing
      }

      return;
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    function openModal() {
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function cleanup() {
      cancelBtn.removeEventListener("click", onCancel);
      okBtn.removeEventListener("click", onAccept);
      overlay.removeEventListener("click", onOverlay);
      window.removeEventListener("keydown", onKey);
    }

    function onCancel() {
      cleanup();
      closeModal();
    }

    function onAccept() {
      cleanup();
      closeModal();
      onOk();
    }

    function onOverlay(e) {
      if (e.target === overlay) {
        onCancel();
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        onCancel();
      }
    }

    cancelBtn.addEventListener("click", onCancel);
    okBtn.addEventListener("click", onAccept);
    overlay.addEventListener("click", onOverlay);
    window.addEventListener("keydown", onKey);

    openModal();
  }

  // DOM refs
  var searchForm = document.getElementById("resultsSearch");
  var searchInput = document.getElementById("q");

  var filtersCard = document.getElementById("filtersCard");
  var applyFiltersButton = document.getElementById("apply");
  var resetFiltersButton = document.getElementById("reset");

  var minPriceInput = document.getElementById("minPrice");
  var maxPriceInput = document.getElementById("maxPrice");
  var minBedsSelect = document.getElementById("minBeds");
  var typeSelect = document.getElementById("type");
  var sortSelect = document.getElementById("sort");

  var headlineEl = document.getElementById("headline");
  var subheadEl = document.getElementById("subhead");

  var emptyStateCard = document.getElementById("empty");
  var listingGrid = document.getElementById("grid");

  // Map panel
  var mapPanel = document.getElementById("mapPanel");
  var mapSubtitle = document.getElementById("mapSubtitle");
  var closeMapButton = document.getElementById("closeMap");

  // Sell/Mortgage panel
  var modePanel = document.getElementById("modePanel");
  var modeTitle = document.getElementById("modeTitle");
  var modeDesc = document.getElementById("modeDesc");
  var modeCallBtn = document.getElementById("modeCallBtn");

  // URL + mode
  var url = new URL(location.href);

  var mode = url.searchParams.get("mode");
  if (!mode) {
    mode = "buy";
  }
  mode = String(mode).toLowerCase();

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
      var v = Number(n || 0);
      return "$" + v.toLocaleString();
    }
  }

  function formatNumber(n) {
    if (typeof App !== "undefined" && App.num) {
      return App.num(n);
    }
    else {
      var v2 = Number(n || 0);
      return v2.toLocaleString();
    }
  }

  function listingMode(l) {
    var raw = "";
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
    if (!q) {
      return true;
    }

    var hay =
      String(listing.address || "") + " " +
      String(listing.city || "") + " " +
      String(listing.state || "") + " " +
      String(listing.zip || "");

    return hay.toLowerCase().includes(String(q).toLowerCase());
  }

  function passesNumericFilters(listing) {
    var minPrice = 0;
    var maxPrice = 0;
    var minBeds = 0;

    if (minPriceInput && minPriceInput.value) {
      minPrice = Number(minPriceInput.value) || 0;
    }
    if (maxPriceInput && maxPriceInput.value) {
      maxPrice = Number(maxPriceInput.value) || 0;
    }
    if (minBedsSelect && minBedsSelect.value) {
      minBeds = Number(minBedsSelect.value) || 0;
    }

    var typeVal = "";
    if (typeSelect && typeSelect.value) {
      typeVal = String(typeSelect.value);
    }

    var price = Number(listing.price || 0) || 0;
    var beds = Number(listing.beds || 0) || 0;

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
    var sortVal = "newest";
    if (sortSelect && sortSelect.value) {
      sortVal = String(sortSelect.value);
    }

    var copy = list.slice();

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
    var isFav = false;

    if (typeof Favorites !== "undefined" && Favorites.has) {
      if (Favorites.has(listing.id)) {
        isFav = true;
      }
      else {
        isFav = false;
      }
    }

    var alt = String(listing.address || "") + ", " + String(listing.city || "");

    var detailsLine =
      String(listing.beds || 0) + " bd • " +
      String(listing.baths || 0) + " ba • " +
      formatNumber(listing.sqft) + " sqft • " +
      escapeHtml(listing.type || "");

    var listingHref = "listing.html?id=" + encodeURIComponent(listing.id);
    var callHref = "https://meet.jit.si/" + encodeURIComponent(jitsiRoomForListing(listing.id));

    var photo = firstPhoto(listing);
    var imgHtml = "";

    if (photo) {
      imgHtml =
        '<img class="home-img-img" src="' + photo + '" alt="' + escapeHtml(alt) + '" loading="lazy" />';
    }
    else {
      imgHtml =
        '<div class="home-img-img" aria-label="Photo unavailable"></div>';
    }

    var heart = "♡";
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
            '<a class="btn btn-ghost btn-sm videoBtn" href="' + callHref + '" rel="noreferrer">Video tour</a>' +
            '<a class="btn btn-primary btn-sm" href="' + listingHref + '">Details</a>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  // Same behavior as listing.js: ask before opening Jitsi
  function attachVideoTourHandlers() {
    var buttons = document.querySelectorAll(".videoBtn");

    for (var i = 0; i < buttons.length; i = i + 1) {
      var btn = buttons[i];

      if (btn.getAttribute("data-video-bound") === "1") {
        continue;
      }
      btn.setAttribute("data-video-bound", "1");

      function openVideoTour(e) {
        e.preventDefault();
        e.stopPropagation();

        var link = this;

        vbConfirmVideoTour(function () {
          window.open(link.href, "_blank");
        });

        return false;
      }

      btn.addEventListener("mousedown", openVideoTour);
      btn.addEventListener("click", openVideoTour);
      btn.addEventListener("touchstart", openVideoTour);
    }
  }

  // ----- Map -----
  var leafletMap = null;
  var marker = null;

  function closeMapPanel() {
    if (mapPanel) {
      mapPanel.classList.add("is-hidden");
    }

    var layout = document.querySelector(".results-layout");
    if (layout) {
      layout.classList.remove("map-open");
    }
  }

  function openMapPanel() {
    if (mapPanel) {
      mapPanel.classList.remove("is-hidden");
    }

    var layout2 = document.querySelector(".results-layout");
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

      var q = "";
      if (searchInput && searchInput.value) {
        q = String(searchInput.value).trim();
      }
      else {
        q = "";
      }

      var u = new URL(location.href);

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
  var allListings = await Data.loadListings();

  // Favorites toggle + map-on-card click
  if (listingGrid) {
    listingGrid.addEventListener("click", async function (e) {
      var favButton = e.target.closest("[data-fav]");
      if (favButton) {
        e.preventDefault();
        e.stopPropagation();

        var id = favButton.getAttribute("data-fav");

        if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
          await Favorites.waitUntilReady();
        }

        if (typeof Favorites !== "undefined" && Favorites.ensureLoggedIn) {
          if (!Favorites.ensureLoggedIn()) {
            return;
          }
        }

        if (typeof Favorites !== "undefined" && Favorites.toggle) {
          var res = await Favorites.toggle(id);

          if (res && res.ok) {
            if (Favorites.has(id)) {
              favButton.textContent = "❤️";
            }
            else {
              favButton.textContent = "♡";
            }

            Favorites.renderFavCount();
          }
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

      var listingCard = e.target.closest("[data-listing-card]");
      if (!listingCard) {
        return;
      }

      var listingId = listingCard.getAttribute("data-id");

      var listing = allListings.find(function (x) {
        return x.id === listingId;
      });

      if (listing) {
        showListingOnMap(listing);
      }
    });
  }

  function setActiveNav() {
    var ids = ["navBuy", "navRent", "navSell", "navMortgage"];

    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.classList.remove("active");
      }
    });

    var activeId = "navBuy";
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

    var activeEl = document.getElementById(activeId);
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
    var q = "";
    if (searchInput && searchInput.value) {
      q = String(searchInput.value).trim();
    }
    else {
      q = "";
    }

    var inMode = allListings.filter(function (l) {
      return listingMode(l) === mode;
    });

    var filtered = inMode
      .filter(function (l) {
        return matchesSearch(l, q);
      })
      .filter(function (l) {
        return passesNumericFilters(l);
      });

    var sorted = sortListings(filtered);

    if (subheadEl) {
      var suffix = "s";
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
      var html = [];
      for (var i = 0; i < sorted.length; i = i + 1) {
        html.push(renderListingCard(sorted[i]));
      }
      listingGrid.innerHTML = html.join("");

      attachVideoTourHandlers();
    }
  }

  // Init
  setActiveNav();
  setHeadline();
  configureModePanels();
  closeMapPanel();
  render();

})();
