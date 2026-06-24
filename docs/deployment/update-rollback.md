# Update & Rollback

Ce guide explique comment mettre à jour CollectionMgnt en limitant le risque de perte de données, puis comment revenir à une version précédente si une mise à jour échoue.

Il s'applique aux déploiements auto-hébergés Docker, Podman et Synology Container Manager.

## Objectif

Une mise à jour modifie les images applicatives. Les données réelles de CollectionMgnt vivent dans le volume persistant du backend.

La stratégie recommandée avant toute mise à jour est donc de conserver :

- le tag ou digest des images actuellement utilisées ;
- une copie complète du volume persistant ;
- la configuration runtime nécessaire au redémarrage.

Le rollback le plus sûr repose sur le retour simultané à l'ancienne image et à la copie du volume prise avant mise à jour.

## Concepts

CollectionMgnt propose ou utilise plusieurs mécanismes de protection des données. Ils ne couvrent pas le même besoin.

### Export JSON

L'export JSON natif est un format métier.

Il permet de récupérer des données applicatives lisibles et réimportables partiellement :

- plugins et schémas ;
- settings non sensibles ;
- collections ;
- items ;
- métadonnées média.

Il ne contient pas :

- les fichiers médias physiques ;
- les utilisateurs ;
- les `password_hash` ;
- les secrets ;
- les variables d'environnement.

Ce n'est pas une sauvegarde complète.

### Backup ZIP

Le backup ZIP est un snapshot applicatif généré depuis l'Administration via `GET /api/admin/backup.zip`.

Il contient :

- une copie SQLite cohérente ;
- les fichiers médias physiques sous `media/uploads/items` ;
- l'export JSON natif global ;
- un manifeste ;
- les plugins disponibles depuis `PLUGINS_DIR`.

Le backup ZIP est sensible, car il contient la base SQLite complète, incluant les utilisateurs et `password_hash`.

À ce stade, CollectionMgnt ne fournit pas encore de restauration ZIP applicative automatisée. Le ZIP doit être conservé comme snapshot technique et filet de sécurité, mais il ne remplace pas une copie complète du volume persistant avant mise à jour.

### Copie du volume persistant

La copie du volume persistant est la protection la plus complète avant une mise à jour.

Elle préserve l'état exact du dossier data utilisé par le backend :

- base SQLite ;
- uploads média ;
- images optimisées ;
- thumbnails ;
- backups générés ;
- fichiers applicatifs générés sous `DATA_DIR`.

Pour Synology, ce dossier correspond par défaut à :

```text
/volume1/docker/collectionmgnt/data
```

ou à la valeur configurée dans `COLLECTIONMGNT_DATA_DIR`.

Pour Docker / Podman local, il correspond par défaut au dossier hôte :

```text
./backend/data
```

### Comparatif

| Mécanisme | Contient les données métier | Contient les médias physiques | Contient les utilisateurs | Contient la configuration runtime | Usage recommandé |
| --- | --- | --- | --- | --- | --- |
| Export JSON | Oui | Non | Non | Non | Portabilité métier, import partiel |
| Backup ZIP | Oui | Oui | Oui | Non | Snapshot applicatif sensible |
| Copie du volume persistant | Oui | Oui | Oui | Non | Rollback pré-update le plus sûr |
| Copie de la configuration runtime | Non | Non | Non | Oui | Redémarrage fiable après update ou rollback |

La configuration runtime doit être conservée séparément : variables d'environnement, secret JWT, ports, chemin du volume, paramètres DSM et règles reverse proxy.

## Avant une mise à jour

Checklist recommandée :

1. Noter le tag ou digest actuel des images backend et frontend.
2. Télécharger un backup ZIP depuis l'Administration.
3. Noter ou exporter la configuration runtime :
   - `JWT_SECRET` ;
   - `ADMIN_USERNAME` ;
   - `ADMIN_PASSWORD` si nécessaire pour une nouvelle initialisation ;
   - `FRONTEND_PORT` ;
   - `BACKEND_PORT` si utilisé ;
   - `DATA_DIR` ou `COLLECTIONMGNT_DATA_DIR` ;
   - règle reverse proxy et certificat DSM si applicable.
4. Arrêter l'application.
5. Copier entièrement le volume persistant.
6. Vérifier que la copie contient au minimum `collection-manager.db` et le dossier `uploads` si des médias existent.
7. Conserver la copie jusqu'à validation complète de la nouvelle version.

Ne pas régénérer `JWT_SECRET` pendant une mise à jour. Un changement de secret invalide les sessions existantes et peut compliquer le diagnostic.

## Procédure de mise à jour

### Docker / Podman

Étapes génériques pour un déploiement basé sur des images :

1. Appliquer la checklist pré-update.
2. Récupérer les nouvelles images.
3. Recréer les conteneurs.
4. Redémarrer l'application.
5. Exécuter les validations post-update.

Exemple Docker Compose :

```bash
docker compose pull
docker compose up -d
```

Exemple Podman Compose :

```bash
podman-compose pull
podman-compose up -d
```

Si le déploiement local utilise `build:` au lieu d'images prébuildées, reconstruire les images au lieu de faire seulement un pull :

```bash
docker compose up --build -d
```

ou :

```bash
podman-compose up --build -d
```

### Synology Container Manager

Étapes adaptées à DSM :

1. Noter les images backend/frontend actuellement utilisées, idéalement avec leur tag ou digest.
2. Télécharger un backup ZIP depuis l'Administration.
3. Noter les variables du projet Container Manager :
   - `JWT_SECRET` ;
   - `ADMIN_USERNAME` ;
   - `ADMIN_PASSWORD` ;
   - `FRONTEND_PORT` ;
   - `COLLECTIONMGNT_DATA_DIR`.
4. Arrêter le projet CollectionMgnt dans Container Manager.
5. Copier le dossier configuré dans `COLLECTIONMGNT_DATA_DIR`.
6. Télécharger ou actualiser les nouvelles images GHCR.
7. Redémarrer le projet.
8. Valider l'application depuis le navigateur.

Le backend ne doit pas être exposé pendant la mise à jour. Le frontend reste le seul point d'entrée public.

## Validation après mise à jour

Vérifier au minimum :

- ouverture de l'application ;
- login administrateur ;
- restauration de session via l'interface ;
- affichage des collections ;
- ouverture d'une liste d'items ;
- ouverture d'une fiche item ;
- affichage des médias et miniatures ;
- upload d'une image de test si le contexte le permet ;
- export CSV ;
- export JSON applicatif depuis l'Administration ;
- import JSON natif sur un fichier de test si le contexte le permet ;
- téléchargement d'un backup ZIP ;
- accès HTTPS et reverse proxy DSM si configurés.

Conserver la copie pré-update tant que ces vérifications ne sont pas terminées.

## Procédure de rollback

Deux niveaux de rollback sont possibles.

### Cas 1 : rollback simple vers image précédente

Ce cas peut suffire si :

- la mise à jour échoue au démarrage ;
- aucune migration de données irréversible n'a été appliquée ;
- aucune donnée importante n'a été créée ou modifiée depuis la mise à jour ;
- l'ancienne version reste compatible avec le volume actuel.

Procédure :

1. Arrêter l'application.
2. Revenir aux anciens tags ou digests backend/frontend.
3. Recréer les conteneurs.
4. Redémarrer.
5. Valider login, collections, médias et backup ZIP.

Cette méthode est rapide, mais elle n'est pas toujours suffisante.

### Cas 2 : rollback complet

Ce cas est recommandé si :

- la mise à jour a modifié la base SQLite ;
- l'application démarre mais se comporte mal ;
- des médias ou données semblent incohérents ;
- le rollback simple échoue ;
- une future migration DB rend l'ancienne version incompatible avec le volume courant.

Procédure :

1. Arrêter le projet ou les conteneurs.
2. Mettre de côté le volume courant pour diagnostic, sans l'écraser.
3. Restaurer la copie complète du volume prise avant mise à jour.
4. Revenir aux anciens tags ou digests backend/frontend.
5. Vérifier que le même `JWT_SECRET` et les mêmes variables importantes sont configurés.
6. Redémarrer l'application.
7. Valider login, collections, items, médias, exports et backup ZIP.

Le rollback complet est la procédure la plus fiable, car il restaure ensemble le code applicatif et l'état des données.

## Risques connus

- Les futures migrations SQLite peuvent être compatibles uniquement vers l'avant.
- Une image ancienne peut ne pas comprendre une base modifiée par une image plus récente.
- Les plugins intégrés peuvent évoluer entre versions.
- Les champs de plugin et les métadonnées existantes peuvent diverger après rollback.
- Le format du backup ZIP pourra évoluer dans de futures versions.
- Le rollback image seule peut être insuffisant si le volume persistant a été modifié.
- Les médias dépendent à la fois des lignes SQLite et des fichiers physiques.
- Le tag `latest` ne décrit pas une version stable dans le temps.

## Bonnes pratiques

- Éviter de dépendre uniquement de `latest` pour les déploiements importants.
- Préférer un tag versionné ou un digest lorsque la reproductibilité compte.
- Toujours conserver un backup pré-update.
- Toujours copier le volume persistant avant une mise à jour sensible.
- Conserver aussi la configuration runtime.
- Tester la nouvelle version avant de supprimer les sauvegardes.
- Ne pas modifier plusieurs éléments à la fois si ce n'est pas nécessaire : image, volume, reverse proxy, ports et secrets doivent rester traçables.
- Stocker les backups ZIP et copies de volume dans un emplacement privé.
- Ne jamais publier une sauvegarde ZIP ou une copie de base SQLite.
