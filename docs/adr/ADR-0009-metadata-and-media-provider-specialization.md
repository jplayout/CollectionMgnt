# ADR-0009 — Metadata and Media Provider Specialization

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

L'acquisition assistee a d'abord ete modelisee autour de providers qui
retournent des suggestions de metadata et, parfois, des URLs d'images. Les
providers jeux video mettent en evidence une separation plus nette : IGDB est
fort pour les metadata generalistes, tandis que des sources comme
ScreenScraper peuvent etre plus pertinentes pour les medias, les variantes
regionales ou les jeux retro.

Tous les providers externes n'ont pas la meme couverture. Certains resolvent un
identifiant ou une recherche texte, certains exposent surtout des images ou des
documents, et certains peuvent faire les deux.

Decision

CollectionMgnt distingue les providers de metadata et les providers de medias.

Un provider peut fournir uniquement des metadata si sa valeur est la recherche,
la resolution d'identifiant ou le mapping vers les champs plugin. Un provider
peut fournir uniquement des medias si sa valeur est l'exposition d'images,
videos, scans ou documents exploitables apres selection d'un item. Un provider
peut aussi fournir les deux quand son API expose des metadata et des medias
coherents pour le meme domaine. TMDb est un exemple de provider mixte dans le
modele courant : il fournit des metadata film et des URLs poster distantes,
mais il ne persiste aucun media.

Les providers restent modelises par capabilities reelles. Une capability de
metadata ne doit pas pretendre importer un fichier. Une capability de medias ne
doit pas pretendre resoudre un item si elle ne fait qu'exposer des assets. Les
resultats peuvent contenir des URLs distantes, mais aucun provider ne stocke de
fichier dans CollectionMgnt.

`MediaService` reste le pipeline unique pour toute persistance de media. Les
uploads manuels, imports depuis provider et futurs imports specialises passent
par les memes validations, transformations, miniatures et regles d'association
aux items.

Consequences

Positive

- Les providers peuvent etre choisis selon leur force reelle.
- IGDB peut rester un provider metadata principal sans couvrir tous les medias.
- ScreenScraper ou un provider similaire peut etre ajoute comme source media ou
  retro sans remplacer le provider metadata principal.
- Les contraintes de securite, validation et stockage des fichiers restent
  centralisees dans `MediaService`.
- Le frontend peut proposer un flux explicite : selection de metadata, puis
  import media confirme par l'utilisateur.

Negative

- Le modele d'acquisition doit gerer plusieurs types de capabilities.
- Les providers media peuvent necessiter une UX de selection d'asset plus riche.
- Les regles de cache doivent rester separees entre metadata normalisees et
  fichiers media.
- La documentation doit expliciter qu'une URL media provider n'est pas encore
  un media stocke.

---

# English

Status

Accepted

Context

Assisted acquisition was first modeled around providers that return metadata
suggestions and, sometimes, image URLs. Video game providers make a sharper
split visible: IGDB is strong for general metadata, while sources such as
ScreenScraper may be more relevant for media, regional variants or retro games.

External providers do not all have the same coverage. Some resolve an
identifier or text search, some mostly expose images or documents, and some can
do both.

Decision

CollectionMgnt distinguishes metadata providers from media providers.

A provider may provide only metadata when its value is search, identifier
resolution or mapping to plugin fields. A provider may provide only media when
its value is exposing images, videos, scans or documents that can be imported
after an item has been selected. A provider may also provide both when its API
exposes coherent metadata and media for the same domain. TMDb is an example of
a mixed provider in the current model: it provides movie metadata and remote
poster URLs, but it does not persist any media.

Providers remain modeled by their real capabilities. A metadata capability must
not pretend to import a file. A media capability must not pretend to resolve an
item if it only exposes assets. Results may contain remote URLs, but no
provider stores files in CollectionMgnt.

`MediaService` remains the single pipeline for all media persistence. Manual
uploads, provider imports and future specialized imports go through the same
validation, transformations, thumbnails and item association rules.

Consequences

Positive

- Providers can be selected according to their real strengths.
- IGDB can remain a primary metadata provider without covering every media use.
- ScreenScraper or a similar provider can be added as a media or retro source
  without replacing the primary metadata provider.
- Security, validation and file storage constraints stay centralized in
  `MediaService`.
- The frontend can offer an explicit flow: metadata selection, then
  user-confirmed media import.

Negative

- The acquisition model must handle several capability types.
- Media providers may require a richer asset selection UX.
- Cache rules must stay separate between normalized metadata and media files.
- Documentation must make clear that a provider media URL is not yet stored
  media.
