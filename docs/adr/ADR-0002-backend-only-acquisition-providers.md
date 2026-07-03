# ADR-0002 — Backend-only Acquisition Providers

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee enrichit les formulaires CollectionMgnt a partir de
providers externes. Ces providers peuvent avoir des contraintes de secrets,
quotas, disponibilite, format de donnees, CORS et conditions d'utilisation.

Un appel direct depuis le frontend rendrait ces contraintes visibles et
difficiles a controler.

Decision

Les providers d'acquisition sont appeles uniquement par le backend.

Flux retenu :

```text
Frontend
  -> Backend
  -> Provider
```

Le flux suivant est refuse :

```text
Frontend
  -> Provider
```

Consequences

Positive

- Les secrets provider restent cote backend.
- Les quotas peuvent etre controles et caches.
- Le cache et les logs restent centralises.
- Le backend normalise les reponses avant exposition au frontend.
- Les problemes CORS provider ne concernent pas l'interface utilisateur.

Negative

- Le backend porte plus de responsabilites.
- Chaque nouveau provider demande un adaptateur backend.
- Le frontend depend du contrat CollectionMgnt plutot que du contrat provider
  externe.

---

# English

Status

Accepted

Context

Assisted acquisition enriches CollectionMgnt forms from external providers.
These providers may involve secrets, quotas, availability constraints, data
formats, CORS and terms of use.

Calling providers directly from the frontend would expose these constraints and
make them harder to control.

Decision

Acquisition providers are called only by the backend.

Accepted flow:

```text
Frontend
  -> Backend
  -> Provider
```

Rejected flow:

```text
Frontend
  -> Provider
```

Consequences

Positive

- Provider secrets stay on the backend.
- Quotas can be controlled and cached.
- Cache and logs remain centralized.
- The backend normalizes responses before exposing them to the frontend.
- Provider CORS issues do not affect the user interface.

Negative

- The backend carries more responsibilities.
- Each new provider requires a backend adapter.
- The frontend depends on the CollectionMgnt contract rather than on external
  provider contracts.
