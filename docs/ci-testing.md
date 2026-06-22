# CI Et Tests

Etat courant : v0.12-lot10.3.0.

Ce document decrit les validations automatisees disponibles pour les
contributeurs. Le projet privilegie une base simple et rapide plutot qu'une
couverture exhaustive.

## Vue D'ensemble

La CI GitHub Actions principale est `.github/workflows/ci.yml`.

Elle s'execute sur :

- `push`
- `pull_request`

Jobs actuels :

- `backend`
  - installe les dependances backend ;
  - execute le check syntaxique ;
  - execute les tests backend.
- `frontend`
  - installe les dependances frontend ;
  - construit l'application Vite.
- `quality`
  - execute `git diff --check`.
- `docker`
  - construit les images backend et frontend apres succes des autres jobs.

Le workflow de publication `.github/workflows/publish.yml` reste separe et sert
a publier les images GHCR depuis `main`, les tags `v*` ou un declenchement
manuel.

Le workflow CodeQL `.github/workflows/codeql.yml` analyse le code JavaScript sur
push `main`, pull request et declenchement manuel.

Dependabot est configure dans `.github/dependabot.yml` pour verifier chaque
semaine :

- les dependances npm backend ;
- les dependances npm frontend ;
- les GitHub Actions.

Les mises a jour mineures et patch sont regroupees pour limiter le bruit des
pull requests.

## Versions Recommandees

La CI utilise Node 22.

Utiliser Node 22 localement pour eviter les problemes de modules natifs,
notamment `better-sqlite3`.

## Validation Locale

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

Qualite Git :

```bash
git diff --check
```

## Tests Backend

Les tests backend utilisent :

- le Node Test Runner natif (`node --test`) ;
- Fastify `inject` ;
- une base SQLite temporaire ;
- un `DATA_DIR` temporaire ;
- un secret JWT de test ;
- un administrateur de test ;
- les plugins locaux synchronises dans la DB temporaire.

Le helper central est :

```text
backend/test/helpers/test-app.js
```

Il reproduit le bootstrap applicatif sans ouvrir de port reseau :

1. cree un repertoire temporaire ;
2. cree une DB SQLite temporaire depuis `schema.sql` ;
3. configure `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DATA_DIR` et `PLUGINS_DIR` pour le test ;
4. construit l'app Fastify ;
5. enregistre JWT, admin initial, plugins et routes ;
6. expose une app prete pour `app.inject()`.

Les tests d'integration sont dans :

```text
backend/test/integration/
```

## Ce Qui Est Teste

La couverture MVP verifie :

- bootstrap complet de l'application ;
- login admin avec succes ;
- login en echec ;
- limitation de `POST /api/auth/login` avec reponse `429` apres depassement ;
- role utilisateur expose par login et `/api/auth/me` ;
- route protegee sans token vers `401` ;
- validation de `JWT_SECRET` absent ou trop faible ;
- presence des en-tetes HTTP de securite de base ;
- `GET /api/admin/system-summary` ;
- refus `403` pour utilisateur authentifie non admin sur les routes admin principales ;
- `GET /api/exports/application.json` ;
- refus `403` pour utilisateur non admin sur l'export applicatif global ;
- export CSV de collection accessible a un utilisateur authentifie ;
- neutralisation anti-formule CSV pour champs systeme et metadata ;
- `POST /api/admin/imports/native-json` avec payload invalide ;
- `GET /api/admin/backup.zip` en smoke test ;
- `GET /api/admin/media-audit` en smoke test ;
- `POST /api/admin/media-cleanup/preview` ;
- `POST /api/admin/media-cleanup/execute` avec liste vide.

Ces tests ne touchent pas aux donnees locales utilisateur.

## Check Syntaxique

Le script backend :

```bash
npm run check:syntax
```

execute `node --check` sur les fichiers JavaScript de :

- `backend/scripts`
- `backend/src`
- `backend/test`

Le script est implemente en Node pour rester portable entre Linux, macOS et CI.

## Ce Qui N'est Pas Encore Teste

Hors perimetre actuel :

- tests unitaires frontend Vitest ;
- tests composants Vue ;
- Playwright ;
- Cypress ;
- tests E2E complets ;
- couverture de code ;
- Sonar ;
- Codecov ;
- tests de performance ;
- tests multi-navigateurs.

Ces sujets pourront faire l'objet de lots futurs.

## Notes Locales

Si `npm test` echoue localement sur `better-sqlite3`, verifier d'abord la
version de Node :

```bash
node --version
```

Le projet et la CI ciblent Node 22. Une version plus recente de Node peut ne pas
etre compatible avec le binaire natif installe de `better-sqlite3`.
