// Favorites stored in Firestore per-user:
// /users/{uid}/favorites/{listingId}
//
// Rules enforced here:
// - If not logged in: cannot save favorites
// - If on favorites.html: user must be logged in (redirects to login)

const Favorites = (function () {
  let readyResolve;
  const readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  let currentUid = "";
  let favSet = new Set();
  let unsubscribe = null;

  function getAuth() {
    if (!window.Firebase || !window.Firebase.auth) {
      return null;
    }
    return window.Firebase.auth;
  }

  function getDb() {
    if (!window.Firebase || !window.Firebase.db) {
      return null;
    }
    return window.Firebase.db;
  }

  function getReturnToValue() {
    // Keep full page + query
    return location.pathname.split("/").pop() + location.search;
  }

  function redirectToLogin() {
    const returnTo = encodeURIComponent(getReturnToValue());
    location.href = "login.html?returnTo=" + returnTo;
  }

  function updateFavCountPill() {
    const el = document.getElementById("favCount");
    if (!el) {
      return;
    }

    const count = favSet.size;
    el.textContent = "❤️ Favorites (" + String(count) + ")";
  }

  function wireNavAuthButtons() {
    const loginBtn = document.getElementById("navLoginBtn");
    const logoutBtn = document.getElementById("navLogoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        const auth = getAuth();
        if (!auth) {
          return;
        }

        try {
          await auth.signOut();
          location.href = "index.html";
        }
        catch (err) {
          console.error(err);
          alert("Could not log out. Try again.");
        }
      });
    }

    // Show/hide happens in initAuthListener based on auth state
    if (loginBtn) {
      // nothing else needed
    }
  }

  function wireSellGuardLink() {
    // If user clicks Sell in nav and they're not logged in, send them to login first
    const sellLink = document.getElementById("navSell");
    if (!sellLink) {
      return;
    }

    sellLink.addEventListener("click", function (e) {
      const auth = getAuth();
      if (!auth) {
        return;
      }

      const user = auth.currentUser;

      if (!user) {
        e.preventDefault();
        redirectToLogin();
      }
    });
  }

  function enforceFavoritesPageAuth(user) {
    const onFavoritesPage = location.pathname.split("/").pop() === "favorites.html";

    if (onFavoritesPage && !user) {
      redirectToLogin();
    }
  }

  function startFavoritesListener(uid) {
    const db = getDb();
    if (!db) {
      favSet = new Set();
      updateFavCountPill();
      readyResolve(true);
      return;
    }

    // Stop old listener
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    favSet = new Set();
    updateFavCountPill();

    const ref = db.collection("users").doc(uid).collection("favorites");

    unsubscribe = ref.onSnapshot(
      function (snap) {
        const next = new Set();

        snap.forEach(function (doc) {
          next.add(doc.id);
        });

        favSet = next;
        updateFavCountPill();
        readyResolve(true);
      },
      function (err) {
        console.error("Favorites listener error:", err);
        readyResolve(true);
      }
    );
  }

  function initAuthListener() {
    const auth = getAuth();
    if (!auth) {
      // If Firebase isn't ready, still resolve so pages don't hang forever
      readyResolve(true);
      return;
    }

    auth.onAuthStateChanged(function (user) {
      const loginBtn = document.getElementById("navLoginBtn");
      const logoutBtn = document.getElementById("navLogoutBtn");

      if (user) {
        currentUid = user.uid || "";
        enforceFavoritesPageAuth(user);
        startFavoritesListener(currentUid);

        if (loginBtn) {
          loginBtn.style.display = "none";
        }
        if (logoutBtn) {
          logoutBtn.style.display = "inline-flex";
        }
      }
      else {
        currentUid = "";
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        favSet = new Set();
        updateFavCountPill();
        enforceFavoritesPageAuth(null);

        if (loginBtn) {
          loginBtn.style.display = "inline-flex";
        }
        if (logoutBtn) {
          logoutBtn.style.display = "none";
        }

        readyResolve(true);
      }
    });
  }

  async function waitUntilReady() {
    return readyPromise;
  }

  function isLoggedIn() {
    const auth = getAuth();
    if (!auth) {
      return false;
    }
    return Boolean(auth.currentUser);
  }

  function has(listingId) {
    return favSet.has(String(listingId || ""));
  }

  function toggle(listingId) {
    const id = String(listingId || "");
    if (!id) {
      return;
    }

    if (!isLoggedIn()) {
      redirectToLogin();
      return;
    }

    const db = getDb();
    const auth = getAuth();

    if (!db || !auth || !auth.currentUser) {
      return;
    }

    const uid = auth.currentUser.uid;
    const ref = db.collection("users").doc(uid).collection("favorites").doc(id);

    // Update UI immediately (fast), then write to Firestore
    if (favSet.has(id)) {
      favSet.delete(id);
      updateFavCountPill();

      ref.delete().catch(function (err) {
        console.error(err);
      });
    }
    else {
      favSet.add(id);
      updateFavCountPill();

      ref.set({
        listingId: id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function (err) {
        console.error(err);
      });
    }
  }

  async function read() {
    await waitUntilReady();
    return Array.from(favSet);
  }

  async function renderFavCount() {
    await waitUntilReady();
    updateFavCountPill();
  }

  // Boot
  wireNavAuthButtons();
  wireSellGuardLink();
  initAuthListener();

  return {
    waitUntilReady,
    isLoggedIn,
    has,
    toggle,
    read,
    renderFavCount
  };
})();
