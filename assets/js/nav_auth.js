(function () {

  var NavAuth = {};
  window.NavAuth = NavAuth;

  function getAuth() {
    if (window.auth) {
      return window.auth;
    }
    return null;
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

  function ensureMyListingsLink() {
    var sellLink = document.getElementById("navSell");
    if (!sellLink) {
      return null;
    }

    var nav = sellLink.parentElement;
    if (!nav) {
      return null;
    }

    var existing = document.getElementById("navMyListings");
    if (existing) {
      return existing;
    }

    var a = document.createElement("a");
    a.id = "navMyListings";
    a.textContent = "My listings";
    a.href = "my_listings.html";

    // Insert right after Sell
    if (sellLink.nextSibling) {
      nav.insertBefore(a, sellLink.nextSibling);
    }
    else {
      nav.appendChild(a);
    }

    return a;
  }

  function goLogin(returnTo) {
    location.href = "login.html?returnTo=" + encodeURIComponent(returnTo);
  }

  NavAuth.init = function () {
    var auth = getAuth();

    var loginBtn = document.getElementById("navLoginBtn");
    var logoutBtn = document.getElementById("navLogoutBtn");

    var sellLink = document.getElementById("navSell");
    var favLink = document.getElementById("favCount");

    var myListingsLink = ensureMyListingsLink();

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

    // Require login on Sell
    if (sellLink) {
      sellLink.addEventListener("click", function (e) {
        if (!auth) {
          return;
        }

        var user = auth.currentUser;

        if (!user) {
          e.preventDefault();
          goLogin("sell.html");
        }
      });
    }

    // Require login on Favorites
    if (favLink) {
      favLink.addEventListener("click", function (e) {
        if (!auth) {
          return;
        }

        var user = auth.currentUser;

        if (!user) {
          e.preventDefault();
          goLogin("favorites.html");
        }
      });
    }

    // Require login on My listings
    if (myListingsLink) {
      myListingsLink.addEventListener("click", function (e) {
        if (!auth) {
          return;
        }

        var user = auth.currentUser;

        if (!user) {
          e.preventDefault();
          goLogin("my_listings.html");
        }
      });
    }

    if (auth) {
      auth.onAuthStateChanged(function (user) {

        // Always ensure link exists (in case DOM loaded late)
        myListingsLink = ensureMyListingsLink();

        if (user) {
          hide(loginBtn);
          show(logoutBtn);

          if (sellLink) {
            sellLink.setAttribute("href", "sell.html");
          }
          if (favLink) {
            favLink.setAttribute("href", "favorites.html");
          }
          if (myListingsLink) {
            myListingsLink.style.display = "";
            myListingsLink.setAttribute("href", "my_listings.html");
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
          if (myListingsLink) {
            myListingsLink.style.display = "none";
            myListingsLink.setAttribute("href", "login.html?returnTo=" + encodeURIComponent("my_listings.html"));
          }
        }
      });
    }
  };

  // Auto init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      NavAuth.init();
    });
  }
  else {
    NavAuth.init();
  }

})();
