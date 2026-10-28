# Déploiement du site de l'AFC

Le site existe à deux endroits, qui servent le même contenu.

| | Vercel | Hostinger |
|---|---|---|
| Rôle | adresse de travail | hébergement du club |
| Mise à jour | automatique | automatique via l'action « Déploiement Hostinger » |

## Ce qui déclenche un déploiement

1. **Une mise à jour du code** poussée sur `main`.
2. **Une publication dans l'application** : lorsqu'un événement, un document
   ou un article est publié, retiré ou modifié, le serveur appelle les
   adresses de reconstruction configurées dans son `.env`. Les demandes sont
   regroupées sur 30 secondes.
3. **La sortie d'un article programmé** : le serveur vérifie toutes les cinq
   minutes si un article a atteint sa date de parution.
4. **Le bouton « Mettre le site à jour maintenant »**, sur les écrans
   Événements, Documents et Articles du tableau de bord.
5. **À la main**, depuis l'onglet Actions → Déploiement Hostinger →
   « Run workflow ».

## À configurer une seule fois

### Dans ce dépôt — Settings → Secrets and variables → Actions

Onglet **Secrets** :

| Nom | Valeur |
|---|---|
| `FTP_SERVER` | l'adresse FTP donnée par Hostinger |
| `FTP_USERNAME` | l'identifiant FTP |
| `FTP_PASSWORD` | le mot de passe FTP |

Onglet **Variables** (facultatif, des valeurs par défaut existent) :

| Nom | Défaut | Quand le changer |
|---|---|---|
| `API_URL` | `https://agbolo.ci/afc-api` | si l'API change d'adresse |
| `FTP_PORT` | `21` | si Hostinger impose un autre port |

Le premier envoi copie tout le site. Les suivants ne transfèrent que les
fichiers modifiés : l'action garde un état de synchronisation sur le serveur.

### Sur le serveur de l'API — fichier `.env`

| Nom | Rôle |
|---|---|
| `SITE_REBUILD_HOOK_URL` | adresse de déploiement Vercel |
| `SITE_REBUILD_DISPATCH_URL` | `https://api.github.com/repos/dagnogopedjomon/AFC-frontend/dispatches` |
| `SITE_REBUILD_DISPATCH_TOKEN` | jeton GitHub autorisé à écrire sur ce dépôt |

Les trois sont facultatives et indépendantes : sans la première, Vercel ne
sera prévenu que par les mises à jour de code ; sans les deux autres,
Hostinger ne sera mis à jour qu'au prochain envoi de code ou à la main.

S'y ajoute `PUBLIC_API_URL` (`https://agbolo.ci/afc-api`), sans laquelle les
liens d'images et de fichiers envoyés au site sont relatifs — donc cassés dès
qu'un fichier est stocké sur le serveur plutôt que sur Supabase.

#### Créer le jeton GitHub

1. https://github.com/settings/personal-access-tokens → **Generate new token**.
2. **Repository access** → *Only select repositories* → `AFC-frontend`.
3. **Permissions** → *Repository permissions* → **Contents : Read and write**.
   C'est la permission qui autorise `repository_dispatch` ; aucune autre n'est
   nécessaire.
4. Donner une date d'expiration et la noter : à l'échéance, les publications
   cesseront de mettre le site à jour, en silence. L'écran du bureau affiche
   alors « Demande refusée » après un clic sur le bouton de mise à jour.
5. Copier le jeton dans `SITE_REBUILD_DISPATCH_TOKEN` sur le serveur, puis
   redémarrer l'application.

Le jeton n'est affiché qu'une fois. S'il est perdu, il faut en créer un autre
et révoquer l'ancien.

## En cas d'échec

Si l'application est injoignable pendant la fabrication, le générateur
s'arrête, les pages déjà en ligne sont conservées et le déploiement continue :
le site reste simplement sur ses contenus précédents. Le journal de l'action
indique la cause.
