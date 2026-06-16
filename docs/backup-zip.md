# Sauvegarde ZIP

État courant : v0.12-lot10.0.1.

## Objectif

Le Lot 9.0.4 ajoute une sauvegarde technique complète téléchargeable depuis l'Administration.

Cette sauvegarde n'est pas un export métier JSON, un import CSV, une synchronisation cloud ou un système de backup professionnel.
Elle fournit un instantané exploitable ultérieurement pour une restauration guidée dans un lot séparé.

## Route

Route protégée par JWT :

- `GET /api/admin/backup.zip`

La réponse est un téléchargement :

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="collectionmgnt-backup-YYYY-MM-DD.zip"`

## Structure ZIP

```text
collectionmgnt-backup-YYYY-MM-DD.zip
├── manifest.json
├── database/
│   └── collection-manager.db
├── media/
│   └── uploads/items/...
├── plugins/
│   └── ...
└── exports/
    └── application.json
```

## Contenu

Obligatoire :

- `manifest.json`
- copie SQLite cohérente sous `database/collection-manager.db`
- export JSON natif global sous `exports/application.json`

Inclus si disponible :

- médias physiques sous `media/uploads/items`
- plugins depuis `PLUGINS_DIR`

La copie SQLite est créée avec `db.backup()` avant archivage.
Le fichier DB vivant n'est pas zippé directement.

## Manifest

Exemple :

```json
{
  "format": "collectionmgnt.full-backup",
  "format_version": 1,
  "created_at": "2026-06-09T00:00:00.000Z",
  "application_version": "v0.12-lot10.0.1",
  "includes_database": true,
  "includes_media_files": true,
  "includes_native_export": true,
  "includes_plugins": true,
  "counts": {
    "plugins": 0,
    "enabledPlugins": 0,
    "items": 0,
    "media": 0
  },
  "paths": {
    "database": "database/collection-manager.db",
    "media": "media/uploads/items",
    "native_export": "exports/application.json",
    "plugins": "plugins"
  },
  "database_size": 0,
  "media_file_count": 0,
  "media_total_bytes": 0,
  "plugin_file_count": 0,
  "warnings": []
}
```

Le manifeste ne contient pas de chemins absolus.

## Sécurité

La sauvegarde ZIP est sensible.

Elle contient la base SQLite complète, donc notamment :

- données métier
- utilisateurs
- `password_hash`
- settings applicatifs
- métadonnées média

Elle n'inclut pas :

- `.env`
- variables d'environnement
- `JWT_SECRET`
- secrets runtime
- tokens
- credentials externes

Les fichiers cachés ou sensibles détectés dans les plugins sont ignorés.
Les liens symboliques sont ignorés.

## Limites

Le Lot 9.0.4 ne fournit pas :

- restauration ZIP
- sauvegarde automatique
- planification
- sauvegarde incrémentale
- stockage distant
- cloud
- historique
- rétention
- progression de génération côté UI

La sauvegarde est générée à la demande et streamée au client.
Les très gros volumes peuvent prendre du temps et dépendre des timeouts du proxy ou du navigateur.

## Relation Avec L'Export JSON

L'export JSON natif reste un export métier :

- pas de fichiers médias physiques
- pas d'utilisateurs ou `password_hash`
- réimport non destructif en `add_only`

La sauvegarde ZIP est un instantané technique :

- DB complète
- médias physiques
- manifest
- export JSON inclus comme aide de lecture

Ces deux formats ne sont pas interchangeables.
