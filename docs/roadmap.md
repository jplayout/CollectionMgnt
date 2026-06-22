# Roadmap - CollectionMgnt

## Vision

Collection Manager est une plateforme auto-hébergée de gestion de collections basée sur un moteur de plugins déclaratifs.

L'objectif est de permettre à un utilisateur de créer et gérer n'importe quel type de collection sans développement spécifique.

## État actuel

- Version actuelle : v0.12-lot10.2.2.
- Dernier lot livré : Lot 10.2.2 - Demo Media Pack.

Capacités disponibles :

- Authentification JWT avec modèle de rôles minimal `admin` / `user`.
- Collections dynamiques pilotées par plugins déclaratifs.
- Plugins standards enrichis pour supporter le dataset de démonstration.
- Dataset officiel de démonstration importable via l'import JSON natif.
- Script de pack média de démonstration avec images PNG générées et uploadées via l'API média.
- CRUD items, validation dynamique, recherche, filtres, pagination, tri et vues cartes/liste.
- Préférences d'affichage par collection/plugin.
- Médias avec upload, conversion WebP, miniatures, image principale, audit et cleanup guidé.
- Exports JSON natifs, export CSV collection et import JSON natif non destructif.
- Administration MVP avec export global, import, backup ZIP, audit média, cleanup média et résumé système.
- Layout authentifié, responsive de base et tests backend d'intégration.
- CI GitHub Actions, publication GHCR et builds Docker/Podman documentés.

Limites majeures connues :

- Restauration ZIP complète non livrée.
- Import CSV CollectionMgnt et import CSV externe non livrés.
- Support backend des types plugin avancés non livré : multiselect, url, email, barcode, isbn.
- Gestion utilisateurs avancée, permissions fines et page profil non livrées.
- Sécurité applicative avancée, audit CI sécurité et hardening Docker encore à traiter.
- Recherche globale multi-collections, FTS, normalisation Unicode et filtres range non livrés.
- Tests frontend, E2E, couverture de code et tooling qualité avancé non livrés.

## Prochaines priorités

### Haute priorité

- Restauration ZIP guidée.
- Import CSV CollectionMgnt.
- Amélioration des rapports et historiques d'administration.

### Priorité moyenne

- Import CSV externe depuis une autre application de gestion de collection.
- Support backend des types plugin avancés : multiselect, url, email, barcode, isbn.
- Gestion utilisateurs avancée et permissions fines.

### Plus tard

- API publique.
- Installation plugins ZIP.
- Catalogue de plugins.
- Recherche globale multi-collections et recherche approximative.

## Sécurité

### Livré

- Lot sécurité RBAC / rate limit / CSV livré.
- Détail complet conservé dans `Historique des lots livrés > Sécurité`.

### Travaux futurs prioritaires

Priorité élevée :

- Revue et mise à jour de la dépendance JWT / fast-jwt.
- Validation stricte de `JWT_SECRET` avec longueur minimale.
- Journalisation des événements sensibles :
  - connexion réussie
  - connexion échouée
  - téléchargement backup
  - import
  - media cleanup

Priorité moyenne :

- Renforcement des en-têtes HTTP avec Helmet ou équivalent.
- Rate limiting complémentaire :
  - backup
  - import
  - upload
- Politique minimale de mot de passe.

### Tooling / CI sécurité

- Dependabot.
- CodeQL.
- `npm audit` en CI.
- Scan de sécurité des images conteneur, par exemple Trivy.

### Infrastructure sécurité

- Docker hardening avec utilisateur non privilégié.
- Monitoring basique des événements sensibles.

## Dette technique

### Backend

- Support backend des types plugin avancés : multiselect, url, email, barcode, isbn.
- Optimisation SQLite.
- Optimisation recherche.
- SQLite FTS5.
- Recherche approximative.
- Pas encore de normalisation complète des accents ou de l'Unicode.
- Pas encore de filtres range.
- Pas de recherche metadata globale multi-plugins.

### Frontend

- Interface complète d'upload images.
- Galerie médias avancée.
- Interface collections avancée.
- Gestion des plugins.
- Page profil fonctionnelle.
- Pas de refonte mobile complète.
- Certains écrans avancés restent à affiner progressivement.

### CI / Qualité

- Tests automatisés.
- Tests unitaires frontend Vitest.
- Tests composants Vue.
- Playwright.
- Cypress.
- Tests E2E complets.
- Couverture de code.
- Sonar.
- Codecov.
- Tests de performance.
- Tests multi-navigateurs.

### Documentation

- Documentation complète.
- Documentation de déploiement local dans `docs/deployment-docker.md`.
- Documentation des commandes locales et du workflow PR.
- Ne pas se limiter à traduire le README pour l'internationalisation.

## Backlog produit

### Collections et items

- Configuration des champs et préférences d’affichage.
- Acquisition assistée / pré-remplissage automatique :
  - support futur des identifiants ISBN / EAN / UPC / code-barres
  - scan possible depuis mobile/tablette
  - recherche automatique via sources externes
  - pré-remplissage des champs item
  - récupération éventuelle de métadonnées et images
  - fonctionnalité distincte du simple enrichissement des plugins standards
- Définition d’échelles de notation configurables :
  - note sur 5
  - note sur 10
  - note sur 20
  - note sur 100
  - pourcentage
  - affichage en étoiles
- Configuration des colonnes affichées dans les listes.
- Choix des métadonnées mises en avant dans les cartes items.
- Préférences d’affichage par collection/plugin.
- Gestion des prêts.
- Historique.
- Tags globaux.

### Import / export / sauvegarde

- Restauration ZIP guidée.
- Restauration ZIP complète.
- Import CSV CollectionMgnt.
- Import CSV externe depuis une autre application de gestion de collection.
- Importer un export CSV venant de l'application Icollect.
- Import CSV.
- Export CSV.
- Import JSON.
- Export JSON.
- Sauvegarde automatique.
- Export complet.
- Politique de rétention.

### Médias

- Outils d’audit et maintenance média.
- Détection des fichiers orphelins sur disque.
- Détection des entrées media sans fichier associé.
- Rapport d’audit détaillé.
- Mode dry-run.
- Nettoyage manuel depuis l’interface d’administration.
- Régénération éventuelle des miniatures et images optimisées.
- Scénarios QA média avec fichiers orphelins volontaires.
- Tests E2E du dataset de démonstration avec pack média.
- OCR.
- Lecture ISBN.
- Lecture code-barres.

### Administration

- Amélioration des rapports et historiques d'administration.
- Multi-utilisateurs avancé.
- Gestion utilisateurs.
- Permissions fines.
- Paramètres système.
- Sous-pages possibles : `/admin/data`, `/admin/media` et `/admin/system`.

### Recherche

- Recherche globale.
- Recherche avancée.
- Filtres automatiques.
- Facettes.
- Multi-collections.
- Recherche configurable.
- SQLite FTS5.
- Recherche approximative.

### Plugins

- Support backend des types plugin avancés : multiselect, url, email, barcode, isbn.
- Plugins officiels.
- Installation plugins ZIP.
- Catalogue de plugins.
- Mangas.
- Bandes dessinées.
- Vinyles.
- Figurines.
- LEGO.
- Cartes Pokémon.

### Internationalisation

- Support multilingue.
- Français.
- Anglais.
- Changement de langue.
- Préférences utilisateur.
- Internationalisation / changement de langue :
  - option dans le menu utilisateur ou administration
  - probablement FR / EN au départ
  - préférence persistée côté utilisateur ou settings
  - ne pas se limiter à traduire le README

### Responsive

- Responsive / usage tablette-mobile :
  - top bar compacte
  - cartes adaptées mobile
  - listes avec scroll/colonnes simplifiées
  - administration utilisable sur petit écran
  - formulaires confortables au tactile

## Historique des lots livrés

### Lot 5.x

#### Lot 5.6 - Livré

- Route protégée `/collections/:pluginId/items/new`
- Création d'item frontend dynamique pilotée par `GET /api/plugins/:pluginId/schema`
- Formulaire dynamique pour les types validés par le backend :
  - text
  - textarea
  - select
  - checkbox
  - date
  - number
  - rating
- Validation frontend légère alignée sur la validation backend :
  - required
  - min
  - max
  - pattern
  - options
- Conversion des champs number/rating avant `POST /api/items`
- Conservation des checkbox à `false`
- Gestion des erreurs frontend et backend
- Redirection vers `/items/:id` après création

#### Lot 5.7 - Livré

- `GET /api/items/:id`
- `PATCH /api/items/:id`
- Édition backend d'un item sans changement de plugin
- Réutilisation de la validation dynamique backend
- Mise à jour de `title`, `description`, `metadata` et `updated_at`
- Conservation des métadonnées inconnues existantes
- Retour de l'item avec `metadata` parsé, code plugin et nom d'affichage plugin

#### Lot 5.8 - Livré

- Route protégée `/items/:id/edit`
- Chargement d'un item via `GET /api/items/:id`
- Préremplissage du formulaire dynamique existant
- Sauvegarde via `PATCH /api/items/:id`
- Redirection vers `/items/:id` après modification
- Page détail item enrichie avec titre, description, plugin, métadonnées et dates
- Bouton `Modifier` depuis la page détail
- Galerie média conservée sur la page détail

#### Lot 5.8.1 - Correctif livré

- Bornage par défaut des champs `rating` à 0..20 côté backend
- Attributs frontend par défaut `min=0`, `max=20` et `step=1` pour les champs `rating`
- Surcharge possible des bornes via `min`, `max` et `step` dans le schéma plugin
- Conservation du comportement actuel des champs `number`, sans bornes par défaut
- `step` reste une contrainte UI uniquement pour ce lot

#### Lot 5.9 - Livré

- Suppression d'un item depuis sa fiche détail
- Confirmation explicite avant suppression avec le titre réel de l'item
- Appel frontend à `DELETE /api/items/:id`
- État `Suppression...` et gestion des erreurs inline
- Redirection vers la liste de collection après suppression
- Message `Item supprimé.` dans la liste après redirection
- Suppression depuis la liste non intégrée dans ce lot
- Limitation restante à ce stade du Lot 5.9 : les fichiers média associés à l'item n'étaient pas encore nettoyés sur disque

#### Lot 5.10 - Livré

- `DELETE /api/items/:id` retourne 404 si l'item est absent
- Suppression DB de l'item avant nettoyage disque
- Conservation de la cascade SQLite pour supprimer les lignes `media`
- Nettoyage best-effort du dossier `backend/data/uploads/items/{itemId}`
- Suppression physique des sous-dossiers `originals`, `images` et `thumbs`
- Erreurs de nettoyage disque logguées sans rollback de la suppression DB

#### Lot 5.11 - Livré

- Recherche titre conservée dans la liste d'une collection
- Filtres dynamiques frontend générés depuis les champs `filterable` du `fields.json`
- Types de filtres frontend supportés :
  - text
  - textarea
  - select
  - checkbox
  - date
  - number
  - rating
- Rating borné côté UI à 0..20 par défaut, avec `step=1`
- Réinitialisation de la recherche et des filtres
- Limitation restante : les champs `searchable` ne sont pas encore exploités
- Limitation restante : pas de tri
- Limitation restante : certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict

#### Lot 5.12 - Livré

- Paramètre `search` sur `GET /api/items`
- Recherche large dans `items.title` et `items.description`
- Recherche dans les metadata déclarées `searchable` quand un plugin courant est fourni
- Combinaison possible avec `plugin` et les filtres `filterable`
- Compatibilité conservée avec `title`
- Combinaison de `title` et `search` en `AND`
- Liste collection frontend basculée de la recherche titre vers la recherche large `search`
- Pas de FTS, pas de tri configurable et pas de recherche metadata globale multi-plugins dans ce lot

#### Lot 5.12.1 - Correctif livré

- Recherche `search` explicitement insensible à la casse simple
- Recherche legacy `title` explicitement insensible à la casse simple
- Filtres `filterable` text, textarea et select insensibles à la casse simple
- Filtres checkbox, number, rating et date conservés stricts
- Post-filtrage frontend aligné sur les mêmes règles
- Limitation restante : pas de normalisation complète des accents ou de l'Unicode

#### Lot 5.12.2 - Correctif livré

- Fiche item améliorée côté frontend sans changement backend
- Chargement du schéma plugin pour présenter les métadonnées
- Labels de métadonnées issus du schéma plugin
- Métadonnées affichées dans l'ordre du schéma plugin
- Description affichée dans une section dédiée avec fallback si vide
- Métadonnées inconnues conservées dans une section `Autres informations`
- Galerie média conservée sous la fiche item

#### Lot 5.13 - Livré

- Parsing backend des filtres metadata selon le type du schéma plugin
- Rejet des filtres invalides avec réponse 400
- Filtres text, textarea et select insensibles à la casse simple
- Validation des options déclarées pour les filtres select
- Filtres checkbox limités à `true` et `false`, convertis en `1` ou `0` côté backend
- Filtres number et rating comparés numériquement
- Filtres rating bornés par `min`/`max`, avec défaut 0..20
- Filtres date validés au format `YYYY-MM-DD`
- Suppression du post-filtrage frontend pour les types gérés par le backend
- Pas de filtres range dans ce lot

#### Lot 5.14 - Livré

- Pagination backend de `GET /api/items` via `page` et `pageSize`
- Valeurs par défaut : `page=1`, `pageSize=24`
- Validation de `page >= 1` et `pageSize` entre 1 et 100, avec réponse 400 en cas de valeur invalide
- Réponse enveloppée avec `items`, `total`, `page`, `pageSize` et `totalPages`
- Requête `COUNT(*)` alignée sur les filtres, la recherche et le plugin courant
- Recherche `search`, recherche legacy `title` et filtres metadata `filterable` combinables avec la pagination
- Pagination frontend dans les listes items avec total, page courante et navigation `Précédent` / `Suivant`
- Retour à la première page lors des recherches, changements de filtres et réinitialisations
- Retour automatique à une page valide si la page courante devient vide après suppression ou changement externe
- Aucun changement de schéma SQLite, tri configurable, FTS ou infinite scroll dans ce lot

#### Lot 5.15 - Livré

- Tri configurable de `GET /api/items` via `sort` et `direction`
- Valeurs par défaut : `sort=title`, `direction=asc`
- Le tri par défaut utilise `title`, champ obligatoire commun à tous les items
- Champs système triables : `title`, `created_at`, `updated_at`
- Le tri `sort=created_at`, `direction=desc` reste disponible explicitement
- Champs metadata triables depuis le schéma plugin courant pour les types text, textarea, select, date, number, rating et checkbox
- Validation stricte de `sort` et `direction`, avec réponse 400 en cas de valeur invalide
- Rejet du tri metadata sans plugin connu
- Tri appliqué avant `LIMIT` / `OFFSET`, avec `COUNT(*)` inchangé
- Tie-breaker stable via `id`
- Recherche `search`, recherche legacy `title`, filtres metadata `filterable` et pagination combinables avec le tri
- Pagination frontend conservant le tri sélectionné
- Sélecteurs frontend `Trier par` et `Ordre`
- Retour à la première page lors d'un changement de tri
- Fallback frontend vers `sort=title`, `direction=asc` si un tri metadata devient invalide après changement de schéma
- Aucun changement de schéma SQLite, propriété plugin `sortable`, tri multi-colonnes, FTS/ranking ou vue liste dense dans ce lot

#### Lot 5.16 - Livré

- Vue liste dense alternative dans les listes items
- Vue cartes conservée comme affichage par défaut
- Bascule frontend locale `Cartes` / `Liste`
- Liste dense basée sur les mêmes données paginées déjà chargées
- Colonnes MVP : `Titre`, champs metadata de `list.highlightedFields` et action `Ouvrir`
- Réutilisation du formatage metadata frontend partagé
- Valeurs metadata vides affichées `—`
- Recherche, filtres, tri et pagination compatibles avec la vue liste
- Préférences d'affichage existantes réutilisées sans nouvelle préférence `table.columns`
- Pas de vue de données avancée : aucun tri par clic header, redimensionnement de colonnes, édition inline, sélection de colonnes CSV ou configuration dédiée des colonnes
- Aucun changement backend, API, schéma SQLite, plugins ou thumbnails en liste dans ce lot

#### Lot 5.16.1 - Livré

- Contexte des listes items conservé dans la query frontend
- Paramètres conservés : recherche, filtres dynamiques, page, taille de page, tri, direction et mode `Cartes` / `Liste`
- Liens `Ouvrir` depuis les cartes et la liste dense transmettant un `returnTo`
- Retour depuis la fiche item vers la liste avec le contexte conservé
- Libellé de retour fiche item stabilisé sur `Retour à la liste`
- Suppression depuis la fiche conservant le contexte de liste et ajoutant `deleted=1`
- Aucun changement backend, API, schéma SQLite, plugins, préférences d'affichage, pagination ou contrat de tri dans ce lot

### Lot 6.x

#### Lot 6.0.1 - Livré

- Exécution locale via `docker compose up --build`, `docker-compose up --build` ou `podman-compose up --build`
- Service backend Node 22 lancé avec `node src/server.js`
- Port backend interne 3000, configurable côté hôte via `BACKEND_PORT`
- Chemins backend configurables via `DATA_DIR` et `PLUGINS_DIR`
- Base SQLite dérivée de `DATA_DIR` via `collection-manager.db`
- Volume persistant `./backend/data:/app/data:Z`
- Plugins montés via `./backend/plugins:/app/plugins:ro,Z`
- Service frontend construit avec Vite et servi en statique par Nginx
- Proxy Nginx `/api` vers `http://backend:3000`
- Port frontend public configurable via `FRONTEND_PORT`, avec défaut 8080
- Compatibilité Podman rootless / Bazzite / SELinux validée avec labels de volumes `:Z`
- `.env` requis avec `JWT_SECRET` et `ADMIN_PASSWORD`
- Documentation de déploiement local dans `docs/deployment-docker.md`
- GitHub Actions, GHCR, HTTPS et reverse proxy externe non inclus dans ce lot

#### Lot 6.0.2 - Livré

- Workflow GitHub Actions `.github/workflows/ci.yml`
- Déclenchement sur push et pull request
- Jobs sur `ubuntu-latest`
- Node 22 pour les jobs backend et frontend
- Job backend :
  - `npm ci` dans `backend/`
  - `node --check` sur les fichiers JavaScript de `backend/src`
- Job frontend :
  - `npm ci` dans `frontend/`
  - `npm exec vite build`
- Job Docker après succès backend et frontend :
  - `docker build -t collectionmgnt-backend ./backend`
  - `docker build -t collectionmgnt-frontend ./frontend`
- Aucune publication d'image dans ce lot
- Pas de release GitHub, pas de GHCR, pas de Docker Hub
- Aucun test applicatif n'est lancé actuellement, faute de script `test` existant

#### Lot 6.0.3 - Livré

- Workflow GitHub Actions `.github/workflows/publish.yml`
- Publication automatique sur GitHub Container Registry
- Déclenchement sur push `main`, tags `v*` et `workflow_dispatch`
- Permissions `contents: read` et `packages: write`
- Vérifications backend et frontend avant publication
- Images publiées :
  - `ghcr.io/<owner>/collectionmgnt-backend`
  - `ghcr.io/<owner>/collectionmgnt-frontend`
- Propriétaire GitHub normalisé en minuscules pour les noms d'images
- Tags publiés :
  - `latest` uniquement depuis `main`
  - tag Git exact uniquement depuis les tags `v*`
  - `sha-*` pour chaque publication
- Pas de Docker Hub
- Pas de GitHub Release
- Pas de multi-arch, cosign, SBOM ou scan sécurité dans ce lot

### Lot 7.x

#### Lot 7.0.1 - Livré

- API backend persistante de préférences d'affichage par plugin
- Routes protégées :
  - `GET /api/plugins/:pluginId/display-preferences`
  - `PUT /api/plugins/:pluginId/display-preferences`
  - `DELETE /api/plugins/:pluginId/display-preferences`
- Stockage dans la table SQLite `settings` avec les clés `displayPreferences.<pluginId>`
- Calcul de préférences par défaut depuis le schéma plugin
- Validation stricte des noms de champs depuis le schéma plugin
- Densités acceptées : `comfortable` et `compact`
- Rejet des champs inconnus et des densités invalides avec réponse 400
- Suppression des préférences pour revenir aux valeurs par défaut
- Aucun changement des fichiers `fields.json`
- Aucun changement frontend dans ce lot

#### Lot 7.0.2 - Livré

- Frontend branché sur `GET /api/plugins/:pluginId/display-preferences`
- Cartes items pilotées par `list.highlightedFields`
- Cartes items affichant les labels du schéma plugin quand les préférences et le schéma sont disponibles
- Densité des cartes appliquée via `list.density`
- Fiche détail pilotée par `details.fieldOrder`
- Champs masqués en fiche détail via `details.hiddenFields`
- Section `Autres informations` conservée pour les métadonnées inconnues du schéma plugin
- Formatage des métadonnées partagé côté frontend
- Aucun panneau d'édition, de sauvegarde ou de reset des préférences dans ce lot

#### Lot 7.0.3 - Livré

- Bouton `Affichage` dans la liste d'une collection
- Panneau inline d'édition des préférences d'affichage
- Édition des champs mis en avant sur les cartes via `list.highlightedFields`
- Réordonnancement par boutons `Monter` et `Descendre`
- Édition de la densité des cartes via `list.density`
- Édition de l'ordre de fiche détail via `details.fieldOrder`
- Masquage de champs en fiche détail via `details.hiddenFields`
- Sauvegarde via `PUT /api/plugins/:pluginId/display-preferences`
- Réinitialisation via `DELETE /api/plugins/:pluginId/display-preferences`
- Aucun drag & drop, format rating/date avancé, champ principal alternatif ou vue liste dense dans ce lot

### Lot 8.x

#### Lot 8.0.1 - Livré

- Export métier JSON applicatif global via `GET /api/exports/application.json`
- Export métier JSON par collection via `GET /api/exports/collections/:pluginId.json`
- Export CSV simple par collection via `GET /api/exports/collections/:pluginId.csv`
- Routes export protégées par JWT
- Format JSON natif versionné `collectionmgnt.native-export`, `format_version=1`
- Export des plugins, schémas plugin, settings applicatifs non sensibles, items et métadonnées média
- Médias référencés sans fichiers physiques, avec `includes_media_files=false`
- CSV collection basé sur les colonnes système puis les champs metadata `field.name` dans l'ordre du schéma plugin
- Téléchargement frontend CSV disponible depuis la liste d'une collection
- Export JSON collection conservé via API, sans exposition dans l'interface collection depuis le Lot 9.0.4.1
- Aucun import, aucune restauration, aucun ZIP, aucun dump SQLite, aucun changement de schéma SQLite ou de plugins

#### Lot 8.1.1 - Livré

- Audit média global lecture seule via `GET /api/admin/media-audit`
- Route protégée par JWT
- Détection des entrées `media` incohérentes avec les items ou les fichiers attendus
- Détection des fichiers et dossiers orphelins sous `DATA_DIR/uploads/items`
- Rapport JSON structuré avec résumé, issues DB, issues disque, candidats de cleanup et warnings
- Chemins du rapport relatifs à `DATA_DIR`, sans exposition de chemins absolus
- Aucun cleanup, aucune suppression de fichier, aucune modification DB, aucune régénération thumbnail/image et aucun changement de schéma SQLite

### Lot 9.x

#### Lot 9.0.1 - Livré

- Fondation Administration via une page frontend protégée `/admin`
- Accès Administration ajouté dans l'ancienne navigation d'accueil sans refonte de la navigation globale
- Section Données avec action `Exporter toutes les données` via `GET /api/exports/application.json`
- Section Médias avec lancement manuel de l'audit média lecture seule via `GET /api/admin/media-audit`
- Affichage du résumé du dernier audit média exécuté dans la session de page
- Section Système avec version application et compteurs plugins, plugins actifs, items et médias
- Nouvelle route protégée read-only `GET /api/admin/system-summary`
- Résumé système basé uniquement sur des `SELECT COUNT(*)`
- Aucun rôle utilisateur, aucune gestion utilisateurs, aucun import JSON, aucun cleanup média, aucune sauvegarde ZIP et aucun changement de schéma SQLite

#### Lot 9.0.2 - Livré

- Action `Importer des données` depuis la section Données de la page Administration
- Route protégée `POST /api/admin/imports/native-json`
- Upload multipart avec champ `file` et limite MVP de 10 MB
- Validation du format `collectionmgnt.native-export`, `format_version=1` et `scope=application|collection`
- Mode unique `add_only`
- Création de nouveaux items avec nouveaux IDs, sans restauration des `source_id`
- Aucun remplacement, aucune suppression et aucune fusion complexe
- Plugins absents ignorés avec warning
- Plugins désactivés importés avec warning
- Validation des champs connus avec le schéma local courant
- Champs metadata inconnus conservés avec warning
- Métadonnées média ignorées avec warning, sans création de lignes `media` et sans restauration de fichiers physiques
- Rapport d'import avec compteurs, items créés, items ignorés, erreurs et warnings
- Aucun import CSV, aucune sauvegarde ZIP, aucune restauration médias physiques et aucun changement de schéma SQLite

#### Lot 9.0.3 - Livré

- Cleanup média manuel guidé depuis la section Médias de la page Administration
- Routes protégées `POST /api/admin/media-cleanup/preview` et `POST /api/admin/media-cleanup/execute`
- Preview obligatoire avant exécution, avec IDs déterministes générés côté backend
- Exécution limitée aux IDs de candidats, avec recalcul du preview côté backend avant suppression
- Candidats nettoyables limités à `FILE_WITHOUT_MEDIA_ROW`, `UNEXPECTED_FILE`, `ITEM_FOLDER_WITHOUT_ITEM` et `EMPTY_ITEM_FOLDER`
- Suppression uniquement sous `DATA_DIR/uploads/items`, sans chemin libre accepté depuis le frontend
- Aucun changement DB, aucune suppression de ligne DB, aucun item supprimé, aucune ligne `media` supprimée, aucune suppression de média référencé DB, aucune régénération thumbnail/image et aucune réparation DB
- UI avec liste de candidats sûrs, sélection manuelle, confirmation `window.confirm` et rapport supprimés/ignorés/erreurs
- Aucun changement de schéma SQLite, aucune sauvegarde ZIP et aucun cleanup automatique

#### Lot 9.0.4 - Livré

- Sauvegarde ZIP complète téléchargeable depuis la page Administration
- Route protégée `GET /api/admin/backup.zip`
- Archive streamée avec `manifest.json`, copie SQLite cohérente, médias physiques, plugins si disponibles et export JSON natif global
- Copie SQLite créée via `db.backup()` avant archivage, sans zipper directement le fichier DB vivant
- Médias inclus sous `media/uploads/items` depuis `DATA_DIR/uploads/items`
- Export JSON natif global inclus sous `exports/application.json`, sans modification du contrat export existant
- Manifest `collectionmgnt.full-backup`, `format_version=1`, sans chemins absolus et avec compteurs, tailles et warnings
- ZIP traité comme sensible car il contient la DB complète, incluant les utilisateurs et `password_hash`
- Aucun changement de schéma SQLite, aucune restauration ZIP, aucun cloud, aucun stockage distant, aucune planification, aucun incrémental et aucun historique/rétention

#### Lot 9.0.4.1 - Livré

- Option `Export JSON` retirée de l'interface collection
- Menu d'export collection remplacé par une action unique `Export CSV`
- Téléchargement CSV collection existant conservé
- Export JSON collection conservé via `GET /api/exports/collections/:pluginId.json`
- Administration inchangée : export/import natif JSON et sauvegarde ZIP restent dans l'Administration
- Aucun changement backend, API, SQLite ou Administration

### Lot 10.x

#### Lot 10.0.1 - Livré

- Layout global pour les pages authentifiées
- Barre supérieure persistante avec marque `CollectionMgnt` cliquable vers Collections
- Menu utilisateur avec avatar avec initiale, Administration, `Mon compte` à venir et Déconnexion
- Login sans redirect explicite vers `/collections`
- Route `/dashboard` conservée en compatibilité et redirigée vers `/collections`
- Dashboard supprimé comme écran intermédiaire du parcours utilisateur
- Pas de breadcrumb sur les pages racines Collections et Administration
- Breadcrumbs conservés sur les pages hiérarchiques, sans niveau Dashboard
- Aucun changement backend, API, SQLite, rôles utilisateur ou page profil fonctionnelle

#### Lot 10.1.0 - Livré

- Fondations responsive frontend posées sans refonte mobile complète
- Convention de breakpoints clarifiée autour de mobile jusqu'à 639px, tablette de 640px à 899px et desktop à partir de 900px
- Paddings globaux du layout et de la top bar ajustés pour desktop, tablette et mobile
- Menu utilisateur conservé dans le viewport mobile avec dropdown utilisable sur petit écran
- Grille Collections légèrement assouplie sur mobile pour éviter des cartes trop massives
- Toolbar des listes items renforcée pour tablette/mobile : recherche pleine largeur, contrôles en grille adaptée et boutons tactiles
- Mode liste items conservé en table sur desktop/tablette large et rendu en lignes compactes verticales sur mobile
- Panneau de préférences d'affichage et formulaires dynamiques améliorés pour les actions tactiles
- Header de fiche item sécurisé contre les titres longs qui compriment les actions
- Administration rendue plus lisible sur tablette/mobile, avec grille deux colonnes réservée au desktop
- Aucun changement backend, API, SQLite, métier, captures README ou framework UI

#### Lot 10.1.1 - Livré

- Fondation de tests automatisés backend avec le Node Test Runner natif
- Helper de test Fastify avec DB SQLite temporaire, `DATA_DIR` temporaire, secret JWT de test, admin de test et plugins synchronisés
- Tests d'intégration backend via Fastify `inject`
- Couverture MVP : auth login succès/échec, route protégée sans token, résumé système admin, export JSON applicatif, import natif invalide, backup ZIP smoke test, audit média, cleanup média preview/execute et bootstrap app
- Scripts backend `npm run check:syntax` et `npm test`
- CI GitHub Actions renforcée : syntax backend, tests backend, build frontend, `git diff --check` et build Docker conservé
- Documentation des commandes locales et du workflow PR
- Aucun changement backend fonctionnel, API, SQLite métier, UX, Playwright, Vitest frontend, Cypress, Sonar, Codecov ou couverture de code

#### Lot 10.2.0 - Plugin Metadata Enrichment - Livré

- Enrichissement des plugins standards `books`, `movies`, `consoles` et `others`
- Préparation d'un futur dataset de démonstration sans créer le dataset dans ce lot
- Champs `books` enrichis : `author`, `genre`, `publisher`, `publication_date`, `read`, `rating`
- Champs `movies` enrichis : `director`, `genre`, `format`, `release_date`, `watched`, `rating`
- Champs `consoles` enrichis : `manufacturer`, `type`, `region`, `release_date`, `condition`
- Champs `others` enrichis : `category`, `maker`, `acquired_date`, `condition`, `location`, `favorite`
- Utilisation uniquement des types plugin déjà supportés : text, select, date, checkbox et rating
- Aucun champ ISBN, EAN, UPC ou code-barres ajouté
- Aucun changement backend, API, SQLite, frontend, média de démonstration ou dataset de démonstration dans ce lot

#### Lot 10.2.1 - Demo Dataset - Livré

- Dataset officiel de démonstration disponible dans `demo/datasets/collectionmgnt-demo-v1.json`
- Documentation d'import disponible dans `demo/README.md`
- Dataset au format JSON natif CollectionMgnt `collectionmgnt.native-export`, `format_version=1`
- Scope applicatif `application` avec `includes_media_files=false`
- 5 plugins existants inclus : `games`, `books`, `movies`, `consoles` et `others`
- 5 schémas plugin inclus pour documenter les champs exportés
- 5 collections incluses : jeux vidéo, livres, films, consoles et objets divers
- 94 items au total :
  - 36 jeux vidéo
  - 18 livres
  - 18 films
  - 12 consoles
  - 10 objets divers
- Données prévues pour tester recherche, filtres, tri, pagination, vues cartes/liste, export CSV, export JSON, import JSON, backup et responsive
- Cas de test inclus avec accents, apostrophes, guillemets, virgules, retours à la ligne, titres longs et caractères spéciaux
- Quelques métadonnées commencent volontairement par `=`, `+`, `-` ou `@` pour vérifier la neutralisation CSV Formula Injection
- Aucun média physique inclus
- Tableaux `media` vides
- Aucun script générateur ajouté au dépôt
- Aucun dataset multiple ajouté
- Aucun changement backend, frontend, API, SQLite, plugins, format export/import ou média dans ce lot

#### Lot 10.2.2 - Demo Media Pack - Livré

- Script de pack média de démonstration disponible dans `demo/scripts/install-demo-media.mjs`
- Documentation média disponible dans `demo/media/README.md`
- Le script importe le dataset officiel via `POST /api/admin/imports/native-json`
- Utilisation du rapport d'import pour récupérer les nouveaux IDs item via `createdItems`
- Génération d'une image PNG principale pour chaque item importé
- Images générées en mémoire, sans fichier image versionné dans le dépôt
- Style uniforme sans image sous copyright : fond coloré déterministe, type de collection, titre et métadonnées courtes
- Upload des images via `POST /api/media`
- Chaque image uploadée est marquée `is_primary=true`
- Paramètres CLI supportés : `--base-url`, `--username`, `--password`, `--dataset`, `--skip-existing` et `--force`
- Aucun stockage d'identifiants ou de token JWT dans un fichier
- Aucune écriture directe dans SQLite
- Aucune écriture directe dans `DATA_DIR/uploads`
- Aucun backup ZIP de démonstration
- Aucun scénario QA média orphelin dans ce lot
- Aucune dépendance ajoutée
- Aucun changement backend, frontend, API, SQLite, plugins, dataset JSON ou routes média dans ce lot

### Sécurité

#### Lot sécurité RBAC / rate limit / CSV - Livré

- Modèle de rôles minimal `admin` / `user` sur la table `users`
- Migration SQLite ajoutant `users.role` avec `DEFAULT 'user'` et `CHECK(role IN ('admin', 'user'))`
- Préservation de l'accès administrateur lors de la migration via `ADMIN_USERNAME`, ou premier utilisateur existant en fallback
- Premier administrateur créé avec `role=admin`
- Rôle inclus dans le JWT, la réponse de login et `/api/auth/me`
- Middleware admin dédié avec distinction `401` sans token ou token invalide, `403` pour utilisateur authentifié non admin
- Routes admin réservées aux admins : résumé système, backup ZIP, import JSON natif, audit média et cleanup média
- Export applicatif global `GET /api/exports/application.json` réservé aux admins
- Exports CSV de collection conservés pour les utilisateurs authentifiés
- Protection de `POST /api/auth/login` par rate limit Fastify : 5 tentatives par fenêtre de 5 minutes, puis `429`
- Neutralisation anti-formule appliquée uniquement aux exports CSV pour les cellules commençant par `=`, `+`, `-` ou `@`
- Tests backend ajoutés pour RBAC admin/user/sans token, rate limit login et sécurisation CSV
- Aucun changement du format JSON natif, aucun changement du format backup ZIP, aucune restauration, aucune gestion utilisateurs avancée, aucune matrice de permissions fine

## Jalons long terme

### v1.0

#### Première version stable

##### Inclus

- Authentification
- Plugins déclaratifs
- Collections dynamiques
- Recherche avancée
- Médias
- Sauvegardes
- Internationalisation
- Plugins officiels

##### Compatible

- Synology NAS
- Docker Compose

---

### Post-v1.0

#### v0.1 - Fondation

##### Objectif

Poser les bases techniques du projet.

###### Backend

- Fastify
- SQLite
- JWT
- Structure plugins

###### Frontend

- Vue 3
- Vite
- Vue Router
- Pinia

###### Infrastructure

- Docker
- Docker Compose
- Synology compatible

###### Livrables

- Authentification
- Structure projet
- Chargement plugins

---

#### v0.2 - Plugins et Collections

##### Objectif

Créer le moteur de collections générique.

###### Fonctionnalités

- CRUD générique
- Plugins déclaratifs
- Champs dynamiques
- Validation dynamique

###### Livrables

- Gestion collections
- Gestion plugins
- Renommage plugins

---

#### v0.3 - Recherche

##### Objectif

Recherche puissante sans code spécifique.

###### Fonctionnalités

- Recherche globale
- Recherche avancée
- Filtres automatiques
- Facettes

###### Livrables

- Multi-collections
- Recherche configurable

---

#### v0.4 - Médias

##### Objectif

Gestion complète des images.

###### Fonctionnalités

- Upload
- Conversion WebP
- Miniatures
- Galerie

###### Livrables

- Images multiples
- Image principale

---

#### v0.5 - Sauvegardes

##### Objectif

Sécuriser les données.

###### Fonctionnalités

- Sauvegarde ZIP
- Restauration ZIP
- Sauvegarde automatique

###### Livrables

- Export complet
- Politique de rétention

---

#### v0.6 - Internationalisation

##### Objectif

Support multilingue.

###### Langues

- Français
- Anglais

###### Fonctionnalités

- Changement de langue
- Préférences utilisateur

---

#### v0.7 - Plugins officiels

##### Plugins fournis

###### Jeux Vidéo

- Plateforme
- Genre
- Éditeur

###### Films

- Réalisateur
- Format
- Année

###### Livres

- Auteur
- ISBN
- Éditeur

###### Consoles

- Fabricant
- Génération

###### Autre

- Champs génériques

---

#### v0.8 - Prêts et Tags

##### Fonctionnalités

- Gestion des prêts
- Historique
- Tags globaux

---

#### v0.9 - Stabilisation

##### Qualité

- Optimisation SQLite
- Optimisation recherche
- Tests automatisés
- Documentation complète

---
