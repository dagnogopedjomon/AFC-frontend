# Site de l'Amicale Football Club

Site public du club : page d'accueil et règles de jeu animées avec voix off.
Le site est d'abord mis en ligne sur **Netlify comme site de test**. Toutes les itérations s'y font.
Il passe sur le vrai domaine seulement après validation par le bureau.

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `src/accueil.html` | modèle de la page d'accueil |
| `src/regles.html` + `src/regles_scenes.js` | modèle et scènes animées de la page des règles |
| `src/404.html` | page « introuvable » |
| `src/page.html`, `src/commun.css`, `src/publications.css`, `src/evenements.js` | gabarit des pages intérieures, feuilles de style communes, script des événements |
| `contenu/` | **ce que le club publie** : événements, articles, documents, images (voir `contenu/LISEZMOI.md`) |
| `contenu_exemple/` | contenus d'exemple pour voir le rendu : `python3 build.py --exemple` |
| `contenu.py`, `publications.py` | lecture et contrôle des contenus ; fabrication des pages blog, événements, documents |
| `src/logo.png` | écusson du club (logo de l'appli AFC) |
| `src/voix/` | les 53 fichiers audio de la voix off (`chXX_sYY.mp3`) |
| `src/voix_off/` | script de la voix off en duo et programme qui régénère les fichiers audio |
| `build.py` | fabrique le site à partir de `src/` |
| `deploy_netlify/` | **le site prêt à déposer sur Netlify** (généré, ne pas modifier à la main) |
| `build_artifacts/` | les mêmes pages en version Claude (généré, non versionné) |

## Modifier le site

1. Modifier un fichier dans `src/` (mise en page) ou dans `contenu/` (publications).
2. Lancer `python3 build.py` dans ce dossier.
3. Vérifier `deploy_netlify/index.html` dans un navigateur.
4. Enregistrer la version : `git add -A && git commit -m "ce qui a changé"`.

## Déposer sur Netlify (site de test)

**Première fois, sans compte technique :**
1. Ouvrir https://app.netlify.com/drop (compte Netlify gratuit).
2. Glisser le dossier `deploy_netlify` dans la page.
3. Netlify donne une adresse du type `https://nom-au-hasard.netlify.app`. On peut la renommer dans *Site configuration > Change site name*.

**Mises à jour suivantes :** dans le site Netlify, onglet *Deploys*, glisser à nouveau le dossier `deploy_netlify`.
L'adresse ne change pas.

**Avec la ligne de commande (facultatif) :**
`npx netlify-cli deploy --dir=deploy_netlify` (aperçu), puis `--prod` pour publier.

## Réglages du site de test

- `robots.txt` ouvre l'indexation sauf `/dashboard/` (l'espace membres n'a rien à faire dans les résultats de recherche).
- Les fichiers audio sont mis en cache 7 jours.

## Avant de passer sur le vrai domaine

- [ ] Validation du contenu par le bureau.
- [ ] Remplir les éléments marqués « à compléter » : noms et photos des membres (avec leur accord), liens des réseaux sociaux, contact pour le parrainage, événements.
- [ ] Confirmer l'horaire des séances (19 h 30 – 21 h 00) et mettre à jour l'article 8 du règlement intérieur (séances du lundi et du jeudi).
- [x] Retirer le blocage des moteurs (`Disallow: /` et `X-Robots-Tag: noindex`) dans `build.py` — fait le 28/10/2026.
- [ ] Ajouter une image de partage (`og:image`) avec l'adresse définitive.
- [x] Adresse choisie le 28/10/2026 : `amicalefc.com` sert tout, vitrine et espace membres, depuis le même dépôt (`public_html` sur Hostinger). Le lien « Accès membres » est donc interne (`/login/`, marqueur `__APP__`) et s'ouvre dans le même onglet. Reste à rattacher le domaine à `public_html` dans hPanel et à arrêter l'ancienne application Node.
- [ ] Brancher le domaine dans Netlify : *Domain management > Add a domain*.

## Voix off

Script : `src/voix_off/Script_voix_off_duo.txt` (Vivienne explique, Rémy annonce les sanctions).
Pour refaire un fichier après correction du texte :

```
pip install edge-tts
python3 src/voix_off/generer_voix.py ch05_s02
python3 build.py
```

Le texte affiché à l'écran (sous-titres) est dans `src/regles_scenes.js` : il doit rester identique au script.

## Charte

Couleurs et polices **de l'appli AFC de Zorkot** : Fraunces léger avec un mot en italique bleu, Inter, JetBrains Mono,
bleu `hsl(214 58% 44%)`, fond quadrillé, thème clair et sombre. Le terrain des règles reste vert.
