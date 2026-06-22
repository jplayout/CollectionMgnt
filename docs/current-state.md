# CollectionMgnt

Version : v0.12-lot10.2.2

## État du projet

Backend : opérationnel

Frontend :

- Authentification : opérationnelle
- Layout global authentifié : disponible
- Administration : fondation MVP disponible
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
- API backend de préférences d'affichage par plugin via la table `settings`
- Préférences d'affichage stockées avec les clés `displayPreferences.<pluginId>`
- Préférences d'affichage sans modification des fichiers `fields.json`
- Plugins standards enrichis pour supporter le dataset de démonstration :
  - `books`
  - `movies`
  - `consoles`
  - `others`
- Aucun champ ISBN, EAN, UPC ou code-barres dans les plugins standards à ce stade
- Dataset officiel de démonstration disponible dans `demo/datasets/collectionmgnt-demo-v1.json`
- Dataset de démonstration importable via l'import JSON natif existant
- Script de pack média de démonstration disponible dans `demo/scripts/install-demo-media.mjs`

### Collections

- Création d'items
- Consultation d'un item par id
- Édition d'items côté backend
- Suppression d'items
- Recherche large via `search` sur titre, description et champs metadata `searchable` du plugin courant
- Recherche legacy par titre via `title`
- Recherche et filtres textuels/select insensibles à la casse simple
- Filtrage par plugin
- Filtrage dynamique sur les champs déclarés `filterable`
- Filtres metadata typés côté backend pour text, textarea, select, checkbox, date, number et rating
- Pagination de `GET /api/items` via `page` et `pageSize`
- Réponse paginée avec `items`, `total`, `page`, `pageSize` et `totalPages`
- Tri configurable de `GET /api/items` via `sort` et `direction`
- Tri disponible sur `title`, `created_at`, `updated_at` et les champs metadata supportés du plugin courant
- Export métier JSON global
- Export métier JSON par collection disponible via API
- Export CSV simple par collection
- Neutralisation des cellules CSV commencant par `=`, `+`, `-` ou `@` pour limiter l'interpretation comme formule par les tableurs
- Dataset de démonstration : 5 collections, 94 items et tableaux `media` vides

### Médias

- Upload d'images originales
- Association d'images aux items
- Pack média de démonstration générant une image PNG principale par item importé via l'API média existante
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
- Audit média global lecture seule pour détecter les incohérences DB/disque
- Cleanup média manuel guidé des candidats disque sûrs depuis l'Administration

### Administration

- Page frontend protégée `/admin`
- Accès depuis le menu utilisateur
- Action `Exporter toutes les données` côté Administration via `GET /api/exports/application.json`
- Action `Importer des données` côté Administration via `POST /api/admin/imports/native-json`
- Import JSON natif en mode `add_only`, sans remplacement, sans suppression et sans restauration des IDs d'origine
- Dataset officiel de démonstration importable depuis Administration > Importer des données
- Audit média lecture seule accessible côté Administration via `GET /api/admin/media-audit`
- Cleanup média manuel guidé via preview obligatoire `POST /api/admin/media-cleanup/preview` puis exécution confirmée `POST /api/admin/media-cleanup/execute`
- Cleanup limité aux fichiers orphelins, fichiers inattendus, dossiers item sans item DB et dossiers item réellement vides
- Cleanup sans suppression ou modification de lignes DB, sans suppression d'item ou ligne `media`, sans suppression de média référencé DB, sans chemins libres fournis par le frontend, sans régénération et sans suppression hors `DATA_DIR/uploads/items`
- Sauvegarde ZIP complète téléchargeable via `GET /api/admin/backup.zip`
- Sauvegarde ZIP contenant une copie SQLite cohérente, les médias physiques sous `DATA_DIR/uploads/items`, l'export JSON natif global, un manifeste et les plugins si `PLUGINS_DIR` est disponible
- Résumé système lecture seule via `GET /api/admin/system-summary`
- Compteurs système : plugins, plugins actifs, items et médias
- Version applicative exposée côté admin sans secrets ni données utilisateurs sensibles
- Accès admin réservé aux utilisateurs `role=admin`
- Réponse `401` si le JWT est absent ou invalide, `403` si l'utilisateur authentifié n'est pas admin
- Aucun écran de gestion utilisateurs, aucun import CSV, aucune restauration ZIP, aucun cloud, aucune planification automatique et aucune sauvegarde incrémentale dans ce lot
- Le dataset de démonstration ne contient aucun fichier média physique et sa réimportation crée de nouveaux items
- Le script média de démonstration importe le dataset en mode `add_only`, génère les images en mémoire et les upload via l'API, sans écriture directe dans SQLite ou `DATA_DIR/uploads`

### Authentification

- JWT via `Authorization: Bearer`
- Création automatique du premier administrateur avec `role=admin`
- Modèle de rôles minimal : `admin` et `user`
- Rôle exposé dans le JWT, la réponse login et `/api/auth/me`
- Limitation de `POST /api/auth/login` à 5 tentatives par fenêtre de 5 minutes
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
- Layout global pour les routes authentifiées
- Barre supérieure persistante avec marque `CollectionMgnt` cliquable vers Collections
- Menu utilisateur avec avatar avec initiale, accès Administration, entrée Mon compte à venir et déconnexion
- Arrivée authentifiée par défaut sur `/collections`
- Redirection de `/dashboard` vers `/collections`
- Authentification JWT
- Restauration de session
- Logout
- Service API centralisé
- Build statique Docker servi par Nginx
- Proxy Nginx `/api` vers le backend Docker
- Support `FormData` dans le service API frontend
- Support des réponses `Blob` dans le service API frontend
- Téléchargement d'export CSV utilisateur depuis la liste d'une collection
- Page détail item enrichie
- Page détail item pilotée par le schéma plugin pour les labels de métadonnées
- Page détail item pilotée par les préférences d'affichage backend pour l'ordre et le masquage des métadonnées
- Navigation collections/items minimale
- Création d'item frontend dynamique via `GET /api/plugins/:pluginId/schema`
- Édition d'item frontend dynamique via `GET /api/items/:id`, `GET /api/plugins/:pluginId/schema` et `PATCH /api/items/:id`
- Suppression d'item depuis la fiche item via `DELETE /api/items/:id`
- Recherche large frontend par collection via le paramètre backend `search`
- Filtres dynamiques frontend par collection depuis les champs `filterable`
- Pagination frontend des listes items avec total, page courante et navigation précédent/suivant
- Tri frontend des listes items avec choix du champ et de la direction
- Vue liste dense alternative pour les listes items
- Cartes items pilotées par les préférences d'affichage backend pour les champs mis en avant et la densité
- Cartes items avec labels issus du schéma plugin quand les préférences sont disponibles
- Panneau d'édition des préférences d'affichage depuis la liste d'une collection
- Édition frontend des champs mis en avant, de leur ordre, de la densité des cartes, de l'ordre détail et des champs masqués
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
- Page Administration MVP avec sections Données, Sauvegarde, Médias et Système
- Accès Administration depuis le menu utilisateur
- Action `Importer des données` depuis la section Données de l'Administration
- Téléchargement de sauvegarde ZIP complète depuis l'Administration
- Export/import natif JSON et sauvegarde ZIP réservés à l'Administration
- Aucun breadcrumb sur les pages racines Collections et Administration
- Breadcrumbs conservés sur les pages hiérarchiques : collection, création, détail item et édition
- Fondations responsive frontend pour tablette/mobile :
  - convention CSS documentée dans le layout : mobile jusqu'à 639px, tablette de 640px à 899px, desktop à partir de 900px
  - paddings globaux ajustés par breakpoint
  - menu utilisateur borné sur petit écran
  - toolbar de liste items renforcée sur tablette/mobile
  - formulaires dynamiques plus confortables au tactile
  - Administration limitée à deux colonnes uniquement en desktop
  - vue Liste responsive : table conservée sur desktop/tablette large, lignes compactes verticales sur mobile
- Preview et exécution confirmée du cleanup média manuel guidé depuis la section Médias de l'Administration
- Routes frontend protégées et redirections :
  - `/dashboard` redirige vers `/collections`
  - `/admin`
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
- Logout depuis le menu utilisateur du layout global

### Disponible mais non encore intégré

- Fichiers de traduction i18n (`fr.json`, `en.json`)

### Manquant

- Interface collections avancée
- Gestion des plugins
- Interface complète d'upload images
- Galerie médias avancée

### Limitations connues

- Chargement N+1 des médias/thumbnails dans les listes items
- Pas encore de recherche globale multi-collections
- Pas de recherche globale multi-plugins sur les metadata `searchable`
- Pas de normalisation complète des accents ou de l'Unicode pour la recherche
- Pas encore de filtres range (`rating_min`, `rating_max`, `date_from`, `date_to`)
- Pas encore d'édition des métadonnées de types non supportés
- Certains types déclarés dans `docs/plugin-api.md` ne sont pas encore validés par le backend
- Pas de refonte mobile complète : les fondations responsive sont en place, mais certains écrans avancés restent à affiner progressivement

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
- `GET /api/plugins/:pluginId/display-preferences`
- `PUT /api/plugins/:pluginId/display-preferences`
- `DELETE /api/plugins/:pluginId/display-preferences`
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

### Administration

- `GET /api/admin/media-audit`
- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`
- `GET /api/admin/backup.zip`
- `GET /api/admin/system-summary`
- `POST /api/admin/imports/native-json`

### Exports

- `GET /api/exports/application.json`
- `GET /api/exports/collections/:pluginId.json`
- `GET /api/exports/collections/:pluginId.csv`

---

## Configuration

### Backend

Variables requises :

- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Variables disponibles pour le déploiement Docker local :

- `PORT`
- `DATA_DIR`
- `PLUGINS_DIR`
- `FRONTEND_PORT`
- `BACKEND_PORT`

`DATABASE_PATH` est dérivé côté backend de `DATA_DIR` et pointe vers `collection-manager.db`.

### Frontend

Variables disponibles :

- `VITE_API_BASE_URL`

### Développement

- Proxy Vite `/api` → `http://localhost:3000`

### Docker local

- `cp .env.example .env`
- `docker compose up --build`
- `docker-compose up --build`
- `podman-compose up --build`
- Frontend disponible sur `http://localhost:8080` par défaut
- Frontend servi en statique par Nginx
- Proxy Nginx `/api` vers `http://backend:3000`
- Backend Node 22 lancé avec `node src/server.js`
- Volume persistant `./backend/data:/app/data:Z`
- Plugins montés en lecture seule via `./backend/plugins:/app/plugins:ro,Z`
- Labels SELinux `:Z` validés sur Podman rootless / Bazzite
- Symptôme possible sans label SELinux : `SQLITE_CANTOPEN` ou `unable to open database file`
- `backend/data` doit exister avant le premier démarrage
- Variables d'exemple documentées dans `.env.example`

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

## CI

- Workflow GitHub Actions `.github/workflows/ci.yml`
- Déclenchement sur push et pull request
- Node 22 utilisé pour les vérifications backend et frontend
- Backend : `npm ci`, `npm run check:syntax`, puis `npm test`
- Tests backend d'intégration via le Node Test Runner natif et Fastify `inject`
- Tests backend exécutés avec une base SQLite temporaire, un `DATA_DIR` temporaire, un secret JWT de test et un admin de test
- Couverture MVP backend : auth login succès/échec, route protégée sans token, résumé système, export JSON applicatif, import natif invalide, backup ZIP smoke test, audit média et cleanup média smoke tests
- Frontend : `npm ci` puis `npm exec vite build`
- Qualité : `git diff --check`
- Docker : build des images backend et frontend après succès des jobs Node
- Aucune publication d'image par le workflow CI
- Pas de Vitest frontend, Playwright, Cypress, couverture de code, Sonar ou Codecov dans ce lot
- Workflow GitHub Actions `.github/workflows/publish.yml`
- Publication GHCR automatique sur push `main`, tags `v*` et déclenchement manuel
- Images publiées :
  - `ghcr.io/<owner>/collectionmgnt-backend`
  - `ghcr.io/<owner>/collectionmgnt-frontend`
- Tags publiés : `latest` sur `main`, tag Git `v*` sur tag, et `sha-*`
- Aucune publication Docker Hub et aucune release GitHub

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
- Lien de test temporaire vers `/items/1`
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
- Navigation initiale vers collections
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

### Lot 5.12 - Recherche backend sur champs searchable

#### Livré

- Paramètre `search` sur `GET /api/items`
- Recherche `search` dans `items.title` et `items.description`
- Recherche `search` dans les metadata déclarées `searchable` quand un plugin courant est fourni
- Champs `searchable` transmis au repository depuis le schéma plugin uniquement
- Combinaison de `search` avec `plugin` et les filtres `filterable` existants
- Compatibilité conservée avec le paramètre legacy `title`
- Combinaison de `title` et `search` en `AND` si les deux paramètres sont présents
- Frontend liste collection basculé sur `search`
- Pas de FTS, pas de tri configurable et pas de recherche metadata globale multi-plugins dans ce lot

### Lot 5.12.1 - Filtres et recherche insensibles à la casse

#### Livré

- Recherche `search` explicitement insensible à la casse simple sur `title`, `description` et metadata `searchable`
- Recherche legacy `title` explicitement insensible à la casse simple
- Filtres metadata `filterable` text, textarea et select insensibles à la casse simple
- Filtres checkbox, number, rating et date conservés stricts
- Post-filtrage frontend aligné sur les mêmes règles
- Pas de normalisation complète des accents ou de l'Unicode

### Lot 5.12.2 - Amélioration de la fiche item

#### Livré

- Chargement du schéma plugin depuis la fiche item quand le plugin est disponible
- Affichage des métadonnées connues dans l'ordre du schéma plugin
- Utilisation des labels de champs du schéma plugin sur la fiche item
- Section `Description` explicite avec fallback `Aucune description.`
- Formatage frontend des valeurs checkbox, date, rating, select, arrays et objets
- Section `Autres informations` pour les métadonnées inconnues du schéma
- Galerie média conservée sous la fiche item

### Lot 5.13 - Clarification des filtres typés backend

#### Livré

- Parsing backend des filtres metadata selon le type déclaré dans le schéma plugin
- Rejet des filtres invalides avec réponse 400
- Filtres text, textarea et select conservés insensibles à la casse simple
- Validation des options déclarées pour les filtres select
- Filtres checkbox acceptant uniquement `true` ou `false`, convertis en `1` ou `0` côté backend
- Filtres number et rating comparés numériquement
- Filtres rating bornés par `min`/`max`, avec défaut 0..20
- Filtres date limités aux dates réelles au format `YYYY-MM-DD`
- Post-filtrage frontend supprimé pour les types maintenant gérés côté backend
- Pas de filtres range dans ce lot

### Lot 6.0.1 - Dockerisation locale

#### Livré

- Exécution locale via `docker compose up --build`
- Exécution locale validée aussi via `podman-compose up --build`
- Backend Docker Node 22 avec commande de production `node src/server.js`
- Port backend configurable via `PORT`, avec défaut 3000
- Chemins backend configurables via `DATA_DIR` et `PLUGINS_DIR`
- SQLite et médias persistés dans `./backend/data:/app/data:Z`
- Plugins montés dans le conteneur backend via `./backend/plugins:/app/plugins:ro,Z`
- Frontend construit avec Vite puis servi en statique par Nginx
- Proxy Nginx `/api` vers le service backend
- Port frontend public configurable via `FRONTEND_PORT`, avec défaut 8080
- Correctif SELinux `:Z` validé sur Podman rootless / Bazzite
- Documentation Docker locale dans `docs/deployment-docker.md`

### Lot 6.0.2 - CI GitHub Actions

#### Livré

- Workflow GitHub Actions minimal dans `.github/workflows/ci.yml`
- Exécution à chaque push et pull request
- Job backend sur Ubuntu latest et Node 22
- Installation backend via `npm ci`
- Vérification syntaxique backend via `node --check` sur les fichiers JavaScript de `backend/src`
- Job frontend sur Ubuntu latest et Node 22
- Installation frontend via `npm ci`
- Build frontend via `npm exec vite build`
- Job Docker dépendant des jobs backend et frontend
- Build de `backend/Dockerfile` avec le tag local `collectionmgnt-backend`
- Build de `frontend/Dockerfile` avec le tag local `collectionmgnt-frontend`
- Pas de publication GHCR, Docker Hub ou release GitHub dans ce lot
- Aucun test applicatif n'est lancé actuellement, faute de script `test` existant

### Lot 6.0.3 - Publication automatique GHCR

#### Livré

- Workflow GitHub Actions `Publish Container Images` dans `.github/workflows/publish.yml`
- Déclenchement sur push `main`, tags `v*` et `workflow_dispatch`
- Permissions GitHub Actions `contents: read` et `packages: write`
- Vérification backend avant publication :
  - Node 22
  - `npm ci`
  - `node --check` sur les fichiers JavaScript de `backend/src`
- Vérification frontend avant publication :
  - Node 22
  - `npm ci`
  - `npm exec vite build`
- Login GHCR via `docker/login-action` et `GITHUB_TOKEN`
- Normalisation du propriétaire GitHub en minuscules pour les noms d'images
- Publication de `ghcr.io/<owner>/collectionmgnt-backend`
- Publication de `ghcr.io/<owner>/collectionmgnt-frontend`
- Tags publiés :
  - `sha-*` à chaque publication
  - `latest` uniquement depuis `main`
  - tag Git exact uniquement depuis les tags `v*`
- Pas de Docker Hub, pas de GitHub Release, pas de multi-arch, pas de cosign, pas de SBOM et pas de scan sécurité dans ce lot

### Lot 7.0.1 - Préférences d'affichage backend

- API backend persistante de préférences d'affichage par plugin
- Routes protégées `GET`, `PUT` et `DELETE` sur `/api/plugins/:pluginId/display-preferences`
- Stockage dans la table `settings` avec les clés `displayPreferences.<pluginId>`
- Préférences par défaut calculées depuis le schéma plugin
- Validation stricte des champs depuis le schéma plugin
- Densités acceptées : `comfortable` et `compact`
- Rejet des champs inconnus et densités invalides avec réponse 400
- Aucun changement des plugins, des fichiers `fields.json` ou du frontend

### Lot 7.0.2 - Consommation frontend des préférences d'affichage

- Frontend branché sur `GET /api/plugins/:pluginId/display-preferences`
- Cartes items affichant les champs `list.highlightedFields` dans l'ordre des préférences
- Cartes items utilisant les labels du schéma plugin au lieu des clés techniques quand le schéma et les préférences sont disponibles
- Cartes items appliquant la densité `comfortable` ou `compact`
- Fiche détail appliquant `details.fieldOrder` et `details.hiddenFields`
- Section `Autres informations` conservée pour les métadonnées inconnues du schéma plugin
- Formatage metadata partagé côté frontend
- Aucun panneau d'édition, de sauvegarde ou de reset des préférences dans ce lot

### Lot 7.0.3 - Panneau d'édition des préférences d'affichage

- Bouton `Affichage` disponible dans la liste d'une collection
- Panneau inline d'édition des préférences d'affichage
- Édition des champs affichés sur les cartes via `list.highlightedFields`
- Réordonnancement des champs affichés avec boutons `Monter` et `Descendre`
- Édition de la densité des cartes : `comfortable` ou `compact`
- Édition de l'ordre des champs de fiche détail via `details.fieldOrder`
- Masquage des champs de fiche détail via `details.hiddenFields`
- Sauvegarde via `PUT /api/plugins/:pluginId/display-preferences`
- Réinitialisation via `DELETE /api/plugins/:pluginId/display-preferences`
- Fermeture du panneau après sauvegarde ou réinitialisation réussie
- Aucun drag & drop, format rating/date avancé, champ principal alternatif ou vue liste dense dans ce lot

### Lot 5.14 - Pagination des listes items

- `GET /api/items` paginé avec `page` et `pageSize`
- Valeurs par défaut : `page=1`, `pageSize=24`
- `pageSize` borné de 1 à 100
- Paramètres `page` ou `pageSize` invalides rejetés avec une réponse 400
- Réponse enveloppée : `items`, `total`, `page`, `pageSize`, `totalPages`
- Recherche `search`, recherche legacy `title`, filtres `filterable` et filtrage plugin combinables avec la pagination
- Liste frontend avec total d'items, page courante et boutons `Précédent` / `Suivant`
- Retour automatique à la première page lors d'une recherche, d'un changement de filtre ou d'une réinitialisation
- Retour automatique à une page valide si la page courante devient vide après suppression ou changement externe
- Aucun changement de schéma SQLite, aucun tri configurable, aucune recherche FTS et aucun infinite scroll dans ce lot

### Lot 5.15 - Tri configurable des listes items

- `GET /api/items` accepte `sort` et `direction`
- Valeurs par défaut : `sort=title`, `direction=asc`
- Le tri par défaut utilise `title`, champ obligatoire commun à tous les items
- Champs système triables : `title`, `created_at`, `updated_at`
- Le tri `sort=created_at`, `direction=desc` reste disponible explicitement
- Champs metadata triables depuis le schéma plugin courant pour les types text, textarea, select, date, number, rating et checkbox
- `sort` ou `direction` invalides rejetés avec une réponse 400
- Tri metadata sans plugin connu rejeté avec une réponse 400
- Tri appliqué avant `LIMIT` / `OFFSET`, avec total inchangé
- Tie-breaker stable via `id`
- Recherche `search`, recherche legacy `title`, filtres `filterable`, filtrage plugin et pagination combinables avec le tri
- Liste frontend avec sélecteurs `Trier par` et `Ordre`
- Changement de tri ramenant automatiquement à la première page
- Fallback frontend vers `sort=title`, `direction=asc` si un tri metadata devient invalide après changement de schéma
- Aucun changement de schéma SQLite, aucune propriété plugin `sortable`, aucun tri multi-colonnes, aucune recherche FTS et aucune vue liste dense dans ce lot

### Lot 5.16 - Vue liste dense des items

- Vue cartes conservée par défaut dans les listes items
- Bascule frontend locale `Cartes` / `Liste`
- Vue liste dense alimentée par les mêmes items déjà chargés que la vue cartes
- Colonnes MVP : `Titre`, champs metadata de `list.highlightedFields` et action `Ouvrir`
- Formatage des valeurs metadata partagé avec les cartes et la fiche détail
- Valeurs metadata vides affichées `—`
- Recherche, filtres, tri et pagination conservés en vue liste
- Préférences d'affichage existantes réutilisées sans nouvelle préférence `table.columns`
- Pas de vue de données avancée : aucun tri par header, redimensionnement de colonnes, édition inline, sélection de colonnes CSV ou configuration dédiée des colonnes
- Aucun changement backend, API, schéma SQLite, plugins ou thumbnails en liste dans ce lot

### Lot 5.16.1 - Navigation retour et contexte de liste

- Contexte des listes items représenté dans la query frontend
- Paramètres conservés : recherche, filtres dynamiques, page, taille de page, tri, direction et mode `Cartes` / `Liste`
- Liens `Ouvrir` depuis les cartes et la liste dense transmettant un `returnTo`
- Retour depuis la fiche item vers la liste avec le contexte conservé
- Libellé de retour fiche item stabilisé sur `Retour à la liste`
- Suppression depuis la fiche conservant le contexte de liste et ajoutant `deleted=1`
- Aucun changement backend, API, schéma SQLite, plugins, préférences d'affichage, pagination ou contrat de tri dans ce lot

### Lot 8.0.1 - Export métier JSON et CSV collection

- Routes protégées JWT pour les exports métier
- Export JSON applicatif global via `GET /api/exports/application.json`
- Export JSON d'une collection via `GET /api/exports/collections/:pluginId.json`
- Export CSV d'une collection via `GET /api/exports/collections/:pluginId.csv`
- Format JSON versionné `collectionmgnt.native-export`, `format_version=1`
- Export des plugins, schémas plugin, settings applicatifs non sensibles, items et métadonnées média
- Items exportés avec `source_id`, titre, description, metadata parsé, dates de création et modification
- Médias référencés par métadonnées et URLs API, sans fichiers physiques
- `includes_media_files=false` dans les exports JSON
- CSV collection avec colonnes système puis champs metadata dans l'ordre du schéma plugin
- En-têtes CSV basés sur `field.name` pour préparer un futur import stable
- Pas d'import, pas de restauration, pas de ZIP, pas de dump SQLite et aucun changement de schéma SQLite dans ce lot

### Lot 8.1.1 - Audit média lecture seule

- Route protégée `GET /api/admin/media-audit`
- Audit global en lecture seule des incohérences entre la table `media`, les items et les fichiers sous `DATA_DIR/uploads/items`
- Détection DB vers disque : item manquant, filename vide, original manquant, image optimisée manquante et thumbnail manquant
- Détection disque vers DB : dossier item sans item DB, fichier sans ligne media correspondante, fichier inattendu et dossier item vide
- Rapport JSON avec `summary`, `dbIssues`, `filesystemIssues`, `cleanupCandidates` et `warnings`
- Chemins exposés relatifs à `DATA_DIR`, sans chemins absolus
- Aucune suppression, aucune modification DB, aucune régénération d'image et aucun changement de schéma SQLite dans ce lot

### Lot 9.0.1 - Fondation Administration

- Route frontend protégée `/admin`
- Lien `Administration` ajouté dans l'ancienne navigation d'accueil, sans refonte de la navigation globale
- Section Données avec export JSON global via `GET /api/exports/application.json`
- Section Médias avec lancement manuel de l'audit média lecture seule via `GET /api/admin/media-audit`
- Résumé du dernier audit média exécuté dans la session de page
- Section Système avec version application, nombre de plugins, plugins actifs, items et médias
- Nouvelle route protégée read-only `GET /api/admin/system-summary`
- Résumé système basé uniquement sur des `SELECT COUNT(*)`
- Aucun changement du schéma SQLite
- Aucun rôle utilisateur, aucune gestion utilisateurs, aucun import JSON, aucun cleanup média et aucune sauvegarde ZIP dans ce lot

### Lot 9.0.2 - Import JSON natif CollectionMgnt

- Import JSON natif depuis la section Données de la page Administration
- Route protégée `POST /api/admin/imports/native-json`
- Payload multipart `file`, limité à 10 MB
- Formats acceptés : `format=collectionmgnt.native-export`, `format_version=1`, `scope=application` ou `scope=collection`
- Mode unique `add_only`
- Chaque item importé crée un nouvel item avec un nouvel ID
- Mapping interne des `source_id` pendant l'import, sans restauration des IDs d'origine
- Aucun remplacement, aucune suppression et aucune fusion complexe
- Plugins absents ignorés avec warning
- Plugins désactivés importés avec warning
- Validation des champs connus avec le schéma local courant
- Champs metadata inconnus conservés avec warning
- Métadonnées média comptées comme ignorées, sans création de lignes `media` et sans restauration de fichiers physiques
- Rapport d'import avec collections traitées, items créés, items ignorés, médias ignorés, erreurs et warnings
- Aucun changement du schéma SQLite
- Aucun import CSV, aucune sauvegarde ZIP et aucune restauration média physique dans ce lot

### Lot 9.0.3 - Cleanup média manuel guidé

- Cleanup média manuel guidé depuis la section Médias de la page Administration
- Routes protégées `POST /api/admin/media-cleanup/preview` et `POST /api/admin/media-cleanup/execute`
- Preview obligatoire avec IDs déterministes générés côté backend
- Execute limité aux IDs de candidats et recalculant le preview côté backend avant suppression
- Candidats sûrs limités à `FILE_WITHOUT_MEDIA_ROW`, `UNEXPECTED_FILE`, `ITEM_FOLDER_WITHOUT_ITEM` et `EMPTY_ITEM_FOLDER`
- Suppression uniquement sous `DATA_DIR/uploads/items`
- Aucun chemin libre accepté depuis le frontend
- Aucun changement DB, aucune suppression de ligne DB, aucun item supprimé, aucune ligne `media` supprimée, aucune régénération et aucune réparation DB
- UI avec liste de candidats, sélection manuelle, confirmation obligatoire et rapport d'exécution
- Aucun changement du schéma SQLite
- Aucun cleanup automatique, aucune sauvegarde ZIP et aucune restauration média physique dans ce lot

### Lot 9.0.4 - Sauvegarde ZIP complète

- Route protégée `GET /api/admin/backup.zip`
- Téléchargement depuis la page Administration
- Archive ZIP streamée avec `manifest.json`, `database/collection-manager.db`, `media/uploads/items`, `plugins` et `exports/application.json`
- Copie SQLite cohérente créée via `db.backup()` avant archivage
- Export JSON natif global réutilisé sous `exports/application.json`, sans changement du contrat export existant
- Médias physiques inclus depuis `DATA_DIR/uploads/items` si présents
- Plugins inclus depuis `PLUGINS_DIR` si présent
- Manifest sans chemins absolus, avec version, date, compteurs, tailles et warnings
- Le ZIP est sensible car il contient la DB complète, incluant les utilisateurs et `password_hash`
- Aucun changement du schéma SQLite
- Aucune restauration ZIP, aucun cloud, aucun stockage distant, aucune planification automatique, aucune sauvegarde incrémentale et aucun historique/rétention dans ce lot

### Lot 9.0.4.1 - Rationalisation des exports collection

- Interface collection rationalisée autour d'une action unique `Export CSV`
- Export CSV utilisateur conservé depuis la liste d'une collection
- Export JSON collection conservé côté API via `GET /api/exports/collections/:pluginId.json`, mais non exposé dans l'interface collection
- Séparation clarifiée : Administration pour l'export/import natif JSON et la sauvegarde ZIP, Collection pour l'export CSV utilisateur
- Aucun changement backend, API, SQLite ou Administration

### Lot 10.0.1 - Layout global et navigation principale

- Layout global appliqué aux routes authentifiées
- Barre supérieure persistante avec marque `CollectionMgnt` cliquable vers Collections
- Menu utilisateur avec avatar avec initiale, entrée Administration, entrée `Mon compte` marquée à venir et déconnexion
- Login sans redirect explicite redirigé vers `/collections`
- Route `/dashboard` conservée comme compatibilité et redirigée vers `/collections`
- Dashboard retiré du parcours utilisateur comme écran intermédiaire
- Pas de breadcrumb sur les pages racines Collections et Administration
- Breadcrumbs utilisateur conservés uniquement pour les pages hiérarchiques, sans niveau Dashboard
- Aucun changement backend, API, SQLite, rôles utilisateur ou page profil fonctionnelle

### Lots suivants

- Import CSV CollectionMgnt
- Import CSV externe depuis une autre application de gestion de collection
- Restauration ZIP guidée
- Filtres range sur rating/date
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
