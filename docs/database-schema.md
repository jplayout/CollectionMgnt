# Database Schema

## Philosophie

Le moteur est entièrement générique.

Aucun plugin ne crée de table spécifique.

Toutes les données métier sont stockées dans :

- plugins
- items
- media
- tags
- loans

Les données spécifiques à un plugin sont stockées dans le champ JSON `metadata`.

---

# Tables

## users

Utilisateurs de l'application.

| Champ | Type | Description |
|---------|---------|---------|
| id | INTEGER | Clé primaire |
| username | TEXT | Nom utilisateur |
| password_hash | TEXT | Mot de passe hashé |
| preferred_language | TEXT | Langue |
| created_at | DATETIME | Création |
| updated_at | DATETIME | Modification |

---

## plugins

Plugins installés.

| Champ | Type |
|---------|---------|
| id | INTEGER |
| code | TEXT |
| display_name | TEXT |
| version | TEXT |
| enabled | INTEGER |
| supports_images | INTEGER |
| supports_loans | INTEGER |
| installed_at | DATETIME |

---

## items

Objets de collection.

| Champ | Type |
|---------|---------|
| id | INTEGER |
| plugin_id | INTEGER |
| title | TEXT |
| description | TEXT |
| metadata | JSON |
| created_at | DATETIME |
| updated_at | DATETIME |

Le champ metadata contient les données spécifiques du plugin.

Exemple :

```json
{
  "platform": "Switch",
  "genre": "RPG"
}
```

---

## media

Images et documents.

| Champ | Type |
|---------|---------|
| id | INTEGER |
| item_id | INTEGER |
| filename | TEXT |
| mime_type | TEXT |
| size | INTEGER |
| is_primary | INTEGER |
| created_at | DATETIME |

---

## tags

Tags globaux.

| Champ | Type |
|---------|---------|
| id | INTEGER |
| name | TEXT |

---

## item_tags

Association N-N.

| Champ | Type |
|---------|---------|
| item_id | INTEGER |
| tag_id | INTEGER |

---

## loans

Gestion des prêts.

| Champ | Type |
|---------|---------|
| id | INTEGER |
| item_id | INTEGER |
| borrower | TEXT |
| loan_date | DATETIME |
| return_date | DATETIME |

---

## settings

Configuration globale.

| Champ | Type |
|---------|---------|
| key | TEXT |
| value | TEXT |
| updated_at | DATETIME |

Exemples :

- default_language
- backup_frequency
- retention_days
- displayPreferences.games

Les préférences d'affichage par plugin sont stockées dans cette table avec des clés `displayPreferences.<pluginId>`.
La valeur est un document JSON contenant les préférences de liste et de fiche détail.

---

# Export Métier Et Sauvegarde Technique

Le Lot 8.0.1 ajoute un export métier sans modifier le schéma SQLite.

L'export métier JSON/CSV lit les tables applicatives existantes et produit un format transportable :

- plugins
- schémas plugins chargés par l'application
- settings applicatifs non sensibles
- items avec `metadata` parsé
- métadonnées `media`

Les utilisateurs, `password_hash`, secrets et variables d'environnement ne font pas partie de l'export métier.

Les fichiers médias physiques stockés sous `DATA_DIR/uploads/items/{itemId}` ne sont pas inclus dans le Lot 8.0.1.
Les exports JSON référencent uniquement les métadonnées média et les URLs API.

Une sauvegarde complète technique reste distincte de l'export métier.
Elle devra couvrir SQLite et les fichiers médias physiques dans un lot séparé.
