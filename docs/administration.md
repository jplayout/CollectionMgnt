# Administration

État courant : v0.11-lot9.0.3.

## Objectif

Le Lot 9.0.1 ajoute une première fondation Administration simple.

La page `/admin` regroupe les actions et informations qui relèvent de la maintenance applicative plutôt que de l'usage quotidien des collections.

La route frontend est protégée comme les autres routes authentifiées.

## Accès

- Page frontend : `/admin`
- Accès depuis le Dashboard
- Retour vers le Dashboard depuis la page Administration

Il n'existe pas encore de rôles utilisateurs.
Tout utilisateur authentifié accède donc à la page Administration dans ce lot.

## Sections

### Données

La section Données propose :

- Export JSON global
- Import JSON natif CollectionMgnt

L'export utilise la route existante :

- `GET /api/exports/application.json`

Cette route est protégée par JWT.
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

Cette route est protégée par JWT, read-only, et repose uniquement sur des `SELECT COUNT(*)`.

Exemple :

```json
{
  "version": "v0.11-lot9.0.3",
  "counts": {
    "plugins": 0,
    "enabledPlugins": 0,
    "items": 0,
    "media": 0
  }
}
```

## Limites MVP

Le Lot 9.0.3 ne fournit pas :

- rôles utilisateurs
- gestion utilisateurs
- import CSV
- cleanup automatique
- sauvegarde ZIP
- restauration
- restauration des fichiers médias physiques
- modification du schéma SQLite
- dashboard admin avancé
- navigation admin multi-pages

## Suites Possibles

La page `/admin` est structurée pour accueillir plus tard :

- sauvegarde ZIP complète avec fichiers médias
- import CSV CollectionMgnt
- gestion utilisateurs
- paramètres système

Lorsque ces sections deviendront trop denses, `/admin` pourra devenir une page d'entrée vers des sous-pages comme `/admin/data`, `/admin/media` et `/admin/system`.
