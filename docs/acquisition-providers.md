# Acquisition Providers

Etat courant : architecture acquisition backend stabilisee avec Open Library
comme provider principal, BnF comme provider public secondaire et Google Books
comme fallback complementaire pour les lookups ISBN livres lorsque `GOOGLE_BOOKS_API_KEY` est configuree. Le socle interne
`movies/search` est disponible pour les
providers films, avec TMDb comme premier provider Movies configure par
`TMDB_API_READ_ACCESS_TOKEN`. `games/search` est expose pour les jeux video,
avec IGDB comme premier metadata provider quand `IGDB_CLIENT_ID` et
`IGDB_CLIENT_SECRET` sont configures.

Ce document est destine aux developpeurs qui veulent comprendre, tester ou
ajouter un provider d'acquisition. Il complete `docs/architecture.md` et
`docs/assisted-acquisition.md` sans remplacer la documentation API utilisateur.

## Vue D'ensemble

Toute acquisition passe par le backend. Le frontend ne contacte jamais Open
Library, BnF, Google Books, TMDb, IGDB, RAWG ou un autre provider externe.

Flux actuel :

```text
Frontend
  -> Backend Route
  -> AcquisitionService
  -> AcquisitionCache
  -> ProviderRegistry
  -> Provider
```

Rôle des couches :

- Frontend : saisie utilisateur, appel backend, affichage des suggestions et
  pre-remplissage local apres validation utilisateur.
- Backend Route : point d'entree HTTP protege par JWT.
- `AcquisitionService` : orchestration metier du lookup.
- `AcquisitionCache` : cache transparent des reponses normalisees.
- `ProviderRegistry` : inventaire et selection ordonnee des providers.
- Provider : adaptateur vers une API externe et mapping vers CollectionMgnt.

## Metadata Providers Et Media Providers

Les providers ne sont pas obliges de couvrir toute l'acquisition. Ils sont
modelises selon leurs capacites reelles.

Un metadata provider fournit des suggestions exploitables pour creer ou
pre-remplir un item : titre, description, champs plugin, identifiants metier ou
URLs de previsualisation. Open Library et Google Books sont aujourd'hui utilises
comme metadata providers livres.

Un media provider fournit surtout des assets exploitables apres selection d'un
item : jaquettes, posters, screenshots, scans, manuels ou autres medias
distants. Il peut etre utile meme s'il ne fournit pas assez de metadata pour
etre un provider principal de recherche.

Un provider peut aussi faire les deux lorsque son API expose metadata et medias
coherents. TMDb est le cas mixte livre aujourd'hui : il fournit des suggestions
film normalisees et des URLs poster distantes, sans persister ces images. Les
providers jeux video futurs peuvent donc etre combines : un provider
generaliste comme IGDB peut porter la recherche metadata, tandis qu'un provider
specialise comme ScreenScraper peut enrichir les medias retro ou les variantes
regionales.

IGDB est un metadata provider jeux video. Il fournit des suggestions de jeux et
une URL de cover distante, mais ne telecharge, ne transforme et ne persiste
aucun media.

Dans tous les cas, les providers ne persistent pas de fichiers. Ils retournent
des suggestions et des URLs distantes. Toute importation durable passe par
`POST /api/acquisition/images/import` ou une future route equivalente qui
reutilise `MediaService`.

## Responsabilites

### Route

Rôle :

- exposer les routes `/api/acquisition/*` ;
- lire le body et les parametres HTTP ;
- appeler `AcquisitionService` ;
- traduire les erreurs acquisition en reponses HTTP stables.

Responsabilites :

- validation HTTP minimale ;
- protection par authentification ;
- format de reponse public.

Non-responsabilites :

- choisir un provider ;
- mapper une reponse externe ;
- acceder directement a SQLite ;
- appeler une API externe.

### AcquisitionService

Rôle :

- porter le cas d'usage acquisition.

Responsabilites :

- valider et normaliser les identifiants metier, par exemple ISBN ;
- valider et normaliser les recherches texte quand la capability le permet ;
- gerer provider explicite ou resolution implicite multi-provider ;
- consulter le cache si disponible ;
- appeler les providers compatibles dans l'ordre du registre sur cache miss ;
- construire la reponse normalisee `{ query, results }`.

Non-responsabilites :

- formater une reponse Fastify ;
- executer du SQL directement ;
- connaitre les details bruts d'une API externe ;
- fusionner automatiquement les resultats de plusieurs providers.

### AcquisitionCache

Rôle :

- eviter des appels provider repetes pour un meme lookup normalise.

Responsabilites :

- construire une cle stable ;
- lire une entree valide ;
- supprimer une entree expiree ou corrompue ;
- ecrire uniquement les resultats normalises ;
- appliquer les TTL.

Non-responsabilites :

- choisir un provider ;
- modifier le format public de l'API ;
- stocker des secrets, erreurs, reponses brutes ou images binaires.

### ProviderRegistry

Rôle :

- maintenir l'inventaire des providers disponibles.

Responsabilites :

- lister les providers exposes par `GET /api/acquisition/providers` ;
- retourner un provider explicite par id ;
- retourner les providers actifs compatibles avec un plugin et une capacite
  dans un ordre stable.

Non-responsabilites :

- orchestrer un lookup complet ;
- appliquer le cache ;
- mapper des donnees externes ;
- implementer la resolution metier ou la strategie de fallback.

### Provider

Rôle :

- adapter un fournisseur externe au contrat CollectionMgnt.

Responsabilites :

- declarer son identite et ses capacites ;
- effectuer l'appel reseau externe ;
- appliquer timeout et traduction d'erreurs ;
- mapper la reponse externe vers une suggestion normalisee.

Non-responsabilites :

- exposer la reponse brute provider ;
- ecrire en base ;
- connaitre Fastify ou les routes HTTP ;
- sauvegarder automatiquement un item ou une image.

## Contrat Provider

Un provider doit fournir une description et les methodes correspondant a ses
capacites.

### `describe()`

La description doit etre stable et exploitable par le backend et le frontend.

Champs attendus :

- `id` : identifiant technique stable, par exemple `openlibrary` ;
- `name` : nom lisible ;
- `plugin` : plugin concerne, par exemple `books` ;
- `capabilities` : liste de capacites, par exemple `isbnLookup` ;
- `enabled` : indique si le provider peut etre utilise ;
- `requiresConfiguration` : indique si une configuration ou une cle API est
  necessaire.

`enabled` doit etre `false` si le provider ne peut pas fonctionner dans l'etat
courant. Une cle API optionnelle absente ne doit pas desactiver un provider si
son API permet un usage non authentifie.

`requiresConfiguration` ne signifie pas que le provider est actif. Il indique
seulement qu'une configuration externe est attendue pour l'utiliser.

### Methodes de lookup et recherche

La methode actuelle est `lookupIsbn(isbn)` pour la capacite `isbnLookup`.

Comportement attendu :

- recevoir un identifiant deja normalise par le service ;
- retourner une liste de suggestions normalisees ;
- retourner une liste vide si aucun resultat exploitable n'existe ;
- lever une erreur acquisition stable pour timeout ou erreur provider ;
- ne jamais retourner la reponse brute de l'API externe.

Une methode media future devra suivre la meme logique : recevoir une requete
normalisee, retourner des assets provider-agnostic et ne jamais telecharger ou
persister directement le fichier. L'import effectif restera separe du lookup et
passera par le pipeline media existant.

La capability interne `movies/search` prepare les providers films par recherche
texte. Elle utilise la methode `searchMovies(searchQuery)`, ou `searchQuery`
contient :

- `query` : texte normalise et obligatoire ;
- `language` : langue des metadata, optionnelle ;
- `region` : contexte regional, optionnel ;
- `year` : annee de sortie attendue, optionnelle.

Cette capability ne cree pas de lookup code-barres film. Un futur lookup
EAN/UPC devra etre porte par un provider capable de resoudre reellement un
identifiant produit.

TMDb implemente `movies/search` via une recherche texte film. Il utilise un
Bearer token backend, ne telecharge aucune image et ne consulte pas le endpoint
movie details dans le MVP. Les images retournees sont uniquement des URLs poster
distantes en taille `w500`. Le frontend appelle cette capability via
`POST /api/acquisition/movies/search`, puis applique la suggestion choisie au
formulaire films sans sauvegarde automatique.

La capability interne `games/search` prepare les providers jeux video par
recherche texte. Elle utilise la methode `searchGames(searchQuery)`, ou
`searchQuery` contient :

- `query` : texte normalise et obligatoire ;
- `language` : langue des metadata, optionnelle et reservee au cache ou a de
  futurs providers qui la supportent ;
- `platform` : plateforme attendue, optionnelle ;
- `year` : annee de sortie attendue, optionnelle.

IGDB implemente `games/search` comme metadata provider. Il utilise OAuth Client
Credentials cote backend via Twitch, avec `IGDB_CLIENT_ID` et
`IGDB_CLIENT_SECRET`. Le token est conserve en memoire jusqu'a son expiration et
renouvele automatiquement avant expiration. Le frontend appelle cette capability
via `POST /api/acquisition/games/search`, puis applique la suggestion choisie au
formulaire jeux sans sauvegarde automatique. Les covers retournees sont des URLs
distantes et aucun telechargement d'image n'est declenche par la recherche.

## Resolution Multi-Provider

En mode implicite, c'est-a-dire sans champ `provider` dans le body, le service
essaie les providers actifs compatibles dans l'ordre stable du registre.

Pour les livres, l'ordre courant est :

1. `openlibrary`
2. `bnf`, SRU public sans authentification
3. `googlebooks`, uniquement si `GOOGLE_BOOKS_API_KEY` est configuree

Pour les films, TMDb est le premier provider `movies/search` quand
`TMDB_API_READ_ACCESS_TOKEN` est configure.

Pour les jeux video, IGDB est le premier provider `games/search` quand
`IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET` sont configures. S'il n'est pas
configure, il reste masque de `GET /api/acquisition/providers` et un appel
explicite retourne `provider_unavailable`.

Regles actuelles :

- un provider explicite est appele seul ;
- un provider explicite inconnu retourne `provider_not_found` ;
- un provider explicite desactive retourne `provider_unavailable` ;
- en mode implicite, un resultat vide permet d'essayer le provider suivant ;
- en mode implicite, `provider_error`, `provider_timeout` et
  `provider_unavailable` permettent d'essayer le provider suivant ;
- le premier provider qui retourne des suggestions gagne ;
- si tous les providers actifs tentes retournent proprement vide, l'API retourne
  `200` avec `results: []` ;
- si aucun resultat n'est trouve et qu'au moins un provider tente echoue
  techniquement, la derniere erreur technique est propagee : la recherche est
  incomplete, meme si un autre provider ou son cache a retourne vide ;
- aucune fusion automatique n'est effectuee ;
- la liste des providers essayes n'est pas exposee au frontend.

## Resultat Normalise

La reponse publique d'un lookup reste :

```text
{
  query,
  results
}
```

`query` decrit la recherche effectuee :

- plugin concerne ;
- type de query ou d'identifiant ;
- valeur normalisee ;
- contexte optionnel, par exemple langue, region ou annee pour une recherche
  texte.

`results` est une liste de suggestions provider-agnostic.

Une suggestion peut contenir :

- `provider` : id du provider source ;
- `confidence` : niveau indicatif de confiance ;
- `title` : titre propose ;
- `description` : description proposee ;
- `metadata` : champs compatibles avec le plugin cible ;
- `images` : URLs de previsualisation distante ;
- `sourceUrl` : URL de consultation chez le provider.

Une URL presente dans `images` est une reference distante, pas un media stocke.
Elle devient un media CollectionMgnt seulement apres confirmation utilisateur et
passage par `MediaService`.

Le mapping doit produire des champs deja comprehensibles par CollectionMgnt. Par
exemple, un provider livre mappe vers `metadata.author`,
`metadata.publisher`, `metadata.publication_date` et `metadata.isbn` quand ces
valeurs sont disponibles.

Les valeurs absentes ne doivent pas etre inventees. Une suggestion incomplete
est acceptable si elle reste utile et correctement normalisee.

## Gestion Des Erreurs

Codes publics stables :

- `invalid_isbn` : identifiant ISBN invalide avant appel provider ;
- `provider_not_found` : provider explicite inconnu ;
- `provider_unavailable` : provider absent, desactive, non configure ou
  temporairement indisponible, notamment HTTP 429 Google Books ;
- `provider_timeout` : timeout lors de l'appel provider ;
- `provider_error` : erreur provider non exploitable.

Les erreurs internes ne doivent jamais etre exposees telles quelles :

- pas de stack trace ;
- pas de payload provider brut ;
- pas de message technique issu directement d'un service externe ;
- pas de secret ou URL signee dans une erreur.

Une absence de resultat n'est pas une erreur si tous les providers tentes ont
termine proprement : le lookup retourne `200` avec `results: []`. Un resultat
vide ne masque jamais une panne d'un autre provider tente.

## Cache

Le cache existe pour reduire la latence, limiter les appels repetes et preparer
les futurs providers avec quotas.

Il se situe entre `AcquisitionService` et `ProviderRegistry`. Le service tente
de lire le cache avant d'appeler le provider. Sur cache miss, entree expiree ou
entree corrompue, le provider est appele puis le resultat normalise peut etre
stocke.

Cle de cache :

```text
plugin:capability:provider_id:mapping_v{version}:identifier
```

Pour `movies/search`, l'identifiant de cache est construit a partir de la query
texte normalisee et des options `language`, `region` et `year`. Deux recherches
avec la meme query mais des langues ou regions differentes restent donc
distinctes.

Pour `games/search`, l'identifiant de cache inclut la query texte normalisee et
les options `language`, `platform` et `year`. Le cache OAuth du token IGDB reste
un cache memoire interne au provider et ne passe pas par `AcquisitionCache`.

Le cache stocke :

- la reponse normalisee `{ query, results }` ;
- le provider utilise ;
- le plugin et la capacite ;
- l'identifiant normalise ;
- la version de mapping ;
- le statut `success` ou `empty` ;
- les dates de creation et expiration.

Le cache ne stocke jamais :

- reponse brute provider ;
- erreur provider ;
- timeout ;
- ISBN invalide ;
- secret ou cle API ;
- image binaire ;
- champ public `cached`.

TTL actuel :

- resultat avec suggestions : 7 jours ;
- resultat vide : 1 heure ;
- erreur ou timeout : pas de cache.

Une reponse trop volumineuse ne doit pas bloquer l'utilisateur : elle peut etre
retournee normalement sans etre ecrite dans le cache.

Le cache reste par provider. Une entree vide Open Library ne bloque donc pas la
tentative BnF puis Google Books en mode implicite. Les entrees `bnf` restent
distinctes ; aucun resultat d'un provider ne remplace celui d'un autre.

## Tests

Les tests acquisition ne doivent jamais appeler Internet.

Bonnes pratiques :

- injecter un `fetchImpl` de test pour les providers ;
- utiliser des fixtures JSON locales pour representer les reponses externes ;
- tester les providers avec des payloads provider realistes mais locaux ;
- tester `AcquisitionService` avec des providers factices ;
- tester `ProviderRegistry` avec plusieurs providers actifs/desactives ;
- tester le cache avec un repository SQLite temporaire ;
- verifier cache hit, cache miss, expiration et entree corrompue ;
- verifier que les entrees de cache restent distinctes par provider ;
- verifier les cas de resolution implicite et de provider explicite ;
- verifier que les erreurs provider et timeouts ne sont pas caches ;
- verifier que le format public ne change pas entre cache miss et cache hit.

Les tests frontend ou Playwright doivent mocker uniquement les routes
necessaires au scenario, par exemple `/api/acquisition/books/isbn/lookup`. Ils
ne doivent jamais intercepter largement toutes les routes API sans raison.

## Ajouter Un Nouveau Provider

Etapes recommandees :

1. Creer un provider dans `backend/src/acquisition/providers/`.
2. Definir une description stable avec `id`, `plugin`, `capabilities`,
   `enabled` et `requiresConfiguration`.
3. Implementer la methode de lookup correspondant a la capacite.
4. Mapper la reponse externe vers le resultat normalise CollectionMgnt.
5. Traduire les erreurs externes vers les erreurs acquisition stables.
6. Enregistrer le provider dans `ProviderRegistry`.
7. Ajouter des tests sans reseau reel.
8. Mettre a jour la documentation pertinente.

Points d'attention :

- ne pas ajouter de logique provider dans les routes ;
- ne pas faire acceder le provider a SQLite ;
- ne pas exposer de reponse brute externe ;
- garder optionnel le provider, mais exiger sa configuration avant activation ;
- garder le frontend provider-agnostic.

## Providers Actuels Et Evolutions

Etat courant et evolutions prevues :

- BnF : provider public `books/isbnLookup` apres Open Library, sans cle API ;
- Google Books : fallback livre complementaire apres BnF, avec cle API
  requise via `GOOGLE_BOOKS_API_KEY`. Sans cle non vide, `describe()` annonce
  `enabled: false` et `requiresConfiguration: true`, le registre le masque de
  la liste active et un appel explicite retourne `provider_unavailable` sans
  appel reseau. La cle reste exclusivement dans les requetes backend ;
- TMDb : premier provider film pour `movies/search`, avec configuration
  obligatoire via `TMDB_API_READ_ACCESS_TOKEN`, sans lookup code-barres, sans
  endpoint details et sans IMDb ID dans ce lot ;
- IGDB : premier metadata provider jeux video pour `games/search`, avec
  configuration obligatoire via `IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET`, route
  acquisition protegee JWT, frontend de recherche jeux et aucun telechargement
  automatique d'image ;
- configuration admin des providers : future, les providers restent configures
  par environnement dans l'etat courant ;
- RAWG : provider jeux video futur eventuel, avec attention aux quotas et aux
  restrictions d'usage ;
- ScreenScraper ou source equivalente : provider media ou retro potentiel,
  complementaire d'un provider metadata principal et soumis a ses propres
  contraintes de licence, attribution et quota ;
- scan camera : couche frontend separee qui remplit un ISBN ou code-barres, puis
  appelle le lookup backend ;
- internationalization : distinguer langue de l'interface, langue des metadata
  et preferences regionales.

Ces evolutions ne doivent pas changer le principe central : providers backend
uniquement, resultat normalise, erreurs stables, tests sans reseau externe.

## English — provider configuration and incomplete searches

Open Library remains the first ISBN provider, followed by public BnF SRU.
Google Books is the final fallback only
when a non-empty `GOOGLE_BOOKS_API_KEY` is configured in the backend. Without
it, Google Books reports `enabled: false` and `requiresConfiguration: true`,
is omitted from active registry resolution and the public provider list, and
rejects explicit lookups with `provider_unavailable` without a network request.
Neither descriptions, public errors, frontend bundles nor logs contain the key.

Implicit acquisition returns the first successful suggestion immediately.
It returns HTTP 200 with `results: []` only if every attempted provider completed
cleanly with no results. If no suggestion is found and any attempted provider
fails with `provider_error`, `provider_timeout` or `provider_unavailable`, the
last technical error is propagated. This also applies to movie and game searches.
A cached empty response follows the same rule as a live empty response.
Explicit provider selection continues to disable fallback.

Google Books HTTP 429 maps to HTTP 503 / `provider_unavailable` without exposing
its raw quota payload. Cache keys remain scoped to providers; empty responses
retain their one-hour TTL, successful responses seven days, and errors are never
cached. Permanent tests use local fixtures and never call external APIs.

## BnF : recherche ISBN/EAN et mapping

Le provider `bnf` utilise le [SRU Catalogue general public](https://api.bnf.fr/fr/api-sru-catalogue-general), sans authentification :

- endpoint : `https://catalogue.bnf.fr/api/SRU` ;
- `version=1.2`, `operation=searchRetrieve`, `recordSchema=dublincore`, `maximumRecords=5` ;
- une seule requete CQL : `(bib.isbn adj "<ISBN>") or (bib.ean adj "<ISBN>")` ;
- timeout specifique BnF : 8 secondes.

Une notice est acceptee seulement si ses identifiants Dublin Core ou la mention
EAN de `dc:description` correspondent exactement a l'identifiant normalise
demande. Le cas `9782952221702` utilise l'EAN, alors que la notice indique
l'ISBN-10 `2952221707`. Les titres, creators, editeur, langue, identifiants et
ARK disponibles sont conserves. `metadata.publication_year` conserve une annee ;
`metadata.publication_date` est fourni uniquement pour une date complete. Aucun
mois ni jour n'est invente. `sourceUrl` pointe vers la notice ARK sur
`catalogue.bnf.fr`, `provider` vaut `bnf` et `images` reste vide.

Le XML est valide puis parse avec `fast-xml-parser` **5.11.2**, licence **MIT**,
audit sans vulnerabilite avant ajout. Les prefixes namespaces SRU/DC peuvent
varier ; les declarations DTD/entites sont rejetees. Un XML invalide, diagnostic
SRU ou HTTP non-2xx produit une erreur technique, pas une reponse vide.

Google Books conserve `q=isbn:<ISBN>`, `maxResults=5`, `printType=books` et la cle
backend obligatoire. `projection=lite` est supprime pour robustesse. Aucune
variante raw, quoted, ISBN-10 ni recherche texte n'est ajoutee.

Les couvertures BnF sont hors perimetre : leur integration eventuelle appartient
a un lot Media Provider conforme a [ADR-0009](adr/ADR-0009-metadata-and-media-provider-specialization.md).

## English — BnF SRU ISBN/EAN metadata

Active book lookup order is **Open Library -> BnF -> Google Books**; without
`GOOGLE_BOOKS_API_KEY`, it is **Open Library -> BnF**. Public BnF SRU uses one
encoded combined ISBN/EAN CQL query, Dublin Core XML, five records and an eight-second
timeout. Exact edition-identifier matching is mandatory, including commercial
EAN mentions in Dublin Core descriptions. Available titles, creators, publishers,
languages, identifiers and ARKs are mapped; partial dates retain their year
without invented month/day values. No BnF cover service is integrated.

XML parsing uses pinned MIT-licensed `fast-xml-parser` 5.11.2, audited before
addition, with validation, namespace-prefix handling and DTD rejection.
Google Books still requires its backend API key and keeps the ISBN query,
`maxResults=5` and `printType=books`; `projection=lite` is removed for robustness,
without alternate queries. Orchestration semantics and provider-scoped cache
remain unchanged. Successful responses retain a seven-day TTL, empty responses
one hour, and technical errors are never cached.

## Resilience apres validation terrain

Pour l'ISBN `9782952221702`, un ancien cache Open Library vide (TTL de 24 h)
masquait une reponse devenue disponible. Le fallback BnF etait rapide sur
Bazzite (environ 252 ms), mais expirait a 5 s sur un NAS Synology ; l'UI
signalait `provider_timeout`. Une resolution IPv4 prioritaire lors du diagnostic
permettait un succes BnF en environ 4412 ms. Apres purge du cache, Open Library
retournait une suggestion et l'UI fonctionnait correctement.

BnF peut donc etre significativement plus lent selon le reseau : son timeout
specifique passe a 8 s. Le cache vide expire apres 1 h pour rappeler le provider
et retourner immediatement ses suggestions sans fallback inutile. Les succes
restent caches 7 jours et les erreurs techniques ne sont jamais cachees.
Aucun retry automatique ni resolution IPv4 forcee n'est ajoute.

## Recherche media multi-provider

`Metadata Provider → metadata + candidats initiaux` ;
`Media Provider → decouverte de candidats` ;
`MediaSearchService → aggregation` ;
`AcquisitionMediaPicker → choix utilisateur` ;
`MediaService → stockage/transformation apres creation`.

Le registre `AcquisitionProviderRegistry` est reutilise. Open Library et Google
Books exposent `books/mediaSearch` (capability `mediaSearch`, plugin `books`),
TMDb `movies/mediaSearch` et IGDB `games/mediaSearch`, en plus de leurs capabilities
metadata. BnF ne participe pas. Aucun second registre ni modification de la
semantique « premier succes gagne » d'AcquisitionService.

`POST /api/acquisition/media/search` est protege par JWT. Corps limite a 4 KiB,
champs stricts : `plugin`, `kind`, `identifiers`, `title` optionnel (300 caracteres),
`metadata` optionnel (`author` 200 caracteres, `language`/`originalLanguage` 35).
Les combinaisons sont `books/cover`, `movies/poster`, `games/cover`. Cette premiere
version exige un identifiant : ISBN valide ou Cover ID/OLID pour books, `tmdbId`
pour movies, `igdbId` pour games. IDs numeriques positifs bornes ; aucune URL
arbitraire, aucun objet item complet, aucun provider fourni par le client.

La reponse contient `query`, `results`, `warnings` et `incomplete`.
Les candidats normalises portent `kind`, `url`, `thumbnailUrl`, `provider`,
`sourceUrl`, `width`, `height`, `attribution`, `license`, `language`, plus
`providerImageId` et, si disponible, `providerLocalizationId` internes et temporaires.
Les informations absentes restent `null` ; seules des URLs HTTPS sans credentials
sont retournees. Les dimensions IGDB sont celles du fichier source annoncees par
l'API ; sa representation `t_cover_big` est redimensionnee par le CDN.

Les providers actifs compatibles sont appeles en concurrence, chacun avec son
budget de timeout (5 s pour les quatre providers actuels, acquisition OAuth IGDB
incluse dans le budget global du provider). Maximum 10 candidats par provider,
20 au total, ordre deterministe du registre. Deduplication par URL normalisee
(fragment retire) et par identifiant image dans un provider ; pour une image
connue a plusieurs tailles, la plus grande est conservee avec une preview petite.
Aucun hashing perceptuel.

| Etat des providers | Reponse |
| --- | --- |
| Plusieurs succes | Candidats fusionnes, 200 |
| Succes + erreur | Candidats disponibles, warnings provider/code, `incomplete: true`, 200 |
| Tous vides propres | `results: []`, `incomplete: false`, 200 |
| Erreurs + providers vides | `results: []`, warnings, `incomplete: true`, 200 |
| Tous en erreur | Erreur acquisition stable 503/504 et warnings sans messages externes |
| Aucun provider actif compatible | `provider_unavailable`, 503 |

Les APIs officielles utilisees sont :

- [Open Library Covers](https://openlibrary.org/dev/docs/api/covers) : priorite
  Cover ID, puis OLID, puis ISBN. Un seul HEAD de la variante L avec
  `default=false` verifie l'existence ; 404 signifie absence. URL L et preview M,
  sans telechargement des fichiers, crawling, variantes ISBN ou prechargement
  des tailles. L'acces ISBN est soumis aux limites Open Library ; reutiliser
  les IDs connus evite des appels inutiles.
- [Google Books volumes](https://developers.google.com/books/docs/v1/reference/volumes) :
  cle backend obligatoire, requete ISBN existante sans `projection=lite`, cinq
  volumes maximum et verification exacte des industryIdentifiers ISBN. Meilleure
  taille disponible, thumbnail/smallThumbnail en preview ; plusieurs volumes
  peuvent donner plusieurs images. Les liens HTTP sur les domaines Google Books
  connus sont convertis en HTTPS ; aucune autre URL HTTP n'est acceptee.
- [TMDb movie images](https://developer.themoviedb.org/reference/movie-images) :
  `/movie/{tmdbId}/images`, uniquement posters, URLs `original`/`w185` sur le CDN
  existant. Classement transparent : langue navigateur, langue originale,
  sans langue, autres ; puis vote moyen/nombre de votes. Dimensions/langue
  proviennent des champs API.
- [IGDB covers](https://api-docs.igdb.com/#cover) : `/v4/covers`, filtre jeu et
  localisations du jeu, dix covers maximum, `image_id`, `url`, dimensions et
  reference de localisation si disponible. OAuth et cache token de l'instance
  IGDB existante sont reutilises. Aucune langue n'est deduite d'une region.
  Un HTTP 401 invalide le token pour la prochaine recherche explicite, sans retry.

La decouverte n'ecrit ni media, ni item, ni cache SQLite et n'appelle jamais
MediaService. Les requetes JSON/HEAD utilisent uniquement les endpoints fixes
ci-dessus, sans suivre de redirects inattendus. Lors d'un import choisi,
l'endpoint existant conserve toutes ses validations SSRF/DNS/redirects, HTTPS,
MIME, taille et dimensions. Aucun cache persistant de recherche media dans ce lot ;
son besoin pourra etre etudie si les limites providers deviennent un probleme.

## English — dedicated media aggregation

MediaSearchService reuses the existing provider registry and a new `mediaSearch`
capability on Open Library, Google Books, TMDb and IGDB. It aggregates concurrent
provider responses rather than using AcquisitionService's first-success rule.
The JWT-protected `/api/acquisition/media/search` endpoint accepts only bounded,
allowlisted plugin/kind/identifier/title/minimal metadata input (4 KiB body).
This version requires an ISBN/known OL ID, TMDb ID or IGDB ID; it has no title-only
search or explicit provider selector. It never accepts a URL to fetch.

Results are capped at ten per provider and twenty globally, deduplicated by
normalized URL and provider image ID. Available image sizes keep the largest
candidate and a smaller preview. Missing dimensions, language, credits and
licenses stay null. Mixed successes/errors return available candidates and
sanitized warnings with `incomplete: true`; clean empties return 200/empty;
errors plus empties explicitly indicate incomplete search; all errors return a
stable acquisition error. Provider timeouts bound each concurrent search.

Official Covers/Volumes/Movie Images/Covers APIs are used as documented above.
Open Library uses one HEAD existence check with `default=false`, preferring
known Cover ID/OLID to rate-limited ISBN access; there is no crawling or size
probing. Google Books requires its backend-only key and exact ISBN matching.
TMDb returns ranked posters; IGDB reuses its OAuth cache and covers/localization
metadata without guessing language. Discovery never downloads into MediaService
or writes items/media/cache. Import remains the existing secure MediaService
pipeline after creation. Persistent media-search caching remains future work.
