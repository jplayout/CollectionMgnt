# Architecture

Etat courant : v0.12-lot11.3.

Ce document est le point d'entree technique pour comprendre CollectionMgnt en
moins de 30 minutes. Les documents specialises restent la source de detail pour
les exports, les medias, les backups, la recherche et les plugins.

## Vue D'ensemble

CollectionMgnt est une application web auto-hebergee composee de :

- un frontend Vue 3 construit avec Vite ;
- un backend Fastify expose sous `/api` ;
- une base SQLite locale via `better-sqlite3` ;
- un moteur de plugins declaratifs stockes dans `backend/plugins` ;
- un stockage disque des medias sous `DATA_DIR/uploads/items`.

En production Docker, le frontend est servi par Nginx et proxifie `/api` vers le
backend. En developpement, Vite proxifie aussi `/api` vers le backend local.

## Architecture Generale

```text
Utilisateur
    |
    v
Frontend Vue 3
    |
    v
API Fastify
    |
    v
Routes
    |
    v
Services
    |
    v
Repositories
    |
    v
SQLite + DATA_DIR
```

Les routes HTTP restent minces : elles lisent les parametres, appellent les
services ou repositories, puis formatent les reponses. Les services portent la
logique metier ou de maintenance. Les repositories encapsulent les requetes
SQLite.

## Bootstrap Backend

Le demarrage produit est orchestre dans `backend/src/server.js`.

Ordre de bootstrap :

1. `initializeDatabase()`
   - cree `DATA_DIR` si necessaire ;
   - ouvre `DATA_DIR/collection-manager.db` ;
   - applique `schema.sql` si la base n'existe pas encore ;
   - applique les migrations applicatives minimales sur les bases existantes,
     dont `users.role` et `acquisition_cache`.
2. `buildApp()`
   - cree l'instance Fastify.
3. `registerJwt(app)`
   - configure `@fastify/jwt` avec `JWT_SECRET` ;
   - ajoute les decorateurs `authenticate` et `requireAdmin`.
4. `createInitialAdmin(db)`
   - cree le premier administrateur si aucun utilisateur n'existe ;
   - assigne `role=admin` a cet utilisateur ;
   - utilise `ADMIN_USERNAME` ou `admin` ;
   - exige `ADMIN_PASSWORD`.
5. `bootstrapPlugins()`
   - charge les plugins depuis `PLUGINS_DIR`.
6. `syncPlugins(db, pluginService)`
   - synchronise les plugins charges vers la table `plugins`.
7. Decorations Fastify
   - `app.db` ;
   - `app.pluginService`.
8. `registerRoutes(app)`
   - enregistre les routes publiques et les routes protegees.
9. `app.listen()`
   - ecoute sur `PORT` ou `3000`.

Le helper de tests `backend/test/helpers/test-app.js` reproduit ce bootstrap
avec une base et un `DATA_DIR` temporaires.

## Architecture Backend

### Routes

Les routes sont regroupees sous `backend/src/routes`, `backend/src/auth`,
`backend/src/media`, `backend/src/search`, `backend/src/settings` et
`backend/src/users`.

`backend/src/routes/index.js` enregistre :

- les routes auth publiques ;
- un groupe protege par JWT pour plugins, items, medias et exports ;
- un sous-groupe admin protege par `requireAdmin`.

Les routes admin principales sont :

- `GET /api/admin/system-summary`
- `POST /api/admin/imports/native-json`
- `GET /api/admin/backup.zip`
- `GET /api/admin/media-audit`
- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`

Le controle d'acces distingue :

- `401 Unauthorized` quand le JWT est absent ou invalide ;
- `403 Forbidden` quand le JWT est valide mais que le role n'est pas `admin`.

L'export applicatif global `GET /api/exports/application.json` est egalement
reserve aux admins. Les exports CSV de collection restent accessibles aux
utilisateurs authentifies.

### Services

Les services vivent dans `backend/src/services`.

Exemples :

- `export-service.js` construit les exports JSON/CSV ;
- `native-import-service.js` valide et importe le JSON natif ;
- `media-service.js` gere upload, generation WebP, primaire et suppression ;
- `media-audit-service.js` compare SQLite et disque ;
- `media-cleanup-service.js` filtre et supprime les candidats disque surs ;
- `backup-service.js` genere l'archive ZIP ;
- `display-preferences-service.js` gere les preferences d'affichage.

L'acquisition assistee utilise aussi une couche dediee dans
`backend/src/acquisition` :

- `acquisition-service.js` orchestre les cas d'usage acquisition, dont le lookup
  ISBN livre ;
- `provider-registry.js` inventorie et selectionne les providers disponibles ;
- `acquisition-cache.js` gere le cache metier des lookups acquisition ;
- `providers/*` contient les adaptateurs vers les fournisseurs externes.

Flux d'acquisition ISBN :

```text
Frontend
    |
    v
Backend Route
    |
    v
AcquisitionService
    |
    v
AcquisitionCache
    |
    v
ProviderRegistry
    |
    v
Provider
```

Responsabilites :

- Route : HTTP uniquement, validation minimale du body et traduction erreur vers
  reponse HTTP.
- `AcquisitionService` : orchestration, validation metier, normalisation,
  selection provider implicite ou explicite et construction `{ query, results }`.
- `AcquisitionCache` : cache metier transparent des reponses normalisees, sans
  exposer de champ supplementaire dans l'API.
- `ProviderRegistry` : inventaire et selection des providers disponibles.
- Provider : adaptateur externe, appel reseau et mapping vers le contrat
  CollectionMgnt.

Le cache SQLite stocke uniquement les reponses normalisees `{ query, results }`
via un repository dedie. Il ne stocke ni reponse brute provider, ni erreur, ni
image binaire. En cas de miss, d'expiration ou d'entree corrompue, le service
appelle le provider selectionne.

Voir `docs/acquisition-providers.md` pour le contrat provider, les responsabilites
des couches acquisition et les bonnes pratiques de tests.

### Repositories

Les repositories vivent dans `backend/src/repositories`.

Ils encapsulent les requetes SQL et evitent de disperser l'acces SQLite dans les
routes ou services.

### Database

La base SQLite est definie dans `backend/src/database/schema.sql`.

Principes :

- aucun plugin ne cree de table ;
- les items partagent la table `items` ;
- les champs propres aux plugins sont stockes dans `items.metadata` ;
- les identifiants d'acquisition assistee (`isbn`, `barcode`) restent des champs
  metadata plugin ;
- le cache acquisition utilise une table dediee `acquisition_cache` ;
- les medias ont une ligne dans `media` et des fichiers sous `DATA_DIR` ;
- les preferences applicatives sont stockees dans `settings`.

Voir `docs/database-schema.md` pour le detail.

### Plugins

Un plugin est un dossier contenant au minimum :

```text
manifest.json
fields.json
```

Le loader lit les plugins depuis `PLUGINS_DIR`, valide les manifests et les
schemas, puis les enregistre dans `PluginService`.

Les plugins declarent les champs dynamiques. Ils ne modifient pas SQLite.

Voir `docs/plugin-api.md`.

## Architecture Frontend

Le frontend vit dans `frontend/src`.

### Router

`frontend/src/router/index.js` declare les routes principales :

- `/login`
- `/collections`
- `/collections/:pluginId/items`
- `/collections/:pluginId/items/new`
- `/items/:id`
- `/items/:id/edit`
- `/admin`

Le guard Vue Router restaure la session via le store auth avant d'autoriser les
routes protegees. `/dashboard` reste une redirection de compatibilite vers
`/collections`.

### Auth Store

`frontend/src/stores/auth.js` gere :

- le token JWT dans `sessionStorage` ;
- l'utilisateur courant ;
- login ;
- restauration via `/api/auth/me` ;
- logout stateless.

### Services API

`frontend/src/services/api.js` centralise `fetch` :

- ajoute `Authorization: Bearer <token>` si disponible ;
- serialise automatiquement les objets JSON ;
- conserve `FormData` pour les uploads/imports ;
- supporte les reponses `Blob` pour medias et telechargements ;
- leve `ApiError` sur reponse HTTP non OK.

Les autres services (`item-api`, `plugin-api`, `media-api`, `admin-api`,
`export-api`) exposent des fonctions orientees domaine aux pages.

### Pages

Les pages principales sont dans `frontend/src/pages` :

- `CollectionsView.vue`
- `ItemsListView.vue`
- `ItemCreateView.vue`
- `ItemEditView.vue`
- `ItemDetails.vue`
- `AdminView.vue`
- `Login.vue`

### Composants Partages

Les composants reutilisables sont dans `frontend/src/components` :

- navigation : `TopNavigation`, `UserMenu`, `BreadcrumbTrail` ;
- collections/items : `CollectionCard`, `ItemCard`, `ItemList` ;
- formulaires dynamiques : `DynamicForm`, `DynamicField`,
  `AcquisitionLookupField` ;
- medias : `MediaGallery`, `MediaThumbnail`, `ImageUploader` ;
- affichage : `DisplayPreferencesPanel`.

Les fondations responsive utilisent les conventions :

- mobile : jusqu'a 639px ;
- tablette : 640px a 899px ;
- desktop : 900px et plus.

## Flux Principaux

### Login

1. L'utilisateur poste ses identifiants sur `/api/auth/login`.
2. Le backend verifie le hash du mot de passe.
3. Le backend retourne un JWT incluant le role et un utilisateur sans `password_hash`.
4. Le frontend stocke le JWT en `sessionStorage`.
5. Les appels suivants ajoutent l'en-tete `Authorization`.

`POST /api/auth/login` est limite a 5 tentatives par fenetre de 5 minutes.

### Navigation Collections

1. `/collections` charge les plugins via l'API plugins.
2. Chaque collection active pointe vers `/collections/:pluginId/items`.
3. La liste charge schema, preferences d'affichage et items pagines.
4. Recherche, filtres, tri, pagination et mode d'affichage sont portes par l'URL.

### Creation Et Edition Item

1. Le frontend charge le schema plugin.
2. `DynamicForm` genere les champs supportes.
3. Pour les livres, le champ ISBN peut declencher un lookup backend et
   pre-remplir localement le formulaire apres choix utilisateur.
4. La validation frontend reste legere.
5. Le backend revalide avec le schema avant insertion ou mise a jour.
6. L'utilisateur est redirige vers la fiche item.
7. Si une couverture provider a ete proposee, l'utilisateur peut confirmer son
   import depuis la fiche item.

### Medias

1. `ImageUploader` envoie un `multipart/form-data` a `/api/media`.
2. `POST /api/acquisition/images/import` peut importer une couverture provider
   apres confirmation utilisateur et creation de l'item.
3. Les deux flux appellent `MediaService.createOriginalMedia()`.
4. Le backend valide le contenu avec Sharp.
5. Le backend stocke l'original, une image optimisee WebP et une miniature WebP.
6. Les fichiers sont lies a une ligne `media`.
7. La galerie et les cartes chargent les thumbnails via des blobs authentifies.

Flux d'import d'une image provider :

```text
Provider
  -> AcquisitionImageImportService
  -> MediaService
  -> Original
  -> WebP
  -> Thumbnail
```

Voir `docs/media-management.md`.

### Administration

La page `/admin` regroupe les actions de maintenance :

- export JSON natif ;
- import JSON natif ;
- backup ZIP ;
- audit media ;
- cleanup media manuel guide ;
- resume systeme.

Voir `docs/administration.md`.

### Export Et Import

L'export JSON natif est un format metier portable.
L'import natif est non destructif et fonctionne en mode `add_only`.

Voir `docs/export-system.md` et `docs/native-json-import.md`.

### Backup ZIP

Le backup ZIP est un instantane technique contenant notamment une copie SQLite,
les medias physiques, les plugins disponibles, un manifeste et l'export JSON
natif global.

Il ne fournit pas encore de restauration.

Voir `docs/backup-zip.md` et `docs/backup-restore.md`.

## Tests

Les tests automatises backend utilisent le Node Test Runner natif et Fastify
`inject`.

Voir `docs/ci-testing.md`.
