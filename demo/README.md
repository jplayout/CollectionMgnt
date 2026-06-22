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

Le script `demo/scripts/install-demo-media.mjs` importe le dataset puis génère une image PNG principale pour chaque item importé.

Les images sont générées à la volée, sans image sous copyright, puis envoyées via l'API média existante. Le script n'écrit pas directement dans SQLite et n'écrit pas directement dans `DATA_DIR/uploads`.

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

Options disponibles :

- `--dataset` pour utiliser un autre fichier JSON natif.
- `--skip-existing` pour ignorer l'upload si un item nouvellement importé a déjà un média.
- `--force` pour uploader malgré les médias existants.

## Limites

- L'import natif est non destructif et fonctionne en mode `add_only`.
- Le script importe le dataset à chaque exécution : relancer la commande crée donc de nouveaux items.
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

The `demo/scripts/install-demo-media.mjs` script imports the dataset, then generates one primary PNG image for each imported item.

Images are generated on demand without copyrighted assets and uploaded through the existing media API. The script does not write directly to SQLite and does not write directly to `DATA_DIR/uploads`.

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

Available options:

- `--dataset` to use another native JSON file.
- `--skip-existing` to skip upload when a newly imported item already has media.
- `--force` to upload even when media already exists.

## Limits

- Native import is non-destructive and uses `add_only` mode.
- The script imports the dataset on every run, so running it again creates new items.
- Credentials and JWT tokens are not stored or written to a file.
- No generated media file is versioned in the repository.
- QA scenarios with orphan media are deferred to a later lot.
