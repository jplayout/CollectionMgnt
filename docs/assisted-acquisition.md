# Assisted Acquisition

Etat courant : fondations identifiants uniquement.

Ce lot pose les bases de l'acquisition assistee sans automatisation externe. Les identifiants sont des champs metadata declares par plugin et stockes dans `items.metadata`.

Aucune table SQLite, migration, camera, scan mobile, API externe, lookup, pre-remplissage automatique ou dedoublonnage global n'est ajoute dans cette phase.

## Champs Supportes

### `isbn`

Champ texte specialise pour les livres.

- Collection concernee : `books`
- Champ standard : `books.isbn`
- Formats acceptes : ISBN-10 et ISBN-13
- Separateurs ignores a la validation : espaces et tirets
- ISBN-10 : `X` final accepte
- Validation : checksum ISBN-10 ou ISBN-13 obligatoire
- Stockage : valeur normalisee sans espaces ni tirets, en majuscules

### `barcode`

Champ texte specialise pour les codes-barres produits.

- Collections concernees : `games`, `movies`, `others`
- Champs standards : `games.barcode`, `movies.barcode`, `others.barcode`
- Formats acceptes : EAN-13 et UPC-A
- Separateurs ignores a la validation : espaces et tirets
- Validation : checksum EAN-13 ou UPC-A obligatoire
- Stockage : valeur normalisee sans espaces ni tirets

Les consoles ne recoivent pas de champ identifiant dans ce lot.

## Recherche Et Filtres

Les champs `isbn` et `barcode` peuvent etre declares `searchable` et `filterable`.

Les plugins standards les declarent avec :

- `required: false`
- `searchable: true`
- `filterable: true`

La recherche large `search` peut retrouver une valeur normalisee. Pour les plugins qui ont un champ identifiant searchable, une recherche avec espaces ou tirets est aussi normalisee en variante de recherche.

Les filtres `isbn` et `barcode` valident et normalisent la valeur de query avant comparaison exacte avec `items.metadata`.

## Hors Perimetre Actuel

Cette phase ne fait que capturer des identifiants.

Non livre dans ce lot :

- scan camera
- scan mobile
- lecture automatique de code-barres
- lookup manuel
- appel a des fournisseurs externes
- pre-remplissage automatique de fiche
- dedoublonnage global

## Phases Futures

Les phases suivantes pourront s'appuyer sur ces champs :

- lookup manuel depuis une fiche ou un formulaire
- fournisseurs externes configurables
- scan camera mobile en contexte HTTPS
- aide au pre-remplissage controlee par l'utilisateur
- dedoublonnage assiste par collection ou multi-collections
