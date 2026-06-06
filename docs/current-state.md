# CollectionMgnt

Version : v0.8-lot5.5

## État du projet

Backend : opérationnel

Frontend :

- Authentification : opérationnelle
- Dashboard : minimal
- Collections : navigation minimale disponible
- Médias : backend disponible, galerie frontend minimale disponible

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
- Stockage disque dans `backend/data/uploads/items/{itemId}`
- Validation réelle du contenu image avec Sharp
- Génération d'une image optimisée WebP
- Génération d'une miniature WebP
- Vérification du type WebP généré (`image/webp`, RIFF/WEBP)
- Liste des médias d'un item
- Consultation des métadonnées média
- Service du fichier original
- Service de la miniature
- Suppression média + fichiers associés
- Définition de l'image principale
- Garantie d'une seule image principale par item
- Promotion automatique de la plus ancienne image restante si l'image principale est supprimée

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
- Support `FormData` dans le service API frontend
- Support des réponses `Blob` dans le service API frontend
- Page détail item minimale
- Navigation collections/items minimale
- Galerie médias frontend minimale
- Routes frontend protégées :
  - `/dashboard`
  - `/collections`
  - `/collections/:pluginId/items`
  - `/items/:id`
- Composants collections/items frontend :
  - `CollectionCard.vue`
  - `ItemCard.vue`
- Composants média frontend :
  - `MediaGallery.vue`
  - `MediaThumbnail.vue`
  - `ImageUploader.vue`

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

- Interface collections avancée
- Gestion des plugins
- Création / édition item frontend
- Interface complète d'upload images
- Galerie médias avancée
- Recherche avancée

### Limitations connues

- Chargement N+1 des médias/thumbnails dans les listes items
- Pas de pagination
- Pas encore de formulaire création / édition item
- Page `/items/:id` encore minimale pour les métadonnées item

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
- `GET /api/media/:id/thumb`
- `PATCH /api/media/:id/primary`
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

#### Livré

- Validation du contenu image avec `sharp.metadata()`
- Génération de miniatures
- Conversion WebP
- Organisation disque : `originals`, `images`, `thumbs`
- Route `GET /api/media/:id/thumb`
- Suppression des originaux, images optimisées et miniatures
- Limite de dimensions : 12000 x 12000

### Lot 5.3 - Image principale

#### Livré

- `PATCH /api/media/:id/primary`
- Une seule image principale par item
- Gestion cohérente lors de la suppression d'une image principale

### Lot 5.4 - Galerie frontend

#### Livré

- Route protégée `/items/:id`
- Page détail item minimale
- Lien de test Dashboard vers `/items/1`
- Galerie d'images pour un item
- Upload image depuis le frontend
- Chargement des thumbnails via `fetch` authentifié et `Blob`
- Nettoyage des `objectURL`
- Affichage de l'image principale
- Sélection de l'image principale
- Suppression d'image

### Lot 5.5 - Liste items / navigation collections

#### Livré

- Route protégée `/collections`
- Route protégée `/collections/:pluginId/items`
- Liste des collections basée sur les plugins activés
- Navigation Dashboard vers collections
- Navigation collection vers liste items
- Navigation item vers fiche item
- Recherche simple par titre dans une collection
- Cartes items avec métadonnées simples
- Affichage de l'image principale dans les cartes items
- Chargement des thumbnails via appels média existants
- Limitation connue : chargement N+1 des médias/thumbnails dans les listes

### Lot 5.6 - Création item frontend dynamique

#### Objectifs

- Formulaire de création item basé sur `fields.json`
- Contrôles frontend cohérents avec la validation backend
- Création d'un item depuis une collection

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
