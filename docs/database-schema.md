# Database Schema

Etat courant : v0.12-lot10.0.1.

La source de verite SQL est `backend/src/database/schema.sql`.
Ce document explique le modele pour comprendre la base sans ouvrir le fichier
SQL.

## Philosophie

Le moteur est generique : aucun plugin ne cree de table dediee.

Les collections sont representees par :

- `plugins` pour les plugins installes ;
- `items` pour les objets de collection ;
- `items.metadata` pour les champs propres au plugin ;
- `media` pour les metadonnees d'images ;
- le filesystem sous `DATA_DIR/uploads/items` pour les fichiers physiques.

SQLite est utilise avec `PRAGMA foreign_keys = ON`.

## Relations Principales

```text
plugins 1 --- n items 1 --- n media
                  |
                  n
               item_tags n --- 1 tags

items 1 --- n loans
users 1 --- n audit_logs
settings : cle/valeur applicative
schema_info : version de schema
```

## Tables

### users

Utilisateurs de l'application.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant interne |
| username | TEXT | NOT NULL UNIQUE | Nom utilisateur |
| password_hash | TEXT | NOT NULL | Hash du mot de passe |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK(role IN ('admin', 'user')) | Role applicatif |
| preferred_language | TEXT | DEFAULT 'fr' | Langue preferee |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de modification |

Le premier administrateur est cree automatiquement au bootstrap si la table est
vide, avec `role='admin'`.

Migration de role :

- les nouvelles bases creent `users.role` directement ;
- les bases existantes recoivent la colonne via `ALTER TABLE users ADD COLUMN` avec `DEFAULT 'user'` et contrainte `CHECK` ;
- pour preserver l'acces admin, la migration promeut `ADMIN_USERNAME` si ce compte existe, sinon le premier utilisateur par `id`.

### plugins

Plugins installes et synchronises depuis `PLUGINS_DIR`.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant interne |
| code | TEXT | NOT NULL UNIQUE | Identifiant technique du plugin |
| display_name | TEXT | NOT NULL | Nom affiche |
| version | TEXT | NOT NULL | Version du plugin |
| enabled | INTEGER | NOT NULL DEFAULT 1 | Plugin actif ou non |
| supports_images | INTEGER | NOT NULL DEFAULT 1 | Capacite images |
| supports_loans | INTEGER | NOT NULL DEFAULT 0 | Capacite prets |
| installed_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de synchronisation |

`plugins.code` correspond a `manifest.id`.

### items

Objets de collection.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant interne |
| plugin_id | INTEGER | NOT NULL, FK plugins(id) | Plugin proprietaire |
| title | TEXT | NOT NULL | Titre commun a tous les items |
| description | TEXT | nullable | Description commune |
| metadata | TEXT | NOT NULL DEFAULT '{}', CHECK(json_valid(metadata)) | Donnees propres au plugin |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de creation |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de modification |

`metadata` stocke un objet JSON valide. Les champs autorises et leur validation
viennent du schema plugin charge par le backend.

Exemple :

```json
{
  "platform": "Switch",
  "genre": "RPG"
}
```

### media

Metadonnees des images associees aux items.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant media |
| item_id | INTEGER | NOT NULL, FK items(id) ON DELETE CASCADE | Item associe |
| filename | TEXT | NOT NULL | Nom du fichier original |
| mime_type | TEXT | NOT NULL | Type MIME original |
| size | INTEGER | NOT NULL | Taille en octets |
| is_primary | INTEGER | NOT NULL DEFAULT 0 | Image principale |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date d'ajout |

La cascade supprime les lignes `media` quand un item est supprime. Le nettoyage
des fichiers physiques reste gere par le backend.

### tags

Tags globaux.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant tag |
| name | TEXT | NOT NULL UNIQUE | Nom du tag |

### item_tags

Association plusieurs-a-plusieurs entre items et tags.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| item_id | INTEGER | NOT NULL, FK items(id) ON DELETE CASCADE | Item |
| tag_id | INTEGER | NOT NULL, FK tags(id) ON DELETE CASCADE | Tag |

La cle primaire est composee de `(item_id, tag_id)`.

### loans

Prets associes a un item.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant pret |
| item_id | INTEGER | NOT NULL, FK items(id) ON DELETE CASCADE | Item prete |
| borrower | TEXT | NOT NULL | Emprunteur |
| loan_date | DATETIME | NOT NULL | Date de pret |
| return_date | DATETIME | nullable | Date de retour |

### settings

Cle/valeur applicative.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| key | TEXT | PRIMARY KEY | Cle technique |
| value | TEXT | NOT NULL | Valeur, souvent JSON |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date de modification |

Utilisations connues :

- preferences d'affichage par plugin avec `displayPreferences.<pluginId>`.

Les settings sont exportes dans l'export JSON applicatif uniquement si leur cle
n'est pas consideree sensible.

### audit_logs

Journal d'audit prevu pour evolutions futures.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant log |
| user_id | INTEGER | FK users(id) ON DELETE SET NULL | Utilisateur associe |
| action | TEXT | NOT NULL | Action |
| entity_type | TEXT | NOT NULL | Type d'entite |
| entity_id | INTEGER | nullable | Identifiant cible |
| payload | TEXT | nullable | Donnees complementaires |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date du log |

Cette table existe dans le schema mais n'est pas encore au coeur des flux
fonctionnels.

### schema_info

Version du schema SQLite.

| Champ | Type | Contraintes | Description |
| --- | --- | --- | --- |
| version | INTEGER | NOT NULL | Version de schema |

Valeur initiale :

```sql
INSERT INTO schema_info(version)
VALUES (2);
```

Le schema dispose d'une migration applicative minimale pour ajouter `users.role`
aux bases existantes. Il n'existe pas encore de systeme de migrations
versionnees complet.

## Index Principaux

Index declares :

- `idx_items_plugin_id` sur `items(plugin_id)` ;
- `idx_item_tags_tag_id` sur `item_tags(tag_id)` ;
- `idx_media_item_id` sur `media(item_id)` ;
- `idx_loans_item_id` sur `loans(item_id)` ;
- `idx_tags_name` sur `tags(name)` ;
- `idx_audit_logs_created_at` sur `audit_logs(created_at)` ;
- `idx_audit_logs_entity` sur `audit_logs(entity_type, entity_id)` ;
- `idx_audit_logs_user` sur `audit_logs(user_id)` ;
- `idx_items_title` sur `items(title)`.

Ces index soutiennent les listes par plugin, les medias par item, les prets, les
tags et les futurs audits applicatifs.

## Contraintes Importantes

- Les cles etrangeres SQLite sont activees.
- `users.username` est unique.
- `users.role` est limite a `admin` ou `user`.
- `plugins.code` est unique.
- `items.metadata` doit toujours etre du JSON valide.
- Supprimer un item cascade vers `media`, `item_tags` et `loans`.
- Supprimer un utilisateur conserve les logs en mettant `audit_logs.user_id` a
  `NULL`.
- Les fichiers media physiques ne sont pas garantis par SQLite ; audit et cleanup
  comparent la DB et le disque.

## Export, Backup Et Sensibilite

L'export JSON natif est un export metier :

- il exclut les utilisateurs et `password_hash` ;
- il exclut les secrets ;
- il ne contient pas les fichiers media physiques.

La sauvegarde ZIP est un instantane technique :

- elle inclut `database/collection-manager.db` ;
- elle inclut donc les utilisateurs et `password_hash` ;
- elle doit etre traitee comme un fichier sensible.

Voir `docs/export-system.md`, `docs/backup-zip.md` et
`docs/backup-restore.md`.
