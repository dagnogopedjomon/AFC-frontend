"""Construit le site de l'Amicale Football Club à partir de src/.

    python3 build.py              contenus du dossier contenu/
    python3 build.py --exemple    contenus d'exemple (contenu_exemple/), pour voir le rendu avant de publier
    AFC_API_URL=https://... python3 build.py    contenus lus dans l'API publique de l'application du club

Produit deux sorties :
  deploy_netlify/   le site complet, à déposer sur Netlify (site de test, puis vrai domaine)
  build_artifacts/  les mêmes pages en version Claude (liens vers les artefacts), non versionné

Marqueurs remplacés dans les modèles :
  __LOGO__    logo du club intégré à la page
  __SCENES__  scènes animées des règles (src/regles_scenes.js)
  __RULES__   adresse de la page des règles
  __HOME__    adresse de la page d'accueil
  __APP__     adresse de l'espace membres (connexion à l'application)
  __EXT__     ouverture dans un nouvel onglet (artefacts seulement)
  __CSS_COMMUN__, __CSS_PUBLI__   feuilles de style communes (src/commun.css, src/publications.css)
  __BLOG__, __DOCS__, __EVENTS__  adresses du blog, des documents et des événements
  __ACTUALITES__, __EVENTS_HTML__, __EVENTS_DATA__   contenus publiés (contenu/ ou API)
  __JS_EVENTS__, __JS_LIGHTBOX__   scripts des événements et des albums photo (src/evenements.js, src/lightbox.js)
  __EFFECTIF_HTML__, __EFFECTIF_TABS__, __EFFECTIF_NOTE__   fiches de l'effectif (contenu/effectif.json ou API)

Contenus : voir contenu/LISEZMOI.md.
"""
import base64
import html
import os
import re
import shutil
import sys
from datetime import datetime, timezone

import contenu
import publications as pub

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, "src")
SITE = os.path.join(ICI, "deploy_netlify")
ART = os.path.join(ICI, "build_artifacts")

# Adresses des artefacts Claude (versions de travail partagées par lien)
ART_ACCUEIL = "https://claude.ai/artifact/MvX5saHGvu6zk8hfTirFeL"
ART_REGLES = "https://claude.ai/artifact/TSLE39r9e2c3HVMvajaCd7"
NEW_TAB = ' target="_blank" rel="noopener"'
# Dans les artefacts, l'espace membres n'est pas au même endroit que la page : adresse complète.
ART_APP = "https://amicalefc.com/login"

# Squelette de page pour le site (les artefacts l'ajoutent eux-mêmes à la publication)
HEAD = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F9FAFB">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#14171A">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="apple-touch-icon" href="/logo.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style>
"""


def lire(nom):
    with open(os.path.join(SRC, nom), encoding="utf-8") as f:
        return f.read()


def ecrire(chemin, texte):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(texte)


MARQUEUR = re.compile(r"__[A-Z][A-Z_]*[A-Z]__")


def remplir(modele, valeurs):
    """Remplace les marqueurs en une seule passe : un contenu publié ne peut pas en introduire d'autres."""
    inconnus = sorted(set(MARQUEUR.findall(modele)) - set(valeurs))
    if inconnus:
        raise SystemExit("Marqueurs sans valeur : " + ", ".join(inconnus))
    return MARQUEUR.sub(lambda m: valeurs[m.group(0)], modele)


def page_complete(fragment, og_titre=None, og_desc=None):
    """Place <title>, <meta>, <link> et le premier <style> dans <head>, le reste dans <body>."""
    fin = fragment.index("</style>") + len("</style>")
    tete, corps = fragment[:fin], fragment[fin:]
    og = ""
    if og_titre:
        og = (f'<meta property="og:type" content="website">\n<meta property="og:title" content="{html.escape(og_titre)}">\n'
              f'<meta property="og:description" content="{html.escape(og_desc)}">\n<meta property="og:locale" content="fr_FR">\n')
    return HEAD + og + tete + "\n</head>\n<body>\n" + corps.strip() + "\n</body>\n</html>\n"


def dossier_contenu():
    if "--exemple" in sys.argv:
        return os.path.join(ICI, "contenu_exemple")
    return os.path.join(ICI, "contenu")


def copier_dossier(source, cible):
    if os.path.isdir(source) and os.listdir(source):
        shutil.copytree(source, cible)


def valeurs_communes(logo, scenes, liens, contenus, rules, home, app, ext):
    """Marqueurs partagés par l'accueil, les règles et les pages de publications."""
    evts = contenus["evenements"]
    fiches, onglets, note_effectif = pub.effectif_html(contenus["effectif"])
    return {
        "__EFFECTIF_HTML__": fiches, "__EFFECTIF_TABS__": onglets, "__EFFECTIF_NOTE__": note_effectif, "__JS_LIGHTBOX__": lire("lightbox.js"),
        "__LOGO__": logo, "__SCENES__": scenes, "__RULES__": rules, "__HOME__": home, "__APP__": app, "__EXT__": ext,
        "__CSS_COMMUN__": lire("commun.css"), "__CSS_PUBLI__": lire("publications.css"), "__JS_EVENTS__": lire("evenements.js"),
        "__BLOG__": liens.blog(), "__DOCS__": liens.documents(), "__EVENTS__": liens.evenements(),
        "__ACTUALITES__": pub.section_actualites(contenus["articles"], contenus["documents"], liens),
        "__EVENTS_HTML__": pub.carrousel_evenements(evts, liens), "__EVENTS_DATA__": pub.donnees_evenements(evts, liens),
    }


def page_interieure(gabarit, valeurs, main, titre, desc):
    v = dict(valeurs, __TITRE__=html.escape(titre), __DESC__=html.escape(desc, quote=True), __MAIN__=main)
    return page_complete(remplir(gabarit, v), titre, desc)


def main():
    with open(os.path.join(SRC, "logo.png"), "rb") as f:
        logo = "data:image/png;base64," + base64.b64encode(f.read()).decode()
    scenes = lire("regles_scenes.js")
    accueil, regles, gabarit = lire("accueil.html"), lire("regles.html"), lire("page.html")
    base = dossier_contenu()
    c = contenu.charger(base, os.environ.get("AFC_API_URL"))
    print(f"Contenus ({'API' if os.environ.get('AFC_API_URL') else os.path.relpath(base, ICI)}) : "
          f"{len(c['evenements'])} événement(s), {len(c['articles'])} article(s), {len(c['documents'])} document(s), {len(c['effectif'])} fiche(s) d'effectif")

    # 1. Site Netlify : liens relatifs, même onglet
    L = pub.Liens(True)
    site = valeurs_communes(logo, scenes, L, c, "/regles/", "/", "/login/", "")
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    ecrire(os.path.join(SITE, "index.html"), page_complete(remplir(accueil, site),
           "Amicale Football Club", "Le foot entre amis à Abidjan : séances, règles de jeu et espace membres."))
    ecrire(os.path.join(SITE, "regles", "index.html"), page_complete(remplir(regles, site),
           "Règles de jeu · Amicale FC", "Le Maracana à la sauce AFC, en animation et avec une voix off."))
    ecrire(os.path.join(SITE, "404.html"), page_complete(lire("404.html")))
    shutil.copytree(os.path.join(SRC, "voix"), os.path.join(SITE, "regles", "voix"))
    shutil.copy(os.path.join(SRC, "logo.png"), os.path.join(SITE, "logo.png"))

    # Pages de publications
    main_, titre, desc = pub.page_blog(c["articles"], L)
    ecrire(os.path.join(SITE, "blog", "index.html"), page_interieure(gabarit, site, main_, titre, desc))
    for a in c["articles"]:
        main_, titre, desc = pub.page_article(a, c["articles"], L)
        ecrire(os.path.join(SITE, "blog", a["slug"], "index.html"), page_interieure(gabarit, site, main_, titre, desc))
    main_, titre, desc = pub.page_evenements(c["evenements"], L)
    ecrire(os.path.join(SITE, "evenements", "index.html"), page_interieure(gabarit, site, main_, titre, desc))
    for v in c["evenements"]:
        main_, titre, desc = pub.page_evenement(v, c["articles"], L)
        ecrire(os.path.join(SITE, "evenements", v["slug"], "index.html"), page_interieure(gabarit, site, main_, titre, desc))
    main_, titre, desc = pub.page_documents(c["documents"])
    ecrire(os.path.join(SITE, "documents", "index.html"), page_interieure(gabarit, site, main_, titre, desc))
    copier_dossier(os.path.join(base, "images"), os.path.join(SITE, "images"))
    copier_dossier(os.path.join(base, "fichiers"), os.path.join(SITE, "fichiers"))

    # Site public sur le vrai domaine : l'indexation est ouverte (le bureau a validé le 28/10/2026).
    ecrire(os.path.join(SITE, "robots.txt"),
           "User-agent: *\nAllow: /\n"
           # L'espace membres n'a rien à faire dans les résultats de recherche.
           "Disallow: /dashboard/\n")
    ecrire(os.path.join(SITE, "_headers"),
           "/*\n  X-Content-Type-Options: nosniff\n"
           "  Referrer-Policy: strict-origin-when-cross-origin\n\n"
           "/regles/voix/*\n  Cache-Control: public, max-age=604800\n\n"
           "/images/*\n  Cache-Control: public, max-age=86400\n\n"
           "/fichiers/*\n  Cache-Control: public, max-age=3600\n")

    # 2. Artefacts Claude : liens vers les autres artefacts, nouvel onglet (publications en aperçu sur l'accueil)
    art = valeurs_communes(logo, scenes, pub.Liens(False), c, ART_REGLES, ART_ACCUEIL, ART_APP, NEW_TAB)
    if os.path.isdir(ART):
        shutil.rmtree(ART)
    ecrire(os.path.join(ART, "accueil", "accueil-afc.html"), remplir(accueil, art))
    ecrire(os.path.join(ART, "regles", "regles-afc.html"), remplir(regles, art))
    shutil.copytree(os.path.join(SRC, "voix"), os.path.join(ART, "regles", "voix"))

    nb = sum(len(f) for _, _, f in os.walk(SITE))
    print(f"deploy_netlify/ : {nb} fichiers · build_artifacts/ : prêt")


if __name__ == "__main__":
    main()
