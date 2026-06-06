# Gestion des images

## État actuel

Lot livré : 5.4 - Galerie frontend minimale.

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
- `GET /api/items/:id/media`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `GET /api/media/:id/thumb`
- `PATCH /api/media/:id/primary`
- `DELETE /api/media/:id`

## Non encore implémenté

- Galerie avancée
- Liste items / navigation collections
- Nettoyage automatique des fichiers lors de la suppression d'un item

## Prochaine étape

Lot 5.5 - Liste items / navigation collections.

Objectifs :

- Liste des items
- Navigation Dashboard vers les items
- Affichage de l'image principale dans les listes
