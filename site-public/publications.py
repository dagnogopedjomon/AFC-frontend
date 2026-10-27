"""Fabrication des pages de publications : événements, blog, documents, section « Actualités » de l'accueil."""
import html
import json
from datetime import timezone

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
FLECHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
PITCH = ('<rect x="20" y="20" width="280" height="140" rx="3"/><line x1="160" y1="20" x2="160" y2="160"/>'
         '<circle cx="160" cy="90" r="20"/><rect x="20" y="55" width="36" height="70"/><rect x="264" y="55" width="36" height="70"/>')
GLYPHES = {
    "evenement": '<rect x="140" y="64" width="40" height="40" rx="5"/><path d="M140 78h40M150 58v10M170 58v10"/>',
    "article": '<rect x="142" y="60" width="36" height="46" rx="4"/><path d="M149 74h22M149 84h22M149 94h14"/>',
}
ICONE_DOC = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
             'stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/></svg>')


POSTES_BUREAU = ["Président", "Vice-président", "Secrétaire général", "Trésorier général", "Chargé de l'organisation", "Moyens généraux"]
POSTES_COMMISSAIRES = ["Commissaire aux comptes", "Commissaire aux comptes"]
ROLES_POSTE = {"bureau": "Élu par l'AG", "commissaire": "Contrôle des comptes"}
SHIRT = ('<svg class="shirt" viewBox="0 0 48 48" aria-hidden="true"><path d="M17 6l-9 4-5 9 7 4 2-3v22h24V20l2 3 7-4-5-9-9-4c-1 3-4 5-7 5s-6-2-7-5z" fill="currentColor"/>'
         '<path d="M17 6c1 3 4 5 7 5s6-2 7-5" fill="none" stroke="var(--card)" stroke-width="1.4"/></svg>')


def e(t):
    return html.escape(str(t), quote=True)


def utc(d):
    return d.astimezone(timezone.utc)


def d_long(d):
    d = utc(d)
    return f"{'1er' if d.day == 1 else d.day} {MOIS[d.month - 1]} {d.year}"


def d_jour(d):
    return f"{JOURS[utc(d).weekday()]} {d_long(d)}"


def heure(d):
    d = utc(d)
    return f"{d.hour:02d}:{d.minute:02d}"


def a_une_heure(ev):
    d = utc(ev["debut"])
    return bool(d.hour or d.minute or ev["fin"])


def quand(ev):
    """« samedi 14 novembre 2026 · 16:00 – 18:00 » (heure d'Abidjan = UTC)."""
    s = d_jour(ev["debut"])
    if a_une_heure(ev):
        s += " · " + heure(ev["debut"])
        if ev["fin"]:
            s += " – " + heure(ev["fin"])
    return s


def taille(n):
    if not n:
        return ""
    return f"{n / 1024:.0f} Ko" if n < 1024 * 1024 else f"{n / 1024 / 1024:.1f} Mo".replace(".", ",")


def couverture(img, genre):
    if img:
        return f'<div class="pcover"><img src="{e(img["url"])}" alt="{e(img["alt"])}" loading="lazy"></div>'
    return (f'<div class="pcover"><svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            f'<g fill="none" stroke="currentColor" stroke-width="1.4" opacity=".3">{PITCH}</g>'
            f'<g fill="var(--secondary)" stroke="currentColor" stroke-width="2">{GLYPHES[genre]}</g></svg></div>')


class Liens:
    """Adresses des pages : réelles sur le site, ancres sur les artefacts de prévisualisation."""

    def __init__(self, reel):
        self.reel = reel

    def blog(self, slug=""):
        return ("/blog/" + (slug + "/" if slug else "")) if self.reel else "#actualites"

    def evenements(self, slug=""):
        return ("/evenements/" + (slug + "/" if slug else "")) if self.reel else "#actions"

    def documents(self):
        return "/documents/" if self.reel else "#actualites"


# ───────────────────────── Cartes ─────────────────────────
def carte_article(a, L):
    ext = f"<p>{e(a['extrait'])}</p>" if a["extrait"] else ""
    return (f'<a class="post" href="{L.blog(a["slug"])}" data-cat="{e(a["categorie"])}">{couverture(a["couverture"], "article")}'
            f'<div class="body"><div class="pmeta"><span class="chip">{e(a["categorie"])}</span><time datetime="{utc(a["date"]).date()}">{d_long(a["date"])}</time></div>'
            f'<h3>{e(a["titre"])}</h3>{ext}</div></a>')


def carte_evenement(ev, L):
    lieu = f'<span class="where">{e(ev["lieu"])}</span>' if ev["lieu"] else ""
    n = len(ev["galerie"])
    photos = f'<span class="where">{n} photo{"s" if n > 1 else ""}</span>' if n else ""
    fin = f' data-fin="{utc(ev["fin"]).isoformat()}"' if ev["fin"] else ""
    return (f'<a class="evc" href="{L.evenements(ev["slug"])}" data-debut="{utc(ev["debut"]).isoformat()}"{fin}>{couverture(ev["couverture"], "evenement")}'
            f'<div class="body"><div class="pmeta"><span class="chip" data-chip>Événement</span><time>{d_long(ev["debut"])}</time></div>'
            f'<b>{e(ev["titre"])}</b>{lieu}{photos}</div></a>')


def ligne_document(d):
    info = [x for x in (d["type"].upper() if d["type"] else "", taille(d["taille"]), d_long(d["date"]) if d["date"] else "") if x]
    desc = f"<small>{e(d['description'])}</small>" if d["description"] else ""
    nom = e(d["url"].rsplit("/", 1)[-1])
    return (f'<div class="doc"><span class="ic">{ICONE_DOC}</span><div><b>{e(d["titre"])}</b>{desc}'
            f'<div class="info">{"".join(f"<span>{e(i)}</span>" for i in info)}</div></div>'
            f'<a class="btn" href="{e(d["url"])}" download="{nom}" rel="noopener">Télécharger</a></div>')


def vide(titre, texte):
    return f'<div class="empty"><b>{e(titre)}</b>{e(texte)}</div>'


# ───────────────────────── Pages ─────────────────────────
def entete(crumb, titre_html, lede=""):
    lede = f'<p class="lede">{e(lede)}</p>' if lede else ""
    return (f'<section class="phead"><div class="wrap"><p class="crumb">{crumb}</p>'
            f'<h1 class="display">{titre_html}</h1>{lede}</div></section>')


def page_blog(articles, L):
    cats = [c for c in dict.fromkeys(a["categorie"] for a in articles)]
    if articles:
        onglets = ('<div class="tabs" role="group" aria-label="Catégories"><button type="button" data-f="all" aria-pressed="true">Tout<span>'
                   f'{len(articles)}</span></button>' + "".join(
                       f'<button type="button" data-f="{e(c)}" aria-pressed="false">{e(c)}<span>{sum(1 for a in articles if a["categorie"] == c)}</span></button>'
                       for c in cats) + "</div>")
        corps = f'<div class="toolbar">{onglets}</div><div class="post-grid" id="posts">' + "".join(carte_article(a, L) for a in articles) + "</div>"
    else:
        corps = vide("Aucun article pour le moment", "Les communiqués et les comptes rendus du club seront publiés ici.")
    main = (entete(f'<a href="{L.reel and "/" or "#"}">Accueil</a> — Blog', "Le blog <em>du club.</em>",
                   "Communiqués, comptes rendus et vie de l'Amicale Football Club.")
            + f'<section class="pbody"><div class="wrap">{corps}</div></section>')
    return main, "Blog · Amicale FC", "Communiqués, comptes rendus et vie de l'Amicale Football Club."


def page_article(a, tous, L):
    autres = [x for x in tous if x["slug"] != a["slug"]][:3]
    suite = ""
    if autres:
        suite = ('<div class="section-gap"><h2>À lire <em>aussi</em></h2><div class="post-grid">'
                 + "".join(carte_article(x, L) for x in autres) + "</div></div>")
    auteur = f"<span>Par {e(a['auteur'])}</span>" if a["auteur"] else ""
    cover = f'<div class="pcover"><img src="{e(a["couverture"]["url"])}" alt="{e(a["couverture"]["alt"])}"></div>' if a["couverture"] else ""
    main = (entete(f'<a href="/">Accueil</a> — <a href="{L.blog()}">Blog</a> — {e(a["categorie"])}', e(a["titre"]))
            + f'<section class="pbody"><div class="wrap"><article class="article">{cover}'
              f'<div class="byline"><span class="chip">{e(a["categorie"])}</span><time datetime="{utc(a["date"]).date()}">{d_long(a["date"])}</time>{auteur}</div>'
              f'<div class="prose">{a["html"]}</div><a class="back" href="{L.blog()}">{FLECHE.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")}Tous les articles</a></article>{suite}</div></section>')
    return main, a["titre"] + " · Amicale FC", a["extrait"] or "Amicale Football Club"


def page_evenements(evts, L):
    if evts:
        corps = ('<h2 class="group-title" id="t-upcoming">À venir</h2><div class="ev-grid" id="ev-upcoming" data-sort></div>'
                 '<div id="ev-upcoming-empty" hidden>' + vide("Aucun événement à venir", "Les prochains événements du club apparaîtront ici.") + '</div>'
                 '<h2 class="group-title section-gap" id="t-past">Passés</h2><div class="ev-grid" id="ev-past" data-sort>'
                 + "".join(carte_evenement(v, L) for v in evts) + "</div>")
    else:
        corps = vide("Aucun événement pour le moment", "Matchs, fêtes et actions du club seront publiés ici.")
    main = (entete('<a href="/">Accueil</a> — Événements', "La vie <em>du club.</em>",
                   "Matchs contre d'autres clubs, fêtes et actions caritatives. Les séances du lundi et du jeudi sont dans le calendrier de l'accueil.")
            + f'<section class="pbody"><div class="wrap">{corps}</div></section>')
    return main, "Événements · Amicale FC", "Les événements de l'Amicale Football Club : matchs, fêtes et actions caritatives."


def page_evenement(ev, articles, L):
    faits = [("Quand", quand(ev))] + ([("Où", ev["lieu"])] if ev["lieu"] else [])
    faits_html = '<div class="facts">' + "".join(f"<div><small>{e(k)}</small><b>{e(v)}</b></div>" for k, v in faits) + "</div>"
    cover = f'<div class="pcover"><img src="{e(ev["couverture"]["url"])}" alt="{e(ev["couverture"]["alt"])}"></div>' if ev["couverture"] else ""
    galerie = (f'<h2 class="group-title" style="margin-top:36px">Album · {len(ev["galerie"])} photo{"s" if len(ev["galerie"]) > 1 else ""}</h2><div class="gallery" data-lightbox>'
               + "".join(f'<a href="{e(g["url"])}" data-legende="{e(g["legende"])}"><img src="{e(g["url"])}" alt="{e(g["alt"] or g["legende"])}" loading="lazy"></a>' for g in ev["galerie"])
               + "</div>") if ev["galerie"] else ""
    doc = (f'<p class="linkcard"><a class="btn primary" href="{e(ev["document"]["url"])}" download rel="noopener">{e(ev["document"]["titre"])}</a></p>'
           if ev["document"] else "")
    lie = next((a for a in articles if a["slug"] == ev["article_slug"]), None)
    compte_rendu = (f'<p class="linkcard"><a class="more" href="{L.blog(lie["slug"])}">Lire le compte rendu : {e(lie["titre"])} {FLECHE}</a></p>' if lie else "")
    fin = f' data-fin="{utc(ev["fin"]).isoformat()}"' if ev["fin"] else ""
    main = (entete(f'<a href="/">Accueil</a> — <a href="{L.evenements()}">Événements</a>', e(ev["titre"]))
            + f'<section class="pbody"><div class="wrap"><div class="article" data-debut="{utc(ev["debut"]).isoformat()}"{fin}>{cover}'
              f'<div class="byline"><span class="chip" data-chip>Événement</span></div>{faits_html}'
              f'<div class="prose">{ev["html"]}</div>{doc}{compte_rendu}{galerie}'
              f'<a class="back" href="{L.evenements()}">{FLECHE.replace("M5 12h14M13 6l6 6-6 6", "M19 12H5M11 6l-6 6 6 6")}Tous les événements</a></div></div></section>')
    return main, ev["titre"] + " · Amicale FC", f"{quand(ev)}" + (f" · {ev['lieu']}" if ev["lieu"] else "")


def page_documents(docs):
    if docs:
        corps = ""
        for cat in dict.fromkeys(d["categorie"] for d in docs):
            corps += f'<h2 class="group-title">{e(cat)}</h2><div class="docs">' + "".join(ligne_document(d) for d in docs if d["categorie"] == cat) + "</div>"
    else:
        corps = vide("Aucun document pour le moment", "Le règlement, les statuts publiables et les comptes rendus seront disponibles ici.")
    main = (entete('<a href="/">Accueil</a> — Documents', "Les documents <em>du club.</em>", "Statuts, règlement et comptes rendus à télécharger.")
            + f'<section class="pbody"><div class="wrap">{corps}</div></section>')
    return main, "Documents · Amicale FC", "Statuts, règlement et comptes rendus de l'Amicale Football Club."


# ───────────────────────── Accueil ─────────────────────────
def section_actualites(articles, docs, L):
    """Bloc « Actualités » de l'accueil : trois derniers articles et quatre derniers documents."""
    if articles:
        posts = '<div class="post-grid">' + "".join(carte_article(a, L) for a in articles[:3]) + "</div>"
    else:
        posts = vide("Aucun article pour le moment", "Les communiqués et les comptes rendus du club seront publiés ici.")
    if docs:
        recents = sorted(docs, key=lambda d: d["date"].timestamp() if d["date"] else 0, reverse=True)[:4]
        bloc_docs = ('<div class="wrap sec-head" style="margin-top:72px"><div><p class="label">— Documents</p><h2 class="title" style="font-size:clamp(26px,3vw,36px)">À <em>télécharger</em></h2></div>'
                     f'<a class="more" href="{L.documents()}">Tous les documents {FLECHE}</a></div><div class="wrap"><div class="docs">'
                     + "".join(ligne_document(d) for d in recents) + "</div></div>")
    else:
        bloc_docs = ""
    return ('<section class="block" id="actualites"><div class="wrap sec-head"><div><p class="label">— Actualités</p>'
            '<h2 class="title">Le blog <em>du club.</em></h2></div>'
            f'<a class="more" href="{L.blog()}">Tous les articles {FLECHE}</a></div>'
            f'<div class="wrap">{posts}</div>{bloc_docs}</section>')


def _cle(t):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", str(t).lower()) if unicodedata.category(c) != "Mn").replace("'", "").replace("’", "").strip()


def fiche_effectif(num, groupe, poste, nom, photo, sous_titre, attente):
    cls = {"commissaire": " ref", "membre": " mem"}.get(groupe, "")
    if photo:
        visuel = (f'<img class="ph" src="{e(photo["url"])}" alt="{e(photo["alt"] or nom)}" loading="lazy" decoding="async">')
        cls += " has-photo"
    else:
        visuel = f'<span class="num" aria-hidden="true">{num}</span>{SHIRT}'
    att = ' data-attente="1"' if attente else ""
    return (f'<article class="player{cls}" data-g="{groupe}"{att}>{visuel}<div class="who"><small>{e(poste)}</small>'
            f'<b>{e(nom)}</b><span>{e(sous_titre)}</span></div></article>')


def effectif_html(effectif):
    """Fiches de l'effectif : les 8 postes statutaires (remplis si la personne est publiée, sinon « Nom à compléter »),
    puis les autres personnes publiées. Retourne (fiches, onglets, note)."""
    restants = list(effectif)
    fiches, n = [], 0

    def prendre(groupe, poste):
        for m in restants:
            if m["groupe"] == groupe and _cle(m["poste"]) == _cle(poste):
                restants.remove(m)
                return m
        return None
    for groupe, postes in (("bureau", POSTES_BUREAU), ("commissaire", POSTES_COMMISSAIRES)):
        for poste in postes:
            m = prendre(groupe, poste)
            n += 1
            if m:
                fiches.append(fiche_effectif(n, groupe, poste, f"{m['prenom']} {m['nom']}".strip(), m["photo"], ROLES_POSTE[groupe], False))
            else:
                fiches.append(fiche_effectif(n, groupe, poste, "Nom à compléter", None, ROLES_POSTE[groupe], True))
    for m in restants:  # bureau/commissaires hors postes connus, puis membres
        n += 1
        sous = ROLES_POSTE.get(m["groupe"], "Membre du club") if m["groupe"] != "membre" else (m["poste"] or "Membre du club")
        poste = m["poste"] if m["groupe"] != "membre" else "Membre"
        fiches.append(fiche_effectif(n, m["groupe"], poste or "Membre", f"{m['prenom']} {m['nom']}".strip(), m["photo"], sous, False))
    nb_mem = sum(1 for m in effectif if m["groupe"] == "membre")
    onglets = ('<div class="tabs" role="group" aria-label="Filtrer l\'effectif"><button type="button" data-f="all" aria-pressed="true">Tous</button>'
               '<button type="button" data-f="be" aria-pressed="false">Bureau<span>6</span></button>'
               '<button type="button" data-f="cc" aria-pressed="false">Commissaires<span>2</span></button>'
               f'<button type="button" data-f="mem" aria-pressed="false">Membres{f"<span>{nb_mem}</span>" if nb_mem else ""}</button></div>')
    onglets = onglets.replace('data-f="be"', 'data-f="bureau"').replace('data-f="cc"', 'data-f="commissaire"').replace('data-f="mem"', 'data-f="membre"')
    attente = sum(1 for f in fiches if 'data-attente="1"' in f)
    if attente:
        note = (f'<p class="note"><span class="todo">{attente} fiche{"s" if attente > 1 else ""} à compléter</span>'
                "La page est publique : seules les personnes qui ont accepté que leur nom et leur photo y figurent sont publiées.</p>")
    else:
        note = ""
    return "".join(fiches), onglets, note


def donnees_evenements(evts, L):
    """Données minimales pour le calendrier et le carrousel de l'accueil (JSON inséré dans la page)."""
    return json.dumps([{"slug": v["slug"], "titre": v["titre"], "debut": utc(v["debut"]).isoformat(),
                        "fin": utc(v["fin"]).isoformat() if v["fin"] else None, "lieu": v["lieu"],
                        "heure": a_une_heure(v), "url": L.evenements(v["slug"])} for v in evts],
                      ensure_ascii=False).replace("</", "<\\/")


def carrousel_evenements(evts, L):
    if not evts:
        return vide("Aucun événement pour le moment", "Matchs, fêtes et actions du club seront publiés ici.")
    return "".join(carte_evenement(v, L) for v in evts)
