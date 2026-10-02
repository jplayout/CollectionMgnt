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
sont Required, avec branche a jour exigee. Aucun ruleset
additionnel n'est configure. Le lot des security gates n'a modifie aucun parametre GitHub et
n'a ajoute aucun auto-merge. Semgrep et Trivy utilisent `pull_request` sans
exception Dependabot ; leur echec empeche le merge car ces checks sont Required.

Before `ci/dependabot-auto-merge`, manually require all checks listed above.
The updated read-only API inspection on 2 October 2026 found all nine checks
required, with strict up-to-date enforcement, and no additional rulesets.
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

## Dependabot auto-merge / Fusion automatique Dependabot

Le workflow `Dependabot Auto Merge` utilise `pull_request` (`opened`,
`synchronize`, `reopened`), uniquement pour `dependabot[bot]` dans
`jplayout/CollectionMgnt`. Il ne fait aucun checkout. Seul `GITHUB_TOKEN` est
utilise, avec `contents: write` et `pull-requests: write`. L'action officielle
`dependabot/fetch-metadata` est fixee par SHA ; ses verifications auteur/commits
restent actives.

Les types metadata `version-update:semver-patch` et `version-update:semver-minor`
sont auto-approuves, puis `gh pr merge --auto --merge` active l'auto-merge GitHub.
Les majors, types inconnus ou absents restent manuels, sans approval ni activation
et avec un message explicite. Les security updates suivent la meme politique.
Pour les groupes, le type fourni par l'action est le niveau SemVer le plus eleve :
patch + minor est automatisable ; patch + major reste manuel.

Le workflow n'attend pas les checks. GitHub realise la fusion seulement quand
la review requise, les neuf Required checks listes ci-dessus et toutes les autres
protections sont satisfaits. Aucun `--admin`, bypass ou desactivation de protection.
Les reexecutions verifient l'approval du bot sur le SHA courant et l'auto-merge
existant ; une nouvelle revision requiert une nouvelle approval. Les erreurs CLI
ne sont pas ignorees. Un head devenu obsolete est laisse au run `synchronize`.

Prerequis avant activation : auto-merge et merge commits autorises, approvals
GitHub Actions autorisees, une review obligatoire et les neuf checks Required.
Audit lecture seule actualise du 2 octobre 2026 : auto-merge, merge commits et
approvals Actions autorises, une review requise et les neuf checks Required.
Les prerequis sont satisfaits.
Aucun repository setting n'est modifie par ce lot.

The workflow only handles Dependabot PRs in this repository, using `GITHUB_TOKEN`
and SHA-pinned official metadata without checkout. Patch/minor updates are
approved and GitHub auto-merge is enabled; major or unknown/missing types remain
manual. Grouped updates use the highest SemVer level from metadata, and security
updates follow the same policy. Reruns detect the bot's current-head approval and
existing auto-merge; CLI errors are not swallowed.

GitHub waits for the required review, all nine Required checks listed above and
all other protections before merging. The workflow does not wait for checks or
bypass protections. Before activation, enable the repository prerequisites and
require all nine checks. The updated read-only audit found auto-merge and merge commits enabled, Actions
approvals allowed, one required review and all nine Required checks. The
prerequisites are satisfied. No repository settings are changed.
