# ADR-0003 — Business Identifiers

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

Les collections ont besoin d'identifiants utiles a l'acquisition assistee :
ISBN pour les livres, codes-barres pour jeux video, films et autres objets.

Deux approches etaient possibles :

- champs generiques `identifier_type` et `identifier_value` ;
- champs metier explicites comme `isbn` et `barcode`.

Decision

CollectionMgnt utilise des champs metier explicites :

- `isbn` pour les livres ;
- `barcode` pour les jeux video, films et autres objets.

Le projet utilise `barcode` plutot que `ean` ou `upc`, car l'utilisateur manipule
un code-barres. Le systeme peut determiner plus tard s'il s'agit d'un EAN, UPC
ou autre format.

Consequences

Positive

- Le formulaire reste plus simple pour l'utilisateur.
- Les plugins declarent des champs lisibles et stables.
- L'API et les filtres restent faciles a comprendre.
- L'acquisition peut s'appuyer sur des champs directs sans couche generique
  prematuree.

Negative

- Les types d'identifiants sont moins abstraits.
- Ajouter une nouvelle famille d'identifiants peut demander un champ dedie.
- Une future acquisition tres generique devra composer avec ces choix metier.

---

# English

Status

Accepted

Context

Collections need identifiers that are useful for assisted acquisition: ISBN for
books, barcodes for video games, movies and other objects.

Two approaches were possible:

- generic `identifier_type` and `identifier_value` fields;
- explicit business fields such as `isbn` and `barcode`.

Decision

CollectionMgnt uses explicit business fields:

- `isbn` for books;
- `barcode` for video games, movies and other objects.

The project uses `barcode` rather than `ean` or `upc`, because the user handles a
barcode. The system can later determine whether it is an EAN, UPC or another
format.

Consequences

Positive

- The form stays simpler for the user.
- Plugins declare readable and stable fields.
- The API and filters remain easy to understand.
- Acquisition can rely on direct fields without a premature generic layer.

Negative

- Identifier types are less abstract.
- Adding a new identifier family may require a dedicated field.
- A future highly generic acquisition system will need to work with these
  business choices.
