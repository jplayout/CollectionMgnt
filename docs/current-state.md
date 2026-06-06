# CollectionMgnt

Version : v0.7-lot5.1

## État du projet

Backend : opérationnel

Frontend :

- Authentification : opérationnelle
- Dashboard : minimal
- Collections : à implémenter
- Médias : backend disponible, interface frontend à implémenter

---

## Backend

### Plugins

- Chargement dynamique depuis `backend/plugins`
- Validation des manifests
- Validation des `fields.json`
- Synchronisation automatique vers SQLite

### Collections

- Création d'items
- Suppression d'items
- Recherche par titre
- Filtrage par plugin
- Filtrage dynamique sur les champs déclarés `filterable`

### Médias

- Upload d'images originales
- Association d'images aux items
- Stockage disque dans `backend/data/uploads`
- Liste des médias d'un item
- Consultation des métadonnées média
- Service du fichier original
- Suppression média + fichier original
- Définition simple de `is_primary` à l'upload

### Authentification

- JWT via `Authorization: Bearer`
- Création automatique du premier administrateur
- Login
- Utilisateur courant (`/me`)
- Logout stateless
- Protection des routes plugins, items et médias

### Validation dynamique

#### Types supportés

- text
- textarea
- select
- checkbox
- date
- number
- rating

#### Contraintes supportées

- required
- min
- max
- pattern
- options

---

## Frontend

### Disponible

- Vue 3
- Vite
- Pinia
- Vue Router
- Login
- Dashboard
- Authentification JWT
- Restauration de session
- Logout
- Service API centralisé

### Authentification frontend

- Store Pinia auth
- Stockage JWT en `sessionStorage`
- Restauration de session via `GET /api/auth/me`
- Guard Vue Router
- Login frontend
- Dashboard protégé avec logout

### Disponible mais non encore intégré

- Fichiers de traduction i18n (`fr.json`, `en.json`)

### Manquant

- Interface collections
- Gestion des plugins
- Upload images
- Galerie médias
- Recherche avancée

---

## API exposée

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Plugins

- `GET /api/plugins`
- `GET /api/plugins/:id`
- `GET /api/plugins/:pluginId/fields`
- `GET /api/plugins/:pluginId/schema`
- `PATCH /api/plugins/:id`

### Items

- `GET /api/items`
- `POST /api/items`
- `DELETE /api/items/:id`

### Médias

- `POST /api/media`
- `GET /api/items/:id/media`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `DELETE /api/media/:id`

---

## Configuration

### Backend

Variables requises :

- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

### Frontend

Variables disponibles :

- `VITE_API_BASE_URL`

### Développement

- Proxy Vite `/api` → `http://localhost:3000`

---

## Décisions d'architecture

- SQLite comme base principale
- Fastify comme serveur HTTP
- JWT pour l'authentification
- Plugins dynamiques comme unité fonctionnelle
- Métadonnées stockées en JSON
- Déploiement cible : Synology NAS
- Pas d'inscription publique

---

## Fonctionnalités prévues

### Lot 5.1 - Backend upload minimal

#### Livré

- Upload multipart d'images originales
- Association d'images aux items existants
- MIME autorisés : JPEG, PNG, WebP
- Taille maximale : 10 MB
- Stockage par item sous `data/uploads/items/{itemId}/originals`
- API média protégée par JWT
- Lecture du fichier original via API
- Suppression du fichier original avec la ligne `media`
- Support simple de `is_primary` à l'upload

### Lot 5.2 - Miniatures et WebP

#### Objectifs

- Génération de miniatures
- Conversion WebP

### Lot 5.3 - Galerie frontend

#### Objectifs

- Galerie d'images
- Choix avancé de l'image principale
- Upload depuis l'interface collection

### Lots suivants

- Interface de gestion des collections
- Recherche avancée
- Gestion complète des médias
- Sauvegarde / restauration
- Internationalisation complète
- Interface d'administration

## Principes du projet

- Auto-hébergement Synology
- SQLite privilégié
- Pas d'inscription publique
- Plugins comme unité fonctionnelle
- Métadonnées stockées en JSON
- Priorité à la simplicité de déploiement
- Pas de dépendances inutiles
- Frontend piloté par les schémas plugins
