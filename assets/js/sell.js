// sell.js (beginner style)
// - Requires login to publish
// - Saves listing to Firestore: /listings/{listingId}
// - Adds lat/lng by geocoding address (OpenStreetMap Nominatim)
// - Uses Firestore-consistent fields: lotSqft, parking, hoa, taxes

(function () {

  // -----------------------------
  // Helpers
  // -----------------------------

  function byId(id) {
    return document.getElementById(id);
  }

  function getTextValue(id) {
    var el = byId(id);
    if (!el) {
      return "";
    }
    return String(el.value || "").trim();
  }

  function getNumberValue(id) {
    var el = byId(id);
    var n = 0;

    if (!el) {
      return 0;
    }

    n = Number(el.value);

    if (isNaN(n)) {
      return 0;
    }
    else {
      return n;
    }
  }

  function setText(el, text) {
    if (!el) {
      return;
    }
    el.textContent = text;
  }

  function setHtml(el, html) {
    if (!el) {
      return;
    }
    el.innerHTML = html;
  }

  function randomId() {
    return "l-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000));
  }

  function parsePhotoUrls(raw) {
    var urls = [];
    var lines = [];
    var i = 0;
    var s = "";

    if (!raw) {
      return [];
    }

    lines = raw.split("\n");

    while (i < lines.length) {
      s = String(lines[i] || "").trim();

      if (s) {
        if (s.indexOf("http://") === 0 || s.indexOf("https://") === 0) {
          urls.push(s);
        }
      }

      i = i + 1;
    }

    if (urls.length > 8) {
      urls = urls.slice(0, 8);
    }

    return urls;
  }

  function renderPreview(urls, previewEl) {
    var html = "";
    var i = 0;
    var u = "";
    var safe = "";

    if (!previewEl) {
      return;
    }

    if (!urls || urls.length === 0) {
      previewEl.innerHTML = "";
      return;
    }

    while (i < urls.length) {
      u = urls[i];
      safe = u.split('"').join("&quot;");

      html += '<div class="card" style="padding:8px;">';
      html += '<img src="' + safe + '" alt="Photo preview" ';
      html += 'style="width:100%; height:120px; object-fit:cover; border-radius:10px;" />';
      html += "</div>";

      i = i + 1;
    }

    previewEl.innerHTML = html;
  }

  function updatePriceLabel(mode) {
    var priceLabel = byId("priceLabel");

    if (!priceLabel) {
      return;
    }

    if (mode === "rent") {
      priceLabel.textContent = "Monthly rent";
    }
    else if (mode === "mortgage") {
      priceLabel.textContent = "Estimated monthly payment";
    }
    else {
      priceLabel.textContent = "Price";
    }
  }

  function buildGeocodeQuery(address, city, state, zip) {
    var parts = [];

    if (address) {
      parts.push(String(address).trim());
    }
    if (city) {
      parts.push(String(city).trim());
    }
    if (state) {
      parts.push(String(state).trim());
    }
    if (zip) {
      parts.push(String(zip).trim());
    }

    return parts.join(", ");
  }

  async function geocodeOnce(query) {
    var url = "";
    var res = null;
    var data = null;
    var first = null;
    var lat = 0;
    var lng = 0;

    if (!query) {
      return null;
    }

    url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=json" +
      "&limit=1" +
      "&q=" + encodeURIComponent(query);

    res = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      return null;
    }

    data = await res.json();

    if (!data || data.length === 0) {
      return null;
    }

    first = data[0];

    lat = Number(first.lat);
    lng = Number(first.lon);

    if (!isFinite(lat) || !isFinite(lng)) {
      return null;
    }

    return { lat: lat, lng: lng };
  }

  async function geocodeBest(address, city, state, zip) {
    var q1 = "";
    var r1 = null;

    var q2 = "";
    var r2 = null;

    var q3 = "";
    var r3 = null;

    var q4 = "";
    var r4 = null;

    q1 = buildGeocodeQuery(address, city, state, zip);
    r1 = await geocodeOnce(q1);
    if (r1) {
      r1.query = q1;
      return r1;
    }

    q2 = buildGeocodeQuery(address, city, state, "");
    r2 = await geocodeOnce(q2);
    if (r2) {
      r2.query = q2;
      return r2;
    }

    q3 = buildGeocodeQuery("", city, state, "");
    r3 = await geocodeOnce(q3);
    if (r3) {
      r3.query = q3;
      return r3;
    }

    q4 = buildGeocodeQuery("", "", "", zip);
    r4 = await geocodeOnce(q4);
    if (r4) {
      r4.query = q4;
      return r4;
    }

    return null;
  }

  function getAuth() {
    if (window.auth) {
      return window.auth;
    }
    return null;
  }

  function getDb() {
    if (window.db) {
      return window.db;
    }
    return null;
  }

  function errorMessage(err) {
    if (!err) {
      return "Unknown error";
    }

    if (err.message) {
      return String(err.message);
    }
    else {
      return String(err);
    }
  }

  // -----------------------------
  // Main
  // -----------------------------

  var form = byId("sellForm");
  var statusEl = byId("status");
  var resultEl = byId("resultLink");

  var photoUrlsEl = byId("photoUrls");
  var previewEl = byId("photoPreview");

  var modeEl = byId("mode");
  var sellerEmailEl = byId("sellerEmail");

  if (!form) {
    return;
  }

  // Auto-fill seller email from logged-in user (if blank)
  var a = getAuth();
  if (a && sellerEmailEl) {
    a.onAuthStateChanged(function (user) {
      if (user && user.email) {
        if (!sellerEmailEl.value || !String(sellerEmailEl.value).trim()) {
          sellerEmailEl.value = String(user.email);
        }
      }
    });
  }

  if (modeEl) {
    updatePriceLabel(getTextValue("mode"));

    modeEl.addEventListener("change", function () {
      updatePriceLabel(getTextValue("mode"));
    });
  }

  if (photoUrlsEl) {
    photoUrlsEl.addEventListener("input", function () {
      var urls = parsePhotoUrls(getTextValue("photoUrls"));
      renderPreview(urls, previewEl);
    });

    renderPreview(parsePhotoUrls(getTextValue("photoUrls")), previewEl);
  }

  form.addEventListener("submit", async function (e) {
    var auth = null;
    var db = null;
    var user = null;

    var listingId = "";
    var listingMode = "";

    var address = "";
    var city = "";
    var state = "";
    var zip = "";

    var neighborhood = "";

    var lotSqft = 0;
    var parking = "";
    var hoa = 0;
    var taxes = 0;

    var photos = [];

    var geo = null;
    var data = null;

    var sellerEmail = "";

    e.preventDefault();

    auth = getAuth();
    db = getDb();

    if (!auth || !db) {
      alert("Firebase is not ready. Check firebase-init.js is loaded before sell.js.");
      return;
    }

    user = auth.currentUser;

    if (!user) {
      location.href = "login.html?returnTo=" + encodeURIComponent("sell.html");
      return;
    }

    listingId = randomId();

    listingMode = getTextValue("mode");
    if (!listingMode) {
      listingMode = "buy";
    }

    sellerEmail = getTextValue("sellerEmail");
    if (!sellerEmail) {
      // fallback (should usually be filled)
      sellerEmail = String(user.email || "").trim();
    }

    if (!sellerEmail) {
      alert("Please enter a seller email.");
      return;
    }

    address = getTextValue("address");
    city = getTextValue("city");
    state = getTextValue("state");
    zip = getTextValue("zip");

    neighborhood = getTextValue("neighborhood");

    lotSqft = getNumberValue("lotSqft");
    parking = getTextValue("parking");
    hoa = getNumberValue("hoa");
    taxes = getNumberValue("taxes");

    photos = parsePhotoUrls(getTextValue("photoUrls"));

    setText(statusEl, "Publishing… (finding location)");
    setHtml(resultEl, "");

    geo = null;

    try {
      geo = await geocodeBest(address, city, state, zip);
    }
    catch (err) {
      geo = null;
    }

    data = {
      id: listingId,
      ownerId: user.uid,

      sellerEmail: sellerEmail,

      status: "active",

      mode: listingMode,

      title: getTextValue("title"),
      address: address,
      city: city,
      state: state,
      zip: zip,
      neighborhood: neighborhood,

      price: getNumberValue("price"),
      beds: getNumberValue("beds"),
      baths: getNumberValue("baths"),
      sqft: getNumberValue("sqft"),
      yearBuilt: getNumberValue("yearBuilt"),

      type: getTextValue("type"),
      description: getTextValue("description"),

      lotSqft: lotSqft,
      parking: parking,
      hoa: hoa,
      taxes: taxes,

      photos: photos,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (geo) {
      data.lat = geo.lat;
      data.lng = geo.lng;
      data.geocoded = true;
      data.geocodeQuery = geo.query;
    }
    else {
      data.geocoded = false;
      data.geocodeQuery = buildGeocodeQuery(address, city, state, zip);
    }

    try {
      setText(statusEl, "Publishing…");

      await db.collection("listings").doc(listingId).set(data);

      setText(statusEl, "Done.");

      var link = "listing.html?id=" + encodeURIComponent(listingId);

      if (geo) {
        setHtml(resultEl, '✅ Published! <a href="' + link + '">View your listing</a>');
      }
      else {
        setHtml(
          resultEl,
          '✅ Published! <a href="' + link + '">View your listing</a>' +
          '<div class="muted" style="margin-top:8px;">' +
          'Note: We could not find exact map coordinates. The listing still saved.' +
          "</div>"
        );
      }
    }
    catch (err2) {
      console.log(err2);
      setText(statusEl, "");
      alert("Publish failed: " + errorMessage(err2));
    }
  });

})();
