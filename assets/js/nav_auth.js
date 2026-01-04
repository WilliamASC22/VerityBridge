(function () {

  function getAuth() {
    if (!window.auth) {
      return null;
    }
    return window.auth;
  }

  function show(el) {
    if (!el) {
      return;
    }
    el.style.display = "";
  }

  function hide(el) {
    if (!el) {
      return;
    }
    el.style.display = "none";
  }

  var auth = getAuth();

  var loginBtn = document.getElementById("navLoginBtn");
  var logoutBtn = document.getElementById("navLogoutBtn");

  var sellLink = document.getElementById("navSell");
  var favLink = document.getElementById("favCount");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (!auth) {
        return;
      }

      auth.signOut().then(function () {
        location.href = "index.html";
      }).catch(function (err) {
        console.error(err);
        alert("Could not log out. Try again.");
      });
    });
  }

  if (sellLink) {
    sellLink.addEventListener("click", function (e) {
      if (!auth) {
        return;
      }

      var user = auth.currentUser;

      if (!user) {
        e.preventDefault();
        location.href = "login.html?returnTo=" + encodeURIComponent("sell.html");
      }
    });
  }

  if (favLink) {
    favLink.addEventListener("click", function (e) {
      if (!auth) {
        return;
      }

      var user = auth.currentUser;

      if (!user) {
        e.preventDefault();
        location.href = "login.html?returnTo=" + encodeURIComponent("favorites.html");
      }
    });
  }

  if (auth) {
    auth.onAuthStateChanged(function (user) {
      if (user) {
        hide(loginBtn);
        show(logoutBtn);

        if (sellLink) {
          sellLink.setAttribute("href", "sell.html");
        }
        if (favLink) {
          favLink.setAttribute("href", "favorites.html");
        }
      }
      else {
        show(loginBtn);
        hide(logoutBtn);

        if (sellLink) {
          sellLink.setAttribute("href", "login.html?returnTo=" + encodeURIComponent("sell.html"));
        }
        if (favLink) {
          favLink.setAttribute("href", "login.html?returnTo=" + encodeURIComponent("favorites.html"));
        }
      }
    });
  }

})();
