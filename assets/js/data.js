const Data = (function () {

  let cache = null;

  async function loadListings() {
    if (cache !== null) {
      return cache;
    }

    const res = await fetch("data/listings.json", {
      cache: "no-store"
    });

    const json = await res.json();

    if (Array.isArray(json)) {
      cache = json;
    }
    else {
      cache = [];
    }

    return cache;
  }

  async function getById(id) {
    const list = await loadListings();

    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        return list[i];
      }
    }

    return null;
  }

  return {
    loadListings: loadListings,
    getById: getById
  };

})();
