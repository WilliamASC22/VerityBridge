(function () {
  function getAuth() {
    if (window.auth) {
      return window.auth;
    }
    return null;
  }

  function buildReturnTo() {
    return location.pathname + location.search;
  }

  function goToLogin() {
    var returnTo = buildReturnTo();
    location.href = "login.html?returnTo=" + encodeURIComponent(returnTo);
  }

  function protectPage() {
    var body = document.body;
    if (!body) {
      return;
    }

    var requireAuth = body.getAttribute("data-require-auth");
    if (requireAuth !== "true") {
      return;
    }

    var auth = getAuth();
    if (!auth) {
      // If firebase-init.js is missing or failed
      goToLogin();
      return;
    }

    // IMPORTANT: wait for Firebase to finish loading the session
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        goToLogin();
      }
    });
  }

  // For buttons/links that should be visible to everyone,
  // but require login when clicked (Sell, Favorites, etc.)
  function requireLoginOnClick(elementId) {
    var el = document.getElementById(elementId);
    if (!el) {
      return;
    }

    el.addEventListener("click", function (e) {
      var auth = getAuth();
      if (!auth) {
        e.preventDefault();
        goToLogin();
        return;
      }

      var user = auth.currentUser;
      if (!user) {
        e.preventDefault();
        goToLogin();
      }
    });
  }

  window.AuthGuard = {
    protectPage: protectPage,
    requireLoginOnClick: requireLoginOnClick
  };
})();
