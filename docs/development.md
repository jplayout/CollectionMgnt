# Development Guide

> Francais en premier. English version below.

---

# Francais

Ce guide donne les reperes pratiques pour contribuer a CollectionMgnt sans lire
tout le code avant de commencer.

## Structure Du Depot

- `backend/` : API Fastify, services, repositories, base SQLite et plugins.
- `frontend/` : application Vue 3, Vite, Pinia, Vue Router et tests Playwright.
- `backend/plugins/` : plugins standards declaratifs.
- `docs/` : documentation utilisateur, technique et de deploiement.
- `.github/workflows/` : CI, CodeQL, Semgrep, Trivy et publication.

## Backend

Le backend est une API Fastify exposee sous `/api`.

Les routes doivent rester minces : validation HTTP minimale, appel a un service
ou repository, puis traduction de la reponse. La logique metier vit dans les
services. L'acces SQLite vit dans les repositories.

Le bootstrap principal est dans `backend/src/server.js`. Les tests utilisent
`backend/test/helpers/test-app.js`, qui cree une application Fastify avec une
base SQLite et un `DATA_DIR` temporaires.

## Frontend

Le frontend utilise Vue 3 avec Vite.

- `frontend/src/pages/` contient les vues principales.
- `frontend/src/components/` contient les composants reutilisables.
- `frontend/src/services/` contient les clients API.
- `frontend/src/stores/` contient les stores Pinia.

Les formulaires items passent par `DynamicForm` et `DynamicField`. Les
comportements plus specialises, comme le lookup ISBN, doivent rester autour du
formulaire plutot que rendre `DynamicField` dependant d'un domaine metier.

## SQLite

La source SQL des nouvelles bases est `backend/src/database/schema.sql`.

Les migrations simples pour bases existantes sont dans
`backend/src/database/init.js`. Une migration doit etre idempotente, ne pas
casser une base existante et mettre a jour `schema_info` quand le schema evolue.

Les plugins ne creent pas de tables. Leurs champs sont stockes dans
`items.metadata`.

## Plugins

Un plugin standard contient au minimum :

```text
manifest.json
fields.json
```

Les plugins declarent les collections, champs dynamiques et capacites media. Ils
ne portent pas la logique d'acquisition, ne font pas d'appel externe et ne
modifient pas directement SQLite.

## Acquisition

Le lookup acquisition passe par le backend uniquement.

```text
Frontend
  -> Backend Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

Le frontend ne contacte jamais Open Library ou un autre provider externe. Il
consomme les routes `/api/acquisition/*`.

Le cache SQLite stocke uniquement les reponses normalisees `{ query, results }`.
Il ne stocke pas les reponses brutes provider, les erreurs, les secrets ou les
images binaires.

## Development conventions / Conventions de developpement

Le cycle officiel d'un lot est :

```text
Analysis
  -> Architecture
  -> Implementation
  -> Self-review
  -> Documentation
  -> Pull Request
  -> Merge
```

Un lot est termine quand les points suivants sont traites :

- implementation terminee ;
- tests ajoutes ou mis a jour quand necessaire ;
- auto-revue effectuee avant PR ;
- documentation concernee mise a jour ;
- `docs/roadmap.md` mis a jour ;
- `docs/current-state.md` mis a jour ;
- ADR cree ou mis a jour seulement si une decision d'architecture durable le
  justifie.

Toute implementation doit etre accompagnee de la documentation pertinente avant
fusion. Pendant une auto-revue, ne creez aucun commit : corrigez si necessaire,
puis laissez la PR porter le diff final.

## Branch naming

Utiliser un prefixe explicite :

- `analysis/*`
- `feature/*`
- `docs/*`
- `fix/*`
- `security/*`
- `refactor/*`
- `test/*`
- `ci/*`
- `chore/*`

## Pull Request conventions

Prefixes de titre recommandes :

- `feat:`
- `fix:`
- `docs:`
- `security:`
- `refactor:`
- `test:`
- `ci:`
- `perf:`
- `chore:`

Les descriptions de PR doivent rester courtes et utiliser ce format :

```markdown
## Summary

...
```

## Testing expectations

- Aucun test ne doit effectuer un appel Internet reel.
- Les providers externes doivent etre testes avec mocks ou fixtures.
- Les tests doivent etre ajoutes ou mis a jour quand le comportement change.
- `git diff --check` doit etre execute avant d'ouvrir une PR.

## Documentation

Toute fonctionnalite terminee doit mettre a jour la documentation concernee
avant fusion. Verifier au minimum `docs/current-state.md` et `docs/roadmap.md`,
puis les docs specialisees impactees.

## Variables D'environnement

Principales variables backend :

- `JWT_SECRET` : obligatoire en production, au moins 32 caracteres.
- `ADMIN_USERNAME` : identifiant du premier admin, defaut `admin`.
- `ADMIN_PASSWORD` : obligatoire pour creer le premier admin.
- `DATA_DIR` : repertoire des donnees SQLite et medias.
- `PLUGINS_DIR` : repertoire des plugins, utile en test ou developpement avance.
- `PORT` : port backend, defaut `3000`.

Variable frontend utile :

- `VITE_API_BASE_URL` : URL API explicite si le proxy Vite/Nginx n'est pas
  utilise.

Ne jamais committer de fichier `.env`, secret, token, base SQLite ou upload
utilisateur.

## Commandes Utiles

Backend :

```bash
cd backend
npm install
npm run dev
npm run check:syntax
npm test
```

Frontend :

```bash
cd frontend
npm install
npm run dev
npm exec vite build
npm run e2e
```

Qualite Git :

```bash
git diff --check
git status --short
```

## Tests Backend

Les tests backend utilisent le Node Test Runner natif et Fastify `inject`.

Ils doivent utiliser une base SQLite temporaire et ne doivent pas toucher aux
donnees locales de developpement. Pour les providers externes, injecter un mock
ou un `fetchImpl` de test.

## Tests Playwright

Les tests Playwright vivent dans `frontend/e2e`.

Ils lancent un backend et un frontend locaux. Les mocks doivent etre limites aux
routes utiles au scenario. Un test frontend ne doit jamais appeler un provider
externe reel.

## Tests Sans Reseau Externe

Aucun test ne doit dependre d'Internet, d'Open Library, d'un registre externe ou
d'un service tiers. Les reponses externes doivent etre mockees ou fournies par
fixtures locales.

Cette regle protege la CI contre les pannes reseau, les quotas et les changements
de donnees provider.

## Validations Avant PR

Executer au minimum :

```bash
cd backend
npm run check:syntax
npm test
```

```bash
cd frontend
npm exec vite build
```

```bash
git diff --check
git status --short
```

Pour un changement E2E ou frontend sensible, executer aussi :

```bash
cd frontend
npm run e2e
```

## Workflow Git

La branche `main` est protegee. Travailler sur une branche dediee, ouvrir une
Pull Request courte et attendre la review.

Les PR doivent rester petites : une intention principale, un diff lisible et des
tests adaptes. Eviter de melanger refactor, fonctionnalite et documentation
hors sujet.

Ne creez pas de commit automatique pendant une session d'assistance ou de revue
sauf demande explicite.

## Documentation

Mettre a jour la documentation quand un changement modifie :

- une fonctionnalite visible ;
- une route API ;
- un format d'import/export ;
- un schema SQLite ou une migration ;
- un plugin ou un type de champ ;
- une commande, un workflow CI ou une procedure de deploiement ;
- une decision d'architecture.

Pour un changement fonctionnel, verifier au minimum `docs/current-state.md` et
`docs/roadmap.md`, puis la documentation specialisee concernee.

---

# English

This guide gives practical landmarks for contributing to CollectionMgnt without
reading the whole codebase first.

## Repository Structure

- `backend/`: Fastify API, services, repositories, SQLite database and plugins.
- `frontend/`: Vue 3 app, Vite, Pinia, Vue Router and Playwright tests.
- `backend/plugins/`: standard declarative plugins.
- `docs/`: user, technical and deployment documentation.
- `.github/workflows/`: CI, CodeQL, Semgrep, Trivy and publishing.

## Backend

The backend is a Fastify API exposed under `/api`.

Routes should stay thin: minimal HTTP validation, call a service or repository,
then translate the response. Business logic belongs in services. SQLite access
belongs in repositories.

The main bootstrap is in `backend/src/server.js`. Tests use
`backend/test/helpers/test-app.js`, which creates a Fastify app with a temporary
SQLite database and `DATA_DIR`.

## Frontend

The frontend uses Vue 3 with Vite.

- `frontend/src/pages/` contains the main views.
- `frontend/src/components/` contains reusable components.
- `frontend/src/services/` contains API clients.
- `frontend/src/stores/` contains Pinia stores.

Item forms use `DynamicForm` and `DynamicField`. More specialized behavior, such
as ISBN lookup, should stay around the form instead of making `DynamicField`
depend on a business domain.

## SQLite

The SQL source for new databases is `backend/src/database/schema.sql`.

Simple migrations for existing databases live in `backend/src/database/init.js`.
A migration must be idempotent, preserve existing databases and update
`schema_info` when the schema changes.

Plugins do not create tables. Their fields are stored in `items.metadata`.

## Plugins

A standard plugin contains at least:

```text
manifest.json
fields.json
```

Plugins declare collections, dynamic fields and media capabilities. They do not
own acquisition logic, do not call external providers and do not modify SQLite
directly.

## Acquisition

Acquisition lookup goes through the backend only.

```text
Frontend
  -> Backend Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

The frontend never calls Open Library or another external provider directly. It
only consumes `/api/acquisition/*` routes.

The SQLite cache stores only normalized `{ query, results }` responses. It does
not store raw provider responses, errors, secrets or binary images.

## Development Conventions

The official batch workflow is:

```text
Analysis
  -> Architecture
  -> Implementation
  -> Self-review
  -> Documentation
  -> Pull Request
  -> Merge
```

A batch is complete when the following points are covered:

- implementation is complete;
- tests are added or updated when needed;
- self-review is done before PR;
- affected documentation is updated;
- `docs/roadmap.md` is updated;
- `docs/current-state.md` is updated;
- an ADR is created or updated only when a durable architecture decision
  requires it.

Every implementation must include the relevant documentation before merge.
During self-review, do not create commits: fix what is needed, then let the PR
carry the final diff.

## Branch Naming

Use an explicit prefix:

- `analysis/*`
- `feature/*`
- `docs/*`
- `fix/*`
- `security/*`
- `refactor/*`
- `test/*`
- `ci/*`
- `chore/*`

## Pull Request Conventions

Recommended title prefixes:

- `feat:`
- `fix:`
- `docs:`
- `security:`
- `refactor:`
- `test:`
- `ci:`
- `perf:`
- `chore:`

PR descriptions should stay short and use this format:

```markdown
## Summary

...
```

## Testing Expectations

- No test should make a real Internet call.
- External providers must be tested with mocks or fixtures.
- Tests should be added or updated when behavior changes.
- `git diff --check` must be run before opening a PR.

## Documentation

Every completed feature must update the affected documentation before merge.
Check at least `docs/current-state.md` and `docs/roadmap.md`, then the impacted
specialized docs.

## Environment Variables

Main backend variables:

- `JWT_SECRET`: required in production, at least 32 characters.
- `ADMIN_USERNAME`: first admin username, defaults to `admin`.
- `ADMIN_PASSWORD`: required to create the first admin.
- `DATA_DIR`: directory for SQLite data and media.
- `PLUGINS_DIR`: plugin directory, useful in tests or advanced development.
- `PORT`: backend port, defaults to `3000`.

Useful frontend variable:

- `VITE_API_BASE_URL`: explicit API URL when the Vite/Nginx proxy is not used.

Never commit `.env` files, secrets, tokens, SQLite databases or user uploads.

## Useful Commands

Backend:

```bash
cd backend
npm install
npm run dev
npm run check:syntax
npm test
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm exec vite build
npm run e2e
```

Git quality:

```bash
git diff --check
git status --short
```

## Backend Tests

Backend tests use the native Node Test Runner and Fastify `inject`.

They must use a temporary SQLite database and must not touch local development
data. For external providers, inject a mock or a test `fetchImpl`.

## Playwright Tests

Playwright tests live in `frontend/e2e`.

They start local backend and frontend servers. Mocks should be limited to the
routes needed by the scenario. A frontend test must never call a real external
provider.

## Tests Without External Network

No test should depend on the Internet, Open Library, an external registry or a
third-party service. External responses must be mocked or provided by local
fixtures.

This protects CI from network failures, quotas and provider data changes.

## Validations Before PR

Run at least:

```bash
cd backend
npm run check:syntax
npm test
```

```bash
cd frontend
npm exec vite build
```

```bash
git diff --check
git status --short
```

For E2E or sensitive frontend changes, also run:

```bash
cd frontend
npm run e2e
```

## Git Workflow

The `main` branch is protected. Work on a dedicated branch, open a small Pull
Request and wait for review.

PRs should stay small: one main intent, a readable diff and relevant tests. Avoid
mixing refactors, features and unrelated documentation.

Do not create automatic commits during an assistance or review session unless
explicitly asked.

## Documentation

Update documentation when a change modifies:

- a visible feature;
- an API route;
- an import/export format;
- a SQLite schema or migration;
- a plugin or field type;
- a command, CI workflow or deployment procedure;
- an architecture decision.

For a functional change, check at least `docs/current-state.md` and
`docs/roadmap.md`, then the relevant specialized documentation.
