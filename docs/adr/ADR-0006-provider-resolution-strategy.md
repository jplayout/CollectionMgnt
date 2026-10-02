# ADR-0006 — Provider Resolution Strategy

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee dispose maintenant de plusieurs providers livres :
Open Library, BnF et Google Books. Le systeme doit choisir un provider de maniere
previsible, tout en restant simple pour le frontend et durable pour de futurs
providers.

Decision

CollectionMgnt distingue deux modes de resolution.

Quand un provider est explicite, seul ce provider est interroge. Aucun fallback
n'est applique, afin que le choix de l'appelant reste strict et observable.

Quand le provider est implicite, les providers sont essayes dans l'ordre du
registry. Pour les livres : Open Library, puis BnF SRU public sans
authentification, puis Google Books actif seulement avec `GOOGLE_BOOKS_API_KEY`.
Sans cette cle, l'ordre actif est Open Library puis BnF. Le premier
provider qui retourne un resultat gagne. Les resultats de plusieurs providers ne
sont pas fusionnes automatiquement.

Un resultat vide permet de passer au provider suivant. Une erreur technique
permet aussi de passer au provider suivant en mode implicite. Une erreur metier
arrete la resolution : elle exprime une impossibilite fonctionnelle plutot
qu'une indisponibilite temporaire. Si aucun resultat n'est trouve, la derniere
erreur technique d'un provider tente est propagee, meme si un autre provider
a retourne vide. `200` / `results: []` exige que tous les providers tentes
aient termine proprement. `provider_unavailable` est une erreur technique,
notamment pour HTTP 429 Google Books.

Le cache reste strictement separe par provider. Il n'existe pas de cache global
apres orchestration, afin d'eviter qu'un resultat issu d'un provider masque les
reponses possibles d'un autre.

Le frontend reste agnostique du provider par defaut. Il peut demander un
provider explicite si necessaire, mais ne porte pas la strategie de resolution.

Consequences

Positive

- Le comportement est deterministe et facile a expliquer.
- Open Library reste la source prioritaire pour les livres.
- Une panne technique permet encore un fallback, mais reste visible si aucun
  provider ne fournit de resultat.
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

Assisted acquisition now has several book providers: Open Library, BnF and
Google Books. The system must choose a provider predictably, while staying simple for
the frontend and durable for future providers.

Decision

CollectionMgnt distinguishes two resolution modes.

When a provider is explicit, only that provider is queried. No fallback is
applied, so the caller's choice remains strict and observable.

When the provider is implicit, providers are tried in registry order. For books,
the order is Open Library, public unauthenticated BnF SRU, then Google Books,
enabled only with `GOOGLE_BOOKS_API_KEY`. Without that key, active order is
Open Library then BnF. The first provider that returns a result
wins. Results from several providers are not merged automatically.

An empty result allows resolution to continue with the next provider. A
technical error also allows resolution to continue with the next provider in
implicit mode. A business error stops resolution: it expresses a functional
impossibility rather than temporary unavailability. If no result is found, the
last technical error from an attempted provider is propagated, even if another
provider returned empty. HTTP 200 / `results: []` requires every attempted
provider to complete cleanly. `provider_unavailable` is a technical error,
including Google Books HTTP 429.

The cache remains strictly separated by provider. There is no global
post-orchestration cache, so a result from one provider cannot hide possible
responses from another provider.

The frontend remains provider-agnostic by default. It may request an explicit
provider when needed, but it does not own the resolution strategy.

Consequences

Positive

- The behavior is deterministic and easy to explain.
- Open Library remains the priority source for books.
- Technical failures still allow fallback, but remain visible if no provider
  returns a result.
- Caches do not mix data from different providers.
- The frontend keeps a stable provider-agnostic contract.

Negative

- The first available result may hide a richer result elsewhere.
- There is no automatic consolidation between providers.
- Registry order becomes a visible product decision.
