# Politique de sécurité

## Signaler une vulnérabilité

Merci de ne pas ouvrir d'issue publique pour une vulnérabilité non corrigée.
Signalez-la via GitHub Security Advisories lorsque disponible, ou contactez le
mainteneur du dépôt si l'accès aux advisories n'est pas possible.

Incluez si possible :

- une description courte ;
- les étapes de reproduction ;
- l'impact estimé ;
- les versions ou commits concernés.

## Divulgation responsable

Nous demandons de laisser un délai raisonnable pour analyser et corriger le
problème avant toute divulgation publique. Nous accuserons réception dès que
possible, sans promettre de SLA formel.

## Versions supportées

Le projet est en phase active de développement. La branche `main` et la dernière
version publiée sont prioritaires pour les correctifs de sécurité. Les anciennes
versions ne sont pas garanties comme supportées.

## GitHub Security Advisories

Les GitHub Security Advisories sont le canal préféré pour coordonner les rapports,
les discussions privées, les correctifs et la divulgation.

## Politique De Sévérité

- Critical : merge interdit tant que le risque n'est pas corrigé ou explicitement
  neutralisé.
- High : merge interdit tant que le risque n'est pas corrigé ou explicitement
  neutralisé.
- Medium : revue obligatoire avant merge, avec justification si le risque est
  accepté temporairement.
- Low : accepté mais suivi, afin de conserver une trace et de traiter le sujet
  avec une priorité adaptée.

## Security Gates

La politique sécurité du projet s'appuie sur Dependabot, CodeQL, Semgrep, Trivy
et GitHub Security & Quality. Les résultats bloquants doivent être traités avant
merge. Les alertes non bloquantes restent visibles et suivies.

---

# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for an unfixed vulnerability. Report it through
GitHub Security Advisories when available, or contact the repository maintainer if
advisories are not accessible.

Please include, when possible:

- a short description;
- reproduction steps;
- estimated impact;
- affected versions or commits.

## Responsible Disclosure

Please allow reasonable time to investigate and fix the issue before public
disclosure. We will acknowledge reports as soon as practical, without promising a
formal SLA.

## Supported Versions

The project is under active development. The `main` branch and the latest
published version are prioritized for security fixes. Older versions are not
guaranteed to be supported.

## GitHub Security Advisories

GitHub Security Advisories are the preferred channel for coordinating reports,
private discussion, fixes and disclosure.

## Severity Policy

- Critical: merge is forbidden until the risk is fixed or explicitly
  neutralized.
- High: merge is forbidden until the risk is fixed or explicitly neutralized.
- Medium: review is required before merge, with justification if the risk is
  accepted temporarily.
- Low: accepted but tracked, so the issue remains visible and can be handled
  with appropriate priority.

## Security Gates

The project's security policy relies on Dependabot, CodeQL, Semgrep, Trivy and
GitHub Security & Quality. Blocking findings must be handled before merge.
Non-blocking alerts remain visible and tracked.
