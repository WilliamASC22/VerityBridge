(function () {
  if (!window.auth) {
    console.error("Auth not initialized. Make sure firebase-init.js is loaded before auth.js");
    return;
  }

  var auth = window.auth;
  var db = window.db;

  var form = document.getElementById("authForm");
  var emailEl = document.getElementById("email");
  var passEl = document.getElementById("password");

  var titleEl = document.getElementById("formTitle");
  var subtitleEl = document.getElementById("formSubtitle");
  var submitBtn = document.getElementById("submitBtn");
  var toggleBtn = document.getElementById("toggleModeBtn");
  var msgEl = document.getElementById("authMsg");

  if (!form || !emailEl || !passEl || !titleEl || !submitBtn || !toggleBtn || !msgEl) {
    return;
  }

  var mode = "login"; // "login" or "signup"

  function showMsg(text, kind) {
    msgEl.textContent = text;

    if (kind) {
      msgEl.className = "login-message show " + kind;
    }
    else {
      msgEl.className = "login-message show";
    }
  }

  function clearMsg() {
    msgEl.textContent = "";
    msgEl.className = "login-message";
  }

  function setMode(newMode) {
    mode = newMode;

    if (mode === "login") {
      titleEl.textContent = "Log in";
      subtitleEl.textContent = "Use the account you created for VerityBridge.";
      submitBtn.textContent = "Log in";
      toggleBtn.textContent = "Create account instead";
      passEl.setAttribute("autocomplete", "current-password");
    }
    else {
      titleEl.textContent = "Create account";
      subtitleEl.textContent = "We’ll create your account and save your profile.";
      submitBtn.textContent = "Create account";
      toggleBtn.textContent = "I already have an account";
      passEl.setAttribute("autocomplete", "new-password");
    }

    clearMsg();
  }

  function getReturnTo() {
    var params = new URLSearchParams(location.search);
    var returnTo = params.get("returnTo");

    if (returnTo) {
      return returnTo;
    }
    else {
      return "index.html";
    }
  }

  function ensureUserDoc(user) {
    if (!db) {
      return Promise.resolve();
    }

    var ref = db.collection("users").doc(user.uid);

    return ref.get().then(function (snap) {
      if (!snap.exists) {
        var email = "";
        if (user.email) {
          email = user.email;
        }

        return ref.set({
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          role: "user"
        });
      }
      else {
        return Promise.resolve();
      }
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearMsg();

    var email = "";
    if (emailEl.value) {
      email = String(emailEl.value).trim();
    }

    var password = "";
    if (passEl.value) {
      password = String(passEl.value);
    }

    if (!email || !password) {
      showMsg("Please enter your email and password.", "error");
      return;
    }

    submitBtn.disabled = true;
    toggleBtn.disabled = true;

    var promise;

    if (mode === "login") {
      promise = auth.signInWithEmailAndPassword(email, password);
    }
    else {
      promise = auth.createUserWithEmailAndPassword(email, password);
    }

    promise
      .then(function (cred) {
        return ensureUserDoc(cred.user).then(function () {
          showMsg("Success! Redirecting…", "success");
          location.href = getReturnTo();
        });
      })
      .catch(function (err) {
        console.error(err);

        var message = "Something went wrong. Please try again.";

        if (err && err.code === "auth/invalid-email") {
          message = "That email address looks invalid.";
        }
        else if (err && err.code === "auth/user-not-found") {
          message = "No account found for that email.";
        }
        else if (err && err.code === "auth/wrong-password") {
          message = "Incorrect password.";
        }
        else if (err && err.code === "auth/email-already-in-use") {
          message = "That email is already in use. Try logging in.";
        }
        else if (err && err.code === "auth/weak-password") {
          message = "Password is too weak. Use at least 6 characters.";
        }
        else if (err && err.message) {
          message = err.message;
        }

        showMsg(message, "error");
        submitBtn.disabled = false;
        toggleBtn.disabled = false;
      });
  });

  toggleBtn.addEventListener("click", function () {
    if (mode === "login") {
      setMode("signup");
    }
    else {
      setMode("login");
    }
  });

  auth.onAuthStateChanged(function (user) {
    if (user) {
      var returnTo = getReturnTo();
      if (returnTo.indexOf("login.html") === -1) {
        location.href = returnTo;
      }
    }
  });

  setMode("login");
})();
