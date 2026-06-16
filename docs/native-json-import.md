# Import JSON Natif

État courant : v0.12-lot10.0.1.

## Objectif

Le Lot 9.0.2 permet d'importer un export JSON natif produit par CollectionMgnt.

Cet import est un import métier non destructif.
Il ne remplace pas une sauvegarde technique complète.

## Route

Route protégée par JWT :

- `POST /api/admin/imports/native-json`

Payload :

- `multipart/form-data`
- champ fichier : `file`
- taille maximale MVP : 10 MB

## Format Accepté

Le fichier doit être un JSON valide avec :

- `format = collectionmgnt.native-export`
- `format_version = 1`
- `scope = application` ou `collection`
- `collections` tableau

Les versions futures sont refusées avec une erreur claire tant qu'elles ne sont pas explicitement supportées.

## Mode D'import

Le mode unique est :

- `add_only`

Conséquences :

- chaque item importé crée un nouvel item
- les IDs d'origine ne sont pas restaurés
- les `source_id` servent au rapport et au mapping interne pendant l'import
- aucun item existant n'est remplacé
- aucune suppression n'est effectuée
- aucune fusion complexe n'est effectuée

## Plugins Et Schémas

L'import ne crée pas et ne modifie pas les plugins.

Si un plugin est absent, la collection correspondante est ignorée avec warning.
Si un plugin est désactivé, les items peuvent être importés avec warning.

Les champs connus sont validés avec le schéma local courant.
Les champs metadata inconnus sont conservés avec warning.
Une différence détectable entre le schéma exporté et le schéma local produit un warning.

## Médias

Le JSON natif contient uniquement des métadonnées média.
Il ne contient pas les fichiers physiques.

Dans le Lot 9.0.2 :

- aucune ligne `media` n'est créée
- aucun fichier média n'est restauré
- les métadonnées média sont comptées dans `mediaMetadataSkipped`
- un warning explique que les médias physiques ne sont pas inclus dans l'export JSON natif

La restauration complète des médias devra passer par une sauvegarde ZIP ou un autre lot dédié.

## Rapport

Le backend retourne un rapport :

```json
{
  "import_started_at": "2026-06-09T00:00:00.000Z",
  "import_finished_at": "2026-06-09T00:00:00.100Z",
  "mode": "add_only",
  "summary": {
    "collectionsProcessed": 0,
    "collectionsSkipped": 0,
    "itemsCreated": 0,
    "itemsSkipped": 0,
    "mediaMetadataSkipped": 0,
    "errorCount": 0,
    "warningCount": 0
  },
  "createdItems": [],
  "skippedItems": [],
  "warnings": [],
  "errors": []
}
```

Les erreurs structurelles globales retournent une réponse 400 et aucun import n'est effectué.
Les erreurs item continuent l'import des autres items et sont listées dans le rapport.

## Limites

- pas d'import CSV
- pas d'import CSV externe
- pas de sauvegarde ZIP
- pas de restauration de fichiers médias physiques
- pas de restauration des IDs d'origine
- pas de remplacement d'items existants
- pas de suppression
- pas de fusion complexe
- pas de création ou modification de plugins
- pas de changement du schéma SQLite
