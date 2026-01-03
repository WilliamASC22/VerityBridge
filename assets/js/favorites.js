const Favorites = (function () {

  const KEY = "hc_favs_v1";

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      let arr;

      if (raw) {
        arr = JSON.parse(raw);
      }
      else {
        arr = [];
      }

      if (Array.isArray(arr)) {
        return arr;
      }
      else {
        return [];
      }
    }
    catch (e) {
      return [];
    }
  }

  function write(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function has(id) {
    const arr = read();
    return arr.includes(id);
  }

  function toggle(id) {
    const arr = read();
    const idx = arr.indexOf(id);

    if (idx >= 0) {
      arr.splice(idx, 1);
    }
    else {
      arr.unshift(id);
    }

    write(arr);
    renderFavCount();
    return arr;
  }

  function count() {
    const arr = read();
    return arr.length;
  }

  function renderFavCount() {
    const el = document.getElementById("favCount");

    if (!el) {
      return;
    }

    el.textContent = "❤️ Favorites (" + count() + ")";
  }

  return {
    read: read,
    write: write,
    has: has,
    toggle: toggle,
    count: count,
    renderFavCount: renderFavCount
  };

})();
