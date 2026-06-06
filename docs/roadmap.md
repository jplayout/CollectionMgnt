# Roadmap - Collection Manager

## Vision

Collection Manager est une plateforme auto-hébergée de gestion de collections basée sur un moteur de plugins déclaratifs.

L'objectif est de permettre à un utilisateur de créer et gérer n'importe quel type de collection sans développement spécifique.

Étape suivante : Lot 5.6 - Création item frontend dynamique.

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
