# CollectionMgnt

Version : v0.8-lot5.11

## État du projet

Backend : opérationnel

Frontend :

- Authentification : opérationnelle
- Dashboard : minimal
- Collections : navigation minimale disponible
- Création item : formulaire dynamique frontend disponible
- Édition item : formulaire dynamique frontend disponible
- Suppression item : disponible depuis la fiche item
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
- Consultation d'un item par id
- Édition d'items côté backend
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
- Nettoyage des fichiers média physiques lors de la suppression d'un item
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
- rating borné par défaut à 0..20 côté backend si `min`/`max` sont absents

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
- Page détail item enrichie
- Navigation collections/items minimale
- Création d'item frontend dynamique via `GET /api/plugins/:pluginId/schema`
- Édition d'item frontend dynamique via `GET /api/items/:id`, `GET /api/plugins/:pluginId/schema` et `PATCH /api/items/:id`
- Suppression d'item depuis la fiche item via `DELETE /api/items/:id`
- Filtres dynamiques frontend par collection depuis les champs `filterable`
- Moteur de formulaires dynamiques frontend :
  - champs fixes `title` obligatoire et `description` optionnel
  - champs dynamiques depuis `schema.fields`
  - préremplissage via `initialValue`
  - libellés de soumission configurables
  - types supportés : text, textarea, select, checkbox, date, number, rating
  - validation légère : required, min, max, pattern, options
  - rating borné par défaut à 0..20 avec step UI à 1
  - fallback texte pour les select sans options
  - conversion number/rating avant création ou édition
  - conservation des checkbox à `false`
  - affichage des erreurs frontend et backend
  - création via `POST /api/items`
  - édition via `PATCH /api/items/:id`
  - redirection vers `/items/:id` après création ou édition
- Galerie médias frontend minimale
- Routes frontend protégées :
  - `/dashboard`
  - `/collections`
  - `/collections/:pluginId/items`
  - `/collections/:pluginId/items/new`
  - `/items/:id`
  - `/items/:id/edit`
- Composants formulaire frontend :
  - `DynamicForm.vue`
  - `DynamicField.vue`
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
- Interface complète d'upload images
- Galerie médias avancée

### Limitations connues

- Chargement N+1 des médias/thumbnails dans les listes items
- Pas de pagination
- Pas encore de tri configurable
- Pas encore de recherche globale multi-collections
- Les champs `searchable` ne sont pas encore exploités par la recherche backend
- Certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict
- Pas encore d'édition des métadonnées de types non supportés
- Pas encore de mise en page avancée de la fiche item
- Certains types déclarés dans `docs/plugin-api.md` ne sont pas encore validés par le backend

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
- `GET /api/items/:id`
- `POST /api/items`
- `PATCH /api/items/:id`
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
- Déploiement Docker auto-hébergé
- Plateforme prioritaire/testée/documentée : Synology NAS
- Compatible avec tout environnement Docker disposant d'un volume persistant
- Pas d'inscription publique

---

## Fonctionnalités prévues

### Lot 5.6 - Création item frontend dynamique

#### Livré

- Route protégée `/collections/:pluginId/items/new`
- Bouton `Nouvel item` depuis la liste d'une collection
- Chargement du schéma plugin via `GET /api/plugins/:pluginId/schema`
- Formulaire dynamique frontend pour les types validés par le backend :
  - text
  - textarea
  - select
  - checkbox
  - date
  - number
  - rating
- Validation frontend légère :
  - required
  - min/max
  - pattern
  - options select
- Conversion des champs number/rating en nombres avant `POST /api/items`
- Conservation des checkboxes `false` dans `metadata`
- Redirection vers `/items/:id` après création

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

### Lot 5.7 - Backend édition item

#### Livré

- `GET /api/items/:id`
- `PATCH /api/items/:id`
- Chargement de l'item existant avant édition
- Retour 404 si l'item est absent
- Refus du changement de plugin d'un item
- Réutilisation de la validation dynamique backend
- Mise à jour de `title`, `description`, `metadata` et `updated_at`
- Conservation des métadonnées inconnues existantes
- Retour de l'item mis à jour avec `metadata` parsé
- Retour du code plugin et du nom d'affichage plugin sur le détail item

### Lot 5.8 - Frontend édition item

#### Livré

- Route protégée `/items/:id/edit`
- Service frontend `getItem(id)`
- Service frontend `updateItem(id, payload)`
- Préremplissage de `DynamicForm.vue` via `initialValue`
- Libellés configurables pour création et édition
- Chargement du schéma plugin de l'item avant édition
- Sauvegarde via `PATCH /api/items/:id`
- Redirection vers `/items/:id` après modification
- Page détail item enrichie :
  - titre
  - description
  - plugin
  - métadonnées dynamiques
  - dates de création et modification
  - bouton `Modifier`
- Galerie média conservée sur la page détail

### Lot 5.8.1 - Bornage des champs rating

#### Livré

- Type `rating` borné par défaut à 0..20 côté backend
- Attributs frontend par défaut `min=0`, `max=20` et `step=1` pour les champs `rating`
- Surcharge possible via `min`, `max` et `step` dans le schéma plugin
- Aucun bornage par défaut ajouté aux champs `number`
- `step` reste une contrainte UI uniquement pour ce lot

### Lot 5.9 - Suppression item frontend

#### Livré

- Bouton `Supprimer` depuis la fiche item
- Confirmation explicite avant suppression avec le titre réel de l'item
- Suppression via `DELETE /api/items/:id`
- État de suppression et affichage des erreurs inline
- Redirection vers `/collections/:pluginId/items?deleted=1` après suppression
- Message `Item supprimé.` dans la liste de collection après redirection
- Suppression depuis la liste volontairement non intégrée dans ce lot
- Limitation connue à ce stade du Lot 5.9 : les fichiers média associés n'étaient pas encore nettoyés sur disque lors de la suppression d'un item

### Lot 5.10 - Nettoyage des fichiers média lors de la suppression d'un item

#### Livré

- `DELETE /api/items/:id` retourne 404 si l'item est absent
- Suppression DB de l'item avant nettoyage disque
- Suppression des lignes `media` par cascade SQLite `ON DELETE CASCADE`
- Nettoyage best-effort du dossier `backend/data/uploads/items/{itemId}`
- Suppression physique des sous-dossiers `originals`, `images` et `thumbs`
- Les dossiers ou fichiers déjà absents sont acceptés
- Les erreurs de nettoyage disque sont logguées sans annuler la suppression DB

### Lot 5.11 - Filtres avancés frontend dans une collection

#### Livré

- Filtres dynamiques générés depuis `schema.fields`
- Seuls les champs déclarés `filterable` sont proposés comme filtres
- Recherche titre existante conservée
- Contrôles frontend adaptés aux types text, textarea, select, checkbox, date, number et rating
- Bornes rating frontend par défaut `min=0`, `max=20`, `step=1`
- Affichage des filtres actifs
- Bouton `Réinitialiser`
- Message `Item supprimé.` conservé après redirection avec `?deleted=1`
- Les filtres backend disponibles restent basés sur `GET /api/items`
- Certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict
- Les champs `searchable` ne sont pas encore utilisés pour une recherche multi-champs

### Lots suivants

- Lot 5.12 - Recherche backend sur champs `searchable` ou clarification backend des filtres typés
- Interface de gestion des collections
- Galerie médias avancée
- Sauvegarde / restauration
- Internationalisation complète
- Interface d'administration

## Principes du projet

- Déploiement Docker auto-hébergé
- Plateforme prioritaire : Synology NAS
- Compatible avec tout environnement Docker disposant d'un volume persistant
- SQLite privilégié
- Pas d'inscription publique
- Plugins comme unité fonctionnelle
- Métadonnées stockées en JSON
- Priorité à la simplicité de déploiement
- Pas de dépendances inutiles
- Frontend piloté par les schémas plugins
