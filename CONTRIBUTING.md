# Contributing To CollectionMgnt

> Français en premier. English version below.

---

# Français

## Workflow Git

La branche `main` est protégée. Aucun commit direct sur `main` ne doit être effectué.

Pour contribuer, créez une branche dédiée depuis l'état courant :

```bash
git checkout -b feature/nom-feature
```

Workflow attendu :

- développer la modification ;
- exécuter les vérifications minimales ;
- mettre à jour la documentation si nécessaire ;
- créer un commit ;
- pousser la branche ;
- ouvrir une Pull Request vers `main`.

## Development workflow

Workflow officiel :

```text
Analysis
  -> Architecture
  -> Implementation
  -> Self-review
  -> Documentation
  -> Pull Request
  -> Merge
```

Pour les conventions détaillées, consultez `docs/development.md`.

## Pull Requests

La branche `main` est protégée. Le développement se fait sur une branche dédiée, puis passe par une Pull Request avant d'être fusionné.

Pour les détails pratiques de développement, consultez `docs/development.md`.

Workflow recommandé :

```bash
git checkout -b feat/native-json-import
```

Puis :

- développer la modification sur cette branche ;
- exécuter les vérifications adaptées ;
- pousser la branche vers le dépôt distant ;
- ouvrir une Pull Request vers `main` ;
- attendre la review avant le merge.

Les Pull Requests doivent rester petites : une intention principale, un diff
lisible et des tests adaptés. Évitez de mélanger fonctionnalité, refactor et
documentation non liée.

Titre recommandé pour la Pull Request :

```text
feat: add native JSON import
```

## Vérifications Minimales

Backend :

```bash
cd backend
npm run check:syntax
npm test
```

Frontend :

```bash
cd frontend
npm exec vite build
```

Git :

```bash
git diff --check
```

La CI de Pull Request exécute les tests backend d'intégration avec le Node Test Runner natif, le build frontend Vite et la vérification whitespace. Les tests backend utilisent une base SQLite et un `DATA_DIR` temporaires.

Aucun test ne doit dépendre d'Internet ou d'un service tiers réel. Les providers
externes, registres, API et réponses réseau doivent être mockés ou couverts par
des fixtures locales.

## Documentation

Toute modification fonctionnelle doit mettre à jour :

- `docs/current-state.md`
- `docs/roadmap.md`

Mettez aussi à jour toute documentation spécialisée concernée, par exemple administration, export/import, sauvegarde ZIP, audit média, cleanup média, schéma de base ou API plugins.

## Données Interdites Dans Git

Ne jamais committer :

- `.env`
- `frontend/.env`
- bases SQLite
- fichiers SQLite WAL/SHM
- uploads utilisateur
- backups ZIP
- secrets
- tokens
- credentials externes
- logs

## Convention de commits

Convention officielle :

- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug ou amélioration UX
- `docs:` documentation
- `refactor:` refactoring sans changement fonctionnel
- `chore:` maintenance, CI, dépendances ou tooling

Exemples issus du projet :

```text
feat: add native JSON import
feat: add full ZIP backup download
fix: hide collection JSON export from the UI
fix: display collection names instead of plugin codes
docs: document export system boundaries
refactor: share breadcrumb rendering across pages
chore: add frontend build to CI
```

## Licence

En contribuant, vous acceptez que vos contributions soient soumises à la licence du projet. Consultez `LICENSE` avant d'ouvrir une Pull Request.

---

# English

## Git Workflow

The `main` branch is protected. Do not commit directly to `main`.

To contribute, create a dedicated branch from the current state:

```bash
git checkout -b feature/feature-name
```

Expected workflow:

- develop the change;
- run the minimal checks;
- update documentation when needed;
- create a commit;
- push the branch;
- open a Pull Request targeting `main`.

## Development Workflow

Official workflow:

```text
Analysis
  -> Architecture
  -> Implementation
  -> Self-review
  -> Documentation
  -> Pull Request
  -> Merge
```

For detailed conventions, read `docs/development.md`.

## Pull Requests

The `main` branch is protected. Development happens on a dedicated branch, then goes through a Pull Request before it is merged.

For practical development details, read `docs/development.md`.

Recommended workflow:

```bash
git checkout -b feat/native-json-import
```

Then:

- develop the change on that branch;
- run the relevant checks;
- push the branch to the remote repository;
- open a Pull Request targeting `main`;
- wait for review before merging.

Pull Requests should stay small: one main intent, a readable diff and relevant
tests. Avoid mixing features, refactors and unrelated documentation.

Recommended Pull Request title:

```text
feat: add native JSON import
```

## Minimal Checks

Backend:

```bash
cd backend
npm run check:syntax
npm test
```

Frontend:

```bash
cd frontend
npm exec vite build
```

Git:

```bash
git diff --check
```

The Pull Request CI runs backend integration tests with the native Node Test Runner, the Vite frontend build and the whitespace check. Backend tests use a temporary SQLite database and `DATA_DIR`.

No test should depend on the Internet or a real third-party service. External
providers, registries, APIs and network responses must be mocked or covered by
local fixtures.

## Documentation

Every functional change should update:

- `docs/current-state.md`
- `docs/roadmap.md`

Also update any specialized documentation affected by the change, such as administration, export/import, ZIP backup, media audit, media cleanup, database schema or plugin API docs.

## Data Forbidden In Git

Never commit:

- `.env`
- `frontend/.env`
- SQLite databases
- SQLite WAL/SHM files
- user uploads
- ZIP backups
- secrets
- tokens
- external credentials
- logs

## Commit Conventions

Official convention:

- `feat:` new feature
- `fix:` bug fix or UX improvement
- `docs:` documentation
- `refactor:` refactoring without functional change
- `chore:` maintenance, CI, dependencies or tooling

Examples from the project:

```text
feat: add native JSON import
feat: add full ZIP backup download
fix: hide collection JSON export from the UI
fix: display collection names instead of plugin codes
docs: document export system boundaries
refactor: share breadcrumb rendering across pages
chore: add frontend build to CI
```

## License

By contributing, you agree that your contributions are submitted under the project license. Read `LICENSE` before opening a Pull Request.
