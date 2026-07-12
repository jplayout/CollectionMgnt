# Architecture Decision Records

> Francais en premier. English version below.

---

# Francais

Un Architecture Decision Record (ADR) documente une decision structurante du
projet.

Un ADR n'est pas un tutoriel et ne remplace pas la documentation technique. Il
explique pourquoi une decision a ete prise, dans quel contexte, et quelles
consequences elle implique.

## Pourquoi Des ADR

CollectionMgnt evolue autour de quelques choix importants : auto-hebergement,
plugins, acquisition assistee, stockage SQLite, securite, quality gates et
maintenabilite.

Les ADR permettent de :

- garder une trace des decisions qui orientent le projet ;
- aider les nouveaux contributeurs a comprendre le raisonnement ;
- eviter de rouvrir les memes debats sans contexte ;
- rendre visibles les compromis acceptes.

## ADR Existants

- ADR-0001 — AGPLv3
- ADR-0002 — Backend-only acquisition providers
- ADR-0003 — Business identifiers
- ADR-0004 — Camera separated from lookup
- ADR-0005 — Acquisition orchestration
- ADR-0006 — Provider resolution strategy
- ADR-0007 — Project quality gates
- ADR-0008 — Acquisition search capabilities and barcode strategy
- ADR-0009 — Metadata and media provider specialization
- ADR-0010 — Native barcode detection with lazy-loaded fallback

## Format Retenu

Le format reste volontairement simple :

```text
# ADR-0001 — Title

Status

Accepted

Context

...

Decision

...

Consequences

Positive

...

Negative

...
```

Les ADR doivent rester courts, orientes decision, et expliquer le pourquoi plus
que le comment.

## Proposer Un Nouvel ADR

Pour proposer un nouvel ADR :

1. creer un fichier `ADR-XXXX-title.md` dans `docs/adr/` ;
2. utiliser le numero suivant disponible ;
3. decrire le contexte, la decision et les consequences ;
4. garder le texte court et durable ;
5. ouvrir une Pull Request dediee ou clairement separee dans une PR existante.

Un ADR accepte ne doit pas etre reecrit pour changer l'historique. Si une
decision evolue, creer un nouvel ADR qui remplace ou affine l'ancien.

---

# English

An Architecture Decision Record (ADR) documents a structural project decision.

An ADR is not a tutorial and does not replace technical documentation. It
explains why a decision was made, the context around it, and the consequences it
creates.

## Why ADRs

CollectionMgnt is shaped by a few important choices: self-hosting, plugins,
assisted acquisition, SQLite storage, security, quality gates and
maintainability.

ADRs help to:

- keep a record of decisions that guide the project;
- help new contributors understand the reasoning;
- avoid reopening the same discussions without context;
- make accepted trade-offs visible.

## Existing ADRs

- ADR-0001 — AGPLv3
- ADR-0002 — Backend-only acquisition providers
- ADR-0003 — Business identifiers
- ADR-0004 — Camera separated from lookup
- ADR-0005 — Acquisition orchestration
- ADR-0006 — Provider resolution strategy
- ADR-0007 — Project quality gates
- ADR-0008 — Acquisition search capabilities and barcode strategy
- ADR-0009 — Metadata and media provider specialization
- ADR-0010 — Native barcode detection with lazy-loaded fallback

## Format

The format intentionally stays simple:

```text
# ADR-0001 — Title

Status

Accepted

Context

...

Decision

...

Consequences

Positive

...

Negative

...
```

ADRs should stay short, decision-oriented, and explain why more than how.

## Proposing A New ADR

To propose a new ADR:

1. create an `ADR-XXXX-title.md` file in `docs/adr/`;
2. use the next available number;
3. describe the context, decision and consequences;
4. keep the text short and durable;
5. open a dedicated Pull Request or keep it clearly separated in an existing PR.

An accepted ADR should not be rewritten to change history. If a decision
evolves, create a new ADR that replaces or refines the previous one.
