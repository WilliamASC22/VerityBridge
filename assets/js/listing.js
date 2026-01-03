(async function () {
  // If Favorites exists, update the little favorites counter
  if (typeof Favorites !== "undefined") {
    Favorites.renderFavCount();
  }

  // Get listing id from the URL: .../listing.html?id=123
  const url = new URL(location.href);
  const listingId = url.searchParams.get("id");

  // Grab DOM elements
  const titleEl = document.getElementById("listingTitle");
  const subtitleEl = document.getElementById("listingSubtitle");
  const priceEl = document.getElementById("listingPrice");
  const factsEl = document.getElementById("listingFacts");
  const descEl = document.getElementById("listingDescription");
  const overviewGrid = document.getElementById("overviewGrid");

  const saveBtn = document.getElementById("saveBtn");
  const videoBtn = document.getElementById("videoBtn");

  const heroPhoto = document.getElementById("heroPhoto");
  const thumbs = document.getElementById("thumbs");
  const prevPhotoBtn = document.getElementById("prevPhoto");
  const nextPhotoBtn = document.getElementById("nextPhoto");

  const requestForm = document.getElementById("requestForm");

  // Map elements (Location card)
  const mapCard = document.getElementById("listingMapCard");
  const mapEl = document.getElementById("listingMap");

  // --------------------------
  // Small helper functions
  // --------------------------
  function safeString(x) {
    if (x === null || x === undefined) {
      return "";
    }
    else {
      return String(x);
    }
  }

  function escapeHtml(s) {
    // If App.escape exists, use it. Otherwise return the string as-is.
    const text = safeString(s);

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
      const v = Number(n || 0);
      return "$" + v.toLocaleString();
    }
  }

  function formatNumber(n) {
    if (typeof App !== "undefined" && typeof App.num === "function") {
      return App.num(n);
    }
    else {
      const v = Number(n || 0);
      return v.toLocaleString();
    }
  }

  function placeholderDataUrl(text) {
    const t = safeString(text);

    let safe = t;
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
        '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"' +
              ' font-family="Arial" font-size="44" fill="#6b7280">' + safe + "</text>" +
      "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function jitsiRoomForListing(id) {
    const base = "veritybridge-" + safeString(id);
    return base.replace(/[^a-zA-Z0-9_-]/g, "");
  }

  // --------------------------
  // Gallery logic
  // --------------------------
  let photoUrls = [];
  let activeIndex = 0;

  function updateThumbActive() {
    const buttons = thumbs.querySelectorAll("button[data-idx]");

    buttons.forEach(function (btn) {
      const idx = Number(btn.getAttribute("data-idx"));
      btn.classList.toggle("thumb-active", idx === activeIndex);
    });
  }

  function setHero(index) {
    if (!photoUrls.length) {
      heroPhoto.src = placeholderDataUrl("Photo unavailable");
      heroPhoto.alt = "Photo unavailable";
      return;
    }

    // Wrap around so going left from 0 goes to the last image
    activeIndex = (index + photoUrls.length) % photoUrls.length;

    heroPhoto.src = photoUrls[activeIndex];
    heroPhoto.alt = "Listing photo " + (activeIndex + 1) + " of " + photoUrls.length;

    updateThumbActive();
  }

  function renderThumbs() {
    thumbs.innerHTML = "";

    if (!photoUrls.length) {
      return;
    }

    photoUrls.forEach(function (src, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thumb";
      btn.setAttribute("data-idx", String(idx));

      const img = document.createElement("img");
      img.src = src;
      img.alt = "Thumbnail " + (idx + 1);
      img.loading = "lazy";

      img.onerror = function () {
        img.onerror = null;
        img.src = placeholderDataUrl("Photo unavailable");
      };

      btn.addEventListener("click", function () {
        setHero(idx);
      });

      btn.appendChild(img);
      thumbs.appendChild(btn);
    });

    updateThumbActive();
  }

  heroPhoto.onerror = function () {
    heroPhoto.onerror = null;
    heroPhoto.src = placeholderDataUrl("Photo unavailable");
  };

  prevPhotoBtn.addEventListener("click", function () {
    setHero(activeIndex - 1);
  });

  nextPhotoBtn.addEventListener("click", function () {
    setHero(activeIndex + 1);
  });

  // Keyboard navigation
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      setHero(activeIndex - 1);
    }

    if (e.key === "ArrowRight") {
      setHero(activeIndex + 1);
    }
  });

  // --------------------------
  // Load listing
  // --------------------------
  const allListings = await Data.loadListings();
  const listing = allListings.find(function (l) {
    return l.id === listingId;
  });

  if (!listing) {
    titleEl.textContent = "Listing not found";
    subtitleEl.textContent = "Try going back to results.";

    if (mapCard) {
      mapCard.style.display = "none";
    }

    return;
  }

  // Top info
  titleEl.textContent = listing.address;

  let neighborhood = listing.neighborhood;
  if (neighborhood === null || neighborhood === undefined) {
    neighborhood = "";
  }

  subtitleEl.textContent =
    (listing.city + ", " + listing.state + " " + listing.zip + " • " + neighborhood)
      .trim();

  priceEl.textContent = formatMoney(listing.price);

  factsEl.textContent =
    listing.beds +
    " bd • " +
    listing.baths +
    " ba • " +
    formatNumber(listing.sqft) +
    " sqft • " +
    listing.type;

  if (listing.description) {
    descEl.textContent = listing.description;
  }
  else {
    descEl.textContent = "No description provided yet.";
  }

  // Overview tiles
  const overviewItems = [
    ["Type", listing.type],
    ["Year built", listing.yearBuilt || "—"],
    ["Lot", listing.lot || "—"],
    ["Parking", listing.parking || "—"],
    ["HOA", listing.hoa || "—"],
    ["Taxes", listing.taxes || "—"]
  ];

  overviewGrid.innerHTML = overviewItems
    .map(function (pair) {
      const k = pair[0];
      const v = pair[1];

      return (
        '<div class="info-tile">' +
          '<div class="info-label">' + escapeHtml(k) + "</div>" +
          '<div class="info-value">' + escapeHtml(String(v)) + "</div>" +
        "</div>"
      );
    })
    .join("");

  // --------------------------
  // Favorites
  // --------------------------
  function syncSaveBtn() {
    const on = Favorites.has(listing.id);

    if (on) {
      saveBtn.textContent = "❤️ Saved";
    }
    else {
      saveBtn.textContent = "♡ Save";
    }
  }

  syncSaveBtn();

  saveBtn.addEventListener("click", function () {
    Favorites.toggle(listing.id);
    Favorites.renderFavCount();
    syncSaveBtn();
  });

  // --------------------------
  // Video room
  // --------------------------
  videoBtn.href =
    "https://meet.jit.si/" + encodeURIComponent(jitsiRoomForListing(listing.id));

  // --------------------------
  // Gallery images
  // --------------------------
  photoUrls = (listing.photos || []).filter(Boolean);

  if (!photoUrls.length) {
    photoUrls = [placeholderDataUrl("Photo unavailable")];
  }

  renderThumbs();
  setHero(0);

  // --------------------------
  // Location map (Leaflet)
  // --------------------------
  function hasCoords(l) {
    return l && typeof l.lat === "number" && typeof l.lng === "number";
  }

  if (!mapCard || !mapEl || typeof L === "undefined") {
    // Missing DOM or Leaflet not loaded -> hide card
    if (mapCard) {
      mapCard.style.display = "none";
    }
  }
  else if (!hasCoords(listing)) {
    // No coords in data -> hide card
    mapCard.style.display = "none";
  }
  else {
    const listingMap = L.map("listingMap", {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([listing.lat, listing.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(listingMap);

    const marker = L.marker([listing.lat, listing.lng]).addTo(listingMap);

    marker.bindPopup(
      '<div style="font-weight:900">' + escapeHtml(listing.address) + "</div>" +
      '<div style="color:#6b7280;font-size:12px">' +
        escapeHtml(listing.city) + ", " + escapeHtml(listing.state) + " " + escapeHtml(listing.zip) +
      "</div>"
    );

    // Leaflet needs this if the map is inside a card/sidebar
    setTimeout(function () {
      listingMap.invalidateSize();
      marker.openPopup();
    }, 80);
  }

  // --------------------------
  // Request form (no backend) -> opens email client
  // --------------------------
  requestForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    const subject = "VerityBridge: Request info for " + listing.address;

    let nameLine = name;
    if (!nameLine) {
      nameLine = "—";
    }

    let emailLine = email;
    if (!emailLine) {
      emailLine = "—";
    }

    let thanksName = name;
    if (!thanksName) {
      thanksName = "";
    }

    const body =
      (
        "Hello,\n\n" +
        "I'm interested in " + listing.address + ".\n\n" +
        "Name: " + nameLine + "\n" +
        "Email: " + emailLine + "\n\n" +
        message + "\n\n" +
        "Thanks,\n" + thanksName
      ).trim();

    const mailto =
      "mailto:" +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;
  });
})();
