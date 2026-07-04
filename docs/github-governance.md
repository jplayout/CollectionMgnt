# Gouvernance GitHub

Ce document distingue les règles versionnées dans le dépôt des réglages GitHub
qui doivent être configurés dans l'interface ou via l'API GitHub.

## Configuré dans le dépôt

- CODEOWNERS : `.github/CODEOWNERS` assigne tout le dépôt à `@jplayout`.
- Pull Request template : `.github/pull_request_template.md`.
- Politique de sécurité : `SECURITY.md`.
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
- Code Scanning pour CodeQL et les outils publiant du SARIF.
- GitHub Security Advisories.

## Checks attendus

- CI backend/frontend, Playwright, Docker et whitespace.
- Project Conventions : titre PR, nom de branche, Markdown et liens internes.
- CodeQL pour l'analyse JavaScript.
- Semgrep pour le scan SAST JavaScript/Vue/Node.
- Trivy pour les vulnérabilités `HIGH` et `CRITICAL` des dépendances et images.

## Non versionnable

Les règles de protection de branche, les rulesets, les paramètres de merge, la
suppression automatique des branches, l'auto-merge, Secret Scanning et certains
paramètres Code Scanning vivent dans GitHub. Ils doivent être audités
régulièrement, car ils ne sont pas entièrement représentés par les fichiers du
dépôt.

---

# GitHub Governance

This document separates repository-versioned rules from GitHub settings that
must be configured in the GitHub UI or API.

## Configured in the Repository

- CODEOWNERS: `.github/CODEOWNERS` assigns the whole repository to `@jplayout`.
- Pull Request template: `.github/pull_request_template.md`.
- Security policy: `SECURITY.md`.
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
- Code Scanning for CodeQL and tools publishing SARIF.
- GitHub Security Advisories.

## Expected Checks

- Backend/frontend CI, Playwright, Docker and whitespace.
- Project Conventions: PR title, branch name, Markdown and internal links.
- CodeQL for JavaScript analysis.
- Semgrep for JavaScript/Vue/Node SAST.
- Trivy for `HIGH` and `CRITICAL` vulnerabilities in dependencies and images.

## Not Versionable

Branch protection rules, rulesets, merge settings, automatic branch deletion,
auto-merge, Secret Scanning and some Code Scanning settings live in GitHub. They
must be audited regularly because they are not fully represented by repository
files.
