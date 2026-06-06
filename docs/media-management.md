# Gestion des images

## État actuel

Lot livré : 5.1 - Backend upload minimal.

Fonctionnalités disponibles :

- Upload multipart d'images originales
- Association d'une image à un item existant
- Utilisation de la table SQLite `media`
- Stockage disque des originaux
- Liste des médias d'un item
- Consultation des métadonnées d'un média
- Service du fichier original via API
- Suppression de la ligne `media` et du fichier original
- Protection JWT des routes média
- Support simple de `is_primary` à l'upload

## Stockage disque

Les fichiers originaux sont stockés sous :

```text
backend/data/uploads/items/{itemId}/originals/{mediaId}.{ext}
```

Le nom de fichier est généré côté serveur.

## Formats acceptés

MIME autorisés :

- `image/jpeg`
- `image/png`
- `image/webp`

Taille maximale :

- 10 MB

SVG est refusé.

## API

Routes disponibles :

- `POST /api/media`
- `GET /api/items/:id/media`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `DELETE /api/media/:id`

## Non encore implémenté

- Génération de miniatures
- Conversion WebP
- Galerie frontend
- Choix avancé de l'image principale après upload
- Nettoyage automatique des fichiers lors de la suppression d'un item

## Prochaine étape

Lot 5.2 - Thumbnails et WebP.
