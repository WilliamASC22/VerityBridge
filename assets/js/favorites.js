(function () {
  var Favorites = {};
  window.Favorites = Favorites;

  var auth = null;
  var db = null;

  var ready = false;
  var readyPromiseResolve = null;
  var readyPromise = new Promise(function (resolve) {
    readyPromiseResolve = resolve;
  });

  var currentUser = null;
  var savedSet = {}; // object as a set: savedSet[id] = true

  function getReturnTo() {
    var page = location.pathname.split("/").pop();
    return page + location.search;
  }

  function goLogin() {
    var returnTo = getReturnTo();
    location.href = "login.html?returnTo=" + encodeURIComponent(returnTo);
  }

  function setFavCountText(n) {
    var el = document.getElementById("favCount");
    if (!el) {
      return;
    }
    el.textContent = "❤️ Favorites (" + String(n) + ")";
  }

  function clearSaved() {
    savedSet = {};
  }

  function countSaved() {
    var n = 0;
    var k;
    for (k in savedSet) {
      if (savedSet.hasOwnProperty(k)) {
        n = n + 1;
      }
    }
    return n;
  }

  async function loadSavedFromFirestore(uid) {
    clearSaved();

    var snap = await db.collection("users").doc(uid).collection("favorites").get();
    snap.forEach(function (doc) {
      savedSet[doc.id] = true;
    });

    setFavCountText(countSaved());
  }

  Favorites.waitUntilReady = function () {
    return readyPromise;
  };

  Favorites.getUser = function () {
    return currentUser;
  };

  Favorites.isSaved = function (listingId) {
    if (!listingId) {
      return false;
    }

    if (savedSet[listingId]) {
      return true;
    }
    else {
      return false;
    }
  };

  // Alias used by results.js + listing.js
  Favorites.has = function (listingId) {
    return Favorites.isSaved(listingId);
  };

  Favorites.isLoggedIn = function () {
    if (currentUser) {
      return true;
    }
    else {
      return false;
    }
  };

  Favorites.ensureLoggedIn = function () {
    if (Favorites.isLoggedIn()) {
      return true;
    }
    else {
      goLogin();
      return false;
    }
  };

  Favorites.renderFavCount = function () {
    setFavCountText(countSaved());
  };

  Favorites.getSavedIds = function () {
    var ids = [];
    var k;
    for (k in savedSet) {
      if (savedSet.hasOwnProperty(k)) {
        ids.push(k);
      }
    }
    return ids;
  };

  Favorites.toggle = async function (listingId) {
    if (!listingId) {
      return { ok: false, reason: "missing-id" };
    }

    if (!currentUser) {
      goLogin();
      return { ok: false, reason: "not-logged-in" };
    }

    var uid = currentUser.uid;
    var ref = db.collection("users").doc(uid).collection("favorites").doc(listingId);

    if (Favorites.isSaved(listingId)) {
      await ref.delete();
      delete savedSet[listingId];
      setFavCountText(countSaved());
      return { ok: true, saved: false };
    }
    else {
      await ref.set({
        listingId: listingId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      savedSet[listingId] = true;
      setFavCountText(countSaved());
      return { ok: true, saved: true };
    }
  };

  function init() {
    auth = window.auth;
    db = window.db;

    if (!auth || !db) {
      console.error("favorites.js: window.auth/window.db missing. Check firebase-init.js order.");
      ready = true;
      setFavCountText(0);
      readyPromiseResolve();
      return;
    }

    auth.onAuthStateChanged(async function (user) {
      currentUser = user;

      if (!user) {
        clearSaved();
        setFavCountText(0);

        if (!ready) {
          ready = true;
          readyPromiseResolve();
        }
        return;
      }

      try {
        await loadSavedFromFirestore(user.uid);
      }
      catch (e) {
        console.error("favorites.js: failed to load favorites", e);
        clearSaved();
        setFavCountText(0);
      }

      if (!ready) {
        ready = true;
        readyPromiseResolve();
      }
    });
  }

  init();
})();
