(async function () {

  var ADMIN_EMAIL = "therealbrownwill@gmail.com";

  function safeString(x) {
    if (x === null || x === undefined) {
      return "";
    }
    else {
      return String(x);
    }
  }

  function escapeHtml(s) {
    if (window.App && typeof App.escape === "function") {
      return App.escape(s);
    }
    else {
      return safeString(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  }

  function setText(el, text) {
    if (!el) {
      return;
    }
    el.textContent = safeString(text);
  }

  function formatMoney(n) {
    if (window.App && typeof App.money === "function") {
      return App.money(n);
    }
    else {
      var v = Number(n || 0);
      return "$" + v.toLocaleString();
    }
  }

  function formatNumber(n) {
    if (window.App && typeof App.num === "function") {
      return App.num(n);
    }
    else {
      var v = Number(n || 0);
      return v.toLocaleString();
    }
  }

  function isHttpUrl(s) {
    var x = String(s || "").trim();
    return (x.indexOf("https://") === 0 || x.indexOf("http://") === 0);
  }

  function firstPhoto(listing) {
    if (!listing) {
      return "";
    }

    if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      return safeString(listing.photos[0]);
    }

    return "";
  }

  // Wait for favorites/auth to initialize
  async function waitForFavorites() {
    if (window.Favorites && Favorites.waitUntilReady) {
      await Favorites.waitUntilReady();
    }
    if (window.Favorites && Favorites.renderFavCount) {
      Favorites.renderFavCount();
    }
  }

  await waitForFavorites();

  var grid = document.getElementById("myListingsGrid");
  var empty = document.getElementById("myListingsEmpty");
  var subhead = document.getElementById("myListingsSubhead");

  var adminTools = document.getElementById("adminTools");
  var loadAllBtn = document.getElementById("loadAllBtn");
  var loadMineBtn = document.getElementById("loadMineBtn");

  var vbTourModal = document.getElementById("vbTourModal");
  var vbTourInput = document.getElementById("vbTourInput");
  var vbTourCancel = document.getElementById("vbTourCancel");
  var vbTourSave = document.getElementById("vbTourSave");

  var vbDeleteModal = document.getElementById("vbDeleteModal");
  var vbDeleteCancel = document.getElementById("vbDeleteCancel");
  var vbDeleteOk = document.getElementById("vbDeleteOk");

  var editingTourId = "";
  var currentView = "mine"; 

  var pendingDeleteId = "";

  if (!window.auth || !window.db) {
    alert("Firebase is not ready. Check firebase-init.js.");
    return;
  }

  var user = window.auth.currentUser;
  if (!user) {
    location.href = "login.html?returnTo=" + encodeURIComponent("my_listings.html");
    return;
  }

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

  function openTourModal(listingId, currentLink) {
    if (!vbTourModal || !vbTourInput || !vbTourCancel || !vbTourSave) {
      alert("Tour link editor is missing in my_listings.html");
      return;
    }

    editingTourId = String(listingId || "").trim();
    vbTourInput.value = String(currentLink || "").trim();

    vbTourModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeTourModal() {
    if (!vbTourModal) {
      return;
    }
    vbTourModal.classList.remove("is-open");
    document.body.style.overflow = "";
    editingTourId = "";
  }

  function openDeleteModal(listingId) {
    if (!vbDeleteModal || !vbDeleteCancel || !vbDeleteOk) {
      // fallback
      var ok = confirm("Delete this listing\n\nThis cannot be undone\n\nContinue?");
      if (ok) {
        deleteListing(listingId);
      }
      return;
    }

    pendingDeleteId = String(listingId || "").trim();
    vbDeleteModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeDeleteModal() {
    if (!vbDeleteModal) {
      return;
    }
    vbDeleteModal.classList.remove("is-open");
    document.body.style.overflow = "";
    pendingDeleteId = "";
  }

  if (vbDeleteCancel) {
    vbDeleteCancel.addEventListener("click", function () {
      closeDeleteModal();
    });
  }

  if (vbDeleteModal) {
    vbDeleteModal.addEventListener("click", function (e) {
      if (e.target === vbDeleteModal) {
        closeDeleteModal();
      }
    });
  }

  if (vbDeleteOk) {
    vbDeleteOk.addEventListener("click", function () {
      var id = pendingDeleteId;
      closeDeleteModal();
      if (id) {
        deleteListing(id);
      }
    });
  }

  function renderCard(listing) {
    var id = safeString(listing.id);
    var title = safeString(listing.address);
    var city = safeString(listing.city);
    var state = safeString(listing.state);
    var tourLink = safeString(listing.tourLink || "");

    var beds = safeString(listing.beds || 0);
    var baths = safeString(listing.baths || 0);
    var sqft = formatNumber(listing.sqft || 0);

    var photo = firstPhoto(listing);
    var imgHtml = "";

    if (photo) {
      imgHtml = '<img class="home-img-img" src="' + escapeHtml(photo) + '" alt="Listing photo" loading="lazy" />';
    }
    else {
      imgHtml = '<div class="home-img-placeholder">No photo</div>';
    }

    var factsLine = beds + " bd • " + baths + " ba • " + sqft + " sqft";
    var listingHref = "listing.html?id=" + encodeURIComponent(id);

    var deleteLabel = "Delete";
    if (isAdmin && listing.ownerId && listing.ownerId !== user.uid) {
      deleteLabel = "Admin delete";
    }

    var canEditTour = false;
    if (isAdmin) {
      canEditTour = true;
    }
    else if (listing.ownerId && String(listing.ownerId) === String(user.uid)) {
      canEditTour = true;
    }
    else {
      canEditTour = false;
    }

    var editTourHtml = "";
    if (canEditTour) {
      editTourHtml =
        '<button class="btn btn-ghost btn-sm" type="button" style="white-space:nowrap;" ' +
        'data-edit-tour="' + escapeHtml(id) + '" ' +
        'data-current-tour="' + escapeHtml(tourLink) + '">' +
          'Edit tour' +
        '</button>';
    }

    return (
      '<article class="home-card" data-card="' + escapeHtml(id) + '">' +
        '<a class="home-img" href="' + listingHref + '" aria-label="Open listing">' +
          imgHtml +
        '</a>' +
        '<div class="home-body">' +
          '<div class="home-row">' +
            '<div class="home-price">' + formatMoney(listing.price) + '</div>' +
            editTourHtml +
            '<button class="btn btn-ghost btn-sm" type="button" style="white-space:nowrap;" data-delete="' + escapeHtml(id) + '">' +
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
      var d = doc.data();
      if (d) {
        if (!d.id) {
          d.id = doc.id;
        }
        out.push(d);
      }
    });

    return out;
  }

  async function loadAll() {
    var snap = await window.db.collection("listings").get();

    var out = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      if (d) {
        if (!d.id) {
          d.id = doc.id;
        }
        out.push(d);
      }
    });

    return out;
  }

  async function deleteListing(id) {
    try {
      await window.db.collection("listings").doc(id).delete();
      if (currentView === "all") {
        var all2 = await loadAll();
        await renderList(all2);
      }
      else {
        var mine2 = await loadMine();
        await renderList(mine2);
      }
    }
    catch (err) {
      console.log(err);
      alert("Delete failed.");
    }
  }

  async function renderList(listings) {
    if (!grid || !empty || !subhead) {
      return;
    }

    if (!listings || listings.length === 0) {
      setText(subhead, "0 listings");
      empty.style.display = "block";
      grid.innerHTML = "";
      return;
    }
    else {
      empty.style.display = "none";
    }

    var count = listings.length;
    var suffix = (count === 1) ? "" : "s";
    setText(subhead, String(count) + " listing" + suffix);

    var html = [];
    var i = 0;

    while (i < listings.length) {
      html.push(renderCard(listings[i]));
      i = i + 1;
    }

    grid.innerHTML = html.join("");
  }

  // edit tour link)
  if (vbTourCancel) {
    vbTourCancel.addEventListener("click", function () {
      closeTourModal();
    });
  }

  if (vbTourModal) {
    vbTourModal.addEventListener("click", function (e) {
      if (e.target === vbTourModal) {
        closeTourModal();
      }
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeTourModal();
      closeDeleteModal();
    }
  });

  if (vbTourSave) {
    vbTourSave.addEventListener("click", async function () {
      if (!editingTourId) {
        closeTourModal();
        return;
      }

      var newLink = "";
      if (vbTourInput) {
        newLink = String(vbTourInput.value || "").trim();
      }

      if (newLink) {
        if (!isHttpUrl(newLink)) {
          alert("Tour link must start with https:// or http:// (Google Meet or Zoom).");
          return;
        }
      }

      try {
        var updateData = {};

        if (newLink) {
          updateData.tourLink = newLink;
        }
        else {
          updateData.tourLink = firebase.firestore.FieldValue.delete();
        }

        await window.db.collection("listings").doc(editingTourId).update(updateData);

        closeTourModal();

        if (currentView === "all") {
          var all2 = await loadAll();
          await renderList(all2);
        }
        else {
          var mine2 = await loadMine();
          await renderList(mine2);
        }
      }
      catch (err) {
        console.log(err);
        alert("Could not update tour link.");
      }
    });
  }

  // Click handler for deletes + edit tour
  if (grid) {
    grid.addEventListener("click", function (e) {
      var editBtn = e.target.closest("[data-edit-tour]");
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();

        var editId = safeString(editBtn.getAttribute("data-edit-tour"));
        var current = safeString(editBtn.getAttribute("data-current-tour"));
        openTourModal(editId, current);
        return;
      }

      var btn = e.target.closest("[data-delete]");
      if (!btn) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      var id = safeString(btn.getAttribute("data-delete"));
      if (!id) {
        return;
      }

      openDeleteModal(id);
    });
  }

  // Admin buttons
  if (loadAllBtn) {
    loadAllBtn.addEventListener("click", async function () {
      if (!isAdmin) {
        return;
      }

      currentView = "all";

      var all = await loadAll();
      await renderList(all);
    });
  }

  if (loadMineBtn) {
    loadMineBtn.addEventListener("click", async function () {
      currentView = "mine";

      var mine = await loadMine();
      await renderList(mine);
    });
  }

  // Initial load (mine)
  currentView = "mine";
  var mineStart = await loadMine();
  await renderList(mineStart);

})();
