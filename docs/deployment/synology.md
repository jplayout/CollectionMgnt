# Déploiement Synology DSM avec Container Manager

Ce guide décrit un déploiement de CollectionMgnt sur Synology DSM avec Container Manager, à partir du compose `deploy/compose.synology.yml`.

Le déploiement expose uniquement le frontend sur le NAS. Le backend reste accessible seulement sur le réseau Docker interne et reçoit les appels `/api` via le Nginx du conteneur frontend.

Pour publier l'application en HTTPS via un domaine ou sous-domaine, voir le guide [Synology HTTPS / Reverse Proxy](synology-https-reverse-proxy.md). L'approche recommandée consiste à faire pointer le reverse proxy DSM vers le frontend uniquement, sans exposer le backend.

Pour préparer les mises à jour et les retours arrière, voir le guide [Update & Rollback](update-rollback.md).

## Prérequis

- Un NAS Synology avec DSM compatible avec Container Manager.
- Le paquet Container Manager installé depuis le Centre de paquets.
- Un compte DSM avec droits administrateur.
- Un accès réseau au NAS depuis le poste qui utilisera l'application.
- Un accès au registre GitHub Container Registry pour télécharger les images :
  - `ghcr.io/jplayout/collectionmgnt-backend:latest`
  - `ghcr.io/jplayout/collectionmgnt-frontend:latest`

Les images GHCR sont publiées pour `linux/amd64` et `linux/arm64`. Les NAS Synology ARM64, dont les modèles basés sur Realtek RTD1293, utilisent l'image `linux/arm64`. `linux/arm/v7` n'est pas supporté officiellement à ce stade.

## Préparation

### Dossier persistant

Créer le dossier de données sur le volume Synology choisi. Le compose fournit cette valeur par défaut :

```text
/volume1/docker/collectionmgnt/data
```

Ce dossier doit être conservé et sauvegardé. Il contient les données applicatives réelles.

`volume1` n'est pas universel sur Synology. Si Container Manager ou vos dossiers Docker sont sur un autre volume ou partage, utiliser le chemin réel, par exemple `/volume2/docker/collectionmgnt/data`, et définir `COLLECTIONMGNT_DATA_DIR` avec cette valeur.

### Secret JWT

Préparer un `JWT_SECRET` fort :

- au moins 32 caractères ;
- valeur aléatoire ;
- valeur stable entre les redémarrages et les mises à jour.

Ne pas régénérer ce secret à chaque démarrage. Les sessions existantes dépendent de cette valeur.

Exemple de forme attendue :

```text
change-me-use-at-least-32-characters
```

Remplacer cette valeur par un secret réellement privé.

### Compte administrateur initial

Choisir :

- `ADMIN_USERNAME`, par défaut `admin` ;
- `ADMIN_PASSWORD`, obligatoire.

Le premier utilisateur administrateur est créé automatiquement au premier démarrage si la base SQLite n'existe pas encore.

### Port frontend

Le compose expose le frontend sur le port hôte `8080` par défaut :

```text
8080:80
```

Si ce port est déjà utilisé sur le NAS, définir `FRONTEND_PORT` avec une autre valeur, par exemple `8081`.

## Déploiement

### Importer le compose

Dans DSM :

1. Ouvrir Container Manager.
2. Aller dans Projets.
3. Créer un nouveau projet.
4. Donner un nom au projet, par exemple `collectionmgnt`.
5. Importer le contenu de `deploy/compose.synology.yml`.

Le compose crée deux services :

- `backend`, basé sur l'image GHCR backend ;
- `frontend`, basé sur l'image GHCR frontend.

Les deux services utilisent le réseau Docker interne `collectionmgnt`.

### Configurer les variables

Renseigner les variables attendues dans Container Manager, ou dans le mécanisme d'environnement proposé par DSM pour le projet :

```env
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
FRONTEND_PORT=8080
COLLECTIONMGNT_DATA_DIR=/volume1/docker/collectionmgnt/data
```

Variables fixées par le compose pour le backend :

```env
DATA_DIR=/app/data
PLUGINS_DIR=/app/plugins
```

Ne pas monter de dossier plugins hôte par défaut. Les plugins intégrés sont déjà présents dans l'image backend sous `/app/plugins`.

### Démarrer le projet

Démarrer le projet depuis Container Manager.

Container Manager doit télécharger les images GHCR, créer le réseau interne, monter le dossier persistant et lancer les deux conteneurs.

Après publication d'une nouvelle version, les manifests multi-architecture peuvent être vérifiés depuis un poste équipé de Docker Buildx :

```bash
docker buildx imagetools inspect ghcr.io/jplayout/collectionmgnt-backend:latest
docker buildx imagetools inspect ghcr.io/jplayout/collectionmgnt-frontend:latest
```

## Vérification

### Accès interface web

Depuis un navigateur sur le LAN :

```text
http://IP_DU_NAS:8080
```

Remplacer `8080` par la valeur de `FRONTEND_PORT` si elle a été changée.

Pour un accès HTTPS via DSM Reverse Proxy, utiliser ensuite le guide dédié : [Synology HTTPS / Reverse Proxy](synology-https-reverse-proxy.md).

### Connexion admin

Se connecter avec :

- l'identifiant `ADMIN_USERNAME` ;
- le mot de passe `ADMIN_PASSWORD`.

Après connexion, l'application doit afficher les collections.

### Vérifier l'API interne

Le backend ne doit pas être appelé directement depuis le navigateur. Les appels API passent par le frontend :

```text
http://IP_DU_NAS:8080/api
```

Sans token, certaines routes protégées répondent normalement `401 Unauthorized`.

### Importer le dataset de démonstration

Pour vérifier un déploiement vide :

1. Se connecter en administrateur.
2. Ouvrir Administration.
3. Utiliser l'import JSON natif.
4. Importer le dataset de démonstration depuis `demo/datasets/collectionmgnt-demo-v1.json`.

L'import doit créer les collections et les items de démonstration. Le pack média de démonstration reste optionnel et n'est pas nécessaire pour valider le déploiement Container Manager.

## Persistance

Le volume Synology persistant par défaut est :

```text
/volume1/docker/collectionmgnt/data
```

Le chemin hôte peut être remplacé avec `COLLECTIONMGNT_DATA_DIR` si le NAS utilise un autre volume ou un autre emplacement Docker.

Il est monté dans le conteneur backend sur :

```text
/app/data
```

Ce dossier contient notamment :

- la base SQLite `collection-manager.db` ;
- les images originales uploadées ;
- les images optimisées ;
- les thumbnails ;
- les backups générés par l'administration ;
- les dossiers applicatifs générés par le backend.

La suppression de ce dossier supprime les données applicatives. Le remplacement des conteneurs ou la mise à jour des images ne doit pas supprimer ce dossier.

## Mise à jour simple

La procédure détaillée de mise à jour et rollback est documentée dans [Update & Rollback](update-rollback.md).

Avant toute mise à jour :

1. Arrêter le projet depuis Container Manager.
2. Sauvegarder le dossier configuré dans `COLLECTIONMGNT_DATA_DIR`, ou `/volume1/docker/collectionmgnt/data` si la valeur par défaut est utilisée.
3. Télécharger les nouvelles images GHCR depuis Container Manager.
4. Redémarrer le projet.
5. Vérifier l'accès web et la connexion admin.

Cette procédure ne décrit pas de rollback avancé. Conserver la sauvegarde du dossier `data` tant que la nouvelle version n'a pas été validée.

## Dépannage

### `JWT_SECRET` invalide

Symptômes possibles :

- le backend s'arrête au démarrage ;
- les logs indiquent que `JWT_SECRET` est requis ou trop court.

Correction :

- définir un `JWT_SECRET` non vide ;
- utiliser au moins 32 caractères ;
- garder la même valeur après redémarrage.

### Port déjà utilisé

Symptômes possibles :

- le service frontend ne démarre pas ;
- Container Manager signale que le port hôte est déjà occupé.

Correction :

- changer `FRONTEND_PORT`, par exemple `8081` ;
- accéder ensuite à `http://IP_DU_NAS:8081`.

### Volume manquant ou mauvais chemin

Symptômes possibles :

- le backend ne crée pas la base ;
- les médias ne persistent pas ;
- les logs mentionnent une erreur d'accès au fichier SQLite.

Correction :

- créer le dossier configuré dans `COLLECTIONMGNT_DATA_DIR`, ou `/volume1/docker/collectionmgnt/data` si la valeur par défaut est utilisée ;
- vérifier que le chemin correspond au volume réel du NAS ;
- vérifier les permissions DSM sur ce dossier.

### Backend inaccessible

Symptômes possibles :

- le frontend s'affiche, mais les appels API échouent ;
- la connexion admin ne répond pas ;
- les logs frontend Nginx mentionnent une erreur de proxy vers `backend:3000`.

Correction :

- vérifier que le service `backend` est démarré ;
- vérifier les logs backend ;
- vérifier que les deux services sont dans le même projet Container Manager ;
- ne pas renommer le service `backend` sans adapter la configuration frontend.

### Frontend inaccessible

Symptômes possibles :

- `http://IP_DU_NAS:8080` ne répond pas ;
- le navigateur affiche une erreur de connexion.

Correction :

- vérifier que le service `frontend` est démarré ;
- vérifier que le port hôte configuré correspond à l'URL utilisée ;
- vérifier le pare-feu DSM ;
- vérifier qu'un autre service n'utilise pas le même port.

## Limitations

- HTTPS et le reverse proxy Synology sont couverts dans [Synology HTTPS / Reverse Proxy](synology-https-reverse-proxy.md).
- L'accès mobile hors LAN dépend de la configuration réseau, du domaine, du certificat et du routage DSM.
- La stratégie de rollback détaillée est couverte dans [Update & Rollback](update-rollback.md).
- Ce guide ne modifie pas les images Docker, l'API, le backend, le frontend ou la base SQLite.
