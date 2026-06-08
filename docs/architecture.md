# Architecture

## Vision générale

CollectionMgnt est une application de gestion de collections pensée pour un déploiement Docker auto-hébergé.

La plateforme prioritaire/testée/documentée est Synology NAS, mais l'application n'est pas spécifique à Synology. Elle doit rester compatible avec tout environnement Docker ou Podman disposant d'un volume persistant pour la base SQLite, les médias et les données applicatives.

## Déploiement local

Le Lot 6.0.1 fournit une exécution locale via Docker Compose ou Podman Compose.

- Frontend : build Vite servi en statique par Nginx
- Proxy frontend : `/api` vers le service backend
- Backend : Node 22 lancé avec `node src/server.js`
- Données : `DATA_DIR`, défaut `/app/data`
- Plugins : `PLUGINS_DIR`, défaut `/app/plugins`
- Base SQLite : `collection-manager.db`, dérivée de `DATA_DIR`
- Volume persistant : `backend/data`
- Plugins locaux : `backend/plugins` monté en lecture seule

Sur Podman rootless, Bazzite et les environnements SELinux, les volumes bind mount utilisent le label `:Z` pour autoriser l'accès à SQLite et aux médias depuis le conteneur backend.

## Backend

### Fastify

### Services

### Repositories

## Frontend

### Vue

### Pinia

### Router

## Plugins

### Manifest

### Fields

### Validation

## Recherche

### Recherche globale

### Recherche avancée

## Médias

### Upload

### Thumbnails

## Sauvegardes

## Internationalisation
