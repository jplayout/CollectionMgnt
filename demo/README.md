# Dataset de démonstration CollectionMgnt

Ce dossier contient le dataset officiel de démonstration pour CollectionMgnt.

Le fichier principal est :

- `demo/datasets/collectionmgnt-demo-v1.json`

## Objectif

Ce dataset permet de découvrir rapidement l'application avec des données réalistes, sans créer manuellement des dizaines d'items.

Il sert aussi de base légère pour les tests manuels, les démonstrations, les captures d'écran et les futurs tests E2E.

## Contenu

Le dataset contient 5 collections et 94 items :

- `games` : 36 jeux vidéo
- `books` : 18 livres
- `movies` : 18 films
- `consoles` : 12 consoles
- `others` : 10 objets divers

Les données couvrent la recherche, les filtres, le tri, la pagination, les vues cartes/liste, l'export CSV, l'export JSON, l'import JSON, le backup et le responsive.

Quelques valeurs rares commencent volontairement par `=`, `+`, `-` ou `@` dans des métadonnées afin de vérifier la neutralisation CSV Formula Injection.

## Import

1. Lancer CollectionMgnt.
2. Se connecter avec un compte admin.
3. Ouvrir Administration.
4. Choisir Importer des données.
5. Sélectionner `demo/datasets/collectionmgnt-demo-v1.json`.

## Limites

- Le dataset ne contient aucun fichier média physique.
- Les tableaux `media` sont vides.
- L'import JSON natif ne restaure pas les fichiers média.
- Le pack média de démonstration sera traité dans un lot ultérieur.
- L'import natif est non destructif et fonctionne en mode `add_only`.
- Réimporter le fichier crée de nouveaux items.

---

# CollectionMgnt Demo Dataset

This folder contains the official CollectionMgnt demo dataset.

The main file is:

- `demo/datasets/collectionmgnt-demo-v1.json`

## Purpose

This dataset helps new users explore the application quickly without manually creating dozens of items.

It also provides lightweight sample content for manual testing, demos, screenshots and future E2E tests.

## Contents

The dataset contains 5 collections and 94 items:

- `games`: 36 video games
- `books`: 18 books
- `movies`: 18 movies
- `consoles`: 12 consoles
- `others`: 10 miscellaneous items

The data covers search, filters, sorting, pagination, card/list views, CSV export, JSON export, JSON import, backup and responsive layouts.

A few metadata values intentionally start with `=`, `+`, `-` or `@` to verify CSV Formula Injection hardening.

## Import

1. Start CollectionMgnt.
2. Log in with an admin account.
3. Open Administration.
4. Choose Import data.
5. Select `demo/datasets/collectionmgnt-demo-v1.json`.

## Limits

- The dataset does not include physical media files.
- `media` arrays are empty.
- Native JSON import does not restore media files.
- A demo media pack may be handled in a later lot.
- Native import is non-destructive and uses `add_only` mode.
- Reimporting the file creates new items.
