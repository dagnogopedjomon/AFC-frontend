"""Lecture et contrôle des contenus publics : événements, articles, documents.

Deux sources possibles, même format (celui décrit dans le cahier des charges du module « Publications ») :
  - des fichiers dans contenu/                 (par défaut, publiés par Behem avec Claude)
  - l'API publique de l'application du club    (si la variable AFC_API_URL est définie)

Seuls les contenus au statut « publié » sont gardés. Tout texte est nettoyé avant d'entrer dans une page.
"""
import html
import json
import os
import re
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser

CATEGORIES_ARTICLE = ["Vie du club", "Règles", "Communiqués", "Comptes rendus"]
CATEGORIES_DOCUMENT = ["Statuts", "Règlement", "Comptes rendus", "Autres"]
GROUPES_EFFECTIF = ["bureau", "commissaire", "membre"]


class ContenuError(SystemExit):
    pass


def erreur(msg):
    raise ContenuError("Contenu : " + msg)


# ───────────────────────── Nettoyage du texte ─────────────────────────
BALISES = {"p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "a", "img", "blockquote", "br", "hr"}
VIDES = {"img", "br", "hr"}
IGNORER = {"script", "style", "iframe", "object", "embed"}


def url_sure(u):
    u = (u or "").strip()
    return u if re.match(r"^(https?://|mailto:|/|#)", u, re.I) else ""


class Nettoyeur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in IGNORER:
            self.skip += 1
            return
        if self.skip or tag not in BALISES:
            return
        a = dict(attrs)
        if tag == "a":
            href = url_sure(a.get("href"))
            ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
            self.out.append(f'<a href="{html.escape(href)}"{ext}>' if href else "<a>")
        elif tag == "img":
            src = url_sure(a.get("src"))
            if src:
                self.out.append(f'<img src="{html.escape(src)}" alt="{html.escape(a.get("alt") or "")}" loading="lazy">')
        else:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in IGNORER:
            self.skip = max(0, self.skip - 1)
        elif not self.skip and tag in BALISES and tag not in VIDES:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip:
            self.out.append(html.escape(data, quote=False))


def nettoyer_html(texte):
    n = Nettoyeur()
    n.feed(texte or "")
    n.close()
    return "".join(n.out)


# ───────────────────────── Markdown simplifié ─────────────────────────
def _inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", lambda m: f'<img src="{html.escape(m.group(2))}" alt="{m.group(1)}">', t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*([^*\n]+)\*(?!\w)", r"<em>\1</em>", t)
    return t


def markdown(texte):
    """Titres #, ##, ###, paragraphes, listes - et 1., citations >, gras, italique, liens, images, ligne ---."""
    blocs, para, liste, typ = [], [], [], None

    def fin_para():
        nonlocal para
        if para:
            blocs.append("<p>" + "<br>".join(_inline(l) for l in para) + "</p>")
            para = []

    def fin_liste():
        nonlocal liste, typ
        if liste:
            blocs.append(f"<{typ}>" + "".join(f"<li>{_inline(i)}</li>" for i in liste) + f"</{typ}>")
            liste, typ = [], None

    for ligne in (texte or "").replace("\r", "").split("\n"):
        s = ligne.strip()
        m_h = re.match(r"^(#{1,3})\s+(.*)$", s)
        m_ul = re.match(r"^[-*]\s+(.*)$", s)
        m_ol = re.match(r"^\d+[.)]\s+(.*)$", s)
        if not s:
            fin_para(); fin_liste()
        elif m_h:
            fin_para(); fin_liste()
            niveau = len(m_h.group(1)) + 1  # un seul h1 par page : # devient h2
            blocs.append(f"<h{niveau}>{_inline(m_h.group(2))}</h{niveau}>")
        elif s == "---":
            fin_para(); fin_liste(); blocs.append("<hr>")
        elif s.startswith(">"):
            fin_para(); fin_liste(); blocs.append("<blockquote><p>" + _inline(s.lstrip("> ")) + "</p></blockquote>")
        elif m_ul or m_ol:
            fin_para()
            t = "ul" if m_ul else "ol"
            if typ and typ != t:
                fin_liste()
            typ = t
            liste.append((m_ul or m_ol).group(1))
        else:
            fin_liste(); para.append(s)
    fin_para(); fin_liste()
    return nettoyer_html("\n".join(blocs))


# ───────────────────────── Champs ─────────────────────────
def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def slugifier(s):
    return re.sub(r"[^a-z0-9]+", "-", sans_accent(s).lower()).strip("-")


def date(v, ou):
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        erreur(f"date illisible « {v} » ({ou}). Format attendu : 2026-11-14 ou 2026-11-14T16:00:00+00:00")
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def publie(c):
    return sans_accent(str(c.get("statut", "publie"))).lower() in ("publie", "published")


def image(v, ou):
    if not v:
        return None
    if isinstance(v, str):
        v = {"url": v}
    u = url_sure(v.get("url"))
    if not u:
        erreur(f"image sans adresse valide ({ou})")
    return {"url": u, "alt": str(v.get("alt") or ""), "legende": str(v.get("legende") or "")}


def texte(c, cle, base):
    """Corps en HTML (API), en Markdown dans le JSON, ou dans un fichier .md à côté (contenu local)."""
    if c.get(cle + "_html"):
        return nettoyer_html(c[cle + "_html"])
    if c.get(cle + "_md"):
        return markdown(c[cle + "_md"])
    if c.get(cle + "_fichier"):
        chemin = os.path.join(base, c[cle + "_fichier"])
        if not os.path.isfile(chemin):
            erreur(f"fichier introuvable : {c[cle + '_fichier']}")
        with open(chemin, encoding="utf-8") as f:
            return markdown(f.read())
    return ""


def slug_de(c, ou):
    titre = str(c.get("titre") or "").strip()
    if not titre:
        erreur(f"un contenu n'a pas de titre ({ou})")
    slug = slugifier(c.get("slug") or titre)
    if not slug:
        erreur(f"adresse impossible à calculer pour « {titre} »")
    return titre, slug


def evenement(c, base):
    titre, slug = slug_de(c, "événement")
    debut = date(c.get("debut"), "événement « " + titre + " »")
    if not debut:
        erreur(f"l'événement « {titre} » n'a pas de date de début")
    doc = c.get("document")
    return {"slug": slug, "titre": titre, "debut": debut, "fin": date(c.get("fin"), titre), "lieu": str(c.get("lieu") or ""),
            "html": texte(c, "description", base), "couverture": image(c.get("couverture"), titre),
            "galerie": [i for i in (image(g, titre) for g in c.get("galerie") or []) if i],
            "document": {"titre": str(doc.get("titre") or "Document"), "url": url_sure(doc.get("url"))} if isinstance(doc, dict) and doc.get("url") else None,
            "article_slug": c.get("article_slug") or None}


def article(c, base):
    titre, slug = slug_de(c, "article")
    cat = str(c.get("categorie") or "Vie du club")
    d = date(c.get("publie_le"), "article « " + titre + " »")
    if not d:
        erreur(f"l'article « {titre} » n'a pas de date de parution (publie_le)")
    return {"slug": slug, "titre": titre, "extrait": str(c.get("extrait") or ""), "html": texte(c, "corps", base),
            "couverture": image(c.get("couverture"), titre), "categorie": cat, "auteur": str(c.get("auteur") or ""), "date": d}


def document(c, base):
    titre = str(c.get("titre") or "").strip()
    if not titre:
        erreur("un document n'a pas de titre")
    f = c.get("fichier") or {}
    url = url_sure(f.get("url") if isinstance(f, dict) else f)
    if not url:
        erreur(f"le document « {titre} » n'a pas de fichier")
    return {"titre": titre, "description": str(c.get("description") or ""), "categorie": str(c.get("categorie") or "Autres"),
            "date": date(c.get("date"), titre), "url": url, "taille": (f.get("taille_octets") if isinstance(f, dict) else None),
            "type": (f.get("type") if isinstance(f, dict) else None) or os.path.splitext(url)[1].lstrip(".").lower()}


def membre_public(c, base):
    """Fiche d'effectif publiée : uniquement les personnes qui ont accepté (statut « publié »)."""
    nom, prenom = str(c.get("nom") or "").strip(), str(c.get("prenom") or "").strip()
    if not (nom or prenom):
        erreur("une fiche d'effectif n'a ni nom ni prénom")
    groupe = sans_accent(str(c.get("groupe") or "membre")).lower()
    if groupe not in GROUPES_EFFECTIF:
        erreur(f"groupe inconnu « {c.get('groupe')} » pour {prenom} {nom} (attendu : bureau, commissaire, membre)")
    return {"nom": nom, "prenom": prenom, "groupe": groupe, "poste": str(c.get("poste") or ""),
            "photo": image(c.get("photo"), f"{prenom} {nom}"), "ordre": int(c.get("ordre") or 0)}


def verifier_doublons(liste, nom):
    vus = set()
    for c in liste:
        if c["slug"] in vus:
            erreur(f"deux {nom} ont la même adresse « {c['slug']} »")
        vus.add(c["slug"])


# ───────────────────────── Sources ─────────────────────────
def lire_json(chemin):
    if not os.path.isfile(chemin):
        return []
    try:
        with open(chemin, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        erreur(f"{os.path.basename(chemin)} n'est pas un JSON valide (ligne {e.lineno}) : {e.msg}")
    return data.get("data", data) if isinstance(data, dict) else data


def depuis_dossier(base):
    return (lire_json(os.path.join(base, "evenements.json")), lire_json(os.path.join(base, "articles.json")),
            lire_json(os.path.join(base, "documents.json")), lire_json(os.path.join(base, "effectif.json")))


def depuis_api(url):
    def get(chemin):
        req = urllib.request.Request(url.rstrip("/") + chemin, headers={"Accept": "application/json", "User-Agent": "afc-site-build"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.load(r)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            erreur(f"API indisponible ou illisible ({chemin}) : {e}. Le site en ligne reste inchangé.")
        return data.get("data", data) if isinstance(data, dict) else data

    evts, arts, docs = get("/api/public/evenements"), get("/api/public/articles"), get("/api/public/documents")
    try:
        effectif = get("/api/public/effectif")
    except ContenuError:
        effectif = []  # route pas encore fournie par l'application : l'effectif reste sur ses emplacements « à compléter »
    complets = []
    for a in arts:  # la liste peut ne contenir que l'extrait : on demande l'article complet
        if not (a.get("corps_html") or a.get("corps_md")) and a.get("slug"):
            a = get("/api/public/articles/" + a["slug"])
        complets.append(a)
    return evts, complets, docs, effectif


def charger(base, api_url=None, maintenant=None):
    """Retourne {'evenements', 'articles', 'documents'} : publiés, contrôlés, triés."""
    maintenant = maintenant or datetime.now(timezone.utc)
    evts, arts, docs, eff = depuis_api(api_url) if api_url else depuis_dossier(base)
    evenements = [evenement(c, base) for c in evts if publie(c)]
    articles = [article(c, base) for c in arts if publie(c)]
    articles = [a for a in articles if a["date"] <= maintenant]  # parution programmée : pas avant sa date
    documents = [document(c, base) for c in docs if publie(c)]
    verifier_doublons(evenements, "événements")
    verifier_doublons(articles, "articles")
    evenements.sort(key=lambda e: e["debut"])
    articles.sort(key=lambda a: a["date"], reverse=True)
    documents.sort(key=lambda d: (CATEGORIES_DOCUMENT.index(d["categorie"]) if d["categorie"] in CATEGORIES_DOCUMENT else 99,
                                  -(d["date"].timestamp() if d["date"] else 0)))
    effectif = [membre_public(c, base) for c in eff if publie(c)]
    effectif.sort(key=lambda m: (GROUPES_EFFECTIF.index(m["groupe"]), m["ordre"] or 999, m["nom"]))
    return {"evenements": evenements, "articles": articles, "documents": documents, "effectif": effectif}
