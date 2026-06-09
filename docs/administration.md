# Administration

État courant : v0.11-lot9.0.1.

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

L'export utilise la route existante :

- `GET /api/exports/application.json`

Cette route est protégée par JWT.
Elle produit un export métier JSON sans fichiers médias physiques, sans utilisateurs, sans `password_hash`, sans secrets et sans variables d'environnement.

### Médias

La section Médias propose :

- Lancer audit média

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
  "version": "v0.11-lot9.0.1",
  "counts": {
    "plugins": 0,
    "enabledPlugins": 0,
    "items": 0,
    "media": 0
  }
}
```

## Limites MVP

Le Lot 9.0.1 ne fournit pas :

- rôles utilisateurs
- gestion utilisateurs
- import JSON
- cleanup média
- suppression automatique de fichiers
- sauvegarde ZIP
- restauration
- modification du schéma SQLite
- dashboard admin avancé
- navigation admin multi-pages

## Suites Possibles

La page `/admin` est structurée pour accueillir plus tard :

- import JSON natif
- cleanup média manuel avec dry-run et confirmation
- sauvegarde ZIP complète avec fichiers médias
- gestion utilisateurs
- paramètres système

Lorsque ces sections deviendront trop denses, `/admin` pourra devenir une page d'entrée vers des sous-pages comme `/admin/data`, `/admin/media` et `/admin/system`.
