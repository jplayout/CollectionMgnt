# Gestion des images

## État actuel

Lot livré : 9.0.3 - Cleanup média manuel guidé.

Fonctionnalités disponibles :

- Upload multipart d'images originales
- Association d'une image à un item existant
- Utilisation de la table SQLite `media`
- Stockage disque des originaux
- Validation réelle du contenu image avec Sharp
- Génération d'une image optimisée WebP
- Génération d'une miniature WebP
- Vérification du type WebP généré (`image/webp`, RIFF/WEBP)
- Liste des médias d'un item
- Consultation des métadonnées d'un média
- Service du fichier original via API
- Service de la miniature via API
- Suppression de la ligne `media` et des fichiers associés
- Protection JWT des routes média
- Support de `is_primary` à l'upload
- Sélection de l'image principale via API
- Garantie d'une seule image principale par item
- Promotion automatique de la plus ancienne image restante si l'image principale est supprimée
- Page détail item minimale côté frontend
- Galerie médias frontend par item
- Composants frontend `MediaGallery.vue`, `MediaThumbnail.vue` et `ImageUploader.vue`
- Upload image depuis le frontend
- Chargement des thumbnails via `fetch` authentifié et `Blob`
- Nettoyage des `objectURL`
- Support `FormData` et réponses `Blob` dans le service API frontend
- Sélection de l'image principale depuis le frontend
- Suppression d'image depuis le frontend
- Affichage de l'image principale dans les cartes items
- Chargement des thumbnails des cartes items via `Blob` authentifié
- Import explicite d'une couverture provider via l'acquisition apres creation
  d'un item
- Nettoyage automatique du dossier média d'un item lors de sa suppression
- Audit média global lecture seule entre SQLite et le disque
- Cleanup média manuel guidé des candidats disque sûrs depuis l'Administration
- Sauvegarde ZIP complète incluant les médias physiques sous `DATA_DIR/uploads/items`

## Stockage disque

Les fichiers sont stockés sous :

```text
backend/data/uploads/items/{itemId}/
├── originals/
│   └── {mediaId}.{ext}
├── images/
│   └── {mediaId}.webp
└── thumbs/
    └── {mediaId}.webp
```

Le nom de fichier est généré côté serveur.

L'original reste servi par `GET /api/media/:id/file`.

La miniature est servie par `GET /api/media/:id/thumb`.

## Formats acceptés

MIME autorisés :

- `image/jpeg`
- `image/png`
- `image/webp`

Taille maximale :

- 10 MB

SVG est refusé.

Formats réels acceptés après lecture par Sharp :

- `jpeg`
- `png`
- `webp`

Limites de dimensions :

- largeur maximale : 12000 px
- hauteur maximale : 12000 px

## Génération

Image optimisée :

- format WebP
- 1600 px maximum sur le côté long
- `fit: inside`
- sans agrandissement
- qualité 82

Miniature :

- format WebP
- 320 x 320
- `fit: cover`
- qualité 75

## API

Routes disponibles :

- `POST /api/media`
- `POST /api/acquisition/images/import`
- `GET /api/items/:id/media`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `GET /api/media/:id/thumb`
- `PATCH /api/media/:id/primary`
- `DELETE /api/media/:id`
- `DELETE /api/items/:id`
- `GET /api/admin/media-audit`
- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`
- `GET /api/admin/backup.zip`

## Import Depuis L'acquisition

Les suggestions provider peuvent contenir une URL de couverture distante. Le
frontend peut l'afficher en previsualisation distante, mais l'image n'est jamais
telechargee automatiquement.

Apres creation de l'item, l'utilisateur peut confirmer l'import depuis la fiche
item. Le backend telecharge alors l'image de maniere bornee et securisee, puis
appelle `MediaService.createOriginalMedia()`.

Le pipeline media reste donc identique a l'upload manuel :

- validation MIME et taille ;
- validation du contenu image avec Sharp ;
- stockage de l'original ;
- generation de l'image WebP optimisee ;
- generation de la miniature WebP ;
- association a l'item via la table `media`.

Il n'existe qu'une seule pipeline media. Les uploads manuels et les imports
depuis providers passent tous par `MediaService.createOriginalMedia()`.

Les images binaires ne sont pas stockees dans le cache acquisition.

## Suppression d'un item

Lorsqu'un item est supprimé via `DELETE /api/items/:id` :

- l'item est supprimé en base en premier
- SQLite supprime les lignes `media` associées via `ON DELETE CASCADE`
- le backend tente ensuite de supprimer le dossier `backend/data/uploads/items/{itemId}`
- les sous-dossiers `originals`, `images` et `thumbs` sont donc nettoyés avec le dossier item
- le nettoyage disque est best-effort : les fichiers ou dossiers déjà absents sont acceptés
- une erreur de nettoyage disque est logguée sans annuler la suppression DB déjà effectuée

## Audit média

`GET /api/admin/media-audit` exécute un audit global en lecture seule.

L'audit vérifie :

- les lignes `media` dont l'item n'existe plus
- les lignes `media` avec `filename` vide
- la présence des fichiers attendus dans `originals`, `images` et `thumbs`
- les dossiers numériques sous `DATA_DIR/uploads/items`
- les fichiers présents dans `originals`, `images` et `thumbs` sans ligne `media` correspondante
- les fichiers inattendus
- les dossiers item vides ou sans fichier média utile

Le rapport ne contient que des chemins relatifs à `DATA_DIR`.
L'audit ne supprime aucun fichier, ne modifie aucune ligne SQLite et ne régénère aucune image.

## Cleanup média manuel guidé

`POST /api/admin/media-cleanup/preview` relance l'audit côté backend, filtre les candidats sûrs et retourne une liste sélectionnable.

Les candidats nettoyables sont limités à :

- `FILE_WITHOUT_MEDIA_ROW`
- `UNEXPECTED_FILE`
- `ITEM_FOLDER_WITHOUT_ITEM`
- `EMPTY_ITEM_FOLDER`

`POST /api/admin/media-cleanup/execute` reçoit uniquement des IDs de candidats.
Le backend recalcule le preview, ignore les IDs inconnus, revalide les chemins et supprime uniquement les candidats encore présents et sûrs.

Le cleanup :

- ne reçoit jamais de chemin libre depuis le frontend
- ne supprime jamais hors `DATA_DIR/uploads/items`
- ne supprime et ne modifie aucune ligne DB
- ne supprime aucun item et aucune ligne `media`
- ne régénère aucune image ou miniature
- ne répare aucune incohérence DB
- ne supprime pas de média référencé par DB
- nécessite une confirmation utilisateur côté UI avant exécution

## Sauvegarde ZIP

`GET /api/admin/backup.zip` génère une sauvegarde technique complète.

Contrairement à l'export JSON natif, cette archive inclut les fichiers médias physiques sous :

```text
media/uploads/items/
```

Le ZIP contient aussi une copie SQLite cohérente, un manifeste et l'export JSON natif global.
Il ne fournit pas de restauration dans le Lot 9.0.4.

## Non encore implémenté

- Galerie avancée
- Optimisation du chargement N+1 des médias/thumbnails dans les listes
- Régénération des miniatures ou images optimisées depuis les originaux

## Prochaine étape

Restauration ZIP guidée ou amélioration des rapports d'administration.
