# CollectionMgnt

Version : v0.6-lot4.0

## Backend

### Plugins

* Chargement dynamique
* Validation des manifests
* Validation des fields.json
* Synchronisation SQLite

### Collections

* Création
* Suppression
* Recherche
* Filtrage

### Authentification

* JWT via Authorization: Bearer
* Création automatique du premier admin
* Login
* Utilisateur courant
* Logout stateless
* Protection des routes plugins et items

### Validation dynamique

Types :

* text
* textarea
* select
* checkbox
* date
* number
* rating

Contraintes :

* required
* min
* max
* pattern
* options

## Frontend

### Disponible

* Vue 3
* Router
* i18n
* Dashboard
* Login

### Manquant

* Interface collections
* Upload images

## API exposée

### Auth

* POST /api/auth/login
* GET /api/auth/me
* POST /api/auth/logout

### Plugins

* GET /api/plugins
* GET /api/plugins/:id
* GET /api/plugins/:pluginId/fields
* PATCH /api/plugins/:id

### Items

* GET /api/items
* POST /api/items
* DELETE /api/items/:id

## Décisions d'architecture

* SQLite
* Fastify
* JWT
* Plugins dynamiques
* Métadonnées JSON
* Déploiement cible Synology
* Pas d'inscription publique

## Prochaine étape

À définir
