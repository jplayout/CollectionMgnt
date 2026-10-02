# Déploiement Docker local

Statut : développement. Version produit canonique : [VERSION](../VERSION).

Ce lot permet une exécution locale avec Docker Compose sur Linux, NAS ou serveur personnel. Synology reste une plateforme prioritaire/testée/documentée, mais la cible principale est le Docker auto-hébergé générique.

## Prérequis

- Node.js 22 pour le lanceur de build
- Podman avec `podman-compose` sur ce système local
- ou Docker avec Compose sur les autres hôtes

## Configuration

Créer un fichier `.env` à la racine à partir de `.env.example`, puis renseigner au minimum :

```bash
cp .env.example .env
```

```env
FRONTEND_PORT=8080
BACKEND_PORT=3000
JWT_SECRET=change-me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
DATA_DIR=/app/data
PLUGINS_DIR=/app/plugins
GOOGLE_BOOKS_API_KEY=
```

`JWT_SECRET` et `ADMIN_PASSWORD` doivent être renseignés pour que le backend démarre et crée le premier administrateur. `ADMIN_USERNAME` est aussi lu depuis `.env`, avec `admin` comme valeur d'exemple.

`DATABASE_PATH` n'est pas une variable d'environnement à fournir. Le backend le dérive de `DATA_DIR` avec le fichier `collection-manager.db`.

## Lancement

```bash
node scripts/container.mjs compose up --build
```

Le lanceur lit automatiquement [VERSION](../VERSION) et le SHA Git local,
sans variable de version dans `.env`. Sur un hôte Docker :

```bash
CONTAINER_ENGINE=docker node scripts/container.mjs compose up --build
```

Les builds utilisent le contexte racine et ajoutent les labels OCI version,
revision et source. Voir la [gouvernance de version](version-governance.md).

L'application est disponible par défaut sur :

```text
http://localhost:8080
```

Le frontend est servi par Nginx. Les appels `/api` sont proxifiés vers le backend interne :

```text
http://backend:3000
```

## Volumes persistants

Les données persistantes sont montées depuis l'hôte :

```text
./backend/data:/app/data:Z
```

Ce volume contient notamment :

- la base SQLite `collection-manager.db`
- les médias uploadés dans `uploads/items`
- les dossiers applicatifs `cache`, `thumbs` et `backups`

Les plugins locaux sont montés en lecture seule :

```text
./backend/plugins:/app/plugins:ro,Z
```

Le suffixe `:Z` applique un label SELinux privé au volume. Il est nécessaire sur Podman rootless, Bazzite et les distributions avec SELinux actif pour permettre au backend d'écrire dans la base SQLite et les médias montés depuis l'hôte. Sans ce label, SQLite peut échouer au démarrage avec `SQLITE_CANTOPEN` ou `unable to open database file`.

Avant le premier démarrage, vérifier que le dossier data existe :

```bash
mkdir -p backend/data
```

## Variables

- `FRONTEND_PORT` : port public du frontend, défaut 8080
- `BACKEND_PORT` : port public optionnel du backend, défaut 3000
- `JWT_SECRET` : secret JWT requis
- `ADMIN_USERNAME` : identifiant du premier administrateur
- `ADMIN_PASSWORD` : mot de passe du premier administrateur, requis
- `DATA_DIR` : chemin data dans le conteneur backend, défaut `/app/data`
- `PLUGINS_DIR` : chemin plugins dans le conteneur backend, défaut `/app/plugins`
- `GOOGLE_BOOKS_API_KEY` : clé requise pour activer le fallback Google Books ;
  vide par défaut, sans obligation pour démarrer l'application

## Validation attendue

- `node scripts/container.mjs compose config --quiet`
- Frontend accessible sur `http://localhost:8080`
- `/api` proxifié vers le backend
- `GET http://localhost:8080/api/plugins` retourne 401 sans token
- Login fonctionnel via le frontend
- Base SQLite accessible dans `/app/data`

## Images GHCR prébuildées

Le Lot 6.0.3 publie automatiquement les images sur GitHub Container Registry :

```text
ghcr.io/jplayout/collectionmgnt-backend:latest
ghcr.io/jplayout/collectionmgnt-frontend:latest
```

Les tags publiés sont :

- `latest` depuis la branche `main`
- tags Git `v*` correspondant aux releases
- tags `sha-*` pour tracer un commit précis

Exemple :

```bash
docker pull ghcr.io/jplayout/collectionmgnt-backend:latest
docker pull ghcr.io/jplayout/collectionmgnt-frontend:latest
```

Les packages GHCR peuvent être privés selon les paramètres GitHub du dépôt ou de l'organisation.

Pour utiliser des images prébuildées au lieu de builder localement, remplacer `build:` par `image:` dans un fichier Compose dédié :

```yaml
services:
  backend:
    image: ghcr.io/jplayout/collectionmgnt-backend:latest
    environment:
      PORT: 3000
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}
      GOOGLE_BOOKS_API_KEY: ${GOOGLE_BOOKS_API_KEY:-}
      DATA_DIR: ${DATA_DIR:-/app/data}
      PLUGINS_DIR: ${PLUGINS_DIR:-/app/plugins}
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    volumes:
      - ./backend/data:${DATA_DIR:-/app/data}:Z
      - ./backend/plugins:${PLUGINS_DIR:-/app/plugins}:ro,Z

  frontend:
    image: ghcr.io/jplayout/collectionmgnt-frontend:latest
    depends_on:
      - backend
    ports:
      - "${FRONTEND_PORT:-8080}:80"
```

## Limites du lot

- Pas de HTTPS.
- Pas de Traefik, Caddy ou reverse proxy externe.
- Pas de stratégie avancée UID/GID pour NAS.
- Pas de sauvegarde automatisée.

## CI

Le Lot 6.0.2 ajoute une CI GitHub Actions minimale qui vérifie le backend, le frontend et le build des images Docker. Elle ne publie aucune image.

La CI actuelle exécute les tests backend et Playwright, le build frontend et
les builds des images. Project Conventions vérifie aussi l'unicité de version.

Le Lot 6.0.3 ajoute un workflow de publication GHCR. Il ne publie pas sur Docker Hub et ne crée pas de release GitHub.

## Configuration Google Books

Renseigner `GOOGLE_BOOKS_API_KEY` dans le `.env` racine pour activer le fallback
ISBN Google Books après Open Library. Le Compose local et
`deploy/compose.synology.yml` transmettent cette variable au backend uniquement,
avec une valeur vide par défaut. Ne pas utiliser de variable `VITE_*`, de build
argument ou de clé réelle dans un fichier versionné.

Après une modification, recréer le backend avec `node scripts/container.mjs compose up -d backend`
pour prendre en compte l'environnement. Sans clé, Open Library reste disponible
et Google Books est désactivé. Une clé valide doit disposer d'un quota utilisable.
Si un provider tenté échoue et qu'aucun résultat n'est trouvé, la recherche
retourne une erreur ; un quota Google Books épuisé devient HTTP 503 /
`provider_unavailable` et n'est pas présenté comme « Aucun résultat trouvé ».
Ne pas partager une sortie `compose config` contenant des secrets.

## English — Google Books configuration

Set `GOOGLE_BOOKS_API_KEY` in the root `.env` to enable Google Books as the ISBN
fallback after Open Library. Both the local and Synology Compose files pass it
only to the backend, with an empty default. The application can start without
it; Google Books is then disabled and Open Library remains available.

Recreate the backend with `node scripts/container.mjs compose up -d backend` after changing its
environment. A valid key also needs available quota. Google Books HTTP 429 maps
to HTTP 503 / `provider_unavailable`. If any attempted provider fails and no
suggestion is found, the request returns an error instead of an empty result.

Never commit a real key or supply it through frontend `VITE_*` variables or
Docker build arguments. Keys remain runtime backend configuration. Do not share
Compose configuration output containing secrets.
