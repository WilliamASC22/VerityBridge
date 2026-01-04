var Data = (function () {

  var listingsCache = null;

  async function loadListings() {
    if (listingsCache) {
      return listingsCache;
    }

    if (window.db) {
      try {
        var snap = await window.db.collection("listings").get();
        var out = [];

        snap.forEach(function (doc) {
          var obj = doc.data() || {};
          obj.id = doc.id;
          out.push(obj);
        });

        listingsCache = out;
        return out;
      }
      catch (e) {
        console.log("Firestore load failed, falling back to JSON.", e);
      }
    }

    var res = await fetch("data/listings.json");
    var json = await res.json();
    listingsCache = json;
    return json;
  }

  async function getListingById(id) {
    if (!id) {
      return null;
    }

    if (window.db) {
      try {
        var doc = await window.db.collection("listings").doc(id).get();
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
