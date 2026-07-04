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
  internes et gates Documentation & Architecture.
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
