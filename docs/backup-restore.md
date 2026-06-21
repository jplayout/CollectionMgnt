# Sauvegarde Et Restauration

Etat courant : v0.12-lot10.0.1.

Ce document decrit l'etat reel du projet : la sauvegarde ZIP existe, mais la
restauration complete n'est pas encore implementee.

## Ce Qui Existe

CollectionMgnt fournit une sauvegarde ZIP technique via :

- `GET /api/admin/backup.zip`

La route est protegee par JWT et exposee dans l'Administration.

L'archive contient :

```text
collectionmgnt-backup-YYYY-MM-DD.zip
|-- manifest.json
|-- database/
|   `-- collection-manager.db
|-- media/
|   `-- uploads/items/...
|-- plugins/
|   `-- ...
`-- exports/
    `-- application.json
```

Contenu obligatoire :

- `manifest.json` ;
- copie SQLite coherente sous `database/collection-manager.db` ;
- export JSON natif global sous `exports/application.json`.

Contenu inclus si disponible :

- medias physiques sous `media/uploads/items` ;
- plugins depuis `PLUGINS_DIR`.

La copie SQLite est creee avec `db.backup()` avant archivage. Le fichier DB
vivant n'est pas zippe directement.

Voir `docs/backup-zip.md` pour le contrat complet.

## Manifeste

Le manifeste decrit :

- le format `collectionmgnt.full-backup` ;
- la version de format ;
- la date de creation ;
- la version applicative ;
- les chemins internes de l'archive ;
- les compteurs plugins/items/media ;
- les tailles et nombres de fichiers ;
- les warnings eventuels.

Le manifeste ne contient pas de chemins absolus.

## Ce Qui N'existe Pas Encore

Le projet ne fournit pas encore :

- restauration ZIP complete ;
- remplacement de la DB courante depuis une archive ;
- restauration selective ;
- restauration automatique des medias physiques ;
- restauration ou installation automatique des plugins ;
- verification interactive d'une archive ;
- dry-run de restauration ;
- rollback de restauration ;
- historique ou retention de backups ;
- planification automatique ;
- stockage cloud ou distant.

L'import JSON natif n'est pas une restauration ZIP. Il est non destructif,
fonctionne en `add_only` et n'inclut pas les fichiers medias physiques.

## Contraintes Futures

Une restauration ZIP devra traiter explicitement plusieurs sujets.

### Base SQLite

- verifier le format et la version du backup ;
- verifier la compatibilite de `schema_info.version` ;
- eviter d'ecraser une base active sans confirmation ;
- prevoir une sauvegarde de securite avant remplacement ;
- gerer les erreurs pendant la copie ou le swap de DB.

### Medias

- restaurer `media/uploads/items` de facon coherente avec la DB restauree ;
- eviter les chemins absolus ;
- refuser les chemins sortant du dossier cible ;
- traiter les fichiers existants ;
- ignorer ou refuser les liens symboliques.

### Plugins

- verifier les plugins presents dans l'archive ;
- eviter d'ecraser des plugins locaux sans confirmation ;
- traiter les differences entre plugins archives et plugins installes ;
- conserver la validation des manifests et `fields.json`.

### Secrets

Le ZIP n'inclut pas :

- `.env` ;
- `JWT_SECRET` ;
- variables d'environnement ;
- tokens ;
- credentials externes.

Une restauration ne doit donc pas promettre de restaurer les secrets runtime.
L'instance cible devra fournir sa propre configuration.

### Compatibilite Versions

La restauration devra verifier :

- `format` et `format_version` du manifeste ;
- version applicative source ;
- version de schema SQLite ;
- compatibilite des plugins ;
- eventuels chemins ou entrees inconnus.

## Strategie Envisagee

Une approche prudente serait :

1. upload de l'archive ZIP depuis l'Administration ;
2. validation du ZIP sans extraction destructive ;
3. lecture et affichage du manifeste ;
4. verification des versions et warnings ;
5. dry-run listant DB, medias et plugins qui seraient restaures ;
6. creation d'une sauvegarde locale de securite de l'etat courant ;
7. arret ou verrouillage temporaire des operations d'ecriture ;
8. restauration dans un repertoire temporaire ;
9. validation des chemins et du contenu extrait ;
10. remplacement atomique ou sequence controlee DB + medias + plugins ;
11. redemarrage ou rechargement controle de l'application ;
12. rapport final.

Cette strategie n'est pas encore implementee.

## Relation Avec Les Autres Formats

- Export JSON natif : format metier portable, sans utilisateurs ni fichiers
  medias, importable en `add_only`.
- Sauvegarde ZIP : instantane technique sensible, incluant DB complete et medias
  physiques.
- Import CSV futur : format d'import collection, distinct du backup.

Ces formats ne sont pas interchangeables.
