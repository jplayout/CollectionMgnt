# Cleanup Média

État courant : v0.11-lot9.0.3.

## Objectif

Le Lot 9.0.3 ajoute un cleanup média manuel guidé depuis l'Administration.

Il permet de supprimer uniquement des fichiers ou dossiers orphelins sûrs détectés par l'audit média.
Il ne modifie jamais SQLite et ne répare aucune incohérence DB.

## Routes

Routes protégées par JWT :

- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`

## Preview

`POST /api/admin/media-cleanup/preview` relance l'audit côté backend, filtre les candidats sûrs, génère un ID déterministe pour chaque candidat et ne modifie rien.

Réponse :

```json
{
  "scan_started_at": "2026-06-09T00:00:00.000Z",
  "scan_finished_at": "2026-06-09T00:00:00.100Z",
  "summary": {
    "candidateCount": 0,
    "fileCount": 0,
    "folderCount": 0,
    "totalBytes": 0,
    "warningCount": 0
  },
  "candidates": [],
  "warnings": []
}
```

Chaque candidat contient :

- `id`
- `type`
- `code`
- `relativePath`
- `reason`
- `size` pour les fichiers
- `itemId`

## Execute

`POST /api/admin/media-cleanup/execute` reçoit uniquement des IDs :

```json
{
  "candidateIds": ["sha256..."]
}
```

Le backend recalcule le preview au moment de l'exécution.
Il ne supprime que les candidats encore présents et sûrs.

Réponse :

```json
{
  "executed_at": "2026-06-09T00:00:00.200Z",
  "summary": {
    "requested": 0,
    "deleted": 0,
    "skipped": 0,
    "errors": 0,
    "bytesDeleted": 0
  },
  "deleted": [],
  "skipped": [],
  "errors": []
}
```

Un ID inconnu est ignoré avec `unknown_candidate`.
Un fichier ou dossier déjà absent est ignoré avec `already_missing`.

## Candidats Nettoyables

Codes acceptés dans ce lot :

- `FILE_WITHOUT_MEDIA_ROW`
- `UNEXPECTED_FILE`
- `ITEM_FOLDER_WITHOUT_ITEM`
- `EMPTY_ITEM_FOLDER`

Codes exclus :

- `MEDIA_ITEM_MISSING`
- `MEDIA_FILENAME_EMPTY`
- `MEDIA_ORIGINAL_MISSING`
- `MEDIA_OPTIMIZED_MISSING`
- `MEDIA_THUMBNAIL_MISSING`

Les problèmes DB, les fichiers attendus manquants et toute régénération restent hors périmètre.

## Sécurité

- aucun chemin libre n'est accepté depuis le frontend
- le frontend transmet seulement des IDs de candidats
- les candidats sont recalculés côté backend avant exécution
- les chemins sont reconstruits depuis `DATA_DIR` et les chemins relatifs issus de l'audit
- les chemins sont résolus avec `path.resolve`
- la suppression est refusée hors `DATA_DIR/uploads/items`
- les liens symboliques ne sont pas supprimés
- les dossiers item doivent être numériques
- un dossier `ITEM_FOLDER_WITHOUT_ITEM` est ignoré si des lignes `media` référencent encore cet item
- aucune ligne DB n'est supprimée ou modifiée
- aucun item et aucune ligne `media` ne sont supprimés
- aucune régénération de thumbnail ou image optimisée n'est effectuée

## Interface Administration

Dans `/admin`, section Médias :

- lancement de l'audit média lecture seule
- bouton de preview cleanup
- liste des candidats sûrs
- cases à cocher
- tout sélectionner / tout désélectionner
- confirmation utilisateur obligatoire avant exécution
- rapport avec supprimés, ignorés, erreurs et octets supprimés

## Limites

Le Lot 9.0.3 ne fournit pas :

- cleanup automatique
- réparation DB
- suppression de lignes `media`
- régénération de fichiers
- restauration de médias physiques
- historique persistant des nettoyages
- sauvegarde ZIP
