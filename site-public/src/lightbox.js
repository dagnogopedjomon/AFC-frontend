/* Albums photo : un clic sur une photo l'ouvre en grand ; flèches ← → pour naviguer, Échap pour fermer. */
(function () {
  var albums = [].slice.call(document.querySelectorAll("[data-lightbox]"));
  if (!albums.length) return;
  var box = document.createElement("div");
  box.className = "lb"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo");
  box.innerHTML = '<button type="button" class="lb-x" aria-label="Fermer">×</button><button type="button" class="lb-p" aria-label="Photo précédente">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-n" aria-label="Photo suivante">›</button>';
  document.body.appendChild(box);
  var img = box.querySelector("img"), cap = box.querySelector("figcaption"), items = [], i = 0, opener = null;
  function show(k) {
    i = (k + items.length) % items.length; var a = items[i];
    img.src = a.getAttribute("href"); img.alt = (a.querySelector("img") || {}).alt || "";
    cap.textContent = (a.getAttribute("data-legende") || "") + (items.length > 1 ? "  ·  " + (i + 1) + " / " + items.length : "");
  }
  function open(list, k, from) { items = list; opener = from; box.hidden = false; document.body.style.overflow = "hidden"; show(k); box.querySelector(".lb-x").focus(); }
  function close() { box.hidden = true; document.body.style.overflow = ""; img.removeAttribute("src"); if (opener) opener.focus(); }
  albums.forEach(function (al) {
    var list = [].slice.call(al.querySelectorAll("a"));
    list.forEach(function (a, k) { a.addEventListener("click", function (ev) { ev.preventDefault(); open(list, k, a); }); });
  });
  box.querySelector(".lb-x").addEventListener("click", close);
  box.querySelector(".lb-p").addEventListener("click", function () { show(i - 1); });
  box.querySelector(".lb-n").addEventListener("click", function () { show(i + 1); });
  box.addEventListener("click", function (ev) { if (ev.target === box) close(); });
  document.addEventListener("keydown", function (ev) {
    if (box.hidden) return;
    if (ev.key === "Escape") close(); else if (ev.key === "ArrowLeft") show(i - 1); else if (ev.key === "ArrowRight") show(i + 1);
  });
})();
