# Gestion des images

## État actuel

Lot livré : 5.2 - Thumbnails et WebP.

Fonctionnalités disponibles :

- Upload multipart d'images originales
- Association d'une image à un item existant
- Utilisation de la table SQLite `media`
- Stockage disque des originaux
- Validation réelle du contenu image avec Sharp
- Génération d'une image optimisée WebP
- Génération d'une miniature WebP
- Liste des médias d'un item
- Consultation des métadonnées d'un média
- Service du fichier original via API
- Service de la miniature via API
- Suppression de la ligne `media` et des fichiers associés
- Protection JWT des routes média
- Support simple de `is_primary` à l'upload

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
- `DELETE /api/media/:id`

## Non encore implémenté

- Galerie frontend
- Choix avancé de l'image principale après upload
- Nettoyage automatique des fichiers lors de la suppression d'un item

## Prochaine étape

Lot 5.3 - Galerie frontend.
