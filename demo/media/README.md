# Pack média de démonstration

Le pack média de démonstration ne versionne aucun fichier média généré.

Les images sont générées à la demande par `demo/scripts/install-demo-media.mjs` et uploadées via l'API média existante de CollectionMgnt.

Cela garde le dépôt léger et évite tout asset image sous copyright.

## Périmètre actuel

- une image PNG générée par item de démonstration importé ;
- upload via `POST /api/media` ;
- chaque image uploadée est marquée comme image principale ;
- aucune écriture directe dans SQLite ;
- aucune écriture directe dans `DATA_DIR/uploads` ;
- aucun backup ZIP de démonstration.

## Fichiers générés

`demo/generated/` est réservé aux sorties locales temporaires si un futur outillage en a besoin.

Le script actuel génère les images en mémoire et n'a pas besoin de les persister.

## Travaux reportés

Les scénarios QA média avec fichiers orphelins ou références cassées volontaires ne font volontairement pas partie de ce lot.

Ils devront être traités plus tard dans un scénario QA ou E2E dédié, pas dans le flux d'installation de démonstration par défaut.

---

# Demo Media Pack

The demo media pack does not version generated media files.

Images are generated on demand by `demo/scripts/install-demo-media.mjs` and uploaded through the existing CollectionMgnt media API.

This keeps the repository lightweight and avoids any copyrighted image asset.

## Current Scope

- one generated PNG image per imported demo item;
- upload through `POST /api/media`;
- each uploaded image is marked as primary;
- no direct SQLite write;
- no direct write to `DATA_DIR/uploads`;
- no demo ZIP backup.

## Generated Files

`demo/generated/` is reserved for temporary local outputs if future tooling needs them.

The current script generates images in memory and does not need to persist them.

## Deferred Work

Media QA scenarios with intentional orphan files or broken references are intentionally not part of this lot.

They should be handled later in a dedicated QA or E2E scenario, not in the default demo installation flow.
