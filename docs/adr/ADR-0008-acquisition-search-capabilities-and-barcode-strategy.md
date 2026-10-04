# ADR-0008 — Acquisition Search Capabilities and Barcode Strategy

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee a d'abord ete construite autour du lookup ISBN pour les
livres. Les prochains providers, comme TMDb pour les films, ne resolvent pas
necessairement un identifiant produit. TMDb permet une recherche textuelle de
films, mais ne constitue pas une source fiable pour resoudre directement un
code-barres DVD ou Blu-ray.

Decision

CollectionMgnt distingue les capabilities de recherche texte et les
capabilities de lookup par identifiant metier.

Pour les films, le socle retenu est `movies/search`. Cette capability accepte
une query texte et des options de contexte comme langue, region et annee. Elle
prepare les providers films sans creer de lookup code-barres film artificiel.

Les codes-barres restent des identifiants produit. Le scan camera remplit un
champ ISBN, EAN ou UPC, puis un provider compatible peut etre interroge si un
tel provider existe. Un provider de recherche texte peut ensuite enrichir une
suggestion, mais il ne remplace pas un lookup code-barres.

Precision de cloture : [ADR-0004](ADR-0004-camera-separated-from-lookup.md)
porte la capacite scanner par type de champ. Le chantier **Product Barcode
Resolution** concerne `EAN/UPC -> objet metier`, pas `camera -> barcode`.
Aucun `movies/barcodeLookup` ou `games/barcodeLookup` n'est livre. Le lot
**Barcode Resolver Provider Analysis** doit evaluer couverture, fiabilite,
licences, quotas et variantes produit avant tout choix de capability ou
implementation. Une collection personnalisee peut scanner sans ce resolver.

Consequences

Positive

- Les providers sont modelises selon leurs capacites reelles.
- TMDb est livre sans pretendre resoudre des EAN ou UPC.
- Le scan camera livre reste separe de la strategie provider.
- Le cache peut inclure query, langue, region et annee sans melanger les
  resultats.

Negative

- Les films ont besoin d'un flux de selection utilisateur, car une recherche
  texte retourne souvent plusieurs resultats.
- Un lookup code-barres film necessitera plus tard une source dediee.
- L'acquisition doit gerer plusieurs formes de query au lieu d'un seul type
  ISBN.

---

# English

Status

Accepted

Context

Assisted acquisition was first built around ISBN lookup for books. Upcoming
providers, such as TMDb for movies, do not necessarily resolve a product
identifier. TMDb supports text search for movies, but is not a reliable source
for directly resolving DVD or Blu-ray barcodes.

Decision

CollectionMgnt distinguishes text search capabilities from business identifier
lookup capabilities.

For movies, the chosen foundation is `movies/search`. This capability accepts a
text query and contextual options such as language, region and year. It prepares
movie providers without creating an artificial movie barcode lookup.

Barcodes remain product identifiers. Camera scanning fills an ISBN, EAN or UPC
field, then a compatible provider may be queried if such a provider exists. A
text search provider may later enrich a suggestion, but it does not replace a
barcode lookup.

Closure clarification: [ADR-0004](ADR-0004-camera-separated-from-lookup.md)
owns field-based scanning. **Product Barcode Resolution** addresses
`EAN/UPC -> business object`, independently of `camera -> barcode`.
No movie/game barcode lookup is delivered. **Barcode Resolver Provider Analysis**
must assess reliable sources before selecting capabilities or implementing a
resolver. Custom collections can scan without one.

Consequences

Positive

- Providers are modeled according to their real capabilities.
- Delivered TMDb support does not pretend to resolve EAN or UPC values.
- Delivered camera scanning remains separate from provider resolution strategy.
- The cache can include query, language, region and year without mixing results.

Negative

- Movies need a user selection flow because text search often returns several
  results.
- Movie barcode lookup will require a dedicated source later.
- Acquisition must handle several query shapes instead of a single ISBN type.
