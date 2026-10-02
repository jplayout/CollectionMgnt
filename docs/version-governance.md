# Gouvernance de version

## Français

[VERSION](../VERSION) est l'unique source de la version produit. Son contenu est
un SemVer, sans préfixe `v`. Les identifiants de développement, alpha et RC sont
des préversions SemVer. Le SHA du build reste séparé. Aucun bump n'est imposé à
chaque PR : le changement de version relève du jalon produit.

Le lecteur partagé `backend/src/config/build-info.js` trouve le fichier depuis
son emplacement, indépendamment du répertoire courant. L'API administrateur
`GET /api/admin/system-summary` expose `version`, `revision` et les compteurs
existants. Les manifests de sauvegarde lisent également ce fichier ; leurs
versions de format et les versions des plugins restent indépendantes.

Vite lit le même fichier au démarrage et au build, puis injecte
`VITE_APP_VERSION` et `VITE_APP_REVISION`. Les paramètres affichent la version
du frontend et le SHA court sur deux lignes, **Version** et **Build**, même si
le résumé backend est indisponible. Seules ces métadonnées publiques sont
affichées, jamais l'environnement complet.

### Développement et builds

`npm run dev` fonctionne dans chaque sous-projet sans configuration de version.
Le SHA local est obtenu une fois depuis Git ; si Git ou la révision manque,
le build affiche `development`. Le backend autorise le fallback de version
`development` pour un fichier absent hors production. Une version invalide
échoue toujours. La production exige le fichier `VERSION` et ne lance jamais
Git : `APP_REVISION` est injecté lors du build ou du déploiement.

`APP_VERSION` et son alias frontend `VITE_APP_VERSION`, lorsqu'ils sont fournis,
doivent correspondre au fichier canonique. `APP_REVISION` et son alias
`VITE_APP_REVISION` sont disponibles pour les builds frontend. `APP_VERSION_FILE`
permet au backend de trouver le fichier copié dans `/app/VERSION` dans l'image.

Depuis la racine, le lanceur utilise Podman par défaut :

```bash
node scripts/container.mjs build backend -t collectionmgnt-backend
node scripts/container.mjs build frontend -t collectionmgnt-frontend
node scripts/container.mjs compose up --build
```

Il transmet automatiquement `APP_VERSION`, `APP_REVISION` et `APP_SOURCE`, sans
recopier la version dans `.env`. Compose exige cette injection pour éviter des
labels vides. Sur un autre hôte équipé de Docker, utiliser
`CONTAINER_ENGINE=docker` devant la même commande. Les builds utilisent le
contexte racine ; `.dockerignore` exclut notamment les fichiers d'environnement,
Git et les dépendances locales.

Les deux images portent les labels OCI `org.opencontainers.image.version`,
`org.opencontainers.image.revision` et `org.opencontainers.image.source`.
Le backend conserve `VERSION` dans l'image ; Nginx sert les métadonnées intégrées
au bundle frontend. Les images GHCR prébuildées n'exigent aucune variable de
version dans le Compose Synology. Le workflow de publication utilise
`scripts/build-info.mjs --github-output` pour les deux builds. Les tags `latest`,
`sha-*` et les tags Git `v*` gardent leur comportement existant.

### Contrôle d'unicité

```bash
node scripts/check-version-governance.mjs
```

Le contrôle Project Conventions exige un fichier SemVer valide, interdit les
anciennes versions de lots dans le code produit, les versions littérales dans
les sources frontend et les champs `version` des manifests npm applicatifs
(y compris les entrées racine des lockfiles).
Ces manifests servent à installer les dépendances, pas à définir une autre
version produit. Les numéros de lots conservés dans la roadmap décrivent
l'historique fonctionnel ; ils ne sont plus des versions applicatives.

## English

[VERSION](../VERSION) is the only product version source. It contains a SemVer
without a `v` prefix. Development, alpha and RC identifiers are prereleases;
the build SHA is separate. A version bump is tied to a product milestone,
never required for every PR.

The shared backend reader resolves the file independently of the working
directory. The authenticated system summary API returns `version`, `revision`
and its existing counters. Backup manifests also read the canonical file;
plugin and data format versions remain independent.

Vite reads the same source for `npm run dev` and production builds, injecting
`VITE_APP_VERSION` and `VITE_APP_REVISION`. Settings displays **Version** and
**Build** separately, with a seven-character SHA or `development`. The frontend
metadata remains visible if the backend summary fails. No secrets or complete
environment object are displayed.

Local development resolves Git automatically. Production backend containers
never execute Git: the revision is injected through `APP_REVISION`. Missing
development version files have an explicit `development` fallback; production
requires the file, and invalid versions always fail. Injected `APP_VERSION`
must match `VERSION`; it cannot override the source of truth.

Use the root `scripts/container.mjs` commands above for builds and Compose.
Podman is the default engine; other hosts can select Docker through
`CONTAINER_ENGINE=docker`. Version, revision and OCI source are passed
automatically, without duplicating the version in `.env`. Both Dockerfiles use
the repository root as build context and include the three OCI labels.
Prebuilt GHCR images carry their own metadata, including on Synology.
Publication triggers, architectures and tag strategy are unchanged.

Project Conventions runs `scripts/check-version-governance.mjs`. It validates
`VERSION`, rejects obsolete product versions and frontend version literals,
and keeps application npm manifests and lockfile root entries from becoming a
second version source.
