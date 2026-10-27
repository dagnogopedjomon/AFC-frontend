# Contenus du site : événements, articles, documents

Ce dossier contient ce que le club publie. Le site est reconstruit à partir de ces fichiers (`python3 build.py`).
Pour voir le rendu avec des contenus d'exemple, sans rien publier : `python3 build.py --exemple`.

Le même format sert à l'API de l'application du club (voir `Cahier_des_charges_module_Publications_AFC_2026-10-15`).
Le jour où l'API existe, `AFC_API_URL=https://… python3 build.py` lit l'API à la place de ces fichiers.

| Fichier ou dossier | Contenu |
|---|---|
| `evenements.json` | liste des événements |
| `articles.json` | liste des articles du blog ; un long texte peut être dans `articles/mon-article.md` |
| `documents.json` | liste des documents à télécharger |
| `effectif.json` | personnes présentées sur l'accueil (nom, poste, photo) |
| `images/` | photos et illustrations (adresse dans les contenus : `/images/nom.jpg`) |
| `fichiers/` | PDF et Word (adresse : `/fichiers/nom.pdf`) |

## Règles communes
- `"statut"` : `"publié"` (par défaut), `"brouillon"` ou `"archivé"`. Seul « publié » apparaît sur le site.
- `"slug"` : adresse courte (`/blog/mon-article/`). Facultatif : calculé à partir du titre.
- Dates : `2026-11-14` ou `2026-11-14T16:00:00+00:00`. Heure d'Abidjan = UTC.
- Texte : `"description_md"` / `"corps_md"` (Markdown simple : `##` titre, `**gras**`, `*italique*`, `- liste`, `[lien](https://…)`, `> citation`), ou `"corps_fichier": "articles/nom.md"`.
- Image : `{ "url": "/images/nom.jpg", "alt": "description de l'image" }`. Poids conseillé : 5 Mo au plus (idéalement moins de 400 Ko).
- Aucune donnée personnelle de membre, et des photos seulement avec l'accord des personnes.

## Événement
```json
{ "titre": "Match contre la corporation X", "debut": "2026-11-14T16:00:00+00:00", "fin": "2026-11-14T18:00:00+00:00",
  "lieu": "Terrain de five, Cocody", "description_md": "Rendez-vous 30 minutes avant.",
  "couverture": { "url": "/images/match.jpg", "alt": "Les deux équipes" },
  "galerie": [], "document": { "titre": "Programme", "url": "/fichiers/programme.pdf" }, "article_slug": null }
```
Les séances du lundi et du jeudi sont calculées par le site : ne pas les saisir.
`article_slug` relie l'événement à son compte rendu publié dans le blog.

## Article
```json
{ "titre": "Compte rendu du repas du club", "extrait": "Deux phrases pour la liste.", "categorie": "Comptes rendus",
  "auteur": "Le Bureau", "publie_le": "2026-09-22T09:00:00+00:00", "couverture": null, "corps_fichier": "articles/repas.md" }
```
Catégories : Vie du club, Règles, Communiqués, Comptes rendus.
Une date `publie_le` dans le futur programme la parution : l'article apparaît à la première reconstruction après cette date.

## Document
```json
{ "titre": "Règles de jeu de l'AFC", "description": "Les adaptations AFC du Maracana.", "categorie": "Règlement",
  "date": "2026-10-15", "fichier": { "url": "/fichiers/regles.pdf", "taille_octets": 568659, "type": "pdf" } }
```
Catégories : Statuts, Règlement, Comptes rendus, Autres.

## Effectif (photos des membres)
```json
{ "prenom": "Koffi", "nom": "Yao", "groupe": "bureau", "poste": "Président",
  "photo": { "url": "/images/membres/koffi-yao.jpg", "alt": "Portrait de Koffi Yao" }, "ordre": 1, "statut": "publié" }
```
- `groupe` : `bureau`, `commissaire` ou `membre`. Pour le bureau et les commissaires, `poste` doit être un des postes des statuts (Président, Vice-président, Secrétaire général, Trésorier général, Chargé de l'organisation, Moyens généraux, Commissaire aux comptes) : la fiche prend alors sa place. Les postes non remplis restent « Nom à compléter ». Pour un membre, `poste` est son poste sur le terrain (facultatif).
- **Une fiche n'est publiée que si la personne a donné son accord** : le statut « publié » vaut accord. Retirer l'accord = passer la fiche en « brouillon » (ou la supprimer) et reconstruire.
- Photo : portrait vertical (3:4), au moins 600 × 800 px, visage au tiers haut, 400 Ko au plus (JPEG ou WebP). Sans photo, un maillot est affiché.

## Albums photo d'un événement
Dans l'événement, `galerie` : liste d'images `{ "url": "/images/albums/…jpg", "alt": "…", "legende": "…" }`. La page de l'événement affiche l'album en grille ; un clic ouvre la photo en grand (flèches pour naviguer, Échap pour fermer). La carte de l'événement indique « N photos ». Poids conseillé : 1600 px de large au plus, 500 Ko par photo.

## Ce que le site vérifie
Un titre ou une date manquants, un JSON mal écrit, un fichier introuvable ou deux contenus de même adresse arrêtent la fabrication avec un message qui dit quoi corriger.
Le HTML est nettoyé : pas de script, pas de lien dangereux.
