(function () {

  function redirectToLogin() {
    var page = location.pathname.split("/").pop();
    if (!page) {
      page = "index.html";
    }

    location.href = "login.html?returnTo=" + encodeURIComponent(page);
  }

  var body = document.body;

  var requiresAuth = false;
  if (body && body.dataset && body.dataset.requireAuth === "true") {
    requiresAuth = true;
  }

  if (!requiresAuth) {
    return;
  }

  if (!window.auth) {
    console.error("Auth not initialized. Make sure firebase-init.js loads before auth-guard.js");
    return;
  }

  window.auth.onAuthStateChanged(function (user) {
    if (!user) {
      redirectToLogin();
    }
  });

})();
