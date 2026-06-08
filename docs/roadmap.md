# Roadmap - Collection Manager

## Vision

Collection Manager est une plateforme auto-hébergée de gestion de collections basée sur un moteur de plugins déclaratifs.

L'objectif est de permettre à un utilisateur de créer et gérer n'importe quel type de collection sans développement spécifique.

Étape suivante : Lot 6.0.3 - Publication automatique GHCR.

---

## État courant

Version actuelle : v0.9-lot6.0.2.

### Lot 5.6 - Livré

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

### Lot 5.7 - Livré

- `GET /api/items/:id`
- `PATCH /api/items/:id`
- Édition backend d'un item sans changement de plugin
- Réutilisation de la validation dynamique backend
- Mise à jour de `title`, `description`, `metadata` et `updated_at`
- Conservation des métadonnées inconnues existantes
- Retour de l'item avec `metadata` parsé, code plugin et nom d'affichage plugin

### Lot 5.8 - Livré

- Route protégée `/items/:id/edit`
- Chargement d'un item via `GET /api/items/:id`
- Préremplissage du formulaire dynamique existant
- Sauvegarde via `PATCH /api/items/:id`
- Redirection vers `/items/:id` après modification
- Page détail item enrichie avec titre, description, plugin, métadonnées et dates
- Bouton `Modifier` depuis la page détail
- Galerie média conservée sur la page détail

### Lot 5.8.1 - Correctif livré

- Bornage par défaut des champs `rating` à 0..20 côté backend
- Attributs frontend par défaut `min=0`, `max=20` et `step=1` pour les champs `rating`
- Surcharge possible des bornes via `min`, `max` et `step` dans le schéma plugin
- Conservation du comportement actuel des champs `number`, sans bornes par défaut
- `step` reste une contrainte UI uniquement pour ce lot

### Lot 5.9 - Livré

- Suppression d'un item depuis sa fiche détail
- Confirmation explicite avant suppression avec le titre réel de l'item
- Appel frontend à `DELETE /api/items/:id`
- État `Suppression...` et gestion des erreurs inline
- Redirection vers la liste de collection après suppression
- Message `Item supprimé.` dans la liste après redirection
- Suppression depuis la liste non intégrée dans ce lot
- Limitation restante à ce stade du Lot 5.9 : les fichiers média associés à l'item n'étaient pas encore nettoyés sur disque

### Lot 5.10 - Livré

- `DELETE /api/items/:id` retourne 404 si l'item est absent
- Suppression DB de l'item avant nettoyage disque
- Conservation de la cascade SQLite pour supprimer les lignes `media`
- Nettoyage best-effort du dossier `backend/data/uploads/items/{itemId}`
- Suppression physique des sous-dossiers `originals`, `images` et `thumbs`
- Erreurs de nettoyage disque logguées sans rollback de la suppression DB

### Lot 5.11 - Livré

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
- Limitation restante : pas de pagination
- Limitation restante : pas de tri
- Limitation restante : certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict

### Lot 5.12 - Livré

- Paramètre `search` sur `GET /api/items`
- Recherche large dans `items.title` et `items.description`
- Recherche dans les metadata déclarées `searchable` quand un plugin courant est fourni
- Combinaison possible avec `plugin` et les filtres `filterable`
- Compatibilité conservée avec `title`
- Combinaison de `title` et `search` en `AND`
- Liste collection frontend basculée de la recherche titre vers la recherche large `search`
- Pas de FTS, pas de pagination, pas de tri configurable et pas de recherche metadata globale multi-plugins dans ce lot

### Lot 5.12.1 - Correctif livré

- Recherche `search` explicitement insensible à la casse simple
- Recherche legacy `title` explicitement insensible à la casse simple
- Filtres `filterable` text, textarea et select insensibles à la casse simple
- Filtres checkbox, number, rating et date conservés stricts
- Post-filtrage frontend aligné sur les mêmes règles
- Limitation restante : pas de normalisation complète des accents ou de l'Unicode

### Lot 5.12.2 - Correctif livré

- Fiche item améliorée côté frontend sans changement backend
- Chargement du schéma plugin pour présenter les métadonnées
- Labels de métadonnées issus du schéma plugin
- Métadonnées affichées dans l'ordre du schéma plugin
- Description affichée dans une section dédiée avec fallback si vide
- Métadonnées inconnues conservées dans une section `Autres informations`
- Galerie média conservée sous la fiche item

### Lot 5.13 - Livré

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

### Lot 6.0.1 - Livré

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

### Lot 6.0.2 - Livré

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

### Prochaine étape

- Lot 6.0.3 - Publication automatique GHCR

### Non livré à ce stade

- Support backend des types plugin avancés : multiselect, url, email, barcode, isbn

---

# v0.1 - Fondation

## Objectif

Poser les bases techniques du projet.

### Backend

- Fastify
- SQLite
- JWT
- Structure plugins

### Frontend

- Vue 3
- Vite
- Vue Router
- Pinia

### Infrastructure

- Docker
- Docker Compose
- Synology compatible

### Livrables

- Authentification
- Structure projet
- Chargement plugins

---

# v0.2 - Plugins et Collections

## Objectif

Créer le moteur de collections générique.

### Fonctionnalités

- CRUD générique
- Plugins déclaratifs
- Champs dynamiques
- Validation dynamique

### Livrables

- Gestion collections
- Gestion plugins
- Renommage plugins

---

# v0.3 - Recherche

## Objectif

Recherche puissante sans code spécifique.

### Fonctionnalités

- Recherche globale
- Recherche avancée
- Filtres automatiques
- Facettes

### Livrables

- Multi-collections
- Recherche configurable

---

# v0.4 - Médias

## Objectif

Gestion complète des images.

### Fonctionnalités

- Upload
- Conversion WebP
- Miniatures
- Galerie

### Livrables

- Images multiples
- Image principale

---

# v0.5 - Sauvegardes

## Objectif

Sécuriser les données.

### Fonctionnalités

- Sauvegarde ZIP
- Restauration ZIP
- Sauvegarde automatique

### Livrables

- Export complet
- Politique de rétention

---

# v0.6 - Internationalisation

## Objectif

Support multilingue.

### Langues

- Français
- Anglais

### Fonctionnalités

- Changement de langue
- Préférences utilisateur

---

# v0.7 - Plugins officiels

## Plugins fournis

### Jeux Vidéo

- Plateforme
- Genre
- Éditeur

### Films

- Réalisateur
- Format
- Année

### Livres

- Auteur
- ISBN
- Éditeur

### Consoles

- Fabricant
- Génération

### Autre

- Champs génériques

---

# v0.8 - Prêts et Tags

## Fonctionnalités

- Gestion des prêts
- Historique
- Tags globaux

---

# v0.9 - Stabilisation

## Qualité

- Optimisation SQLite
- Optimisation recherche
- Tests automatisés
- Documentation complète

---

# v1.0

## Première version stable

### Inclus

- Authentification
- Plugins déclaratifs
- Collections dynamiques
- Recherche avancée
- Médias
- Sauvegardes
- Internationalisation
- Plugins officiels

### Compatible

- Synology NAS
- Docker Compose

---

# Backlog futur

## Plugins

- Mangas
- Bandes dessinées
- Vinyles
- Figurines
- LEGO
- Cartes Pokémon

## Fonctionnalités

- Import CSV
- Export CSV
- Import JSON
- Export JSON
- API publique

## Recherche

- SQLite FTS5
- Recherche approximative

## Médias

- OCR
- Lecture ISBN
- Lecture code-barres

## Administration

- Multi-utilisateurs avancé
- Rôles
- Permissions

## Distribution

- Installation plugins ZIP
- Catalogue de plugins

## Lot futur 

### Configuration des champs et préférences d’affichage

- Définition d’échelles de notation configurables :
  - note sur 5
  - note sur 10
  - note sur 20
  - note sur 100
  - pourcentage
  - affichage en étoiles
- Configuration des colonnes affichées dans les listes
- Choix des métadonnées mises en avant dans les cartes items
- Préférences d’affichage par collection/plugin

### Outils d’audit et maintenance média

- Détection des fichiers orphelins sur disque
- Détection des entrées media sans fichier associé
- Rapport d’audit détaillé
- Mode dry-run
- Nettoyage manuel depuis l’interface d’administration
- Régénération éventuelle des miniatures et images optimisées
