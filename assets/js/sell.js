(async function () {

  if (typeof Favorites !== "undefined" && Favorites.waitUntilReady) {
    await Favorites.waitUntilReady();
    Favorites.renderFavCount();
  }

  const form = document.getElementById("sellForm");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("resultLink");
  const photoUrlsEl = document.getElementById("photoUrls");
  const previewEl = document.getElementById("photoPreview");

  const modeEl = document.getElementById("mode");
  const priceLabelEl = document.getElementById("priceLabel");

  function setStatus(text) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text;
  }

  function setResult(html) {
    if (!resultEl) {
      return;
    }
    resultEl.innerHTML = html;
  }

  function getAuth() {
    if (!window.Firebase) {
      return null;
    }
    if (!window.Firebase.auth) {
      return null;
    }
    return window.Firebase.auth;
  }

  function getDb() {
    if (!window.Firebase) {
      return null;
    }
    if (!window.Firebase.db) {
      return null;
    }
    return window.Firebase.db;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    if (!el) {
      return "";
    }
    return String(el.value || "").trim();
  }

  function getNumber(id) {
    const el = document.getElementById(id);
    if (!el) {
      return 0;
    }
    return Number(el.value || 0) || 0;
  }

  function parsePhotoUrls() {
    const raw = getValue("photoUrls");
    if (!raw) {
      return [];
    }

    const urls = raw
      .split("\n")
      .map(function (s) {
        return String(s || "").trim();
      })
      .filter(function (s) {
        return Boolean(s);
      });

    const good = urls.filter(function (u) {
      return u.startsWith("http://") || u.startsWith("https://");
    });

    return good.slice(0, 8);
  }

  function renderPreview() {
    if (!previewEl) {
      return;
    }

    const urls = parsePhotoUrls();

    if (urls.length === 0) {
      previewEl.innerHTML = "";
      return;
    }

    previewEl.innerHTML = urls.map(function (u) {
      const safe = (typeof App !== "undefined" && App.escape) ? App.escape(u) : u;
      return (
        '<div class="card" style="padding:8px;">' +
          '<img src="' + safe + '" alt="Photo preview" style="width:100%; height:120px; object-fit:cover; border-radius:10px;" />' +
        "</div>"
      );
    }).join("");
  }

  function randomId() {
    return "l-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000));
  }

  function updatePriceLabel() {
    if (!modeEl) {
      return;
    }
    if (!priceLabelEl) {
      return;
    }

    const m = String(modeEl.value || "buy");

    if (m === "buy") {
      priceLabelEl.textContent = "Price";
    }
    else if (m === "rent") {
      priceLabelEl.textContent = "Rent / month";
    }
    else if (m === "mortgage") {
      priceLabelEl.textContent = "Est. payment / month";
    }
    else {
      priceLabelEl.textContent = "Price";
    }
  }

  if (photoUrlsEl) {
    photoUrlsEl.addEventListener("input", renderPreview);
  }

  if (modeEl) {
    modeEl.addEventListener("change", updatePriceLabel);
  }

  updatePriceLabel();
  renderPreview();

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const auth = getAuth();
    const db = getDb();

    if (!auth || !db) {
      alert("Firebase is not ready. Check firebase-init.js.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      location.href = "login.html?returnTo=" + encodeURIComponent("sell.html");
      return;
    }

    const photos = parsePhotoUrls();

    if (photos.length === 0) {
      alert("Please paste at least 1 photo URL (Unsplash link).");
      return;
    }

    const listingId = randomId();

    const data = {
      id: listingId,
      ownerId: user.uid,
      status: "active",

      // IMPORTANT: listing type stored as buy/rent/mortgage
      mode: getValue("mode"),

      title: getValue("title"),
      address: getValue("address"),
      city: getValue("city"),
      state: getValue("state"),
      zip: getValue("zip"),

      price: getNumber("price"),
      beds: getNumber("beds"),
      baths: getNumber("baths"),
      sqft: getNumber("sqft"),
      yearBuilt: getNumber("yearBuilt"),

      type: getValue("type"),
      description: getValue("description"),

      photos: photos,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    setStatus("Publishing…");
    setResult("");

    try {
      await db.collection("listings").doc(listingId).set(data);

      setStatus("Done.");
      const link = "listing.html?id=" + encodeURIComponent(listingId);
      setResult('✅ Published! <a href="' + link + '">View your listing</a>');
    }
    catch (err) {
      console.error(err);
      setStatus("");
      alert("Publish failed: " + String(err.message || err));
    }
  });

})();
