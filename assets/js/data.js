var Data = (function () {
  async function loadListings() {
    if (window.db) {
      try {
        var snap = await db.collection("listings").get();
        var out = [];

        snap.forEach(function (doc) {
          var obj = doc.data() || {};
          obj.id = doc.id;
          out.push(obj);
        });

        return out;
      }
      catch (e) {
        console.log("Firestore load failed, falling back to JSON.", e);
      }
    }

    var res = await fetch("data/listings.json");
    return await res.json();
  }

  async function getListingById(id) {
    if (!id) {
      return null;
    }

    if (window.db) {
      try {
        var doc = await db.collection("listings").doc(id).get();
        if (doc.exists) {
          var obj = doc.data() || {};
          obj.id = doc.id;
          return obj;
        }
      }
      catch (e) {
        console.log("Firestore get failed, falling back to JSON.", e);
      }
    }

    var listings = await loadListings();
    return listings.find(function (l) {
      return l.id === id;
    }) || null;
  }

  return {
    loadListings: loadListings,
    getListingById: getListingById
  };
})();
