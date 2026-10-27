# CI Et Tests

Statut : développement. Version produit canonique : [VERSION](../VERSION).

## Proxies de confiance / Trusted proxies

Avec Node 22, lancer `cd backend`, `npm ci`, puis `npm test` et
`npm run check:syntax`. `trusted-proxies.test.js` couvre les configurations,
CVE-2026-92395 sur le paquet résolu, les vraies routes login/audit/cleanup,
le spoofing, les chaînes mixtes, IPv4/IPv6, 429/Retry-After, JWT et permissions.
Sur les quatre routes limitées, les IP invalides conservent les en-têtes de
sécurité et ne provoquent aucun appel à `LocalStore.incr`, vérifié par espion.

Le test réseau séparé `npm run test:proxy-network` utilise le nginx du Dockerfile
frontend, déjà présent localement, et sa configuration du dépôt. Il ne télécharge
aucune image et ne dépend d'aucun service externe. Il nécessite Linux et
Podman (défaut) ou `CONTAINER_ENGINE=docker`, avec accès au moteur et au réseau
hôte. Des IP loopback distinctes représentent les clients ; le backend est volontairement
accessible directement pour vérifier le refus du spoofing. Les ports restent
loopback et les données temporaires ; le conteneur est supprimé après le test.
Il vérifie aussi la normalisation host/proto et le parcours login/JWT.
De véritables lignes HTTP XFF répétées, avec préfixes falsifiés/malformés tournants,
vérifient le quota via nginx et en accès direct. Node reçoit bien deux lignes XFF
en accès direct ; nginx les rassemble en ajoutant son correspondant réel.
Ce test ne prouve pas le fonctionnement d'un DSM physique ni d'un NAT spécifique.

With Node 22, run `cd backend`, `npm ci`, `npm test`, and `npm run check:syntax`.
The proxy regression file covers configuration, the resolved CVE fix, actual
login/media routes, spoofing, mixed chains, IPv4/IPv6, quotas, JWT and permissions.
Spies verify that invalid IPs on all four limited routes keep security headers
and never call `LocalStore.incr`.
Run `npm run test:proxy-network` separately on Linux with local Podman or
`CONTAINER_ENGINE=docker` and the frontend Dockerfile's nginx image already
available. It never pulls images or contacts external services. An ephemeral
host-network container uses repository nginx configuration, loopback-only ports,
temporary data and distinct client addresses, checking isolation, forwarding header
normalization, login/JWT and a deliberately reachable direct backend. It cleans
up its container afterwards. Real repeated XFF header lines with rotating forged
and malformed prefixes exercise quotas through nginx and directly. Node receives
two separate XFF lines directly; nginx combines them and appends its actual peer.
Physical DSM and engine-specific NAT need deployment
validation; see the [FR/EN guide](deployment/trusted-proxies.md).

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

`item-patch.test.js` vérifie le contrat de `description` au PATCH (absence,
`null`, chaîne vide, remplacement et conservation d'un `NULL` initial), ainsi
que les règles existantes de titre et de métadonnées. Les tests passent par
la vraie route avec `app.inject()` et contrôlent directement les valeurs en
SQLite, sans réseau externe. Exécution ciblée depuis `backend/` :

```bash
node --test --test-concurrency=1 test/integration/item-patch.test.js test/integration/item-identifiers.test.js
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

## Dependabot automation validation / Validation automatisation Dependabot

La fusion directe Dependabot est testee avec `node:test`, sans reseau ni
credentials, dans `backend/test/integration/dependabot-auto-merge.test.js`.
Les tests utilisent des reponses REST/GraphQL synthetiques, un transport HTTP
injecte et une horloge virtuelle. Ils sont inclus dans `npm test` du backend ;
aucune modification de `ci.yml` n'est necessaire pour les executer en CI.

```bash
node --test backend/test/integration/dependabot-auto-merge.test.js
```

La politique pure, le transport API, l'observation et l'attente sont separes dans
`.github/scripts/dependabot-policy.mjs`, `dependabot-github.mjs` et l'entree CLI
`dependabot-auto-merge.mjs`. Aucun test ne cree de token App, ne contacte GitHub,
ne change les protections et ne fusionne une vraie PR.

| Scenario | Resultat attendu |
| --- | --- |
| Patch, minor, groupe uniquement patch/minor | Un seul PUT simule avec le SHA attendu et `merge_method: merge`. |
| Major, inconnu, groupe contenant une dependance non eligible | Zero appel de merge. |
| Prerelease, metadata absente, ambigue ou YAML non supporte | Zero appel de merge ; traitement manuel. |
| Auteur, identite numerique, commit, signature ou committer incorrect | Zero appel de merge. |
| Plusieurs commits, fork, mauvaise branche source ou cible | Zero appel de merge. |
| PR fermee, deja mergee, draft, conflit ou fusionnabilite inconnue | Zero appel de merge. |
| Check absent ou pending | Attente bornee, puis zero appel de merge. |
| Check failed, cancelled, skipped, neutral | Zero appel de merge. |
| Mauvais SHA, App, suite, workflow, job ou tentative | Zero appel de merge. |
| Ancien succes, nouveau run pending ou failed | Ancien succes insuffisant ; zero appel de merge. |
| Nouveau run valide apres ancien echec | Dernier run selectionne ; un seul PUT simule. |
| Reexecution complete de CI | Tous les jobs requis de la tentative courante doivent etre verts. |
| Reexecution partielle sans tous les jobs requis | Reste bloquee ; relancer le workflow complet. |
| Head, base, checks ou etat modifies avant merge | Zero appel de merge lors de la revalidation. |
| Base obsolete ou mauvais parents du commit de test | Zero appel de merge. |
| Autre ruleset ou derive visible des checks requis | Zero appel de merge. |
| `branchProtectionRule` inaccessible | Jamais demande ; identite/base GraphQL et politique des neuf checks restent obligatoires. |
| Lecture publique de `main` refusee, incomplete ou autre SHA | Zero appel de merge, y compris en revalidation ; aucun fallback. |
| Approval classique reintroduite ou base avancee apres la derniere lecture | Refus serveur simule : un seul PUT lie au SHA, aucun retry, bypass ou succes annonce. |
| Lecture HTTP 403, 405, 409, 422 ou timeout | Zero appel de merge ; erreur sans corps API sensible. |
| PUT HTTP 403, 405, 409, 422 ou timeout | Un seul appel HTTP simule, jamais de retry ou fallback. |
| Reponse PUT sans confirmation de fusion | Echec explicite ; jamais declaree reussie. |
| Candidat expire, activation absente ou mode simulation | Aucune ecriture autorisee. |
| Activation `TRUE`, `True`, absente ou invalide | Garde du workflow fausse ; aucun token App ni merge. |
| Dry-run explicite, absent ou invalide dans le dispatch | Aucune autorisation d'ecriture, meme avec activation `true`. |
| Numero manuel `0131`, `131.0`, `0x83`, signe, espace ou entier non sur | Refus avant publication de l'autorisation. |
| PR 131 automatique et entree manuelle canonique `131` | Meme numero valide et meme groupe de concurrence. |
| Dispatch hors main ou acteur sans droit write/maintain/admin | Refus sans merge. |
| Pagination, liste tronquee, URL externe, erreur GraphQL | Lecture complete ou refus ferme. |
| GraphQL FORBIDDEN, NOT_FOUND, RATE_LIMITED, INTERNAL ou donnees partielles | Zero merge, y compris en revalidation ; diagnostic limite a l'operation fixe, statut HTTP, categories et chemins de champs autorises. |
| Tableau GraphQL `errors: []` | Donnees toujours validees ; aucun contournement des controles. |

Les diagnostics GraphQL n'affichent jamais les messages GitHub, corps de reponse,
headers ou credentials. Les valeurs inconnues deviennent `UNKNOWN` ; les indices
de liste deviennent `[]`. Le diagnostic contient au plus cinq erreurs. HTTP 403
reste bloquant, sans lecture du corps d'erreur. L'operation est maintenant
`ObserveMainReference` ; GraphQL ne demande aucun champ de protection classique.
Le nouveau dry-run de la PR 131 doit etre lance apres deploiement sur `main`,
en conservant l'activation desactivee.

Les tests negatifs de validation garantissent zero appel de merge. Les tests
d'erreur **du PUT lui-meme** doivent observer exactement un appel simule pour
prouver l'absence de retry ; ils ne representent aucune fusion reelle.

Validation manuelle apres integration, toujours sans fusion pour les tests :

1. Conserver l'activation desactivee ; migrer les deux secrets vers Actions.
2. Executer les simulations des PR 131 et 132 sur `main`, `dry_run: true`.
3. Verifier que les deux secrets sont accessibles sans afficher leurs valeurs,
   que les permissions de lecture suffisent et que tous les controles passent.
   Auditer separement `strict: true`, les neuf checks avec App Actions et le
   perimetre du bypass dans les settings ou avec un compte deja autorise.
4. Si les secrets ou une garantie de securite restent incertains, ne pas activer.
   Ne pas modifier les protections pour faire passer un test.

La procedure de migration, d'activation explicite et de reevaluation manuelle
est dans [GitHub governance](github-governance.md#secrets-et-activation--secrets-and-activation).
Les tests locaux ne prouvent ni l'acces reel aux secrets du runner, ni les droits
complets de l'installation App, ni le bypass effectivement applique par GitHub.
Le serveur reste l'autorite finale pour les courses entre la derniere lecture
et le PUT. La politique stricte peut refuser une mise a jour legitime : corriger
la cause ou traiter manuellement, sans relacher automatiquement les gardes.

Dependabot direct merge tests use `node:test`, synthetic REST/GraphQL fixtures,
an injected HTTP transport and virtual time, with no network or credentials.
They run through the existing backend test suite. Validation failures guarantee
zero merge calls; eligible patch/minor updates produce exactly one mocked REST
PUT bound to the expected head. PUT-error tests deliberately record one mocked
request and verify no retry or fallback. No test performs a real merge.

Coverage includes major/unknown/mixed groups, unsupported signed metadata,
author and commit identity/signature, forks, PR state, missing/failed/skipped/
neutral checks, workflow/job/App/suite/SHA provenance, duplicate executions and
CI reruns, stale branches, head/base races and visible configuration drift.
Server rejection of an additional classic review or a base race is mocked at the
ordinary PUT: one attempt, no retry or bypass, and no reported success. It also
covers HTTP 403/405/409/422, timeouts, candidate
expiry, pagination, recovery authorization and disabled/dry-run write guards.
The actual workflow guard command and privileged-step wiring are tested across
exact/mixed-case/missing/invalid activation values and dry-run inputs. Invalid
manual PR representations cannot publish write authorization. Canonical dispatch
strings and numeric automatic events share one concurrency group per PR.

GraphQL FORBIDDEN/NOT_FOUND/RATE_LIMITED/INTERNAL errors and untrusted partial data
must prevent every merge, including during revalidation. Diagnostics expose only
the fixed operation, allowlisted HTTP status, categories and field paths, never
GitHub messages, response bodies, headers or credentials. Unknown values become
`UNKNOWN`, list indices become `[]`, and at most five errors are reported. HTTP
403 is rejected without reading its body. An empty `errors: []` array still
requires all data and policy validations. `ObserveMainReference` never requests
`branchProtectionRule`; inaccessible or incomplete public branch/check metadata
fails closed during both preparation and revalidation. The nine checks and their
App sources are locally pinned, not inferred from the readable server settings.

After integration, keep activation disabled and run dry-run dispatches for PRs
131/132 on `main`. Verify Actions-secret availability and read-token permissions
without printing credentials. Separately audit server `strict: true`, the nine
checks pinned to Actions and the App bypass scope with an already authorized
account or Settings; the controller cannot read classic strict/review settings.
Do not activate if any required guarantee remains
uncertain. Local tests cannot prove runtime secret access or GitHub bypass
semantics; server protections resolve the final race. See the governance guide
for migration, explicit activation, recovery and stopping active runs.
