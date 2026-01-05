(async function () {

  // Wait for favorites/auth to initialize
  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
  }

  if (typeof Favorites !== "undefined" && Favorites.renderFavCount) {
    Favorites.renderFavCount();
  }

  function vbConfirmVideoTour(onOk) {
    var overlay = document.getElementById("vbModal");
    var cancelBtn = document.getElementById("vbCancel");
    var okBtn = document.getElementById("vbOk");

    if (!overlay || !cancelBtn || !okBtn) {
      var ok = confirm("Open video tour in a new tab?");
      if (ok) {
        onOk();
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

  // Get listing id from the URL: .../listing.html?id=123
  var url = new URL(location.href);
  var listingId = url.searchParams.get("id");

  // Grab DOM elements
  var titleEl = document.getElementById("listingTitle");
  var subtitleEl = document.getElementById("listingSubtitle");
  var priceEl = document.getElementById("listingPrice");
  var factsEl = document.getElementById("listingFacts");
  var descEl = document.getElementById("listingDescription");
  var overviewGrid = document.getElementById("overviewGrid");

  var saveBtn = document.getElementById("saveBtn");
  var videoBtn = document.getElementById("videoBtn");

  var heroPhoto = document.getElementById("heroPhoto");
  var thumbs = document.getElementById("thumbs");
  var prevPhotoBtn = document.getElementById("prevPhoto");
  var nextPhotoBtn = document.getElementById("nextPhoto");

  var requestForm = document.getElementById("requestForm");

  // Map elements (Location card)
  var mapCard = document.getElementById("listingMapCard");
  var mapEl = document.getElementById("listingMap");

  // Gallery state
  var photoUrls = [];
  var activeIndex = 0;

  function safeString(x) {
    if (x === null || x === undefined) {
      return "";
    }
    else {
      return String(x);
    }
  }

  function escapeHtml(s) {
    var text = safeString(s);

    if (typeof App !== "undefined" && typeof App.escape === "function") {
      return App.escape(text);
    }
    else {
      return text;
    }
  }

  function formatMoney(n) {
    if (typeof App !== "undefined" && typeof App.money === "function") {
      return App.money(n);
    }
    else {
      var v = Number(n || 0);
      return "$" + v.toLocaleString();
    }
  }

  function formatNumber(n) {
    if (typeof App !== "undefined" && typeof App.num === "function") {
      return App.num(n);
    }
    else {
      var v2 = Number(n || 0);
      return v2.toLocaleString();
    }
  }

  function placeholderDataUrl(text) {
    var t = safeString(text);

    var safe = t;
    if (!safe) {
      safe = "Photo unavailable";
    }

    safe = safe.slice(0, 60);

    var svg =
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
        '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"' +
              ' font-family="Arial" font-size="44" fill="#6b7280">' + safe + "</text>" +
      "</svg>";

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function isHttpUrl(s) {
    var x = String(s || "").trim();
    return (x.indexOf("https://") === 0 || x.indexOf("http://") === 0);
  }

  function getCurrentUser() {
    try {
      if (window.auth && window.auth.currentUser) {
        return window.auth.currentUser;
      }
    } catch (_) {}
    return null;
  }

  function isSellerForListing(listing) {
    var u = getCurrentUser();
    if (!u || !u.uid) {
      return false;
    }
    if (!listing || !listing.ownerId) {
      return false;
    }
    return String(u.uid) === String(listing.ownerId);
  }

  function setHero(index) {
    if (!heroPhoto) {
      return;
    }
    if (!photoUrls.length) {
      return;
    }

    if (index < 0) {
      index = photoUrls.length - 1;
    }
    else if (index >= photoUrls.length) {
      index = 0;
    }

    activeIndex = index;
    heroPhoto.src = photoUrls[activeIndex];

    if (thumbs) {
      var all = thumbs.querySelectorAll("button");
      for (var i = 0; i < all.length; i = i + 1) {
        all[i].classList.remove("active");
      }
      if (all[activeIndex]) {
        all[activeIndex].classList.add("active");
      }
    }
  }

  function renderThumbs() {
    if (!thumbs) {
      return;
    }

    var html = [];
    for (var i = 0; i < photoUrls.length; i = i + 1) {
      var src = photoUrls[i];
      html.push(
        '<button class="thumb" type="button" data-i="' + String(i) + '">' +
          '<img src="' + src + '" alt="Thumbnail" />' +
        "</button>"
      );
    }

    thumbs.innerHTML = html.join("");

    thumbs.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-i]");
      if (!btn) {
        return;
      }
      var idx = Number(btn.getAttribute("data-i")) || 0;
      setHero(idx);
    });
  }

  if (prevPhotoBtn) {
    prevPhotoBtn.addEventListener("click", function () {
      setHero(activeIndex - 1);
    });
  }

  if (nextPhotoBtn) {
    nextPhotoBtn.addEventListener("click", function () {
      setHero(activeIndex + 1);
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      setHero(activeIndex - 1);
    }
    if (e.key === "ArrowRight") {
      setHero(activeIndex + 1);
    }
  });

  // Load listing
  var allListings = await Data.loadListings();

  var listing = null;
  for (var j = 0; j < allListings.length; j = j + 1) {
    if (allListings[j].id === listingId) {
      listing = allListings[j];
      break;
    }
  }

  if (!listing) {
    if (titleEl) {
      titleEl.textContent = "Listing not found";
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Try going back to results.";
    }
    if (mapCard) {
      mapCard.style.display = "none";
    }
    return;
  }

  if (requestForm) {
    requestForm.dataset.sellerEmail = String(listing.sellerEmail || "").trim();
  }

  // Top info
  if (titleEl) {
    titleEl.textContent = listing.address;
  }

  var neighborhood = listing.neighborhood;
  if (neighborhood === null || neighborhood === undefined) {
    neighborhood = "";
  }
  else {
    neighborhood = String(neighborhood);
  }

  if (subtitleEl) {
    subtitleEl.textContent =
      (listing.city + ", " + listing.state + " " + listing.zip + " • " + neighborhood).trim();
  }

  if (priceEl) {
    priceEl.textContent = formatMoney(listing.price);
  }

  if (factsEl) {
    factsEl.textContent =
      listing.beds +
      " bd • " +
      listing.baths +
      " ba • " +
      formatNumber(listing.sqft) +
      " sqft • " +
      listing.type;
  }

  if (descEl) {
    if (listing.description) {
      descEl.textContent = listing.description;
    }
    else {
      descEl.textContent = "No description provided yet.";
    }
  }

  if (overviewGrid) {
    var lotDisplay = "—";
    if (typeof listing.lotSqft === "number" && listing.lotSqft > 0) {
      lotDisplay = formatNumber(listing.lotSqft) + " sqft";
    }

    var hoaDisplay = listing.hoa;
    if (hoaDisplay === null || hoaDisplay === undefined) {
      hoaDisplay = "—";
    }
    else if (typeof hoaDisplay === "number") {
      hoaDisplay = formatMoney(hoaDisplay);
    }
    else {
      hoaDisplay = String(hoaDisplay);
    }

    var taxesDisplay = listing.taxes;
    if (taxesDisplay === null || taxesDisplay === undefined) {
      taxesDisplay = "—";
    }
    else if (typeof taxesDisplay === "number") {
      taxesDisplay = formatMoney(taxesDisplay);
    }
    else {
      taxesDisplay = String(taxesDisplay);
    }

    var overviewItems = [
      ["Type", listing.type],
      ["Year built", listing.yearBuilt || "—"],
      ["Lot", lotDisplay],
      ["Parking", listing.parking || "—"],
      ["HOA", hoaDisplay],
      ["Taxes", taxesDisplay]
    ];

    var tiles = [];
    for (var k = 0; k < overviewItems.length; k = k + 1) {
      var pair = overviewItems[k];
      tiles.push(
        '<div class="info-tile">' +
          '<div class="info-label">' + escapeHtml(pair[0]) + "</div>" +
          '<div class="info-value">' + escapeHtml(String(pair[1])) + "</div>" +
        "</div>"
      );
    }

    overviewGrid.innerHTML = tiles.join("");
  }

  // Favorites
  function syncSaveBtn() {
    if (!saveBtn) {
      return;
    }
    if (typeof Favorites === "undefined" || !Favorites.has) {
      saveBtn.textContent = "♡ Save";
      return;
    }
    var on = Favorites.has(listing.id);
    saveBtn.textContent = on ? "❤️ Saved" : "♡ Save";
  }

  syncSaveBtn();

  if (saveBtn) {
    saveBtn.addEventListener("click", async function () {
      if (typeof Favorites === "undefined") {
        return;
      }
      if (Favorites.waitUntilReady) {
        await Favorites.waitUntilReady();
      }
      if (Favorites.ensureLoggedIn) {
        if (!Favorites.ensureLoggedIn()) {
          return;
        }
      }
      if (Favorites.toggle) {
        var res = await Favorites.toggle(listing.id);
        if (res && res.ok) {
          Favorites.renderFavCount();
          syncSaveBtn();
        }
      }
    });
  }

  function applyVideoButton() {
    if (!videoBtn) {
      return;
    }

    var seller = isSellerForListing(listing);
    var tourLink = String(listing.tourLink || "").trim();

    // Reset visuals
    videoBtn.style.pointerEvents = "";
    videoBtn.style.opacity = "";
    videoBtn.style.cursor = "";
    videoBtn.removeAttribute("aria-disabled");
    videoBtn.title = "";

    if (tourLink && isHttpUrl(tourLink)) {
      // Link exists -> seller: Start, buyer: Join
      videoBtn.textContent = seller ? "Start video tour" : "Join video tour";
      videoBtn.href = tourLink;

      function openTour(e) {
        e.preventDefault();
        e.stopPropagation();

        vbConfirmVideoTour(function () {
          window.open(tourLink, "_blank");
        });

        return false;
      }

      videoBtn.addEventListener("mousedown", openTour);
      videoBtn.addEventListener("click", openTour);
      videoBtn.addEventListener("touchstart", openTour);
      return;
    }

    // No valid link yet
    if (seller) {
      // Seller can still start a meeting anywhere, we open Google Meet new as a helpful default.
      videoBtn.textContent = "Start video tour";
      videoBtn.href = "https://meet.google.com/new";

      function startTour(e) {
        e.preventDefault();
        e.stopPropagation();

        vbConfirmVideoTour(function () {
          window.open("https://meet.google.com/new", "_blank");
        });

        return false;
      }


      videoBtn.addEventListener("mousedown", startTour);
      videoBtn.addEventListener("click", startTour);
      videoBtn.addEventListener("touchstart", startTour);
    }
    else {
      // Buyer waits
      videoBtn.textContent = "Waiting for seller";
      videoBtn.href = "#";
      videoBtn.setAttribute("aria-disabled", "true");
      videoBtn.style.pointerEvents = "none";
      videoBtn.style.opacity = "0.65";
      videoBtn.style.cursor = "not-allowed";
      videoBtn.title = "The seller has not added a tour link yet.";
    }
  }

  applyVideoButton();

  // If auth loads after page render, update label for seller vs buyer
  try {
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged(function () {
        applyVideoButton();
      });
    }
  } catch (_) {}

  // Gallery images
  photoUrls = (listing.photos || []).filter(function (x) {
    return Boolean(x);
  });

  if (!photoUrls.length) {
    photoUrls = [placeholderDataUrl("Photo unavailable")];
  }

  renderThumbs();
  setHero(0);

  // Location map (Leaflet)
  function hasCoords(l) {
    if (!l) {
      return false;
    }
    if (typeof l.lat !== "number") {
      return false;
    }
    if (typeof l.lng !== "number") {
      return false;
    }
    return true;
  }

  if (!mapCard || !mapEl || typeof L === "undefined") {
    if (mapCard) {
      mapCard.style.display = "none";
    }
  }
  else if (!hasCoords(listing)) {
    mapCard.style.display = "none";
  }
  else {
    var listingMap = L.map("listingMap", {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([listing.lat, listing.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(listingMap);

    var marker = L.marker([listing.lat, listing.lng]).addTo(listingMap);

    marker.bindPopup(
      '<div style="font-weight:900">' + escapeHtml(listing.address) + "</div>" +
      '<div style="color:#6b7280;font-size:12px">' +
        escapeHtml(listing.city) + ", " + escapeHtml(listing.state) + " " + escapeHtml(listing.zip) +
      "</div>"
    );

    setTimeout(function () {
      listingMap.invalidateSize();
      marker.openPopup();
    }, 80);
  }

  if (requestForm) {
    requestForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      var sellerEmail =
        document.getElementById("requestForm")?.dataset?.sellerEmail?.trim() || "";

      if (!sellerEmail) {
        openMailErrorModal("Seller email isn’t available for this listing yet.");
        return;
      }

      // Add buyer email if logged in
      var buyerEmail = "";
      try {
        var u = getCurrentUser();
        if (u && u.email) {
          buyerEmail = String(u.email);
        }
      } catch (_) {
        buyerEmail = "";
      }

      var details =
        "Tour request (VerityBridge)\n\n" +
        "Address: " + String(listing.address || "") + ", " +
                     String(listing.city || "") + ", " +
                     String(listing.state || "") + " " +
                     String(listing.zip || "") + "\n" +
        (buyerEmail ? ("Buyer email: " + buyerEmail + "\n") : "") +
        "\nMessage:\nHi! I’m interested in this property. Is it available for a tour this week?\n";

      var copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(details);
          copied = true;
        }
      } catch (_) {
        copied = false;
      }

      openMailModal(sellerEmail, copied);
    });
  }

  function openMailModal(email, copied) {
    const overlay = document.getElementById("vbMailModal");
    const copyLine = overlay.querySelector(".vb-mail-copyline");

    if (copied) {
      copyLine.textContent = "Your message was copied to the clipboard. Paste it into the email body.";
    } else {
      copyLine.textContent =
        "Couldn’t auto-copy (browser blocked clipboard). Please copy your message manually, then paste it into the email body.";
    }

    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");

    overlay.querySelector(".mail-cancel").onclick = function () {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    overlay.querySelector(".mail-open").onclick = function () {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      window.location.href = "mailto:" + email;
    };
  }

  function openMailErrorModal(message) {
    const overlay = document.getElementById("vbMailErrorModal");
    overlay.querySelector(".vb-mail-err-text").textContent = message;

    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");

    overlay.querySelector(".mail-err-close").onclick = function () {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    };
  }

})();
