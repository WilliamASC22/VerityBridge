// Renders the Favorites page using Favorites + Data
// Requires login

(async function () {

  // Must be logged in to view favorites page
  if (typeof Favorites === "undefined" || !Favorites.waitUntilReady) {
    console.error("favorites_page.js: Favorites is missing. Check script order.");
    return;
  }

  await Favorites.waitUntilReady();

  if (!Favorites.isLoggedIn || !Favorites.isLoggedIn()) {
    if (Favorites.ensureLoggedIn) {
      Favorites.ensureLoggedIn();
    }
    return;
  }

  // Update navbar count
  if (Favorites.renderFavCount) {
    Favorites.renderFavCount();
  }

  // DOM
  var headlineEl = document.getElementById("headline");
  var subheadEl = document.getElementById("subhead");
  var gridEl = document.getElementById("grid");
  var emptyEl = document.getElementById("empty");

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
      if (v2) {
        return v2.toLocaleString();
      }
      else {
        return "—";
      }
    }
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

  function renderCard(listing) {
    var alt = String(listing.address || "") + ", " + String(listing.city || "");
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

    var detailsLine =
      String(listing.beds || 0) + " bd • " +
      String(listing.baths || 0) + " ba • " +
      formatNumber(listing.sqft) + " sqft • " +
      escapeHtml(listing.type || "");

    return (
      '<article class="home-card" data-id="' + escapeHtml(listing.id) + '">' +
        '<a class="home-img" href="' + listingHref + '" aria-label="Open listing">' +
          imgHtml +
        "</a>" +
        '<div class="home-body">' +
          '<div class="home-top">' +
            '<div class="home-price">' + formatMoney(listing.price) + "</div>" +
            '<button class="icon-btn" type="button" data-unfav="' + escapeHtml(listing.id) + '" aria-label="Remove favorite">' +
              "🗑️" +
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

  async function loadFavoriteListings() {
    var ids = [];

    if (Favorites.getSavedIds) {
      ids = Favorites.getSavedIds();
    }

    if (!ids.length) {
      return [];
    }

    // Load listings once (fast path)
    var all = await Data.loadListings();

    // Keep only those in favorites, in the same order as ids
    var out = [];

    for (var i = 0; i < ids.length; i = i + 1) {
      var id = ids[i];

      var found = null;

      for (var j = 0; j < all.length; j = j + 1) {
        if (all[j].id === id) {
          found = all[j];
          break;
        }
      }

      if (found) {
        out.push(found);
      }
    }

    return out;
  }

  function showEmptyState() {
    if (emptyEl) {
      emptyEl.style.display = "block";
    }
    if (gridEl) {
      gridEl.innerHTML = "";
    }

    if (headlineEl) {
      headlineEl.textContent = "Favorites";
    }
    if (subheadEl) {
      subheadEl.textContent = "0 homes";
    }
  }

  function showGrid(listings) {
    if (emptyEl) {
      emptyEl.style.display = "none";
    }

    if (headlineEl) {
      headlineEl.textContent = "Favorites";
    }

    if (subheadEl) {
      var suffix = "s";
      if (listings.length === 1) {
        suffix = "";
      }
      else {
        suffix = "s";
      }
      subheadEl.textContent = String(listings.length) + " home" + suffix;
    }

    if (!gridEl) {
      return;
    }

    var html = [];
    for (var i = 0; i < listings.length; i = i + 1) {
      html.push(renderCard(listings[i]));
    }

    gridEl.innerHTML = html.join("");
  }

  async function render() {
    var favListings = await loadFavoriteListings();

    if (!favListings.length) {
      showEmptyState();
    }
    else {
      showGrid(favListings);
    }
  }

  // Remove favorite handler
  if (gridEl) {
    gridEl.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-unfav]");
      if (!btn) {
        return;
      }

      e.preventDefault();

      var id = btn.getAttribute("data-unfav");

      if (Favorites.toggle) {
        await Favorites.toggle(id);
        Favorites.renderFavCount();
        await render();
      }
    });
  }

  // Initial render
  await render();

})();
