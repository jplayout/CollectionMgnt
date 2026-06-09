# Export System

État courant : v0.10-lot8.0.1.

## Objectif

Le Lot 8.0.1 fournit un export métier des données CollectionMgnt.

Il ne s'agit pas d'une sauvegarde technique complète.
Il ne fournit pas encore d'import, de restauration, de ZIP, de dump SQLite ou d'export des fichiers médias physiques.

## Routes

Toutes les routes d'export sont protégées par JWT.

- `GET /api/exports/application.json`
- `GET /api/exports/collections/:pluginId.json`
- `GET /api/exports/collections/:pluginId.csv`

Les routes collection retournent 404 si le plugin demandé est inconnu.

## Format JSON Natif

Les exports JSON utilisent un format racine versionné :

```json
{
  "format": "collectionmgnt.native-export",
  "format_version": 1,
  "exported_at": "2026-06-09T00:00:00.000Z",
  "scope": "application",
  "includes_media_files": false,
  "plugins": [],
  "schemas": [],
  "settings": [],
  "collections": []
}
```

### Export Applicatif Global

`GET /api/exports/application.json` produit un export global avec :

- plugins installés
- schémas plugin chargés par l'application
- settings applicatifs non sensibles
- collections par plugin
- items
- métadonnées média

Les utilisateurs, `password_hash`, secrets, tokens, credentials et variables d'environnement ne sont pas exportés.

### Export JSON Collection

`GET /api/exports/collections/:pluginId.json` produit le même format racine avec :

- `scope = "collection"`
- une seule entrée dans `collections`
- uniquement le plugin et le schéma concernés
- pas de settings globaux

## Items Exportés

Chaque item est exporté avec :

- `source_id`
- `title`
- `description`
- `metadata` parsé
- `created_at`
- `updated_at`

`source_id` conserve l'identifiant interne d'origine pour un futur import natif.
Il ne doit pas être considéré comme un identifiant portable unique entre deux instances.

## Médias

Le Lot 8.0.1 n'inclut pas les fichiers médias physiques.

Chaque média est exporté comme métadonnée :

- `source_id`
- `item_source_id`
- `filename`
- `mime_type`
- `size`
- `is_primary`
- `created_at`
- `original_url`
- `thumbnail_url`

`includes_media_files` reste toujours `false`.

Une archive ZIP complète avec SQLite et fichiers médias devra être traitée dans un lot séparé.

## CSV Collection

`GET /api/exports/collections/:pluginId.csv` produit un CSV simple.

Colonnes :

- `source_id`
- `title`
- `description`
- `created_at`
- `updated_at`
- champs metadata dans l'ordre du schéma plugin

Les colonnes metadata utilisent `field.name`, pas `field.label`.
Ce choix privilégie la stabilité technique et prépare le futur import CSV.

Règles de sérialisation :

- valeurs metadata absentes ou nulles : cellule vide
- checkbox : `true` ou `false`
- objets et arrays : JSON compact
- virgules, guillemets et retours ligne : échappement CSV standard

## Téléchargement

Les exports JSON utilisent :

- `Content-Type: application/json; charset=utf-8`
- `Content-Disposition: attachment`

Les exports CSV utilisent :

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment`

Les noms de fichiers sont contrôlés côté serveur :

- `collectionmgnt-export-YYYY-MM-DD.json`
- `collectionmgnt-<plugin>-YYYY-MM-DD.json`
- `collectionmgnt-<plugin>-YYYY-MM-DD.csv`

## Sécurité

- routes protégées par JWT
- pas d'export des utilisateurs ni des hashes de mot de passe
- pas d'export des secrets ou variables d'environnement
- settings filtrés pour éviter les clés sensibles évidentes
- aucun accès direct aux fichiers médias physiques

## Limites

- pas d'import natif
- pas d'import CSV externe
- pas de restauration
- pas de ZIP
- pas de dump SQLite
- pas de fichiers médias inclus
- pas de streaming optimisé pour très gros exports
- pas de sélection de colonnes CSV depuis l'interface

## Suite Prévue

Le lot suivant prévu est le Lot 8.0.2 : import CSV externe provenant d'une autre application de gestion de collection.

Cet import devra rester distinct de l'export natif JSON afin de ne pas confondre :

- le format natif CollectionMgnt
- les CSV externes à mapper vers un schéma plugin
- la sauvegarde technique complète de l'application
