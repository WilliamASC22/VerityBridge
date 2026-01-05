(async function () {

  async function waitForFavorites() {
    if (window.Favorites && Favorites.waitUntilReady) {
      await Favorites.waitUntilReady();
    }
    if (window.Favorites && Favorites.renderFavCount) {
      Favorites.renderFavCount();
    }
  }

  await waitForFavorites();

  function vbConfirmDelete(onOk) {
    var overlay = document.getElementById("vbDeleteModal");
    var cancelBtn = document.getElementById("vbDeleteCancel");
    var okBtn = document.getElementById("vbDeleteOk");

    // Fallback if modal HTML is missing
    if (!overlay || !cancelBtn || !okBtn) {
      var msg = "Delete this listing\n\nThis cannot be undone\n\nContinue";
      var ok = confirm(msg);
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

  var grid = document.getElementById("myListingsGrid");
  var empty = document.getElementById("myListingsEmpty");
  var subhead = document.getElementById("myListingsSubhead");

  var adminTools = document.getElementById("adminTools");
  var loadAllBtn = document.getElementById("loadAllBtn");
  var loadMineBtn = document.getElementById("loadMineBtn");

  function safeString(x) {
    if (x === null || x === undefined) {
      return "";
    }
    return String(x);
  }

  function setText(el, text) {
    if (!el) {
      return;
    }
    el.textContent = String(text || "");
  }

  function escapeHtml(s) {
    if (window.App && typeof App.escape === "function") {
      return App.escape(s);
    }
    return safeString(s);
  }

  function formatMoney(n) {
    if (window.App && typeof App.money === "function") {
      return App.money(n);
    }
    var v = Number(n || 0);
    return v.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  }

  function formatNumber(n) {
    if (window.App && typeof App.num === "function") {
      return App.num(n);
    }
    var v = Number(n || 0);
    if (v) {
      return v.toLocaleString();
    }
    return "—";
  }

  function firstPhoto(listing) {
    if (!listing) {
      return "";
    }
    if (Array.isArray(listing.photos) && listing.photos.length) {
      return listing.photos[0] || "";
    }
    return "";
  }

  // -----------------------------
  // Auth/DB check
  // -----------------------------
  if (!window.auth || !window.db) {
    alert("Firebase is not ready. Check firebase-init.js.");
    return;
  }

  var user = window.auth.currentUser;
  if (!user) {
    location.href = "login.html?returnTo=" + encodeURIComponent("my_listings.html");
    return;
  }

  var ADMIN_EMAIL = "support@veritybridge.com"; // your existing value
  var isAdmin = false;

  if (user.email) {
    if (String(user.email).toLowerCase() === String(ADMIN_EMAIL).toLowerCase()) {
      isAdmin = true;
    }
    else {
      isAdmin = false;
    }
  }
  else {
    isAdmin = false;
  }

  if (isAdmin && adminTools) {
    adminTools.style.display = "block";
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderCard(listing) {
    var id = safeString(listing.id);
    var title = safeString(listing.address);
    var city = safeString(listing.city);
    var state = safeString(listing.state);

    var beds = safeString(listing.beds || 0);
    var baths = safeString(listing.baths || 0);
    var sqft = formatNumber(listing.sqft || 0);

    var photo = firstPhoto(listing);
    var imgHtml = "";

    if (photo) {
      imgHtml = '<img class="home-img-img" src="' + escapeHtml(photo) + '" alt="Listing photo" loading="lazy" />';
    }
    else {
      imgHtml = '<div class="home-img-img" aria-label="Photo unavailable"></div>';
    }

    var factsLine = beds + " bd • " + baths + " ba • " + sqft + " sqft • " + escapeHtml(listing.type || "");
    var listingHref = "listing.html?id=" + encodeURIComponent(id);

    var deleteLabel = "Delete";
    if (isAdmin && listing.ownerId && listing.ownerId !== user.uid) {
      deleteLabel = "Admin delete";
    }

    return (
      '<article class="home-card" data-card="' + escapeHtml(id) + '">' +
        '<a class="home-img" href="' + listingHref + '" aria-label="Open listing">' +
          imgHtml +
        '</a>' +
        '<div class="home-body">' +
          '<div class="home-row">' +
            '<div class="home-price">' + formatMoney(listing.price) + '</div>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-delete="' + escapeHtml(id) + '">' +
              deleteLabel +
            '</button>' +
          '</div>' +
          '<div class="home-facts muted">' + factsLine + '</div>' +
          '<div class="home-addr">' + escapeHtml(title) + '</div>' +
          '<div class="home-sub muted">' + escapeHtml(city) + ', ' + escapeHtml(state) + '</div>' +
        '</div>' +
      '</article>'
    );
  }

  async function loadMine() {
    var snap = await window.db
      .collection("listings")
      .where("ownerId", "==", user.uid)
      .get();

    var out = [];
    snap.forEach(function (doc) {
      var obj = doc.data() || {};
      obj.id = doc.id;
      out.push(obj);
    });

    return out;
  }

  async function loadAll() {
    var snap = await window.db
      .collection("listings")
      .get();

    var out = [];
    snap.forEach(function (doc) {
      var obj = doc.data() || {};
      obj.id = doc.id;
      out.push(obj);
    });

    return out;
  }

  async function renderList(listings) {
    if (!grid || !empty || !subhead) {
      return;
    }

    var count = listings.length;
    var suffix = (count === 1) ? "" : "s";
    setText(subhead, String(count) + " listing" + suffix);

    if (count === 0) {
      empty.style.display = "block";
      grid.innerHTML = "";
      return;
    }
    else {
      empty.style.display = "none";
    }

    var html = [];
    var i = 0;

    while (i < listings.length) {
      html.push(renderCard(listings[i]));
      i = i + 1;
    }

    grid.innerHTML = html.join("");
  }

  async function deleteListing(listingId) {

    vbConfirmDelete(async function () {
      try {
        await window.db.collection("listings").doc(listingId).delete();
      }
      catch (err) {
        console.error(err);
        alert("Delete failed. Check permissions.");
        return;
      }

      // Reload current view (keep your behavior)
      if (isAdmin && adminTools && adminTools.style.display !== "none") {
        var mine = await loadMine();
        await renderList(mine);
      }
      else {
        var mine2 = await loadMine();
        await renderList(mine2);
      }
    });

  }

  // Click handler for deletes
  if (grid) {
    grid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-delete]");
      if (!btn) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      var id = btn.getAttribute("data-delete");
      if (!id) {
        return;
      }

      deleteListing(id);
    });
  }

  // Admin buttons
  if (loadAllBtn) {
    loadAllBtn.addEventListener("click", async function () {
      if (!isAdmin) {
        return;
      }

      var all = await loadAll();
      await renderList(all);
    });
  }

  if (loadMineBtn) {
    loadMineBtn.addEventListener("click", async function () {
      var mine = await loadMine();
      await renderList(mine);
    });
  }

  // Initial load (mine)
  var mineStart = await loadMine();
  await renderList(mineStart);

})();
