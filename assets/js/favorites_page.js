(async function () {
  await Favorites.renderFavCount();

  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var subhead = document.getElementById("subhead");

  var listings = await Data.loadListings();
  var favIds = await Favorites.read();

  var favListings = favIds
    .map(function (id) {
      return listings.find(function (l) {
        return l.id === id;
      }) || null;
    })
    .filter(function (x) {
      return x !== null;
    });

  if (subhead) {
    subhead.textContent = favListings.length + " saved homes";
  }

  if (!grid) {
    return;
  }

  if (favListings.length === 0) {
    if (empty) {
      empty.style.display = "block";
    }
    grid.innerHTML = "";
    return;
  }

  if (empty) {
    empty.style.display = "none";
  }

  grid.innerHTML = favListings.map(renderCard).join("");

  grid.querySelectorAll("[data-unfav]").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var id = btn.getAttribute("data-unfav");
      await Favorites.toggle(id);
      location.reload();
    });
  });

  function renderCard(l) {
    var img = (Array.isArray(l.photos) && l.photos[0]) ? l.photos[0] : "";
    var price = l.price ? "$" + Number(l.price).toLocaleString() : "";
    var meta = [];
    if (l.beds != null) meta.push(String(l.beds) + " bd");
    if (l.baths != null) meta.push(String(l.baths) + " ba");
    if (l.sqft != null) meta.push(String(l.sqft).toLocaleString() + " sqft");

    return `
      <article class="card">
        <a class="card-media" href="listing.html?id=${encodeURIComponent(l.id)}">
          <img src="${img}" alt="${escapeHtml(l.title || "Home")}">
        </a>
        <div class="card-body">
          <div class="card-top">
            <div class="card-price">${price}</div>
            <button class="chip" data-unfav="${l.id}" title="Remove from favorites">Remove</button>
          </div>
          <div class="card-title">${escapeHtml(l.title || "")}</div>
          <div class="card-meta">${meta.join(" • ")}</div>
          <div class="card-loc">${escapeHtml(l.city || "")}, ${escapeHtml(l.state || "")}</div>
        </div>
      </article>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
