# Administration

État courant : v0.12-lot10.0.1.

## Objectif

Le Lot 9.0.1 ajoute une première fondation Administration simple.

La page `/admin` regroupe les actions et informations qui relèvent de la maintenance applicative plutôt que de l'usage quotidien des collections.

La route frontend est protégée comme les autres routes authentifiées. Les API
de maintenance admin sont reservees aux utilisateurs `role=admin`.

## Accès

- Page frontend : `/admin`
- Accès depuis le menu utilisateur
- Barre supérieure globale avec marque `CollectionMgnt` cliquable vers `/collections`
- La route `/dashboard` redirige vers `/collections`
- Aucun breadcrumb n'est affiché sur la page racine Administration

Le modele de roles backend est volontairement minimal :

- `admin` : acces aux routes d'administration et a l'export applicatif global ;
- `user` : acces aux fonctionnalites utilisateur authentifiees, dont l'export CSV de collection.

Les erreurs d'acces sont distinguees :

- `401 Unauthorized` si le token est absent ou invalide ;
- `403 Forbidden` si l'utilisateur est authentifie mais non admin.

## Sections

### Données

La section Données propose :

- Exporter toutes les données
- Importer des données

L'export utilise la route existante :

- `GET /api/exports/application.json`

Cette route est protégée par JWT et role `admin`.
Elle produit un export métier JSON sans fichiers médias physiques, sans utilisateurs, sans `password_hash`, sans secrets et sans variables d'environnement.

L'import utilise :

- `POST /api/admin/imports/native-json`

L'import accepte un fichier JSON natif CollectionMgnt via le champ multipart `file`.
Il accepte uniquement `format=collectionmgnt.native-export`, `format_version=1` et `scope=application|collection`.

Le mode est strictement `add_only` :

- les items sont ajoutés avec de nouveaux IDs
- les IDs d'origine ne sont pas restaurés
- aucun item existant n'est remplacé
- aucune suppression n'est effectuée
- les plugins ne sont pas créés ou modifiés
- les fichiers médias physiques ne sont pas restaurés

Après import, la page affiche un rapport avec collections traitées, items créés, items ignorés, médias ignorés, erreurs et warnings.

### Sauvegarde

La section Sauvegarde propose :

- Télécharger la sauvegarde

La route utilisée est :

- `GET /api/admin/backup.zip`

Cette route est protégée par JWT et role `admin`.
Elle génère une archive technique complète contenant :

- `manifest.json`
- une copie SQLite cohérente sous `database/collection-manager.db`
- les médias physiques sous `media/uploads/items`
- l'export JSON natif global sous `exports/application.json`
- les plugins sous `plugins` si `PLUGINS_DIR` est disponible

Le ZIP ne contient pas `.env`, variables d'environnement, `JWT_SECRET`, secrets runtime, tokens ou credentials externes.
Le manifeste n'expose pas de chemins absolus.

La sauvegarde ZIP est sensible, car elle contient la DB complète, incluant les utilisateurs et `password_hash`.
Le Lot 9.0.4 ne fournit pas de restauration ZIP.

### Médias

La section Médias propose :

- Lancer audit média
- Prévisualiser nettoyage
- Nettoyer la sélection après confirmation utilisateur

L'audit utilise la route existante :

- `GET /api/admin/media-audit`

L'audit reste strictement lecture seule.
Il ne supprime aucun fichier, ne modifie aucune ligne SQLite et ne régénère aucune image.

Après exécution, la page affiche un résumé du dernier audit lancé dans la session :

- `scan_started_at`
- `scan_finished_at`
- `dbIssueCount`
- `filesystemIssueCount`
- `cleanupCandidateCount`
- `warningCount`

Le cleanup média manuel guidé utilise :

- `POST /api/admin/media-cleanup/preview`
- `POST /api/admin/media-cleanup/execute`

La preview filtre uniquement les candidats sûrs :

- `FILE_WITHOUT_MEDIA_ROW`
- `UNEXPECTED_FILE`
- `ITEM_FOLDER_WITHOUT_ITEM`
- `EMPTY_ITEM_FOLDER`

La page affiche les candidats sûrs, permet une sélection manuelle, propose tout sélectionner/tout désélectionner, puis demande une confirmation `window.confirm` avant exécution.

L'exécution reçoit uniquement des IDs de candidats, recalcule le preview côté backend et retourne un rapport avec supprimés, ignorés, erreurs et octets supprimés.
Elle ne modifie jamais la DB, ne supprime aucun item ou ligne `media`, ne supprime jamais hors `DATA_DIR/uploads/items`, ne supprime pas de média référencé DB, ne régénère aucune image et ne répare aucune incohérence DB.

### Système

La section Système affiche un résumé applicatif :

- version application
- nombre de plugins
- nombre de plugins actifs
- nombre d'items
- nombre de médias

La route backend utilisée est :

- `GET /api/admin/system-summary`

Cette route est protégée par JWT et role `admin`, read-only, et repose uniquement sur des `SELECT COUNT(*)`.

Exemple :

```json
{
  "version": "v0.12-lot10.0.1",
  "counts": {
    "plugins": 0,
    "enabledPlugins": 0,
    "items": 0,
    "media": 0
  }
}
```

## Limites MVP

Le lot courant ne fournit pas :

- gestion utilisateurs
- import CSV
- cleanup automatique
- restauration ZIP
- cloud ou stockage distant
- planification automatique
- sauvegarde incrémentale
- historique ou rétention de backups
- restauration
- restauration des fichiers médias physiques
- modification du schéma SQLite
- dashboard admin avancé
- navigation admin multi-pages

## Suites Possibles

La page `/admin` est structurée pour accueillir plus tard :

- restauration ZIP guidée
- import CSV CollectionMgnt
- gestion utilisateurs
- paramètres système

Lorsque ces sections deviendront trop denses, `/admin` pourra devenir une page d'entrée vers des sous-pages comme `/admin/data`, `/admin/media` et `/admin/system`.
