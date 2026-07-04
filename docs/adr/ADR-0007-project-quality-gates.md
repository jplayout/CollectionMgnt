# ADR-0007 — Project Quality Gates

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

CollectionMgnt est un projet auto-heberge qui doit rester maintenable,
auditable et publiable depuis `main`. Les lots 14.0 a 14.4 ont ajoute des
conventions de projet, des workflows CI durcis, une gouvernance GitHub, des
gates documentaires et une politique de securite explicite.

Decision

Les quality gates du projet sont bloquants par defaut.

La CI est bloquante afin qu'une Pull Request ne puisse pas degrader les tests,
le build, les scans securite ou les conventions attendues. `main` doit rester
publiable a tout moment, car il sert de reference pour les images, les releases
et les correctifs.

La documentation est obligatoire pour les changements significatifs. Elle fait
partie du produit : elle explique l'etat courant, les decisions et les
procedures qui permettent de maintenir le projet sans dependance implicite a la
memoire des contributeurs.

Les security gates sont bloquants pour les problemes critiques et eleves. Les
risques moyens exigent une revue explicite, et les risques faibles peuvent etre
acceptes mais restent suivis.

Les conventions sont verifiees automatiquement pour garder les PR petites,
lisibles et coherentes. L'automatisation evite une review manuelle repetitive et
rend les attentes visibles des le debut.

Consequences

Positive

- `main` reste une base fiable pour publier ou corriger rapidement.
- Les regressions de qualite sont detectees avant merge.
- Les decisions, l'etat projet et les impacts documentaires restent visibles.
- La review humaine peut se concentrer sur le fond plutot que sur les
  conventions.

Negative

- Certaines PR doivent ajouter une justification documentaire ou securite.
- La CI peut bloquer un changement pourtant correct tant qu'une regle n'est pas
  satisfaite.
- Les gates doivent rester simples pour eviter les faux positifs fragiles.

---

# English

Status

Accepted

Context

CollectionMgnt is a self-hosted project that must remain maintainable,
auditable and publishable from `main`. Batches 14.0 to 14.4 added project
conventions, hardened CI workflows, GitHub governance, documentation gates and
an explicit security policy.

Decision

Project quality gates are blocking by default.

CI is blocking so a Pull Request cannot degrade tests, builds, security scans or
expected conventions. `main` must remain publishable at all times because it is
the reference for images, releases and fixes.

Documentation is mandatory for significant changes. It is part of the product:
it explains the current state, decisions and procedures that keep the project
maintainable without relying on contributors' implicit memory.

Security gates are blocking for critical and high issues. Medium risks require
explicit review, and low risks may be accepted but remain tracked.

Conventions are checked automatically to keep PRs small, readable and
consistent. Automation avoids repetitive manual review and makes expectations
visible early.

Consequences

Positive

- `main` remains a reliable base for publishing or fixing quickly.
- Quality regressions are detected before merge.
- Decisions, project state and documentation impacts stay visible.
- Human review can focus on substance rather than conventions.

Negative

- Some PRs must add documentation or security justification.
- CI may block an otherwise correct change until a rule is satisfied.
- Gates must stay simple to avoid fragile false positives.
