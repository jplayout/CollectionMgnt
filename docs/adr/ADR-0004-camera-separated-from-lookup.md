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
Camera Scanner
  -> Champ dynamique isbn / barcode
  -> Identifiant normalise
  -> Acquisition backend optionnelle, sur action utilisateur
```

Le scanner ne parle jamais aux providers.

Precision de cloture du 4 octobre 2026, sans changement de decision : le scanner
est une capacite du **type de champ**, pas du type de collection. Tout champ
`isbn` ou `barcode` compatible du formulaire dynamique peut ouvrir la camera,
selectionner un identifiant selon son mode, puis faire valider et normaliser
la valeur dans le champ qui l'a ouvert. Le moteur ne connait ni `books`, ni
`movies`, ni `games` et ne lance jamais automatiquement de lookup.

Stocker un identifiant ne signifie pas savoir resoudre l'objet. Une collection
personnalisee LEGO peut declarer un champ `barcode`, scanner et stocker un EAN
sans provider. `type: barcode` n'implique jamais `barcodeLookup`.

La resolution est une capacite d'acquisition distincte, optionnelle, fournie
par un provider compatible : `isbnLookup`, `barcodeLookup` si reellement livre,
recherche texte (`movies/search`, `games/search`) ou recherche media
(`mediaSearch`). L'absence de resolver n'empeche jamais le scanner de fonctionner.
Voir [ADR-0008](ADR-0008-acquisition-search-capabilities-and-barcode-strategy.md)
pour EAN/UPC vers objet metier et [l'audit de cloture](../assisted-acquisition.md#audit-de-cloture-scanner-acquisition-medias)
pour les limites livrees et futures.

Consequences

Positive

- Le scan reste une fonction frontend limitee a la lecture d'un ISBN ou
  code-barres.
- Les providers restent backend-only.
- Le lookup manuel et le scan utilisent le meme contrat backend.
- Les tests et les erreurs restent separes entre lecture camera et acquisition.

Negative

- Le lookup, quand disponible, necessite une action utilisateur distincte du scan.
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
Camera Scanner
  -> Dynamic isbn / barcode field
  -> Normalized identifier
  -> Optional backend acquisition, on user action
```

The scanner never talks to providers.

Closure clarification, 4 October 2026, without changing the decision: scanning
belongs to the **field type**, independently of the collection. Dynamic `isbn`
and `barcode` fields can open the camera, select a mode-compatible identifier,
and validate/normalize it in the initiating field. The scanner engine knows
nothing about books, movies or games and never starts a lookup automatically.

Identifier storage is separate from resolution: a custom LEGO collection may
scan and store an EAN with no provider. `type: barcode` never implies
`barcodeLookup`. Acquisition capabilities are optional and supplied by compatible
providers; a missing resolver never prevents scanning. See
[ADR-0008](ADR-0008-acquisition-search-capabilities-and-barcode-strategy.md).

Consequences

Positive

- Scanning remains a frontend feature limited to reading an ISBN or barcode.
- Providers remain backend-only.
- Manual lookup and scan-based lookup use the same backend contract.
- Tests and errors stay separated between camera reading and acquisition.

Negative

- Lookup, when available, requires a separate user action after scanning.
- Scanning cannot directly optimize for a specific provider.
- A future real-time experience will need to respect this separation.
