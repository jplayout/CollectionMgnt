# Roadmap - Collection Manager

## Vision

Collection Manager est une plateforme auto-hébergée de gestion de collections basée sur un moteur de plugins déclaratifs.

L'objectif est de permettre à un utilisateur de créer et gérer n'importe quel type de collection sans développement spécifique.

Étape suivante : Lot 5.11 - Recherche avancée.

---

## État courant

Version actuelle : v0.8-lot5.10.

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

### Prochaine étape

- Lot 5.11 - Recherche avancée

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
- Déploiement Docker auto-hébergé
- Plateforme prioritaire : Synology NAS
- Compatible avec tout environnement Docker disposant d'un volume persistant

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

- Déploiement Docker auto-hébergé
- Plateforme prioritaire/testée/documentée : Synology NAS
- Tout environnement Docker disposant d'un volume persistant

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

- Configuration des champs et préférences d’affichage
- outil d’audit média permettant de détecter les fichiers orphelins et les entrées DB invalides, avec nettoyage manuel depuis l’administration.
