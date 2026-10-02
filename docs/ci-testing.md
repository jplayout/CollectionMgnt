# CI Et Tests

Statut : développement. Version produit canonique : [VERSION](../VERSION).

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
- `e2e`
  - installe les dependances backend et frontend ;
  - installe Chromium pour Playwright ;
  - execute le parcours E2E MVP sur backend et frontend locaux.
- `docker`
  - construit les images backend et frontend apres succes des autres jobs.

Le workflow de publication `.github/workflows/publish.yml` reste separe et sert
a publier les images GHCR depuis `main`, les tags `v*` ou un declenchement
manuel.

Le workflow CodeQL `.github/workflows/codeql.yml` analyse le code JavaScript sur
push `main`, pull request et declenchement manuel.

Le workflow Semgrep `.github/workflows/semgrep.yml` execute un scan SAST
complementaire a CodeQL sur push `main`, pull request et declenchement manuel.
Il utilise `semgrep scan --error` avec les regles `p/default`, cible les sources
JavaScript/Vue/Node et est bloquant. Le workflow ne requiert pas
`SEMGREP_APP_TOKEN` ; une connexion future a Semgrep App pourra etre ajoutee via
ce secret.

Le workflow Trivy `.github/workflows/trivy.yml` execute des scans de securite
bloquants sur push `main`, pull request et declenchement manuel pour les
vulnerabilites `HIGH` et `CRITICAL` :

- scan des dependances backend npm ;
- scan des dependances frontend npm ;
- build des images backend et frontend ;
- scan des images conteneur construites localement.

Les quatre scans Trivy utilisent `severity: HIGH,CRITICAL` et `exit-code: '1'`.
Les rapports table affichent ces severites ; les vulnerabilites `LOW` et `MEDIUM`
ne sont pas affichees par ces steps et ne font pas echouer le workflow. Pour
leur suivi, executer un scan complet avec `--exit-code 0` sans filtre de severite.
Les builds images sont egalement bloquants : un build echoue ne constitue pas
un scan effectue. Aucun `ignore-unfixed` ni exception `.trivyignore` n'est ajoute.
Toute exception future doit etre minimale, justifiee et revue selon SECURITY.md.

La securite fait partie des quality gates : les vulnerabilites `CRITICAL` et
`HIGH` bloquent le merge, les `MEDIUM` exigent une revue explicite et les `LOW`
restent suivies.

Le workflow Project Conventions `.github/workflows/project-conventions.yml`
verifie les conventions de PR, le whitespace, Markdown, les liens internes et le
gate Documentation & Architecture. Ce gate bloque les oublis documentaires les
plus directs, sans appel reseau et sans dependance au code applicatif.

Dependabot est configure dans `.github/dependabot.yml` pour verifier chaque
semaine :

- les dependances npm backend ;
- les dependances npm frontend ;
- les GitHub Actions.

Les mises a jour mineures et patch sont regroupees pour limiter le bruit des
pull requests. Les branches `dependabot/` sont une exception autorisee au gate
de nom de branche ; les branches humaines gardent leurs prefixes habituels.
Les titres Dependabot, y compris groupes, commencent par `chore:` et passent
le meme gate Conventional Commit que les PR humaines, sans bypass.
Voir les [conventions de gouvernance GitHub](github-governance.md).

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
npx playwright test e2e/camera-scanner
```

E2E Playwright :

```bash
cd frontend
npm run e2e:install
npm run e2e
```

Trivy local, si le binaire est installe :

```bash
trivy fs --scanners vuln --vuln-type library --severity HIGH,CRITICAL --exit-code 1 backend
trivy fs --scanners vuln --vuln-type library --severity HIGH,CRITICAL --exit-code 1 frontend
node scripts/container.mjs build backend -t collectionmgnt-backend:trivy
node scripts/container.mjs build frontend -t collectionmgnt-frontend:trivy
trivy image --scanners vuln --vuln-type os,library --severity HIGH,CRITICAL --exit-code 1 collectionmgnt-backend:trivy
trivy image --scanners vuln --vuln-type os,library --severity HIGH,CRITICAL --exit-code 1 collectionmgnt-frontend:trivy
```

Semgrep local, si le binaire est installe :

```bash
semgrep scan --error --config p/default --metrics=off --include='*.js' --include='*.mjs' --include='*.cjs' --include='*.vue' .
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

## Tests E2E Playwright

Les tests E2E MVP utilisent Playwright cote frontend avec Chromium uniquement.

La configuration est :

```text
frontend/playwright.config.js
```

Elle lance :

- le backend local sur `127.0.0.1:3100` ;
- un serveur de sante local pour attendre le bootstrap backend ;
- Vite sur `127.0.0.1:4173` ;
- le proxy Vite `/api` vers le backend E2E.

Le backend E2E utilise :

- un `DATA_DIR` temporaire cree sous le repertoire temporaire systeme ;
- les plugins locaux depuis `backend/plugins` ;
- `JWT_SECRET` de test avec au moins 32 caracteres ;
- `ADMIN_USERNAME=admin` ;
- `ADMIN_PASSWORD=e2e-admin-password`.

Les scenarios couverts sont volontairement limites :

- login admin et arrivee sur Collections ;
- acces Administration ;
- import du dataset officiel `demo/datasets/collectionmgnt-demo-v1.json` ;
- verification des 94 items crees ;
- ouverture de la collection Jeux Video ;
- ouverture d'une fiche item ;
- retour sur Administration.

Le media pack de demonstration, les exports, les backups, les filtres, la
pagination detaillee, les screenshots E2E et les navigateurs multiples restent
hors perimetre de ce MVP.

Les tests du scanner camera frontend sont organises par responsabilite :

```text
frontend/e2e/camera-scanner/
```

Cette suite reste sous Playwright dans le lot 15.3 pour eviter une nouvelle
dependance de test. Elle separe les tests du service, des adaptateurs natif et
ZXing, de l'UI modale et de l'integration formulaire. Les mocks couvrent
`navigator.mediaDevices.getUserMedia`, `BarcodeDetector`, le fallback ZXing et le
montage Vue du composant.

## Ce Qui Est Teste

La couverture MVP verifie :

- bootstrap complet de l'application ;
- login admin avec succes ;
- login en echec ;
- limitation de `POST /api/auth/login` avec reponse `429` apres depassement ;
- limitation de `GET /api/admin/media-audit` avec reponse `429` apres
  depassement ;
- limitation de `POST /api/admin/media-cleanup/preview` et
  `POST /api/admin/media-cleanup/execute` avec reponse `429` apres
  depassement ;
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
- Cypress ;
- tests E2E complets au-dela du MVP Playwright ;
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

## Version governance

Project Conventions runs `node scripts/check-version-governance.mjs` without
installing dependencies. The gate checks canonical [VERSION](../VERSION),
SemVer validity, obsolete product versions, frontend version literals and npm
manifest duplication. Backend tests cover reading, injection, development
fallback and API metadata; Playwright checks Settings and build formatting.

Les builds CI et Trivy passent par `scripts/container.mjs` avec
`CONTAINER_ENGINE=docker` sur GitHub. Localement, le même lanceur utilise Podman.
Les images partagent la version canonique et le SHA, ainsi que les labels OCI.
Voir la [gouvernance FR/EN](version-governance.md).

## Security gate implementation / Implementation des gates securite

Semgrep est fixe a `1.179.0` (release stable du 1er octobre 2026), avec le digest
OCI `sha256:cab19964e6c93019934252a9cd591d9b27df1e5b5d1734b26f4069ae51c295f8`.
Le digest et la version doivent etre mis a jour ensemble apres validation.
`--error` transforme un finding en sortie 1 ; un scan propre sort avec 0.
Le ruleset distant `p/default` reste evolutif. Aucun token AppSec n'est requis.

Semgrep is pinned to version `1.179.0` and the OCI digest above. Update both
together after validation. `semgrep scan --error` exits 1 on findings and 0 on a
clean scan. The remote `p/default` ruleset can still change independently.

Trivy conserve `aquasecurity/trivy-action@v0.36.0`, dont la version CLI par defaut
est `0.70.0`. Les quatre scans bloquent sur `HIGH,CRITICAL`, meme sans correctif
publie. Les scans images conservent les packages OS et library. Localement,
utiliser Podman via le launcher existant ; GitHub conserve Docker.

Trivy retains action `v0.36.0` (default CLI `0.70.0`). All four scans fail on
HIGH/CRITICAL, including unfixed vulnerabilities. Image scans include OS and
library packages. Image build failures also fail the job. LOW/MEDIUM require a
separate unfiltered report for tracking and do not fail this gate.

La baseline du 2 octobre 2026 sur `11995c6`, apres remediation Semgrep et
hardening des images, est propre : aucun finding Semgrep et aucune occurrence
HIGH/CRITICAL dans les deux scans filesystem et les deux scans images.
Les suppressions Semgrep ciblees et justifiees de la remediation restent
respectees. Aucune baseline HIGH/CRITICAL connue n'est toleree ; aucun ignore
Trivy ni contournement du gate n'est ajoute.

The 2 October 2026 baseline on `11995c6`, after Semgrep remediation and image
hardening, is clean: zero Semgrep findings and zero HIGH/CRITICAL occurrences
in both filesystem scans and both image scans. The remediation's justified,
rule-specific Semgrep suppressions remain respected. No known HIGH/CRITICAL
baseline is tolerated, and no Trivy ignore or gate bypass is added.
