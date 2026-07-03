# ADR-0005 — Acquisition Orchestration

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee doit supporter progressivement plusieurs providers,
cache, timeouts, erreurs stables, quotas et fallback futur. Garder cette logique
dans les routes ou dans les providers rendrait les responsabilites floues.

Decision

CollectionMgnt utilise une couche d'orchestration acquisition.

Flux retenu :

```text
Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

Responsabilites :

- Route : entree HTTP, authentification, validation minimale et traduction des
  erreurs.
- `AcquisitionService` : orchestration metier, normalisation, choix provider et
  construction du resultat.
- `AcquisitionCache` : cache transparent des reponses normalisees.
- `ProviderRegistry` : inventaire et selection des providers.
- Provider : appel externe et mapping vers le contrat CollectionMgnt.

Le cache est place entre le service et le registry afin de rester transparent
pour l'API publique et d'eviter un appel provider quand une reponse normalisee
valide existe deja.

Consequences

Positive

- Les routes restent minces.
- Les providers restent des adaptateurs externes.
- Le cache ne modifie pas le format public des reponses.
- Les futurs providers et fallback disposent d'un point d'orchestration clair.
- Les tests peuvent isoler service, cache, registry et providers.

Negative

- L'architecture ajoute une couche supplementaire.
- Les contributeurs doivent respecter les frontieres entre composants.
- Les changements acquisition doivent verifier plusieurs niveaux de tests.

---

# English

Status

Accepted

Context

Assisted acquisition must progressively support multiple providers, cache,
timeouts, stable errors, quotas and future fallback. Keeping this logic in
routes or providers would blur responsibilities.

Decision

CollectionMgnt uses an acquisition orchestration layer.

Accepted flow:

```text
Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

Responsibilities:

- Route: HTTP entry point, authentication, minimal validation and error
  translation.
- `AcquisitionService`: business orchestration, normalization, provider
  selection and result construction.
- `AcquisitionCache`: transparent cache for normalized responses.
- `ProviderRegistry`: provider inventory and selection.
- Provider: external call and mapping to the CollectionMgnt contract.

The cache is placed between the service and the registry so it stays transparent
to the public API and avoids a provider call when a valid normalized response
already exists.

Consequences

Positive

- Routes stay thin.
- Providers remain external adapters.
- The cache does not change the public response format.
- Future providers and fallback have a clear orchestration point.
- Tests can isolate service, cache, registry and providers.

Negative

- The architecture adds one more layer.
- Contributors must respect boundaries between components.
- Acquisition changes must check several test levels.
