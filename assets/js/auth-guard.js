var AuthGuard = (function () {

  function redirectToLogin() {
    var parts = location.pathname.split("/");
    var page = parts[parts.length - 1];

    if (!page) {
      page = "index.html";
    }

    var next = encodeURIComponent(page);
    location.href = "login.html?returnTo=" + next;
  }

  function protectPage() {
    var requiresAuth = false;

    if (document.body && document.body.dataset && document.body.dataset.requireAuth === "true") {
      requiresAuth = true;
    }

    if (!requiresAuth) {
      return;
    }

    if (!window.auth || !window.auth.onAuthStateChanged) {
      redirectToLogin();
      return;
    }

    window.auth.onAuthStateChanged(function (user) {
      if (!user) {
        redirectToLogin();
      }
    });
  }

  return {
    protectPage: protectPage
  };

})();
