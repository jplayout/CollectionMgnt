# Assisted Acquisition

Etat courant : fondations identifiants, lookup backend ISBN livres,
pre-remplissage frontend local pour les livres, orchestration backend et cache
SQLite acquisition.

Les identifiants sont des champs metadata declares par plugin et stockes dans
`items.metadata`. Le lookup ISBN livres est disponible via le backend
CollectionMgnt avec Open Library comme premier provider.

Aucune camera, scan mobile, sauvegarde automatique, import d'image ou
dedoublonnage global n'est disponible a ce stade.

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

## Architecture Backend Providers

Toute communication avec un fournisseur externe passe par le backend. Le
frontend ne doit pas appeler les providers directement.

Principes :

- les routes acquisition sont protegees par JWT comme les routes items utilisateur ;
- les routes acquisition restent minces et deleguent les cas d'usage a un
  `AcquisitionService` backend ;
- `AcquisitionService` porte la validation metier, la normalisation, la
  selection provider et la construction du resultat API ;
- les providers sont isoles derriere un registre backend ;
- le registre provider reste responsable de l'inventaire et de la selection ;
- le mapping provider vers resultat CollectionMgnt est centralise dans le provider ;
- aucune route acquisition ne cree ou modifie un item ;
- aucune image n'est telechargee dans ce lot ;
- les URLs de couverture peuvent etre retournees comme previsualisation distante ;
- aucun secret provider n'est expose cote frontend.

Flux interne :

```text
Frontend
  -> Backend Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

Cette orchestration prepare les providers multiples, un futur fallback et les
quotas sans modifier l'API publique existante ni activer de fallback a ce stade.

Le lookup ISBN utilise un cache backend SQLite transparent :

- la reponse API publique ne change pas ;
- aucun champ `cached` n'est expose ;
- seules les reponses normalisees `{ query, results }` sont stockees ;
- les reponses brutes provider ne sont jamais stockees ;
- les resultats avec suggestions sont caches 7 jours ;
- les resultats vides sont caches 24 heures ;
- les erreurs provider, timeouts et ISBN invalides ne sont pas caches ;
- aucune image binaire n'est stockee dans le cache.

Provider livre :

- `openlibrary`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : non
  - secret requis : aucun

Voir `docs/acquisition-providers.md` pour le contrat technique des providers,
les responsabilites des couches acquisition et les bonnes pratiques de tests.

## API Acquisition

### `GET /api/acquisition/providers`

Retourne les providers disponibles pour le backend.

Exemple :

```json
{
  "providers": [
    {
      "id": "openlibrary",
      "name": "Open Library",
      "plugin": "books",
      "capabilities": ["isbnLookup"],
      "enabled": true,
      "requiresConfiguration": false
    }
  ]
}
```

### `POST /api/acquisition/books/isbn/lookup`

Recherche des suggestions de metadata livre depuis un ISBN.

Body :

```json
{
  "isbn": "9780140328721",
  "provider": "openlibrary"
}
```

Le champ `provider` est optionnel. S'il est absent, le backend utilise le
provider actif par defaut pour `books` / `isbnLookup`.

Reponse :

```json
{
  "query": {
    "plugin": "books",
    "type": "isbn",
    "value": "9780140328721"
  },
  "results": [
    {
      "provider": "openlibrary",
      "confidence": "high",
      "title": "Fantastic Mr. Fox",
      "description": "",
      "metadata": {
        "isbn": "9780140328721",
        "author": "Roald Dahl",
        "publisher": "Puffin",
        "publication_date": "1988-01-01"
      },
      "images": [
        {
          "url": "https://covers.openlibrary.org/b/id/123-L.jpg",
          "kind": "cover",
          "source": "openlibrary"
        }
      ],
      "sourceUrl": "https://openlibrary.org/books/OL7353617M/Fantastic_Mr._Fox"
    }
  ]
}
```

Erreurs stables :

- `invalid_isbn` : ISBN invalide ;
- `provider_not_found` : provider demande inconnu ;
- `provider_unavailable` : aucun provider actif disponible ;
- `provider_timeout` : timeout provider ;
- `provider_error` : erreur provider non exploitable.

Si Open Library ne trouve aucun resultat, la route retourne `200` avec
`results: []`.

Les suggestions servent a pre-remplir localement le formulaire cote frontend
apres choix explicite de l'utilisateur. La sauvegarde reste assuree par les
routes items existantes `POST /api/items` et `PATCH /api/items/:id`, avec
validation et normalisation backend habituelles.

## Lookup Frontend ISBN

Le formulaire dynamique affiche un bouton `Rechercher` adjacent au champ ISBN
pour le plugin `books`.

Flux utilisateur :

1. l'utilisateur saisit un ISBN ;
2. le frontend appelle le backend CollectionMgnt ;
3. le backend interroge le provider actif ;
4. le frontend affiche les suggestions retournees ;
5. l'utilisateur choisit `Utiliser` ;
6. le formulaire est pre-rempli localement ;
7. l'utilisateur controle et sauvegarde manuellement.

Le frontend ne contacte jamais Open Library ou un autre provider externe
directement. Il consomme uniquement les routes `/api/acquisition/*`.

Regles de pre-remplissage :

- `title`, `description`, `author`, `publisher` et `publication_date` sont
  renseignes uniquement si le champ courant est vide ;
- `metadata.isbn` peut etre remplace par la valeur normalisee retournee par le
  backend ;
- aucune valeur absente n'est inventee ;
- aucun item n'est cree ou modifie tant que l'utilisateur ne soumet pas le
  formulaire ;
- les URLs de couverture peuvent etre affichees en previsualisation distante,
  mais aucune image n'est importee ou sauvegardee.

Les erreurs de lookup (`invalid_isbn`, `provider_unavailable`,
`provider_timeout`, erreur generique) sont affichees sans bloquer la saisie
manuelle.

## Hors Perimetre Actuel

Cette phase capture les identifiants, ajoute le lookup backend ISBN livres via
Open Library et expose le pre-remplissage local cote frontend pour les livres.

Non livre dans ce lot :

- scan camera
- scan mobile
- lecture automatique de code-barres
- lookup code-barres
- lookup films ou jeux video
- pre-remplissage avec sauvegarde automatique
- import ou telechargement d'image
- dedoublonnage global

## Phases Futures

Les phases suivantes pourront s'appuyer sur ces champs :

- fallback Google Books pour les livres
- import image ou couverture apres validation utilisateur
- provider TMDb pour les films
- provider IGDB ou RAWG pour les jeux video
- fournisseurs externes configurables
- scan camera mobile en contexte HTTPS
- dedoublonnage assiste par collection ou multi-collections
