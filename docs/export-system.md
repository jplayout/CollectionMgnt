# Export System

État courant : v0.11-lot9.0.4.

## Objectif

Le Lot 8.0.1 fournit un export métier des données CollectionMgnt.

Il ne s'agit pas d'une sauvegarde technique complète.
Il fournit aussi un import JSON natif non destructif depuis le Lot 9.0.2.
Depuis le Lot 9.0.4, la sauvegarde ZIP complète existe comme fonctionnalité distincte.
L'export JSON natif reste un export métier et ne devient pas une sauvegarde technique.

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

La sauvegarde ZIP complète avec SQLite et fichiers médias est traitée séparément de cet export métier.

## Export Métier vs Sauvegarde ZIP

L'export JSON natif est un format métier :

- portable
- versionné
- lisible
- sans fichiers médias physiques
- sans utilisateurs, `password_hash`, secrets ou variables d'environnement
- réimportable partiellement via l'import natif `add_only`

La sauvegarde ZIP complète est un instantané technique :

- route `GET /api/admin/backup.zip`
- archive `collectionmgnt.full-backup`
- contient une copie SQLite cohérente
- contient les médias physiques sous `DATA_DIR/uploads/items`
- contient l'export JSON natif global sous `exports/application.json`
- contient un manifeste
- contient les plugins si `PLUGINS_DIR` est disponible

Le ZIP est sensible, car il contient la DB complète, incluant les utilisateurs et `password_hash`.
Il ne contient pas `.env`, variables d'environnement, `JWT_SECRET`, secrets runtime, tokens ou credentials externes.

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

## Import JSON Natif

`POST /api/admin/imports/native-json` importe un fichier JSON natif CollectionMgnt.

La route accepte un payload `multipart/form-data` avec le champ fichier `file`.
La limite MVP est de 10 MB.

Formats acceptés :

- `format = collectionmgnt.native-export`
- `format_version = 1`
- `scope = application` ou `collection`

Le mode d'import est strictement `add_only` :

- chaque item importé crée un nouvel item
- les `source_id` servent uniquement au rapport et au mapping interne pendant l'import
- les IDs d'origine ne sont jamais restaurés
- aucun item existant n'est remplacé
- aucune suppression n'est effectuée
- aucune fusion complexe n'est effectuée

Les plugins ne sont pas créés ou modifiés par l'import.
Une collection dont le plugin est absent est ignorée avec warning.
Une collection dont le plugin est désactivé peut être importée avec warning.

Les champs connus sont validés avec le schéma local courant.
Les champs metadata inconnus sont conservés avec warning.

Les métadonnées média présentes dans l'export JSON ne créent pas de lignes `media`.
Elles sont comptées comme ignorées, car les fichiers médias physiques ne sont pas inclus dans le JSON natif.

## Sécurité

- routes protégées par JWT
- route d'import natif protégée par JWT
- validation stricte du JSON natif avant import
- import natif non destructif en mode `add_only`
- pas d'export des utilisateurs ni des hashes de mot de passe
- pas d'export des secrets ou variables d'environnement
- settings filtrés pour éviter les clés sensibles évidentes
- aucun accès direct aux fichiers médias physiques

## Limites

- import natif limité au JSON CollectionMgnt version 1
- pas de remplacement ou fusion d'items existants
- pas de restauration des IDs d'origine
- pas de restauration des métadonnées média en lignes DB
- pas d'import CSV externe
- pas de restauration
- pas de restauration ZIP
- pas de fichiers médias inclus dans l'export JSON natif
- pas de streaming optimisé pour très gros exports
- pas de sélection de colonnes CSV depuis l'interface

## Suite Prévue

Les suites possibles sont :

- import CSV CollectionMgnt
- import CSV externe provenant d'une autre application de gestion de collection
- restauration ZIP guidée

Ces lots devront rester distincts de l'import natif JSON afin de ne pas confondre le format métier CollectionMgnt, les CSV externes à mapper et la sauvegarde technique complète de l'application.
