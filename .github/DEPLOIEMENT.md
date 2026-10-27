# Déploiement du site de l'AFC

Le site existe à deux endroits, qui servent le même contenu.

| | Vercel | Hostinger |
|---|---|---|
| Rôle | adresse de travail | hébergement du club |
| Mise à jour | automatique | automatique via l'action « Déploiement Hostinger » |

## Ce qui déclenche un déploiement

1. **Une mise à jour du code** poussée sur `main`.
2. **Une publication dans l'application** : lorsqu'un événement est publié,
   retiré ou modifié, le serveur appelle les adresses de reconstruction
   configurées dans son `.env`. Les demandes sont regroupées sur 30 secondes.
3. **À la main**, depuis l'onglet Actions → Déploiement Hostinger →
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
| `FTP_PROTOCOL` | `ftps` | passer à `ftp` si l'hébergement refuse le FTPS |
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

## En cas d'échec

Si l'application est injoignable pendant la fabrication, le générateur
s'arrête, les pages déjà en ligne sont conservées et le déploiement continue :
le site reste simplement sur ses contenus précédents. Le journal de l'action
indique la cause.
