# ADR-0004 — Camera Separated From Lookup

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

Le scan camera est une evolution naturelle de l'acquisition assistee, notamment
sur mobile et iPhone en HTTPS. Il pourrait etre tentant de lier directement le
scan a un provider externe.

Cela melangerait deux responsabilites differentes : lire un identifiant et
chercher des metadonnees.

Decision

Le scan camera est separe du lookup.

Flux retenu :

```text
Scanner
  -> Identifiant
  -> Lookup backend
```

Le scanner ne parle jamais aux providers.

Consequences

Positive

- Le scan reste une fonction frontend limitee a la lecture d'un ISBN ou
  code-barres.
- Les providers restent backend-only.
- Le lookup manuel et le scan utilisent le meme contrat backend.
- Les tests et les erreurs restent separes entre lecture camera et acquisition.

Negative

- Le parcours utilisateur comporte deux etapes internes.
- Le scan ne peut pas optimiser directement un provider specifique.
- Une future experience temps reel devra respecter cette separation.

---

# English

Status

Accepted

Context

Camera scanning is a natural evolution of assisted acquisition, especially on
mobile and iPhone over HTTPS. It could be tempting to bind scanning directly to
an external provider.

That would mix two different responsibilities: reading an identifier and looking
up metadata.

Decision

Camera scanning is separated from lookup.

Accepted flow:

```text
Scanner
  -> Identifier
  -> Backend lookup
```

The scanner never talks to providers.

Consequences

Positive

- Scanning remains a frontend feature limited to reading an ISBN or barcode.
- Providers remain backend-only.
- Manual lookup and scan-based lookup use the same backend contract.
- Tests and errors stay separated between camera reading and acquisition.

Negative

- The user journey contains two internal steps.
- Scanning cannot directly optimize for a specific provider.
- A future real-time experience will need to respect this separation.
