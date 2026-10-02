# Assisted Acquisition

Etat courant : fondations identifiants, lookup backend ISBN livres, recherche
texte films via TMDb, recherche texte jeux via IGDB, pre-remplissage frontend
local, orchestration backend, resolution multi-provider, cache SQLite
acquisition, choix de media avant creation pour les livres et import via le
systeme media existant.

Les identifiants sont des champs metadata declares par plugin et stockes dans
`items.metadata`. Le lookup ISBN livres est disponible via le backend
CollectionMgnt avec Open Library comme provider principal, BnF comme provider
public secondaire et Google Books comme fallback complementaire configure.

Le backend expose aussi `movies/search` via TMDb pour les films, configure par
`TMDB_API_READ_ACCESS_TOKEN`. Le frontend films permet une recherche par titre,
un choix explicite de suggestion et un pre-remplissage local sans sauvegarde
automatique.

Le backend expose `games/search` via IGDB pour les jeux video, configure par
`IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET`. Le frontend jeux permet une recherche
par titre, avec plateforme et annee optionnelles, puis applique une suggestion
sans importer automatiquement la cover distante.

Le scan camera frontend local peut remplir les champs `isbn` et `barcode` des
formulaires dynamiques. Il ne declenche aucun lookup, aucune sauvegarde
automatique et aucun dedoublonnage global.

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

## Scanner Camera Frontend

Les lots 15.0 et 15.1 ajoutent la fondation technique frontend du scanner camera
et son branchement aux champs identifiants.

Formats actifs :

- champ `isbn` : `ean_13` uniquement, valeur ISBN-13 Bookland `978` ou `979`
  avec checksum valide ;
- champ `barcode` : `ean_13` et `upc_a`.

ISBN-10 n'est pas une symbologie camera annoncee. QR Code reste hors perimetre.

Architecture :

- `NativeBarcodeAdapter` utilise `BarcodeDetector` seulement apres verification
  de `getSupportedFormats()`.
- `ZxingBarcodeAdapter` charge `@zxing/browser` par import dynamique si le natif
  est absent ou insuffisant.
- `ScannerService` gere `navigator.mediaDevices.getUserMedia`, le choix
  d'adaptateur et l'arret idempotent du flux camera.
- `CameraScanner.vue` expose une modale accessible, une video, un cadre de scan,
  des etats permission/loading/scanning/error/unsupported et un evenement de
  resultat brut normalise.
- `DynamicForm.vue` affiche un bouton `Scanner` pour les champs `isbn` et
  `barcode`, puis remplit uniquement le champ concerne.

Garanties du lot :

- aucun appel backend ;
- aucun appel provider ;
- aucune sauvegarde automatique ;
- aucune image ou frame envoyee ou persistee ;
- aucun stockage local browser ;
- arret strict du `MediaStream` apres succes, fermeture, erreur et unmount ;
- saisie clavier toujours disponible ;
- pour un champ `isbn`, les codes voisins non Bookland, UPC-A, supplements
  courts et ISBN-13 a checksum invalide sont ignores sans fermer la modale ;
- pour un champ `barcode`, le comportement reste limite aux EAN-13 et UPC-A ;
- lookup ISBN livres et recherches jeux/films toujours declenches uniquement
  par le bouton `Rechercher`.

## Recherche Et Filtres

Les champs `isbn` et `barcode` peuvent etre declares `searchable` et `filterable`.

Les plugins standards les declarent avec :

- `required: false`
- `searchable: true`
- `filterable: true`

La recherche large `search` peut retrouver une valeur normalisee. Pour les plugins qui ont un champ identifiant searchable, une recherche avec espaces ou tirets est aussi normalisee en variante de recherche.

Les filtres `isbn` et `barcode` valident et normalisent la valeur de query avant comparaison exacte avec `items.metadata`.

## Architecture Backend Providers

Les lookups et imports de fichiers depuis un fournisseur externe passent par le backend.
Les previsualisations peuvent charger une image distante via `<img>`. Le
frontend ne doit pas appeler les APIs des providers directement.

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
BnF ; Google Books est tente seulement si `GOOGLE_BOOKS_API_KEY` est configuree et si
le provider precedent ne fournit aucun resultat exploitable ou echoue
techniquement. Une recherche sans resultat propage la derniere erreur technique
des providers tentes (`provider_error`, `provider_timeout`,
`provider_unavailable`) au lieu de presenter cette recherche incomplete comme
une absence certaine de resultats.

Le lookup ISBN utilise un cache backend SQLite transparent :

- la reponse API publique ne change pas ;
- aucun champ `cached` n'est expose ;
- seules les reponses normalisees `{ query, results }` sont stockees ;
- les reponses brutes provider ne sont jamais stockees ;
- les resultats avec suggestions sont caches 7 jours ;
- les resultats vides sont caches 1 heure ;
- les erreurs provider, timeouts et ISBN invalides ne sont pas caches ;
- aucune image binaire n'est stockee dans le cache.

La recherche texte film interne utilise le meme principe de cache provider. Sa
cle inclut la query normalisee ainsi que `language`, `region` et `year` quand
ces options existent, afin de ne pas melanger des resultats localises
differemment.

La recherche texte jeux utilise le meme cache provider. Sa cle inclut la query
normalisee ainsi que `language`, `platform` et `year` quand ces options existent.
Le cache OAuth Twitch d'IGDB reste en memoire dans le provider et ne passe pas
par `AcquisitionCache`.

Provider livre :

- `openlibrary`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : non
  - secret requis : aucun
- `bnf`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : non
  - secret requis : aucun
- `googlebooks`
  - plugin : `books`
  - capacite : `isbnLookup`
  - configuration obligatoire : oui
  - secret requis : `GOOGLE_BOOKS_API_KEY`
  - cle API requise : `GOOGLE_BOOKS_API_KEY`
  - sans cle : desactive, masque de la liste active et jamais appele anonymement

Capability film :

- `movies/search`
  - plugin : `movies`
  - type : recherche texte
  - options de contexte : `language`, `region`, `year`
  - provider reel : `tmdb`, si `TMDB_API_READ_ACCESS_TOKEN` est configure
  - lookup code-barres : non
  - images : URLs poster distantes TMDb `w500`, sans telechargement provider
  - details IMDb : non livres dans ce lot

Capability jeux video :

- `games/search`
  - plugin : `games`
  - type : recherche texte
  - options de contexte : `platform`, `year`
  - provider reel : `igdb`, si `IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET` sont
    configures
  - lookup code-barres : non
  - images : URLs cover distantes IGDB `t_cover_big`, sans telechargement
    provider
  - medias riches : screenshots, artworks, videos et franchises non livres dans
    ce lot

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
      "id": "bnf",
      "name": "BnF",
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
      "requiresConfiguration": true
    },
    {
      "id": "tmdb",
      "name": "The Movie Database (TMDb)",
      "plugin": "movies",
      "capabilities": ["movies/search"],
      "enabled": true,
      "requiresConfiguration": true
    },
    {
      "id": "igdb",
      "name": "IGDB",
      "plugin": "games",
      "capabilities": ["games/search"],
      "enabled": true,
      "requiresConfiguration": true,
      "type": "metadata"
    }
  ]
}
```

TMDb apparait uniquement lorsque le backend est configure avec
`TMDB_API_READ_ACCESS_TOKEN`.

IGDB apparait uniquement lorsque le backend est configure avec
`IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET`.

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
resolution implicite pour `books` / `isbnLookup` : Open Library, puis BnF, puis
Google Books si necessaire et configure. Si un provider est explicite, seul ce
provider est appele.

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
- `provider_unavailable` : provider non configure, aucun provider actif ou
  indisponibilite temporaire, notamment HTTP 429 Google Books ;
- `provider_timeout` : timeout provider ;
- `provider_error` : erreur provider non exploitable.

Si tous les providers actifs tentes terminent proprement sans resultat, la
route retourne `200` avec `results: []`.

Les suggestions servent a pre-remplir localement le formulaire cote frontend
apres choix explicite de l'utilisateur. La sauvegarde reste assuree par les
routes items existantes `POST /api/items` et `PATCH /api/items/:id`, avec
validation et normalisation backend habituelles.

### `POST /api/acquisition/movies/search`

Recherche des suggestions de metadata film depuis un titre.

Body :

```json
{
  "query": "Blade Runner",
  "provider": "tmdb",
  "language": "fr-FR",
  "region": "FR",
  "year": "1982"
}
```

`query` est obligatoire. `provider`, `language`, `region` et `year` sont
optionnels. Si `provider` est absent, la resolution implicite utilise les
providers films actifs dans l'ordre du registre.

Reponse :

```json
{
  "query": {
    "plugin": "movies",
    "type": "text",
    "value": "Blade Runner",
    "language": "fr-FR",
    "region": "FR",
    "year": "1982"
  },
  "results": [
    {
      "provider": "tmdb",
      "confidence": "high",
      "title": "Blade Runner",
      "description": "A blade runner must pursue replicants.",
      "metadata": {
        "tmdbId": 78,
        "originalTitle": "Blade Runner",
        "releaseDate": "1982-06-25",
        "releaseYear": "1982",
        "originalLanguage": "en"
      },
      "images": [
        {
          "url": "https://image.tmdb.org/t/p/w500/poster.jpg",
          "kind": "cover",
          "source": "tmdb"
        }
      ],
      "sourceUrl": "https://www.themoviedb.org/movie/78"
    }
  ]
}
```

Le frontend films utilise cette route dans le formulaire de creation. Le bouton
`Utiliser` pre-remplit uniquement les champs vides, conserve les identifiants
provider normalises et garde l'image proposee en memoire volatile. L'import de
couverture choisi dans le picker est importe uniquement apres creation de
l'item lors de la soumission utilisateur.

### `POST /api/acquisition/games/search`

Recherche des suggestions de metadata jeu video depuis un titre.

Body :

```json
{
  "query": "Elden Ring",
  "provider": "igdb",
  "platform": "PlayStation 5",
  "year": "2022"
}
```

`query` est obligatoire. `provider`, `platform` et `year` sont optionnels. Si
`provider` est absent, la resolution implicite utilise les providers jeux actifs
dans l'ordre du registre.

Reponse :

```json
{
  "query": {
    "plugin": "games",
    "type": "text",
    "value": "Elden Ring",
    "language": null,
    "platform": "PlayStation 5",
    "year": "2022"
  },
  "results": [
    {
      "provider": "igdb",
      "confidence": "high",
      "title": "Elden Ring",
      "description": "Become an Elden Lord.",
      "metadata": {
        "igdbId": 119133,
        "releaseDate": "2022-02-25",
        "platforms": ["PlayStation 5", "Windows PC"],
        "genres": ["Role-playing (RPG)", "Adventure"],
        "developer": "FromSoftware",
        "publisher": "Bandai Namco Entertainment"
      },
      "images": [
        {
          "url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
          "kind": "cover",
          "source": "igdb"
        }
      ],
      "sourceUrl": "https://www.igdb.com/games/elden-ring"
    }
  ]
}
```

Le frontend jeux utilise cette route dans le formulaire de creation. Le bouton
`Utiliser` pre-remplit uniquement les champs vides : titre, description,
`release_date`, `developer`, `publisher`, `platform` et `genre`. `igdbId` est
conserve dans `metadata`. La cover distante reste en memoire volatile et
l'import du choix media se fait uniquement apres creation de l'item lors de
la soumission utilisateur.

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

Pour les lookups et imports, le frontend consomme uniquement les routes
`/api/acquisition/*`, sans appeler directement les APIs des providers.

Regles de pre-remplissage :

- `title`, `description`, `author`, `publisher` et `publication_date` sont
  renseignes uniquement si le champ courant est vide ;
- `metadata.isbn` peut etre remplace par la valeur normalisee retournee par le
  backend ;
- aucune valeur absente n'est inventee ;
- aucun item n'est cree ou modifie tant que l'utilisateur ne soumet pas le
  formulaire ;
- les URLs de couverture peuvent etre affichees en previsualisation distante ;
- le picker livre permet de choisir une image proposee, un fichier local ou
  aucune image avant creation ; la soumission cree l'item puis importe le choix.

Les erreurs de lookup (`invalid_isbn`, `provider_unavailable`,
`provider_timeout`, erreur generique) sont affichees sans bloquer la saisie
manuelle.

## Recherche Frontend Jeux

Le formulaire dynamique affiche une recherche IGDB pour le plugin `games` quand
un provider compatible est disponible.

Flux utilisateur :

1. l'utilisateur saisit un titre ;
2. il peut preciser une plateforme et une annee ;
3. le frontend appelle `POST /api/acquisition/games/search` ;
4. le backend interroge IGDB selon la strategie de resolution ;
5. le frontend affiche les suggestions retournees ;
6. l'utilisateur choisit `Utiliser` ;
7. le formulaire est pre-rempli localement ;
8. l'utilisateur controle et sauvegarde manuellement.

Regles de pre-remplissage :

- les champs deja remplis ne sont jamais ecrases ;
- `title`, `description`, `release_date`, `developer`, `publisher`, `platform`
  et `genre` sont renseignes uniquement si le champ courant est vide ;
- `igdbId` est conserve dans `metadata` ;
- aucune valeur absente n'est inventee ;
- aucun item n'est cree ou modifie tant que l'utilisateur ne soumet pas le
  formulaire ;
- les URLs de cover sont affichees comme suggestions distantes ;
- l'import d'une cover proposee n'est disponible qu'apres creation de l'item,
  depuis la fiche item.

## Hors Perimetre Actuel

Cette phase capture les identifiants, ajoute le lookup backend ISBN livres via
Open Library, BnF et Google Books, expose la recherche films via TMDb et expose la
recherche jeux via IGDB avec pre-remplissage local cote frontend.

Non livre dans ce lot :

- scan camera
- scan mobile
- lecture automatique de code-barres
- lookup code-barres
- endpoint details TMDb et IMDb ID
- endpoint details IGDB
- ScreenScraper
- pre-remplissage avec sauvegarde automatique
- import d'image avant creation d'un item
- dedoublonnage global

## Phases Futures

Les phases suivantes pourront s'appuyer sur ces champs :

- fournisseurs externes configurables
- providers media ou retro complementaires comme ScreenScraper
- scan camera mobile en contexte HTTPS
- dedoublonnage assiste par collection ou multi-collections

## English — ISBN fallback and provider failures

Book ISBN lookup calls Open Library first, then public BnF SRU, then Google
Books when needed and configured. `GOOGLE_BOOKS_API_KEY` is required to activate Google Books; without
it, the provider is absent from the active registry and is never called
anonymously. An explicit request for unconfigured Google Books returns HTTP 503
/ `provider_unavailable`. The key stays in backend requests only.

A successful suggestion wins immediately, including after a previous provider
failure. HTTP 200 with `results: []` means all attempted providers completed
cleanly without suggestions. If any attempted provider fails and no suggestion
is found, the last technical error is returned, including when Open Library's
empty response came from cache. Google Books HTTP 429 returns HTTP 503 /
`provider_unavailable`, not an empty lookup.

The existing UI error mechanism displays an unavailable, timeout or generic
lookup error and keeps manual entry usable. It does not display “Aucun résultat
trouvé” for failed requests. Explicit provider selection disables fallback.
The scanner, response format and provider-scoped cache strategy are unchanged.

## BnF : suggestions livres publiques

Sans cle Google Books, Open Library et BnF restent disponibles. BnF utilise une
seule requete SRU publique combinant ISBN et EAN, sans authentification. La notice
doit correspondre a l'identifiant demande, notamment via la mention EAN de la
notice `9782952221702`. La suggestion s'affiche comme les autres ; « Source : BnF »
identifie son origine et « Utiliser » remplit les champs disponibles sans
sauvegarde automatique. Une annee seule reste dans `metadata.publication_year`
et ne remplit pas artificiellement le champ date. Le scanner reste inchange.

Google Books exige toujours `GOOGLE_BOOKS_API_KEY`. Seul `projection=lite` est
supprime pour robustesse ; aucune variante de recherche ISBN n'est ajoutee.
BnF ne propose aucune couverture dans ce lot ; le service beta de couvertures
est reserve a un futur Media Provider selon ADR-0009.

## English — public BnF book suggestions

Book lookup order is Open Library -> BnF -> configured Google Books. BnF uses
one public SRU request combining ISBN and EAN, without authentication. Matching
edition identifiers are required. BnF suggestions use the existing normalized
contract, display their source and fill available fields through “Utiliser”,
without saving automatically. A year alone is preserved as `publication_year`
and does not invent a full date. Scanner behavior is unchanged.
Google Books still requires `GOOGLE_BOOKS_API_KEY`; `projection=lite` is removed
without alternative ISBN queries. BnF covers remain outside this metadata lot.

## Resilience des lookups livres

Le timeout specifique BnF est de 8 s, car sa latence varie selon le reseau.
Le cache provider conserve les suggestions 7 jours et les reponses vides 1 h ;
les erreurs techniques et timeouts ne sont jamais caches. Apres expiration
d'un cache vide Open Library, le provider est rappele : s'il retourne une
suggestion, elle est affichee immediatement sans fallback BnF.

Le cas terrain ISBN `9782952221702` (ancien cache vide, BnF lent sur Synology,
UI `provider_timeout`, puis purge et une suggestion Open Library avec UI OK)
est detaille dans [la documentation providers](acquisition-providers.md#resilience-apres-validation-terrain).

## Choix de media avant creation — livres

`Metadata Provider → AcquisitionMediaPicker → MediaService` : les providers
fournissent des candidats, le picker porte le choix utilisateur et MediaService
stocke et transforme les fichiers. `AcquisitionMediaPicker.vue` est generique :
`candidates`, `v-model` et `disabled`, sans ISBN ni collection dans son API.
L'adaptateur frontend normalise les images existantes Open Library, Google Books,
TMDb et IGDB sans changer leur contrat backend `{ kind, source, url }`.
Le `kind` existant est conserve (TMDb utilise actuellement `cover` pour son poster) ;
un candidat explicite `poster` est aussi accepte. BnF reste sans candidat image.

Dans le resultat livre, la premiere URL HTTPS valide est preselectionnee.
« Changer l’image » affiche tous les candidats disponibles, leur provider et
les informations de source, attribution et licence disponibles. Il permet aussi
un fichier JPEG/PNG/WebP local ou « Aucune image ». « Utiliser » applique la
suggestion et son choix au formulaire ; ce choix reste modifiable ensuite.
Aucune recherche supplementaire ni import n'a lieu lors du lookup ou du choix.
La previsualisation distante peut charger l'image dans le navigateur ; seul le
backend telecharge le fichier pour l'import.

Le choix reste en memoire frontend : `{ mode: 'remote', candidate }`,
`{ mode: 'local', file }` ou `{ mode: 'none' }`. Le candidat conserve `kind`,
`url`, `originalUrl`, `thumbnailUrl`, `provider`, `sourceUrl`, `width`, `height`,
`attribution` et `license` ; les valeurs absentes restent `null`, sans invention.
Aucune URL distante n'est ajoutee aux metadata de l'item ou a la table `media`.
Le fichier reste local, sans upload anticipé, et sa preview utilise une URL blob
liberee au changement de choix ou au demontage du composant.

Au clic « Créer l’item » : `POST /api/items`, reception de `itemId`, puis
`POST /api/acquisition/images/import` pour le choix distant ou `POST /api/media`
pour le fichier local, avec `isPrimary: true`. « Aucune image » ignore cette etape.
L'item est conserve meme si l'import echoue : la fiche affiche
« L’élément a été créé, mais l’image n’a pas pu être importée. » et la galerie
permet d'ajouter ou remplacer une image. Aucun rollback ni second pipeline.
La provenance disponible est temporaire : le modele media actuel ne possede pas
ses champs de stockage, et aucune migration DB n'est ajoutee.

Le scenario ISBN `9782952221702`, *La Horde du contrevent*, est teste avec une
suggestion Open Library et sa couverture, un choix sans image, un upload local,
l'import apres creation et le media principal sur la fiche. Les tests utilisent
des reponses provider controlees, sans consultation d'API externe.
Les films et jeux utilisent desormais le meme picker et le meme ordre
creation puis import, sans changer leur recherche metadata.

## English — media selection before book creation

Metadata providers optionally supply candidates; the generic
`AcquisitionMediaPicker` handles user choice; `MediaService` stores/transforms
media. A frontend adapter preserves the existing provider response contract and
accepts Open Library/Google Books covers, TMDb posters and IGDB covers without
inventing provenance, dimensions or licenses. BnF covers are excluded.

The first valid HTTPS candidate is preselected. Users can change it, pick a local
JPEG/PNG/WebP file, or choose no image. Applying a suggestion retains the choice
in frontend memory, editable before submission. Previews may load remote images,
but only the secure backend endpoint downloads them for storage. No extra lookup,
media persistence or upload occurs before creation.

Submission creates the item first, then imports the selected remote candidate via
`/api/acquisition/images/import`, or uploads the local file via `/api/media`, as
primary media. Import failure preserves the item and displays a warning on its
details page, where the gallery remains available. Available provenance stays
temporary because the media model has no provenance fields; no DB migration.
Movies/games now use the same picker and creation-then-import flow.
Official provider media discovery is now available as described below. Manual
remote URLs, BnF Covers, editing/crop and advanced galleries remain future work.

## Rechercher d'autres images — livres, films et jeux

Dans « Changer l’image », l'action « Rechercher d’autres images » lance une
recherche explicite via le backend. Aucun appel automatique au chargement du
formulaire, au lookup metadata ou a l'application d'une suggestion. La premiere
image proposee reste preselectionnee et peut etre remplacee, sans obligation.
Le meme picker sert aux couvertures livres/jeux et aux posters films.

Les candidats initiaux sont marques « Image proposée », les nouveaux candidats
« Résultat de recherche ». Provider, source, attribution/licence disponibles
sont affiches. Le choix courant reste intact apres recherche, y compris fichier
local ou aucune image. Une recherche repetee remplace les resultats de recherche
precedents ; un resultat deja choisi reste disponible. Les reponses obsoletes
sont ignorees. Les appels identiques en cours sont partages dans la session,
et le bouton est desactive pendant sa recherche. Les resultats termines ne sont
pas caches. La langue navigateur est transmise pour classer les posters TMDb.

Les erreurs partielles affichent « Recherche incomplète » avec les providers
concernes et laissent les images disponibles selectionnables. Un resultat vide
avec erreurs est distingue d'une absence propre de medias. Si tous les providers
echouent, un message permet de reessayer ou de conserver le choix courant.

Les identifiants deja connus (Cover ID/OLID/ISBN, TMDb ID, IGDB ID) sont utilises,
sans recherche web ni essai de centaines d'URLs. Les limites Open Library rendent
la recherche explicite necessaire : un seul controle d'existence, aucun crawling
ou prechargement des tailles. Le detail du contrat et de l'aggregation est dans
[les providers acquisition](acquisition-providers.md#recherche-media-multi-provider).

Le flux reste `Metadata Provider → candidats initiaux`, `Media Provider →
MediaSearchService → candidats fusionnes`, `AcquisitionMediaPicker → choix`,
`creation item → MediaService → import/stockage/transformation`. Aucun media
n'est persiste par la recherche. Le choix et sa provenance restent temporaires ;
le schema media n'a pas de champs de provenance. L'import se fait apres itemId,
via le pipeline existant, comme media principal. Un echec image conserve l'item
et affiche l'avertissement sur sa fiche. Aucun import automatique de toutes les
images, aucune URL saisie manuellement, aucun BnF Covers ou ScreenScraper.

## English — explicit media discovery in the picker

Books, movies and games share the same picker. “Search for other images” runs
only on user action, never on form load or metadata lookup. Existing suggested
images and search results are labelled separately; available provider/source,
credits and licenses are shown without inventing missing values. Searches retain
the current choice, including a local file or no image. Repeated searches
replace prior search results while preserving any selected candidate; stale
responses are ignored. Identical in-flight requests share one session request,
with no persistent or completed-result cache.

Partial failures visibly mark the search incomplete and preserve usable results.
All-provider failures allow retry or continued use of the current choice.
Known identifiers drive official provider discovery; Open Library uses only one
existence check and prefers known IDs because ISBN access is rate limited.
Discovery writes no media or DB state. Creation still precedes secure remote
import/local upload through MediaService as primary media. Import failure keeps
the item and warns on its details page. Provenance stays temporary; no new DB
schema, generic web search, arbitrary remote URLs, BnF Covers or ScreenScraper.
