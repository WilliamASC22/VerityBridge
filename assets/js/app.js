const App = (function () {

  function escape(s) {
    if (s === null || s === undefined) {
      s = "";
    }
    else {
      s = String(s);
    }

    s = s.replaceAll("&", "&amp;");
    s = s.replaceAll("<", "&lt;");
    s = s.replaceAll(">", "&gt;");
    s = s.replaceAll('"', "&quot;");
    s = s.replaceAll("'", "&#039;");

    return s;
  }

  function money(n) {
    let v;

    if (n) {
      v = Number(n);
    }
    else {
      v = 0;
    }

    return v.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  }

  function num(n) {
    let v;

    if (n) {
      v = Number(n);
    }
    else {
      v = 0;
    }

    if (v) {
      return v.toLocaleString();
    }
    else {
      return "—";
    }
  }

  function qs(key) {
    const url = new URL(location.href);
    const params = url.searchParams;
    return params.get(key);
  }

  return {
    escape: escape,
    money: money,
    num: num,
    qs: qs
  };

})();
