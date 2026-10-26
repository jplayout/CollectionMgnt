# Gouvernance GitHub

Ce document distingue les règles versionnées dans le dépôt des réglages GitHub
qui doivent être configurés dans l'interface ou via l'API GitHub.

## Configuré dans le dépôt

- CODEOWNERS : `.github/CODEOWNERS` assigne tout le dépôt à `@jplayout`.
- Pull Request template : `.github/pull_request_template.md`.
- Politique de sécurité : `SECURITY.md`.
- Politique de quality gates : `docs/adr/ADR-0007-project-quality-gates.md`.
- Workflows CI : `.github/workflows/ci.yml`, `project-conventions.yml`,
  `codeql.yml`, `semgrep.yml`, `trivy.yml` et `publish.yml`.
- Dependabot : `.github/dependabot.yml`.

## Conventions de branches et de titres

Les branches humaines conservent les préfixes `analysis/`, `feature/`, `docs/`,
`fix/`, `security/`, `refactor/`, `test/`, `ci/` et `chore/`.
Le préfixe `dependabot/` est la seule exception automatisée autorisée.

Toutes les PR, y compris celles de Dependabot, restent soumises au format
`<prefix>: <summary>` avec `feat`, `fix`, `docs`, `security`, `refactor`, `test`,
`ci`, `perf` ou `chore`. Dependabot utilise `commit-message.prefix: "chore"`
pour npm backend, npm frontend et GitHub Actions. GitHub ajoute le deux-points :
les titres commencent par `chore:`, y compris pour les mises à jour groupées.
Les identifiants des groupes restent présents dans leurs branches et titres.
La configuration s'applique aux nouvelles PR ; les titres des PR déjà ouvertes
peuvent nécessiter une mise à jour pour passer le gate.

## À configurer dans GitHub

- Branch Protection ou Rulesets sur `main`.
- Required Status Checks alignés avec les workflows bloquants.
- Merge Policy : squash recommandé pour garder un historique lisible.
- Suppression automatique des branches après merge.
- Auto-merge si l'équipe choisit de l'utiliser.
- Secret Scanning.
- Push Protection.
- Dependabot Alerts.
- Code Scanning pour CodeQL et les outils publiant du SARIF.
- GitHub Security Advisories.

## Checks attendus

- CI backend/frontend, Playwright, Docker et whitespace.
- Project Conventions : titre PR, nom de branche, whitespace, Markdown, liens
  internes, unicité de version et gates Documentation & Architecture.
- CodeQL pour l'analyse JavaScript.
- Semgrep pour le scan SAST JavaScript/Vue/Node.
- Trivy pour les vulnérabilités `HIGH` et `CRITICAL` des dépendances et images.
- Dependabot Alerts, Code Scanning, Secret Scanning, Push Protection et Security
  Advisories font partie de la gouvernance sécurité GitHub.

Le gate Documentation & Architecture est versionné dans le dépôt. Il vérifie les
cas à forte confiance : fonctionnalités avec code applicatif, workflows GitHub,
acquisition, base de données, médias et plugins. Une exception explicite peut
être documentée dans la PR avec `Docs impact: none - <reason>`.

## Non versionnable

Les règles de protection de branche, les rulesets, les paramètres de merge, la
suppression automatique des branches, l'auto-merge, Secret Scanning, Push
Protection, Dependabot Alerts, Security Advisories et certains paramètres Code
Scanning vivent dans GitHub. Ils doivent être audités régulièrement, car ils ne
sont pas entièrement représentés par les fichiers du dépôt.

## Recommandé

- Activer Secret Scanning et Push Protection sur `main`.
- Garder Dependabot Alerts et Code Scanning visibles dans l'onglet Security.
- Utiliser Security Advisories pour coordonner les vulnérabilités avant
  divulgation.
- Aligner les Required Status Checks avec les gates bloquants.

---

# GitHub Governance

This document separates repository-versioned rules from GitHub settings that
must be configured in the GitHub UI or API.

## Configured in the Repository

- CODEOWNERS: `.github/CODEOWNERS` assigns the whole repository to `@jplayout`.
- Pull Request template: `.github/pull_request_template.md`.
- Security policy: `SECURITY.md`.
- Quality gates policy: `docs/adr/ADR-0007-project-quality-gates.md`.
- CI workflows: `.github/workflows/ci.yml`, `project-conventions.yml`,
  `codeql.yml`, `semgrep.yml`, `trivy.yml` and `publish.yml`.
- Dependabot: `.github/dependabot.yml`.

## Branch and Title Conventions

Human branches keep the `analysis/`, `feature/`, `docs/`, `fix/`, `security/`,
`refactor/`, `test/`, `ci/` and `chore/` prefixes.
The `dependabot/` prefix is the only allowed automated exception.

All PRs, including Dependabot PRs, must use `<prefix>: <summary>` with `feat`,
`fix`, `docs`, `security`, `refactor`, `test`, `ci`, `perf` or `chore`.
Dependabot uses `commit-message.prefix: "chore"` for backend npm, frontend npm
and GitHub Actions. GitHub adds the colon, so titles start with `chore:`,
including grouped updates. Group identifiers remain in their branches and titles.
The configuration applies to new PRs; existing PR titles may need updating to
pass the gate.

## To Configure in GitHub

- Branch Protection or Rulesets on `main`.
- Required Status Checks aligned with blocking workflows.
- Merge Policy: squash is recommended to keep history readable.
- Automatic branch deletion after merge.
- Auto-merge if the team chooses to use it.
- Secret Scanning.
- Push Protection.
- Dependabot Alerts.
- Code Scanning for CodeQL and tools publishing SARIF.
- GitHub Security Advisories.

## Expected Checks

- Backend/frontend CI, Playwright, Docker and whitespace.
- Project Conventions: PR title, branch name, whitespace, Markdown, internal
  links and Documentation & Architecture gates.
- CodeQL for JavaScript analysis.
- Semgrep for JavaScript/Vue/Node SAST.
- Trivy for `HIGH` and `CRITICAL` vulnerabilities in dependencies and images.
- Dependabot Alerts, Code Scanning, Secret Scanning, Push Protection and
  Security Advisories are part of GitHub security governance.

The Documentation & Architecture gate is versioned in the repository. It checks
high-confidence cases: features with application code, GitHub workflows,
acquisition, database, media and plugins. An explicit exception can be documented
in the PR with `Docs impact: none - <reason>`.

## Not Versionable

Branch protection rules, rulesets, merge settings, automatic branch deletion,
auto-merge, Secret Scanning, Push Protection, Dependabot Alerts, Security
Advisories and some Code Scanning settings live in GitHub. They must be audited
regularly because they are not fully represented by repository files.

## Recommended

- Enable Secret Scanning and Push Protection on `main`.
- Keep Dependabot Alerts and Code Scanning visible in the Security tab.
- Use Security Advisories to coordinate vulnerabilities before disclosure.
- Align Required Status Checks with blocking gates.

## Version produit / Product version

Project Conventions exécute `node scripts/check-version-governance.mjs`.
[VERSION](../VERSION) est la seule source produit ; aucun bump par PR n’est
imposé. Les builds CI et Trivy utilisent le lanceur de métadonnées partagé.
Le workflow GHCR injecte la version canonique et le SHA dans les deux images,
avec leurs labels OCI ; les déclencheurs et tags restent identiques.

Project Conventions validates the sole [VERSION](../VERSION) source without
requiring a bump for each PR. CI, Trivy and GHCR inject the same version and Git
revision into both images. Publication triggers and tags remain unchanged.
See [version governance](version-governance.md).

## Required security checks / Checks securite requis

Semgrep et Trivy sont des gates bloquants : Semgrep echoue sur tout finding
non supprime de facon ciblee et justifiee ; Trivy echoue sur HIGH/CRITICAL,
y compris sans correctif publie. LOW/MEDIUM ne bloquent pas le gate Trivy.
Aucune baseline HIGH/CRITICAL connue n'est toleree.

Semgrep and Trivy are blocking gates: Semgrep fails on findings without a
justified, rule-specific suppression; Trivy fails on HIGH/CRITICAL, including
unfixed vulnerabilities. LOW/MEDIUM do not fail the Trivy gate. No known
HIGH/CRITICAL baseline is tolerated.

Avant activation de `ci/dependabot-auto-merge`, configurer manuellement les checks
suivants comme Required sur `main`, avec leurs noms GitHub exacts :

- `Backend`
- `Frontend`
- `Playwright E2E`
- `Docker`
- `Quality`
- `Project Conventions`
- `Analyze JavaScript (javascript-typescript)`
- `Semgrep`
- `Trivy`

Lecture API du 2 octobre 2026 actualisee : les neuf checks listes ci-dessus
sont Required, avec branche a jour exigee. Cette observation historique precede le ruleset `Human Review` decrit ci-dessous. Le lot des security gates n'a modifie aucun parametre GitHub et
n'a ajoute aucun auto-merge. Semgrep et Trivy utilisent `pull_request` sans
exception Dependabot ; leur echec empeche le merge car ces checks sont Required.

Before `ci/dependabot-auto-merge`, manually require all checks listed above.
The updated read-only API inspection on 2 October 2026 found all nine checks
required, with strict up-to-date enforcement, before the `Human Review` ruleset described below was configured.
Semgrep and Trivy run on all pull requests, including Dependabot, without a
failure bypass. Failed security checks prevent merging because they are configured as Required.
The security gate batch changed no GitHub settings or auto-merge behavior.

`aquasecurity/trivy-action@v0.36.0` reste une reference par tag, sans pin SHA.
Aucune politique actuelle du depot n'impose ce pin pour les Actions tierces.
Le durcissement de ces references doit etre traite dans un lot supply-chain
ulterieur ; la version de cette action reste identique ici.

The Trivy action remains tag-pinned at `v0.36.0`, without a commit SHA. Current
repository policy does not mandate SHA pins for third-party Actions. Track this
hardening in a future supply-chain batch without changing the action version here.

## Dependabot direct merge / Fusion directe Dependabot

Le workflow `Dependabot Auto Merge` remplace le merge differe `gh pr merge
--auto` par un unique `PUT /repos/jplayout/CollectionMgnt/pulls/{number}/merge`,
avec `sha` et `merge_method: merge`. Aucun `--admin`, approval artificielle,
changement de protection ou elargissement des permissions App n'est introduit.
Le controleur est desactive par defaut : tant que la variable Actions
`DEPENDABOT_DIRECT_MERGE_ENABLED` ne vaut pas exactement `true`, il simule
la decision sans creer de token App ni demander une fusion.
Une garde Node chargee depuis le SHA de confiance calcule cette decision par
egalite stricte, avant toute creation de token. Elle publie `allow_write` comme
booleen JSON constant, consomme avec `fromJSON` par le workflow en plus de
l'eligibilite validee. `TRUE`, `True`, les valeurs absentes ou invalides restent
en simulation. Le controleur recalcule defensivement la meme decision ; le
dry-run demande dans l'evenement ne peut pas etre annule par l'environnement.

### Confiance et eligibilite / Trust and eligibility

`pull_request_target` (`opened`, `synchronize`, `reopened`) execute la definition
issue de `main`. Le seul checkout est limite a `.github/scripts`, au SHA de
confiance `github.sha`, avec `persist-credentials: false`. Aucun checkout de head,
build, installation de dependances, artefact ou cache de PR n'est execute dans
ce job. Les actions checkout et creation de token restent epinglees par SHA.
Les CI ordinaires continuent a tester le code de PR sans token de cette App.

Le controleur relit la PR par API et exige :

- depot source et cible `jplayout/CollectionMgnt`, avec identite numerique attendue ;
- base `main`, branche `dependabot/`, PR ouverte, non draft, sans conflit ;
- auteur REST `dependabot[bot]`, identite numerique `49699333` ;
- un seul commit au head, auteur Dependabot, committer GitHub `web-flow`,
  signature verifiee avec raison `valid` ;
- un bloc `updated-dependencies` signe, non ambigu, dont chaque dependance
  declare une version stable connue et un type SemVer patch ou minor.

Un groupe patch + minor est autorise. Un groupe contenant une major ou un type
inconnu est refuse entierement. Les PR a plusieurs commits, prereleases,
versions representees seulement par SHA, formats YAML non pris en charge,
metadonnees absentes ou ambigues restent manuels. Le titre, le body, les labels
et les adresses email ne servent pas de preuve d'eligibilite. Le parseur limite
lit le trailer signe comme des donnees ; il n'execute jamais du YAML ou du code.
Il remplace `fetch-metadata`, qui ne validait que le premier commit, et permet
la meme politique sur les evenements automatiques et la recuperation manuelle.

### Checks et protections / Checks and protections

`GITHUB_TOKEN` est limite a `contents`, `pull-requests`, `checks`, `actions` et
`statuses` en lecture. La politique et les checks sont lus avec ce token, jamais
avec le token App. La protection de `main` doit conserver les neuf checks listes
plus haut, associes a GitHub Actions (`app_id: 15368`), avec `strict: true`.
La protection historique ne doit ajouter aucune approval, Code Owner review
ou approval du dernier push : le controleur refuserait avant tout appel de merge.
Le ruleset actif `Human Review` conserve approval et Code Owner review, avec
bypass de l'App `CollectionMgnt Dependabot Merger` pour les PR uniquement.
Son bypass ne doit pas contenir de regle de checks. La
[lecture des rulesets](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset)
masque `bypass_actors` aux lecteurs sans droit d'ecriture sur le ruleset. Le controleur
valide les regles visibles ; le serveur autorise le bypass de l'identite App
reelle. Il ne demande aucun droit d'administration pour lire cette liste. Si le
bypass est retire, GitHub refuse le PUT ; aucun fallback n'est autorise.
Une derive de cette politique ou un ruleset actif supplementaire arrete le controleur ; aucun droit n'est ajoute.

L'attente est bornee a 45 minutes, avec une interrogation par minute. Elle
porte seulement sur les neuf checks obligatoires, jamais sur le job de fusion.
Le controleur selectionne le dernier run `pull_request` de chaque workflow
attendu, puis ses jobs dans la tentative courante. Il verifie workflow ID,
depot, branche, PR, head SHA, job ID, check ID, App et check suite. L'acteur
initial du run doit aussi etre Dependabot avec son identite numerique ; une
reexecution humaine d'un run initialement Dependabot reste possible. Cette
provenance authentifiee empeche un push humain avec auteur de commit usurpe
de servir de preuve Dependabot lors du dispatch manuel. Un succes
`push`, un ancien run ou une ancienne tentative ne remplace pas la CI attendue.
Une reexecution partielle qui ne republie pas tous les jobs requis de la tentative
courante reste bloquee ; utiliser une reexecution complete du workflow.

Chaque job et check doit etre `completed` / `success`. Absence ou attente ne
permet aucune fusion ; echec, cancellation, skipped, neutral, source incorrecte
ou statut legacy du meme nom arretent la tentative. Les listes API sont paginees
et bornees ; une liste tronquee ou trop grande est refusee.
Le head doit contenir le `main` courant. Les parents du commit de test doivent
etre exactement cette base et ce head. Les checks du head ou de ce commit de
test sont verifies sans confondre `github.sha` et le head de PR.

Le token App n'est cree qu'apres une decision positive. Il est limite au depot
courant, avec seulement `contents: write` et `pull-requests: write`, et revoque
en fin de job. Le candidat expire apres cinq minutes. Avant l'unique PUT, le
controleur reprend toutes les validations, exige les memes runs et tentatives,
puis relit encore le head, l'etat de PR et `main`. La protection serveur stricte
et les droits reels de l'App restent l'autorite finale contre les courses :
`sha` verrouille le head mais ne verrouille pas la base.
Une erreur API, un timeout ou `merged: false` ne vaut jamais succes. Aucun retry
automatique d'ecriture ni fallback auto/admin n'est effectue. Apres un timeout
de PUT, verifier l'etat GitHub avant toute reprise : la fusion peut avoir eu lieu.
Une PR fermee, mergee, draft, modifiee ou devenue obsolete ne produit aucune
nouvelle demande de merge. Aucune branche n'est supprimee par le controleur.

### Secrets et activation / Secrets and activation

Les [restrictions Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)
et le [contexte pull_request_target](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target)
imposent de verifier la disponibilite des secrets avec ce declencheur.
Les secrets Dependabot utilises par l'ancien `pull_request` ne suffisent pas
pour ce controleur de confiance : les deux secrets suivants doivent etre ajoutes
manuellement aux **repository Actions secrets**, sans changer les droits App :

- `DEPENDABOT_MERGER_CLIENT_ID`
- `DEPENDABOT_MERGER_PRIVATE_KEY`

Leurs valeurs ne sont ni lues par les tests ni affichees. La premiere etape du
workflow ne controle que leur presence. Sans secrets accessibles, une demande
reelle s'arrete avant la creation du token. Si le contexte Dependabot restreint
les secrets, ne pas contourner cette restriction : laisser l'activation desactivee
et diagnostiquer en mode simulation. Auditer les consommateurs des anciennes
copies Dependabot, puis les supprimer apres migration : elles ne doivent pas
rester accessibles aux workflows `pull_request` qui traitent le code de PR.
Si un autre consommateur en depend encore, le migrer avant toute activation.

Procedure manuelle apres integration sur `main` :

1. Laisser `DEPENDABOT_DIRECT_MERGE_ENABLED` absente ou differente de `true`.
2. Ajouter les deux Actions secrets depuis une source sure, sans les afficher.
3. Auditer les anciens consommateurs et retirer les deux copies Dependabot
   apres migration, pour fermer cet acces depuis les workflows de PR.
4. Lancer le workflow sur `main`, PR `131`, `dry_run: true`, puis PR `132`.
5. Verifier la presence des deux secrets, les lectures avec `GITHUB_TOKEN`,
   les neuf checks et la decision eligible. Une simulation ne prouve pas le
   bypass serveur ; aucun test ne doit effectuer une fusion pour le prouver.
6. Seulement apres validation, definir `DEPENDABOT_DIRECT_MERGE_ENABLED=true`.
   Cette activation autorise les prochaines executions automatiques eligibles.
7. Pour fusionner une PR existante, relancer sur `main` avec son numero et
   `dry_run: false`. Toutes les conditions sont reevaluees, sans exception.

Exemples de simulations, sans fusion :

```bash
gh workflow run dependabot-auto-merge.yml --ref main -f pr_number=131 -F dry_run=true
gh workflow run dependabot-auto-merge.yml --ref main -f pr_number=132 -F dry_run=true
```

`workflow_dispatch` est accepte uniquement sur `main`. L'acteur initial et
l'acteur de reexecution doivent avoir un droit `write`, `maintain` ou `admin`,
verifie par API. L'acteur humain autorise la reevaluation, mais ne remplace
jamais les preuves Dependabot de la PR et du commit. L'entree `pr_number` doit
etre un entier decimal positif canonique et sur : `131` est accepte, `0131`,
`131.0`, `0x83`, les signes, espaces et entiers non surs sont refuses avant toute
creation de token. Les evenements GitHub fournissent un entier numerique,
valide sans coercition. Pour une meme PR, les deux parcours autorises utilisent
ainsi le meme groupe de concurrence. Un changement de head,
une avancee de `main`, un echec ou un timeout necessite une nouvelle evaluation.
Apres la premiere fusion, l'autre PR peut devoir etre rebasee par Dependabot
puis repasser toute sa CI. L'absence d'evenement apres une reexecution de CI
se recupere par ce dispatch ; aucun `workflow_run` supplementaire n'est requis.

Pour arreter les fusions futures, retirer la variable d'activation ou la mettre
a `false`, puis annuler les runs de controleur en cours. La variable est capturee
au demarrage : la modifier seule n'annule pas un run deja autorise. Une demande
REST deja acceptee ne peut pas etre annulee par ce mecanisme. Revenir a l'ancien
workflow ne retablit pas le bypass lors d'un merge differe.

The controller uses the trusted `main` workflow through `pull_request_target`,
with a sparse checkout of that exact trusted SHA and no persisted credentials.
It never checks out or executes PR code with App credentials. The read-only
`GITHUB_TOKEN` validates provenance, one verified Dependabot commit, and every
dependency's signed stable patch/minor metadata. Mixed patch/minor groups pass;
any major, unknown, prerelease, unsupported format or additional commit stays manual.

It waits up to 45 minutes for all nine required checks, using the latest PR
workflow runs and current attempts, expected job/check identities, App, suite,
head/test-merge SHA and current base. Original CI run actors must be Dependabot;
human reruns of those runs are allowed. Missing or pending checks cannot merge;
failed, skipped, neutral, cancelled or incorrectly sourced checks are refused.
Partial reruns missing required jobs require a full workflow rerun. Configuration
drift, including an additional non-bypassable review, stops before the merge API.
Only the existing `Human Review` ruleset may be bypassed; strict checks stay intact.
GitHub hides bypass actors from read-only callers. Public rule structure is
validated locally, while the merge server authorizes the actual App bypass.
No administration permission is requested; a removed bypass fails at the PUT.

The App token is created only after eligibility, scoped to this repository with
contents/pull requests write permissions and revoked after the job. Final checks
repeat the full validation and pin the same runs, attempts, head and base before
one REST merge with `sha` and `merge_method: merge`. Candidates expire after five
minutes. GitHub enforces remaining rules and strict freshness atomically; there
is no atomic base parameter. Errors or timeouts never trigger an automatic write
retry, admin bypass, or auto-merge fallback. Inspect GitHub after a merge timeout.

Manual migration requires the two named credentials as repository **Actions
secrets**; the previous Dependabot-only secrets are insufficient. Values are never
printed or used in tests. Audit other consumers, migrate them, and remove the
old Dependabot copies so PR workflows cannot access these privileged credentials.
Keep `DEPENDABOT_DIRECT_MERGE_ENABLED` unset until both
secret-presence checks and dry runs for PRs 131/132 succeed on `main`. The default
is always simulation. Then set the variable to `true` and explicitly dispatch
an existing PR with `dry_run: false` to re-evaluate it. Both the original and rerun
actor must have repository write/maintain/admin permission; PR eligibility stays
unchanged. Rebase and rerun CI if the other merge advances `main`. Dispatch also
recovers after a CI rerun because CI completion does not trigger this controller.
To stop future merges, disable the variable and cancel active controller runs;
changing the variable alone does not revoke runs already started or accepted PUTs.

A trusted Node guard performs the exact, case-sensitive activation check before
any App token is created. Only the string `true` can permit writes; `TRUE`,
`True`, missing or invalid values remain simulations. The workflow consumes its
constant JSON boolean output through `fromJSON`, together with eligibility.
The controller defensively repeats the same decision, including the actual
event's dry-run request. Dispatch PR numbers must be positive safe canonical
decimal strings: `131` is accepted, while `0131`, `131.0`, `0x83`, signs and
whitespace are refused. Automatic events must carry an actual safe integer.
Both authorized paths therefore use the same concurrency group for a given PR.
