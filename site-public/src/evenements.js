/* Événements : étiquette « À venir / En cours / Passé » et tri, calculés à l'ouverture de la page (heure du visiteur),
   pour rester justes même si le site n'a pas été reconstruit depuis la date de l'événement. */
(function () {
  var now = Date.now(), RANK = { live: 0, soon: 1, past: 2 };
  var cards = [].slice.call(document.querySelectorAll("[data-debut]"));
  function etat(c) {
    var d = Date.parse(c.getAttribute("data-debut")), f = c.getAttribute("data-fin") ? Date.parse(c.getAttribute("data-fin")) : d + 3 * 3600000;
    return now < d ? "soon" : now < f ? "live" : "past";
  }
  cards.forEach(function (c) {
    var s = etat(c); c.setAttribute("data-state", s);
    var chip = c.querySelector("[data-chip]");
    if (chip) { chip.className = "chip " + (s === "soon" ? "soon" : s === "live" ? "live" : "past"); chip.textContent = s === "soon" ? "À venir" : s === "live" ? "En cours" : "Passé"; }
  });
  var up = document.getElementById("ev-upcoming"), pa = document.getElementById("ev-past");
  if (up && pa) cards.forEach(function (c) { (c.getAttribute("data-state") === "past" ? pa : up).appendChild(c); });
  [].slice.call(document.querySelectorAll("[data-sort]")).forEach(function (box) {
    var items = [].slice.call(box.children).filter(function (c) { return c.hasAttribute("data-debut"); });
    items.sort(function (a, b) {
      var sa = a.getAttribute("data-state"), sb = b.getAttribute("data-state");
      if (sa !== sb) return RANK[sa] - RANK[sb];
      var da = Date.parse(a.getAttribute("data-debut")), db = Date.parse(b.getAttribute("data-debut"));
      return sa === "past" ? db - da : da - db;
    });
    items.forEach(function (c) { box.appendChild(c); });
  });
  if (up && pa) {
    var none = document.getElementById("ev-upcoming-empty");
    up.hidden = !up.children.length; none.hidden = !!up.children.length;
    document.getElementById("t-past").hidden = !pa.children.length; pa.hidden = !pa.children.length;
  }
})();
