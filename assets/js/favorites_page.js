(async function () {
  Favorites.renderFavCount();

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const subhead = document.getElementById("subhead");

  const listings = await Data.loadListings();
  const favIds = Favorites.read();

  const favListings = favIds
    .map(function (id) {
      return listings.find(function (l) {
        return l.id === id;
      });
    })
    .filter(Boolean);

  subhead.textContent = favListings.length + " saved";

  // --- placeholder image ---
  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#f8fbff"/>
            <stop offset="1" stop-color="#eef2f7"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="44" fill="#6b7280">
          Photo unavailable
        </text>
      </svg>`
    );

  function imgTag(urls, alt) {
    let safeAlt;

    if (alt) {
      safeAlt = App.escape(alt);
    }
    else {
      safeAlt = "Home photo";
    }

    let list;

    if (Array.isArray(urls)) {
      list = urls.filter(Boolean);
    }
    else {
      list = [];
      if (urls) {
        list.push(urls);
      }
    }

    let first;

    if (list.length > 0) {
      first = list[0];
    }
    else {
      first = placeholder;
    }

    const data = App.escape(JSON.stringify(list));

    return `
      <img class="home-img-img"
           src="${App.escape(first)}"
           alt="${safeAlt}"
           data-srcs='${data}'
           data-i="0"
           onerror="
             try {
               const srcs = JSON.parse(this.getAttribute('data-srcs') || '[]');
               let i = parseInt(this.getAttribute('data-i') || '0', 10);
               i++;
               if (i < srcs.length) {
                 this.setAttribute('data-i', String(i));
                 this.src = srcs[i];
               }
               else {
                 this.onerror = null;
                 this.src = '${placeholder}';
               }
             }
             catch (e) {
               this.onerror = null;
               this.src = '${placeholder}';
             }
           ">
    `;
  }

  function card(l) {
    const alt = l.address + ", " + l.city;

    return `
      <article class="home-card">
        <a class="home-img" href="listing.html?id=${encodeURIComponent(l.id)}" aria-label="View listing">
          ${imgTag(l.photos || [], alt)}
        </a>

        <div class="home-body">
          <div class="home-row">
            <div class="home-price">${App.money(l.price)}</div>
            <button class="icon-btn" type="button" data-fav="${App.escape(l.id)}" aria-label="Unsave listing">❤️</button>
          </div>

          <div class="home-facts muted">
            ${l.beds} bd • ${l.baths} ba • ${App.num(l.sqft)} sqft • ${App.escape(l.type)}
          </div>

          <a class="home-addr" href="listing.html?id=${encodeURIComponent(l.id)}">
            ${App.escape(l.address)}, ${App.escape(l.city)}, ${App.escape(l.state)} ${App.escape(l.zip)}
          </a>

          <div class="home-sub muted">${App.escape(l.neighborhood || "")}</div>
        </div>
      </article>
    `;
  }

  if (!favListings.length) {
    empty.style.display = "block";
    grid.innerHTML = "";
    return;
  }
  else {
    empty.style.display = "none";
    grid.innerHTML = favListings.map(card).join("");
  }

  // event delegation for unfavorite
  grid.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-fav]");
    if (!btn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const id = btn.getAttribute("data-fav");
    Favorites.toggle(id);
    location.reload();
  });

})();
