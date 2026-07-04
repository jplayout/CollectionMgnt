# Acquisition Providers

Etat courant : architecture acquisition backend stabilisee avec Open Library
comme provider principal et Google Books comme provider secondaire pour les
lookups ISBN livres. Le socle interne `movies/search` est disponible pour les
providers films, avec TMDb comme premier provider Movies configure par
`TMDB_API_READ_ACCESS_TOKEN`.

Ce document est destine aux developpeurs qui veulent comprendre, tester ou
ajouter un provider d'acquisition. Il complete `docs/architecture.md` et
`docs/assisted-acquisition.md` sans remplacer la documentation API utilisateur.

## Vue D'ensemble

Toute acquisition passe par le backend. Le frontend ne contacte jamais Open
Library, Google Books, TMDb, IGDB, RAWG ou un autre provider externe.

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

## Resolution Multi-Provider

En mode implicite, c'est-a-dire sans champ `provider` dans le body, le service
essaie les providers actifs compatibles dans l'ordre stable du registre.

Pour les livres, l'ordre courant est :

1. `openlibrary`
2. `googlebooks`

Pour les films, TMDb est le premier provider `movies/search` quand
`TMDB_API_READ_ACCESS_TOKEN` est configure.

Regles actuelles :

- un provider explicite est appele seul ;
- un provider explicite inconnu retourne `provider_not_found` ;
- un provider explicite desactive retourne `provider_unavailable` ;
- en mode implicite, un resultat vide permet d'essayer le provider suivant ;
- en mode implicite, une erreur technique ou un timeout permet d'essayer le
  provider suivant ;
- le premier provider qui retourne des suggestions gagne ;
- si tous les providers retournent vide, l'API retourne `200` avec
  `results: []` ;
- si tous les providers echouent techniquement, une erreur stable existante est
  retournee ;
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
- `provider_unavailable` : provider absent, desactive ou non configuré ;
- `provider_timeout` : timeout lors de l'appel provider ;
- `provider_error` : erreur provider non exploitable.

Les erreurs internes ne doivent jamais etre exposees telles quelles :

- pas de stack trace ;
- pas de payload provider brut ;
- pas de message technique issu directement d'un service externe ;
- pas de secret ou URL signee dans une erreur.

Une absence de resultat n'est pas une erreur : le lookup retourne `200` avec
`results: []`.

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
- resultat vide : 24 heures ;
- erreur ou timeout : pas de cache.

Une reponse trop volumineuse ne doit pas bloquer l'utilisateur : elle peut etre
retournee normalement sans etre ecrite dans le cache.

Le cache reste par provider. Une entree vide Open Library ne bloque donc pas la
tentative Google Books en mode implicite, et une entree Google Books ne remplace
pas une entree Open Library.

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
- ne pas rendre obligatoire une cle API si le provider est optionnel ;
- garder le frontend provider-agnostic.

## Providers Actuels Et Evolutions

Etat courant et evolutions prevues :

- Google Books : provider livre secondaire livre apres Open Library, avec cle
  API optionnelle via `GOOGLE_BOOKS_API_KEY` ;
- TMDb : premier provider film pour `movies/search`, avec configuration
  obligatoire via `TMDB_API_READ_ACCESS_TOKEN`, sans lookup code-barres, sans
  endpoint details et sans IMDb ID dans ce lot ;
- configuration admin des providers : future, les providers restent configures
  par environnement dans l'etat courant ;
- IGDB ou RAWG : provider jeux video futur, avec attention aux quotas et aux
  secrets ;
- scan camera : couche frontend separee qui remplit un ISBN ou code-barres, puis
  appelle le lookup backend ;
- internationalization : distinguer langue de l'interface, langue des metadata
  et preferences regionales.

Ces evolutions ne doivent pas changer le principe central : providers backend
uniquement, resultat normalise, erreurs stables, tests sans reseau externe.
