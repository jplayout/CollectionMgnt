# Démonstration CollectionMgnt

Ce dossier contient le dataset officiel de démonstration et le script de pack média pour CollectionMgnt.

Fichiers principaux :

- `demo/datasets/collectionmgnt-demo-v1.json`
- `demo/scripts/install-demo-media.mjs`

## Dataset

Ce dataset permet de découvrir rapidement l'application avec des données réalistes, sans créer manuellement des dizaines d'items.

Il sert aussi de base légère pour les tests manuels, les démonstrations, les captures d'écran et les futurs tests E2E.

### Contenu

Le dataset contient 5 collections et 94 items :

- `games` : 36 jeux vidéo
- `books` : 18 livres
- `movies` : 18 films
- `consoles` : 12 consoles
- `others` : 10 objets divers

Les données couvrent la recherche, les filtres, le tri, la pagination, les vues cartes/liste, l'export CSV, l'export JSON, l'import JSON, le backup et le responsive.

Quelques valeurs rares commencent volontairement par `=`, `+`, `-` ou `@` dans des métadonnées afin de vérifier la neutralisation CSV Formula Injection.

### Import manuel du dataset

1. Lancer CollectionMgnt.
2. Se connecter avec un compte admin.
3. Ouvrir Administration.
4. Choisir Importer des données.
5. Sélectionner `demo/datasets/collectionmgnt-demo-v1.json`.

## Pack média généré

Le script `demo/scripts/install-demo-media.mjs` installe le pack média de démonstration. Il peut importer le dataset si nécessaire, ou compléter les images manquantes d'un dataset déjà importé.

Les images sont générées à la volée, sans image sous copyright, puis envoyées via l'API média existante. Le script n'écrit pas directement dans SQLite et n'écrit pas directement dans `DATA_DIR/uploads`.

Par défaut, le script est prudent :

- il affiche les étapes et une progression pendant l'exécution ;
- s'il détecte que le dataset de démonstration est déjà présent, il n'importe pas une nouvelle copie ;
- il complète uniquement les images manquantes ;
- s'il ne trouve pas le dataset, il l'importe puis attache les images aux items créés.

Sur un NAS Synology ARM64, la génération et l'optimisation des 94 images peuvent prendre plusieurs minutes.

### Prérequis

- Node.js 22 ou plus récent.
- Backend CollectionMgnt lancé.
- Compte admin CollectionMgnt.

### Commande

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://localhost:3000 \
  --username admin \
  --password 'change-me'
```

Pour compléter les images après un import manuel du dataset, sans jamais réimporter le dataset :

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://localhost:3000 \
  --username admin \
  --password 'change-me' \
  --attach-existing
```

Pour une instance Synology où l'application est exposée par le frontend sur le port `8080`, utiliser l'URL frontend sans ajouter `/api` :

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://IP_DU_NAS:8080 \
  --username admin \
  --password 'change-me' \
  --attach-existing
```

Options disponibles :

- `--dataset` pour utiliser un autre fichier JSON natif.
- `--attach-existing` pour compléter les médias manquants d'un dataset déjà importé, sans réimport.
- `--force` pour uploader malgré les médias existants.

## Limites

- L'import natif est non destructif et fonctionne en mode `add_only`.
- La correspondance `--attach-existing` utilise le couple collection/plugin + titre. Les titres introuvables ou ambigus sont affichés dans le résumé final.
- Les identifiants et le token JWT ne sont ni stockés ni écrits dans un fichier.
- Aucun fichier média généré n'est versionné dans le dépôt.
- Les scénarios QA avec médias orphelins sont reportés à un lot ultérieur.

---

# CollectionMgnt Demo

This folder contains the official CollectionMgnt demo dataset and media pack script.

Main files:

- `demo/datasets/collectionmgnt-demo-v1.json`
- `demo/scripts/install-demo-media.mjs`

## Dataset

This dataset helps new users explore the application quickly without manually creating dozens of items.

It also provides lightweight sample content for manual testing, demos, screenshots and future E2E tests.

### Contents

The dataset contains 5 collections and 94 items:

- `games`: 36 video games
- `books`: 18 books
- `movies`: 18 movies
- `consoles`: 12 consoles
- `others`: 10 miscellaneous items

The data covers search, filters, sorting, pagination, card/list views, CSV export, JSON export, JSON import, backup and responsive layouts.

A few metadata values intentionally start with `=`, `+`, `-` or `@` to verify CSV Formula Injection hardening.

### Manual Dataset Import

1. Start CollectionMgnt.
2. Log in with an admin account.
3. Open Administration.
4. Choose Import data.
5. Select `demo/datasets/collectionmgnt-demo-v1.json`.

## Generated Media Pack

The `demo/scripts/install-demo-media.mjs` script installs the demo media pack. It can import the dataset when needed, or complete missing images for a dataset that was already imported.

Images are generated on demand without copyrighted assets and uploaded through the existing media API. The script does not write directly to SQLite and does not write directly to `DATA_DIR/uploads`.

By default, the script is cautious:

- it prints execution steps and progress;
- when it detects that the demo dataset is already present, it does not import another copy;
- it only completes missing images;
- when the dataset is not found, it imports it and attaches images to the created items.

On a Synology ARM64 NAS, generating and optimizing the 94 images can take several minutes.

### Requirements

- Node.js 22 or newer.
- Running CollectionMgnt backend.
- CollectionMgnt admin account.

### Command

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://localhost:3000 \
  --username admin \
  --password 'change-me'
```

To complete images after manually importing the dataset, without ever importing the dataset again:

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://localhost:3000 \
  --username admin \
  --password 'change-me' \
  --attach-existing
```

For a Synology instance where the app is exposed by the frontend on port `8080`, use the frontend URL without adding `/api`:

```bash
node demo/scripts/install-demo-media.mjs \
  --base-url http://NAS_IP:8080 \
  --username admin \
  --password 'change-me' \
  --attach-existing
```

Available options:

- `--dataset` to use another native JSON file.
- `--attach-existing` to complete missing media for an already imported dataset, without reimporting.
- `--force` to upload even when media already exists.

## Limits

- Native import is non-destructive and uses `add_only` mode.
- `--attach-existing` matches items by collection/plugin + title. Missing or ambiguous titles are printed in the final summary.
- Credentials and JWT tokens are not stored or written to a file.
- No generated media file is versioned in the repository.
- QA scenarios with orphan media are deferred to a later lot.
