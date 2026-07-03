# Roadmap - CollectionMgnt

## Vision

Collection Manager est une plateforme auto-hébergée de gestion de collections basée sur un moteur de plugins déclaratifs.

L'objectif est de permettre à un utilisateur de créer et gérer n'importe quel type de collection sans développement spécifique.

## État actuel

- Version actuelle : v0.12-lot10.5.4.1.
- Dernier lot livré : Lot 10.5.4.1 - Update / Rollback Foundations.

Capacités disponibles :

- Authentification JWT avec modèle de rôles minimal `admin` / `user`.
- Validation stricte de `JWT_SECRET` au démarrage.
- En-têtes HTTP de sécurité via Helmet avec configuration prudente.
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
- Playwright E2E MVP côté frontend avec Chromium, dataset de démonstration et `DATA_DIR` temporaire.
- CI GitHub Actions, CodeQL, Semgrep, Dependabot, publication GHCR multi-architecture et builds Docker/Podman documentés.
- Base Compose Synology disponible avec images GHCR `linux/amd64` et `linux/arm64`, volume persistant explicite configurable et backend non exposé sur l'hôte.
- Guide de déploiement Synology DSM / Container Manager disponible.
- Guide HTTPS / Reverse Proxy DSM disponible, avec recommandation de proxy vers le frontend uniquement.
- Guide de mise à jour et rollback disponible, avec sauvegarde pré-update du volume persistant recommandée.

Limites majeures connues :

- Restauration ZIP complète non livrée.
- Rollback automatisé non livré.
- Import CSV CollectionMgnt et import CSV externe non livrés.
- Support backend des types plugin avancés restant à livrer : multiselect, url, email.
- Gestion utilisateurs avancée, permissions fines et page profil non livrées.
- Audit sécurité conteneur et hardening Docker encore à traiter.
- Scénarios avancés d'accès distant, VPN/tunnel et guides Caddy/Traefik/Nginx dédiés encore à traiter.
- Recherche globale multi-collections, FTS, normalisation Unicode et filtres range non livrés.
- Tests frontend unitaires, E2E exhaustifs, couverture de code et tooling qualité avancé non livrés.

## Prochaines priorités

### Haute priorité

- Restauration ZIP guidée.
- Import CSV CollectionMgnt.
- Amélioration des rapports et historiques d'administration.

### Priorité moyenne

- Import CSV externe depuis une autre application de gestion de collection.
- Support backend des types plugin avancés restant à livrer : multiselect, url, email.
- Gestion utilisateurs avancée et permissions fines.

### Plus tard

- API publique.
- Installation plugins ZIP.
- Catalogue de plugins.
- Recherche globale multi-collections et recherche approximative.

## Sécurité

### Livré

- Lot sécurité RBAC / rate limit / CSV livré.
- Lot 10.3.0 Security & CI Hardening livré : CodeQL, Dependabot, Helmet et validation stricte de `JWT_SECRET`.
- Lot 10.3.1 Migration `@fastify/jwt` livré : dette sécurité `fast-jwt` traitée par mise à jour vers `@fastify/jwt` `10.1.0`.
- Lot 10.3.2 Trivy Security Scanning livré : scans dépendances et images conteneur en mode non bloquant.
- Lot 11.0.1 Semgrep SAST GitHub Action livré : scan SAST complémentaire à CodeQL en mode observation non bloquant.
- Lot 10.5.3 HTTPS / Reverse Proxy DSM livré : documentation HTTPS DSM avec backend non exposé.
- Détail complet conservé dans `Historique des lots livrés > Sécurité`.

### Travaux futurs prioritaires

Priorité élevée :

- Journalisation des événements sensibles :
  - connexion réussie
  - connexion échouée
  - téléchargement backup
  - import
  - media cleanup

Priorité moyenne :

- Rate limiting complémentaire :
  - backup
  - import
  - upload
- Politique minimale de mot de passe.

### Tooling / CI sécurité

- Dependabot livré pour backend npm, frontend npm et GitHub Actions.
- CodeQL livré pour l'analyse JavaScript.
- Semgrep livré comme scan SAST complémentaire à CodeQL, en mode observatoire non bloquant et sans obligation de `SEMGREP_APP_TOKEN`.
- Connexion future possible à Semgrep App via le secret `SEMGREP_APP_TOKEN`.
- Trivy livré en mode observatoire non bloquant pour les dépendances backend/frontend et les images conteneur.
- `npm audit` en CI.
- Politique de blocage automatique sur vulnérabilités à définir dans un lot futur.

### Infrastructure sécurité

- Docker hardening avec utilisateur non privilégié.
- Monitoring basique des événements sensibles.

#### HTTPS / TLS et accès distant sécurisé

Objectif :

- Permettre un déploiement sécurisé de CollectionMgnt accessible depuis smartphone, tablette et postes distants.

Contexte :

- Les usages mobiles deviennent une cible importante du produit.
- Les futures fonctionnalités d’acquisition assistée reposeront potentiellement sur l’utilisation de l’appareil photo.
- Les accès distants deviennent plus fréquents à mesure que le produit mûrit.

Travaux futurs envisagés :

- Documentation complémentaire de déploiement HTTPS hors DSM.
- Guides de configuration pour :
  - Caddy
  - Traefik
  - Nginx
- Documentation reverse proxy hors DSM.
- Validation du fonctionnement derrière un reverse proxy TLS.
- Vérification correcte des en-têtes proxy.
- Recommandations TLS modernes.
- Documentation des scénarios d’accès distant :
  - VPN
  - Tailscale
  - reverse proxy exposé sur Internet
- Validation des usages smartphone et tablette via HTTPS.
- Vérification de compatibilité des futures fonctionnalités caméra dans un contexte sécurisé.

Livré :

- Guide Synology DSM HTTPS / Reverse Proxy avec règle recommandée vers le frontend uniquement.
- Rappel que le backend reste non exposé et que `/api` est relayé par le Nginx frontend.

Principes :

- CollectionMgnt ne prévoit pas d’embarquer directement la gestion TLS dans l’application.
- Le déploiement recommandé repose sur un reverse proxy externe.
- Les fonctionnalités mobiles doivent fonctionner correctement dans un contexte HTTPS standard.

Priorité :

- Moyenne à court terme.
- Élevée avant la livraison des fonctionnalités de scan mobile / acquisition assistée.

Lien roadmap :

- Voir aussi `Backlog produit > Acquisition assistée`, car HTTPS devient un prérequis pratique pour certaines fonctionnalités mobiles.

## Dette technique

### Backend

- Support backend des types plugin avancés restant à livrer : multiselect, url, email.
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
- Extension de la couverture Playwright.
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

### Acquisition assistée

#### Acquisition assistée / pré-remplissage automatique

Objectif :

- Réduire fortement le temps nécessaire à la création d’un item grâce à l’identification automatique et au pré-remplissage des métadonnées.

Phase 1 — Identifiants standard :

- Fondations identifiants ISBN / EAN / UPC livrées dans les plugins standards pertinents ; lookup ISBN livres livré, lookup code-barres et scan restent futurs.
- Validation et stockage des identifiants.
- Ne pas se limiter à un simple champ texte si un type dédié devient pertinent.

Phase 2 — Scan mobile et tablette :

- Utilisation de l’appareil photo depuis un téléphone ou une tablette.
- Détection automatique des codes-barres.
- Remplissage automatique du champ ISBN / EAN / UPC détecté.

Phase 3 — Lookup livres :

- Premier cas cible recommandé : livres.
- Recherche via Open Library et/ou Google Books.
- Pré-remplissage possible :
  - titre
  - auteur
  - éditeur
  - date de publication
  - couverture

Phase 4 — Architecture fournisseurs :

- Architecture backend extensible livrée via `AcquisitionService`, registre provider et providers isolés.
- Ne pas verrouiller CollectionMgnt sur un seul service externe.
- Gérer les erreurs, quotas, indisponibilités et différences de qualité des sources.

Phase 5 — Extension progressive :

- Étendre ensuite aux jeux vidéo, films, consoles et autres collections.
- Création semi-automatique avec validation utilisateur avant enregistrement.

#### Lot 11.1.1 - Frontend ISBN Lookup - Livré

- Bouton `Rechercher` disponible sur le champ ISBN des livres.
- Lookup via le backend CollectionMgnt uniquement, sans appel provider direct depuis le frontend.
- Suggestions provider-agnostic affichées dans le formulaire.
- Pré-remplissage local après action explicite `Utiliser`.
- Aucun écrasement automatique des champs déjà renseignés, sauf normalisation de `metadata.isbn`.
- Aucune sauvegarde automatique et aucun import d'image dans ce lot.

#### Lot 11.2 - Acquisition Orchestration Backend - Livré

- Couche `AcquisitionService` ajoutée entre les routes acquisition et les providers.
- Routes acquisition conservées sans changement d'API publique.
- Validation métier ISBN, normalisation, choix provider et construction `{ query, results }` centralisés côté service.
- `ProviderRegistry` conservé comme inventaire/sélection des providers.
- Aucun fallback actif, aucun cache et aucun provider supplémentaire dans ce lot.

Contraintes :

- Fonctionnalité optionnelle.
- Validation utilisateur obligatoire avant création définitive.
- Compatibilité desktop, tablette et mobile.
- Aucune dépendance obligatoire à un fournisseur externe.
- Respect de la confidentialité : ne pas envoyer plus de données que nécessaire aux services externes.
- Images/couvertures récupérées seulement après validation ou selon un comportement clairement documenté.

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

- Support backend des types plugin avancés restant à livrer : multiselect, url, email.
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
- Champs metadata triables depuis le schéma plugin courant pour les types text, textarea, select, isbn, barcode, date, number, rating et checkbox
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
- Aucun champ ISBN, EAN, UPC ou code-barres ajouté dans ce lot historique ; les fondations identifiants sont traitées ensuite dans le lot Assisted Acquisition Foundations
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
- Mode par défaut prudent : détection d'un dataset déjà présent, sans réimport d'une nouvelle copie
- Mode `--attach-existing` pour compléter les images manquantes d'un dataset déjà importé manuellement
- Progression affichée pendant la connexion, la détection/import, la recherche des items, la vérification des médias et l'upload
- Génération d'une image PNG principale pour chaque item importé
- Images générées en mémoire, sans fichier image versionné dans le dépôt
- Style uniforme sans image sous copyright : fond coloré déterministe, type de collection, titre et métadonnées courtes
- Upload des images via `POST /api/media`
- Chaque image uploadée est marquée `is_primary=true`
- Paramètres CLI supportés : `--base-url`, `--username`, `--password`, `--dataset`, `--attach-existing`, `--force` et compatibilité `--skip-existing`
- Aucun stockage d'identifiants ou de token JWT dans un fichier
- Aucune écriture directe dans SQLite
- Aucune écriture directe dans `DATA_DIR/uploads`
- Aucun backup ZIP de démonstration
- Aucun scénario QA média orphelin dans ce lot
- Aucune dépendance ajoutée
- Aucun changement backend, frontend, API, SQLite, plugins, dataset JSON ou routes média dans ce lot

#### Lot 10.3.0 - Security & CI Hardening - Livré

- Workflow CodeQL ajouté dans `.github/workflows/codeql.yml`
- Analyse CodeQL JavaScript sur push `main`, pull request et déclenchement manuel
- Dependabot ajouté dans `.github/dependabot.yml`
- Surveillance Dependabot hebdomadaire pour backend npm, frontend npm et GitHub Actions
- Regroupement des mises à jour mineures et patch Dependabot pour limiter le bruit
- Ajout de Helmet côté backend Fastify
- CSP stricte volontairement non activée dans ce lot
- En-têtes de sécurité HTTP activés avec configuration prudente : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` et `Permissions-Policy`
- Validation de `JWT_SECRET` au démarrage backend avec longueur minimale de 32 caractères
- Message d'erreur explicite si `JWT_SECRET` est absent ou trop faible
- Tests backend ajoutés pour les en-têtes de sécurité et la validation de `JWT_SECRET`
- Trivy non intégré dans ce lot pour éviter de fragiliser la CI
- Aucun changement métier, UX, API fonctionnelle, SQLite, OAuth, MFA, SSO, HTTPS embarqué, reverse proxy, monitoring, audit logs avancés ou CSP stricte

#### Lot 10.3.1 - Migration @fastify/jwt - Livré

- Migration backend de `@fastify/jwt` de `9.1.0` vers `10.1.0`
- Mise à jour transitive de `fast-jwt` de `5.0.6` vers `6.2.4`
- Dette sécurité `fast-jwt` / `@fastify/jwt` supprimée selon `npm audit --omit=dev`
- Payload JWT existant conservé : `id`, `role`, `username`
- Comportement existant conservé pour `fastify.jwt.sign(...)`, `request.jwtVerify()`, `request.user` et RBAC admin/user
- Aucun changement produit, API, frontend, SQLite, modèle de rôles, middleware RBAC ou refonte auth
- Tests backend existants conservés pour login, `/api/auth/me`, RBAC, routes admin, imports, exports, backup, media audit/cleanup et validation `JWT_SECRET`

#### Lot 10.3.2 - Trivy Security Scanning - Livré

- Workflow dédié `.github/workflows/trivy.yml`
- Déclenchement sur push `main`, pull request et déclenchement manuel
- Scan Trivy des dépendances backend npm via le répertoire `backend`
- Scan Trivy des dépendances frontend npm via le répertoire `frontend`
- Build local des images `collectionmgnt-backend:trivy` et `collectionmgnt-frontend:trivy`
- Scan Trivy des images conteneur backend et frontend construites par le workflow
- Mode initial non bloquant : `exit-code=0` et `continue-on-error`
- Rapports visibles dans les logs GitHub Actions
- Aucune politique CVSS, exception de sécurité, signature d'image, SBOM avancé, cosign, SLSA ou scan secrets dans ce lot

#### Lot 10.4.0 - Playwright E2E MVP - Livré

- Playwright ajouté côté frontend avec Chromium uniquement
- Configuration E2E disponible dans `frontend/playwright.config.js`
- Scénarios E2E MVP :
  - login admin
  - arrivée sur Collections
  - accès Administration
  - import du dataset officiel de démonstration
  - vérification des 94 items créés
  - ouverture de la collection Jeux Vidéo
  - ouverture d'une fiche item
  - retour sur Administration
- Backend E2E lancé localement sur `127.0.0.1:3100`
- Frontend Vite E2E lancé localement sur `127.0.0.1:4173`
- `DATA_DIR` temporaire utilisé pour ne pas dépendre d'une base locale existante
- `PLUGINS_DIR` configuré vers les plugins locaux du dépôt
- Proxy Vite `/api` configuré vers le backend E2E via `VITE_PROXY_TARGET`
- Job GitHub Actions `Playwright E2E` ajouté dans `.github/workflows/ci.yml`
- Scripts frontend ajoutés : `e2e`, `e2e:ui` et `e2e:install`
- Artefacts locaux Playwright ignorés par Git : `frontend/playwright-report/` et `frontend/test-results/`
- Media pack, screenshots E2E, tests multi-navigateurs, filtres, pagination détaillée, export, backup et scénarios exhaustifs hors périmètre de ce MVP

#### Lot 10.5.1 - Synology Compose Foundation - Livré

- Ajout de `deploy/compose.synology.yml` comme base de projet Synology Container Manager
- Compose basé sur les images GHCR prébuildées :
  - `ghcr.io/jplayout/collectionmgnt-backend:latest`
  - `ghcr.io/jplayout/collectionmgnt-frontend:latest`
- Services `backend` et `frontend` reliés par un réseau Docker interne dédié
- Frontend exposé sur le port hôte configurable `${FRONTEND_PORT:-8080}:80`
- Backend non exposé publiquement sur l'hôte Synology
- Volume persistant explicite et configurable `${COLLECTIONMGNT_DATA_DIR:-/volume1/docker/collectionmgnt/data}:/app/data`
- `DATA_DIR=/app/data` et `PLUGINS_DIR=/app/plugins` configurés côté backend
- `JWT_SECRET` obligatoire et documenté comme stable et long d'au moins 32 caractères
- `ADMIN_USERNAME` et `ADMIN_PASSWORD` configurables via variables d'environnement
- `restart: unless-stopped` ajouté aux deux services
- Aucun `build:`, aucun suffixe SELinux `:Z`, aucun montage de dossier plugins hôte par défaut
- Ajout de `deploy/README.md` avec rappels sur Container Manager, persistance, sauvegarde et HTTPS futur
- Aucun changement backend, frontend, API, SQLite, CI, reverse proxy HTTPS ou guide Synology complet dans ce lot

#### Lot 10.5.2 - Synology Deployment Guide - Livré

- Ajout de `docs/deployment/synology.md` comme guide de déploiement DSM / Container Manager
- Documentation des prérequis Synology : DSM compatible, Container Manager et accès administrateur DSM
- Documentation de la préparation du dossier persistant, avec `/volume1/docker/collectionmgnt/data` comme valeur par défaut configurable
- Documentation de la génération et conservation d'un `JWT_SECRET` fort et stable
- Documentation du choix de `ADMIN_USERNAME`, `ADMIN_PASSWORD` et `FRONTEND_PORT`
- Procédure d'import du compose Synology dans Container Manager
- Rappel de l'architecture frontend/backend : backend interne non exposé, API proxifiée par le frontend
- Vérifications documentées : accès web, connexion admin, API via `/api` et import du dataset de démonstration
- Persistance documentée pour SQLite, médias, thumbnails et backups
- Procédure de mise à jour simple : sauvegarde du volume, pull des images et redémarrage
- Dépannage documenté pour `JWT_SECRET`, port occupé, volume manquant, backend inaccessible et frontend inaccessible
- Limitations explicites : HTTPS, reverse proxy et accès mobile hors LAN hors périmètre
- Aucun changement backend, frontend, API, SQLite, CI, sécurité ou images Docker dans ce lot

#### Lot 10.5.2.1 - Multi-Architecture GHCR Images - Livré

- Publication GHCR migrée vers Docker Buildx dans `.github/workflows/publish.yml`
- Configuration QEMU via `docker/setup-qemu-action`
- Configuration Buildx via `docker/setup-buildx-action`
- Publication backend et frontend via `docker/build-push-action`
- Images GHCR publiées pour `linux/amd64` et `linux/arm64`
- Support des NAS Synology ARM64, dont Realtek RTD1293, via l'image `linux/arm64`
- Tags visibles conservés : `sha-*`, `latest` sur `main` et tag Git exact sur `v*`
- `linux/arm/v7` non supporté officiellement à ce stade
- Vérification post-merge recommandée avec `docker buildx imagetools inspect` sur les images backend et frontend `latest`

#### Lot 10.5.3 - HTTPS / Reverse Proxy DSM - Livré

- Ajout de `docs/deployment/synology-https-reverse-proxy.md` comme guide utilisateur HTTPS via Synology DSM Reverse Proxy
- Architecture recommandée documentée :
  - navigateur en HTTPS vers DSM Reverse Proxy
  - DSM vers le port frontend du NAS, par défaut `8080`
  - Nginx frontend vers le backend interne pour `/api`
- Backend conservé non exposé sur l'hôte Synology
- Documentation explicite de ne pas créer de règle DSM séparée pour `/api`
- Prérequis documentés : Container Manager, compose Synology déjà déployé, domaine, certificat DSM, ports `80`/`443`, firewall DSM/routeur et port frontend
- Étapes génériques documentées pour certificat DSM / Let's Encrypt et association au domaine CollectionMgnt
- Règle reverse proxy DSM recommandée documentée avec source HTTPS `collection.example.com:443` et destination HTTP `localhost:${FRONTEND_PORT}`
- Redirection HTTP vers HTTPS documentée comme recommandée lorsque DSM le permet
- Tests de validation documentés : accès HTTPS, refresh de page interne, login admin, import demo, upload image, médias, exports CSV/JSON, backup ZIP et accès mobile Wi-Fi/4G/5G
- Points de vigilance documentés : limites applicatives 10 MB, limites DSM possibles, gros backups, certificats autosignés déconseillés sur mobile, JWT en `sessionStorage` et `X-Forwarded-Proto` non bloquant actuellement
- Dépannage documenté pour page inaccessible, certificat invalide, 502, login impossible, API inaccessible, upload/import, backup interrompu et accès LAN OK mais mobile KO
- Liens ajoutés depuis la documentation Synology, `deploy/README.md`, l'état courant et le README
- Aucun changement backend, frontend, API, SQLite, Docker, compose, HSTS applicatif, Caddy, Traefik ou Nginx Proxy Manager

#### Lot 10.5.4.1 - Update / Rollback Foundations - Livré

- Ajout de `docs/deployment/update-rollback.md` comme guide officiel de mise à jour et rollback pour les déploiements auto-hébergés
- Documentation de l'objectif : mettre à jour CollectionMgnt en limitant le risque de perte de données
- Distinction documentée entre export JSON métier, backup ZIP applicatif et copie complète du volume persistant
- Tableau comparatif documenté pour les protections de données
- Checklist pré-update documentée : noter tag ou digest courant, télécharger backup ZIP, arrêter l'application, copier `DATA_DIR` et vérifier `JWT_SECRET` plus variables importantes
- Procédure Docker / Podman documentée pour pull ou rebuild, recréation des conteneurs et validation
- Procédure Synology Container Manager documentée avec conservation du volume et des variables du projet
- Validation post-update documentée : login, collections, items, médias, import/export, backup ZIP et HTTPS
- Rollback simple documenté vers image précédente
- Rollback complet documenté avec restauration du volume persistant et retour à l'ancien tag ou digest
- Risques connus documentés : futures migrations DB, incompatibilités potentielles entre versions, rollback image seule parfois insuffisant et importance de la sauvegarde du volume
- Bonnes pratiques documentées : éviter de dépendre uniquement de `latest`, conserver un backup pré-update et tester avant suppression des sauvegardes
- Liens ajoutés depuis la documentation Synology, `deploy/README.md`, le README, l'état courant et la roadmap
- Aucun changement backend, frontend, API, SQLite, Docker, compose, backup ZIP ou restauration

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
