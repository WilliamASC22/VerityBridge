(function () {
  function getById(id) {
    return document.getElementById(id);
  }

  var loginBtn = getById("navLoginBtn");
  var logoutBtn = getById("navLogoutBtn");
  var userEmailEl = getById("navUserEmail");

  if (!window.auth || !window.auth.onAuthStateChanged) {
    return;
  }

  function showLogin() {
    if (loginBtn) {
      loginBtn.style.display = "";
    }
    if (logoutBtn) {
      logoutBtn.style.display = "none";
    }
    if (userEmailEl) {
      userEmailEl.style.display = "none";
      userEmailEl.textContent = "";
    }
  }

  function showLogout(user) {
    if (loginBtn) {
      loginBtn.style.display = "none";
    }
    if (logoutBtn) {
      logoutBtn.style.display = "";
    }
    if (userEmailEl) {
      userEmailEl.style.display = "";
      if (user && user.email) {
        userEmailEl.textContent = user.email;
      }
      else {
        userEmailEl.textContent = "";
      }
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      window.auth
        .signOut()
        .then(function () {
          location.reload();
        })
        .catch(function (err) {
          console.error(err);
          alert("Could not log out. Try again.");
        });
    });
  }

  window.auth.onAuthStateChanged(function (user) {
    if (user) {
      showLogout(user);
    }
    else {
      showLogin();
    }
  });
})();
