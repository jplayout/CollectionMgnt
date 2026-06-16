# Audit Média

État courant : v0.12-lot10.0.1.

## Objectif

Le Lot 8.1.1 fournit un audit média global en lecture seule.

Il détecte les incohérences entre :

- la table SQLite `media`
- la table SQLite `items`
- les fichiers présents sous `DATA_DIR/uploads/items`

Il ne supprime aucun fichier, ne modifie aucune ligne SQLite et ne régénère aucune image.

## Route

Route protégée par JWT :

- `GET /api/admin/media-audit`

## Périmètre scanné

L'audit scanne uniquement :

```text
DATA_DIR/uploads/items/
└── {itemId}/
    ├── originals/
    ├── images/
    └── thumbs/
```

Seuls les dossiers item numériques sont interprétés comme dossiers média d'items.

Les chemins retournés dans le rapport sont relatifs à `DATA_DIR`.
Les chemins absolus ne sont pas exposés.

## Format Du Rapport

```json
{
  "scan_started_at": "2026-06-09T00:00:00.000Z",
  "scan_finished_at": "2026-06-09T00:00:00.100Z",
  "summary": {
    "items": 0,
    "mediaRows": 0,
    "itemFolders": 0,
    "filesScanned": 0,
    "dbIssueCount": 0,
    "filesystemIssueCount": 0,
    "cleanupCandidateCount": 0,
    "warningCount": 0
  },
  "dbIssues": [],
  "filesystemIssues": [],
  "cleanupCandidates": [],
  "warnings": []
}
```

Chaque issue contient au minimum :

```json
{
  "code": "MEDIA_ORIGINAL_MISSING",
  "severity": "warning",
  "item_id": 123,
  "media_id": 456,
  "path": "uploads/items/123/originals/456.jpg",
  "message": "Original file for media 456 is missing."
}
```

## Codes DB Vers Disque

- `MEDIA_ITEM_MISSING` : une ligne `media` référence un item absent.
- `MEDIA_FILENAME_EMPTY` : une ligne `media` a un `filename` vide.
- `MEDIA_ORIGINAL_MISSING` : le fichier original attendu est absent.
- `MEDIA_OPTIMIZED_MISSING` : l'image optimisée attendue est absente.
- `MEDIA_THUMBNAIL_MISSING` : la miniature attendue est absente.

## Codes Disque Vers DB

- `ITEM_FOLDER_WITHOUT_ITEM` : un dossier `uploads/items/{itemId}` existe sans item DB correspondant.
- `FILE_WITHOUT_MEDIA_ROW` : un fichier dans `originals`, `images` ou `thumbs` n'a pas de ligne `media` correspondante.
- `UNEXPECTED_FILE` : un fichier dans un dossier média ne respecte pas le nom attendu.
- `EMPTY_ITEM_FOLDER` : un dossier item est vide ou ne contient aucun fichier média utile.

## Warnings

- `UPLOADS_ITEMS_MISSING` : le dossier `DATA_DIR/uploads/items` n'existe pas.
- `UPLOADS_PATH_UNSAFE` : le chemin d'uploads résolu ne reste pas sous `DATA_DIR`.

## Cleanup Candidates

`cleanupCandidates` liste des candidats potentiels au nettoyage manuel guidé.

L'audit reste strictement lecture seule.
Il n'effectue aucune suppression.

Depuis le Lot 9.0.3, le cleanup manuel utilise uniquement une sous-partie sûre de ces candidats :

- `FILE_WITHOUT_MEDIA_ROW`
- `UNEXPECTED_FILE`
- `ITEM_FOLDER_WITHOUT_ITEM`
- `EMPTY_ITEM_FOLDER`

Les problèmes DB et les fichiers attendus manquants restent exclus du cleanup :

- `MEDIA_ITEM_MISSING`
- `MEDIA_FILENAME_EMPTY`
- `MEDIA_ORIGINAL_MISSING`
- `MEDIA_OPTIMIZED_MISSING`
- `MEDIA_THUMBNAIL_MISSING`

Le cleanup est déclenché via des routes séparées et protégées :

- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`

L'exécution recalcule les candidats côté backend et ne reçoit que des IDs de candidats.
Elle ne reçoit jamais de chemin libre depuis le frontend.

## Sécurité

- aucun chemin utilisateur n'est accepté
- les chemins sont construits depuis `DATA_DIR` et `getUploadPath`
- les chemins scannés sont résolus avec `path.resolve`
- l'audit refuse de scanner un chemin d'uploads hors `DATA_DIR`
- la route est protégée par JWT

## Limites

- pas de suppression automatique
- pas de modification DB
- pas de régénération de thumbnails ou images optimisées
- scan synchrone adapté aux volumes modestes

## Suite Prévue

Les suites possibles concernent l'amélioration des rapports admin, la restauration ZIP guidée ou la régénération guidée des thumbnails/images dans un lot distinct.
