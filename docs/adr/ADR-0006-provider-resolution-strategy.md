# ADR-0006 — Provider Resolution Strategy

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee dispose maintenant de plusieurs providers livres :
Open Library et Google Books. Le systeme doit choisir un provider de maniere
previsible, tout en restant simple pour le frontend et durable pour de futurs
providers.

Decision

CollectionMgnt distingue deux modes de resolution.

Quand un provider est explicite, seul ce provider est interroge. Aucun fallback
n'est applique, afin que le choix de l'appelant reste strict et observable.

Quand le provider est implicite, les providers sont essayes dans l'ordre du
registry. Pour les livres, Open Library passe avant Google Books. Le premier
provider qui retourne un resultat gagne. Les resultats de plusieurs providers ne
sont pas fusionnes automatiquement.

Un resultat vide permet de passer au provider suivant. Une erreur technique
permet aussi de passer au provider suivant en mode implicite. Une erreur metier
arrete la resolution : elle exprime une impossibilite fonctionnelle plutot
qu'une indisponibilite temporaire.

Le cache reste strictement separe par provider. Il n'existe pas de cache global
apres orchestration, afin d'eviter qu'un resultat issu d'un provider masque les
reponses possibles d'un autre.

Le frontend reste agnostique du provider par defaut. Il peut demander un
provider explicite si necessaire, mais ne porte pas la strategie de resolution.

Consequences

Positive

- Le comportement est deterministe et facile a expliquer.
- Open Library reste la source prioritaire pour les livres.
- Les pannes techniques d'un provider ne bloquent pas l'acquisition implicite.
- Les caches ne melangent pas des donnees issues de providers differents.
- Le frontend conserve un contrat stable et provider-agnostic.

Negative

- Le premier resultat disponible peut masquer un resultat plus riche ailleurs.
- Il n'y a pas de consolidation automatique entre providers.
- L'ordre du registry devient une decision produit visible.

---

# English

Status

Accepted

Context

Assisted acquisition now has several book providers: Open Library and Google
Books. The system must choose a provider predictably, while staying simple for
the frontend and durable for future providers.

Decision

CollectionMgnt distinguishes two resolution modes.

When a provider is explicit, only that provider is queried. No fallback is
applied, so the caller's choice remains strict and observable.

When the provider is implicit, providers are tried in registry order. For books,
Open Library comes before Google Books. The first provider that returns a result
wins. Results from several providers are not merged automatically.

An empty result allows resolution to continue with the next provider. A
technical error also allows resolution to continue with the next provider in
implicit mode. A business error stops resolution: it expresses a functional
impossibility rather than temporary unavailability.

The cache remains strictly separated by provider. There is no global
post-orchestration cache, so a result from one provider cannot hide possible
responses from another provider.

The frontend remains provider-agnostic by default. It may request an explicit
provider when needed, but it does not own the resolution strategy.

Consequences

Positive

- The behavior is deterministic and easy to explain.
- Open Library remains the priority source for books.
- Technical failures from one provider do not block implicit acquisition.
- Caches do not mix data from different providers.
- The frontend keeps a stable provider-agnostic contract.

Negative

- The first available result may hide a richer result elsewhere.
- There is no automatic consolidation between providers.
- Registry order becomes a visible product decision.
