# Assisted Acquisition

Etat courant : fondations identifiants, lookup backend ISBN livres,
pre-remplissage frontend local pour les livres, orchestration backend,
resolution multi-provider, cache SQLite acquisition et import explicite de
couverture provider vers le systeme media existant.

Les identifiants sont des champs metadata declares par plugin et stockes dans
`items.metadata`. Le lookup ISBN livres est disponible via le backend
CollectionMgnt avec Open Library comme provider principal et Google Books comme
provider secondaire.

Le backend dispose aussi du contrat interne `movies/search` et du provider TMDb
pour les films, configure via `TMDB_API_READ_ACCESS_TOKEN`. Aucune route
publique de recherche film et aucun frontend film ne sont livres a ce stade.

Aucune camera, scan mobile, sauvegarde automatique ou dedoublonnage global
n'est disponible a ce stade.

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
  resolution provider et la construction du resultat API ;
- les providers sont isoles derriere un registre backend ;
- le registre provider reste responsable de l'inventaire et de la selection ;
- le mapping provider vers resultat CollectionMgnt est centralise dans le provider ;
- aucune route acquisition ne cree ou modifie un item ;
- les URLs de couverture peuvent etre retournees comme previsualisation distante ;
- l'import d'une couverture provider passe par une confirmation utilisateur et
  un item deja cree ;
- l'import d'image reutilise le `MediaService` existant ;
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

Cette orchestration supporte les providers multiples sans modifier l'API
publique existante. En mode implicite, Open Library est essaye d'abord, puis
Google Books est tente seulement si le provider precedent ne fournit aucun
resultat exploitable ou echoue techniquement.

Le lookup ISBN utilise un cache backend SQLite transparent :

- la reponse API publique ne change pas ;
- aucun champ `cached` n'est expose ;
- seules les reponses normalisees `{ query, results }` sont stockees ;
- les reponses brutes provider ne sont jamais stockees ;
- les resultats avec suggestions sont caches 7 jours ;
- les resultats vides sont caches 24 heures ;
- les erreurs provider, timeouts et ISBN invalides ne sont pas caches ;
- aucune image binaire n'est stockee dans le cache.

La recherche texte film interne utilise le meme principe de cache provider. Sa
cle inclut la query normalisee ainsi que `language`, `region` et `year` quand
ces options existent, afin de ne pas melanger des resultats localises
differemment.

Provider livre :

- `openlibrary`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : non
  - secret requis : aucun
- `googlebooks`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : non
  - secret requis : aucun
  - cle API optionnelle : `GOOGLE_BOOKS_API_KEY`

Capability interne preparee :

- `movies/search`
  - plugin : `movies`
  - type : recherche texte
  - options de contexte : `language`, `region`, `year`
  - provider reel : `tmdb`, si `TMDB_API_READ_ACCESS_TOKEN` est configure
  - lookup code-barres : non
  - images : URLs poster distantes TMDb `w500`, sans telechargement provider
  - details IMDb : non livres dans ce lot

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
    },
    {
      "id": "googlebooks",
      "name": "Google Books",
      "plugin": "books",
      "capabilities": ["isbnLookup"],
      "enabled": true,
      "requiresConfiguration": false
    },
    {
      "id": "tmdb",
      "name": "The Movie Database (TMDb)",
      "plugin": "movies",
      "capabilities": ["movies/search"],
      "enabled": true,
      "requiresConfiguration": true
    }
  ]
}
```

TMDb apparait uniquement lorsque le backend est configure avec
`TMDB_API_READ_ACCESS_TOKEN`.

### `POST /api/acquisition/books/isbn/lookup`

Recherche des suggestions de metadata livre depuis un ISBN.

Body :

```json
{
  "isbn": "9780140328721",
  "provider": "openlibrary"
}
```

Le champ `provider` est optionnel. S'il est absent, le backend utilise la
resolution implicite pour `books` / `isbnLookup` : Open Library d'abord, puis
Google Books si necessaire. Si un provider est explicite, seul ce provider est
appele.

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

Si aucun provider actif ne trouve de resultat, la route retourne `200` avec
`results: []`.

Les suggestions servent a pre-remplir localement le formulaire cote frontend
apres choix explicite de l'utilisateur. La sauvegarde reste assuree par les
routes items existantes `POST /api/items` et `PATCH /api/items/:id`, avec
validation et normalisation backend habituelles.

### `POST /api/acquisition/images/import`

Importe une image distante proposee par un provider vers la galerie media d'un
item deja cree.

Body :

```json
{
  "itemId": 123,
  "imageUrl": "https://covers.openlibrary.org/b/id/123-L.jpg",
  "provider": "openlibrary",
  "source": "openlibrary",
  "isPrimary": true
}
```

Regles :

- `itemId` et `imageUrl` sont obligatoires ;
- `provider`, `source` et `isPrimary` sont optionnels ;
- aucun import n'est lance sans confirmation explicite de l'utilisateur ;
- le backend telecharge l'image, valide l'URL et le contenu, puis appelle
  `MediaService.createOriginalMedia()` ;
- l'original, l'image WebP optimisee et la miniature sont generes par le systeme
  media existant ;
- aucune image binaire n'est stockee dans `acquisition_cache`.

La route refuse les URLs non HTTPS, locales ou privees, revalide les redirects
et borne le telechargement avec la meme limite de taille que les uploads media.

## Lookup Frontend ISBN

Le formulaire dynamique affiche un bouton `Rechercher` adjacent au champ ISBN
pour le plugin `books`.

Flux utilisateur :

1. l'utilisateur saisit un ISBN ;
2. le frontend appelle le backend CollectionMgnt ;
3. le backend interroge les providers selon la strategie de resolution ;
4. le frontend affiche les suggestions retournees ;
5. l'utilisateur choisit `Utiliser` ;
6. le formulaire est pre-rempli localement ;
7. l'utilisateur controle et sauvegarde manuellement.

Le frontend ne contacte jamais Open Library, Google Books ou un autre provider externe
directement. Il consomme uniquement les routes `/api/acquisition/*`.

Regles de pre-remplissage :

- `title`, `description`, `author`, `publisher` et `publication_date` sont
  renseignes uniquement si le champ courant est vide ;
- `metadata.isbn` peut etre remplace par la valeur normalisee retournee par le
  backend ;
- aucune valeur absente n'est inventee ;
- aucun item n'est cree ou modifie tant que l'utilisateur ne soumet pas le
  formulaire ;
- les URLs de couverture peuvent etre affichees en previsualisation distante ;
- l'import d'une couverture proposee n'est disponible qu'apres creation de
  l'item, depuis la fiche item.

Les erreurs de lookup (`invalid_isbn`, `provider_unavailable`,
`provider_timeout`, erreur generique) sont affichees sans bloquer la saisie
manuelle.

## Hors Perimetre Actuel

Cette phase capture les identifiants, ajoute le lookup backend ISBN livres via
Open Library et Google Books, puis expose le pre-remplissage local cote frontend
pour les livres.

Non livre dans ce lot :

- scan camera
- scan mobile
- lecture automatique de code-barres
- lookup code-barres
- provider reel de lookup jeux video
- route publique de recherche films
- endpoint details TMDb et IMDb ID
- pre-remplissage avec sauvegarde automatique
- import d'image avant creation d'un item
- dedoublonnage global

## Phases Futures

Les phases suivantes pourront s'appuyer sur ces champs :

- route publique et frontend pour la recherche film TMDb
- provider IGDB ou RAWG pour les jeux video
- fournisseurs externes configurables
- scan camera mobile en contexte HTTPS
- dedoublonnage assiste par collection ou multi-collections
