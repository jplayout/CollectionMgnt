# Recherche

État courant : v0.8-lot5.11.

## Disponible

La recherche d'items est disponible dans la liste d'une collection.

Capacités backend actuellement utilisées par `GET /api/items` :

- filtrage par plugin via `plugin`
- recherche simple par titre via `title`
- filtres metadata sur les champs déclarés `filterable`
- égalité stricte sur les valeurs metadata via `json_extract`

Capacités frontend disponibles :

- champ de recherche par titre
- filtres dynamiques générés depuis le schéma plugin
- affichage uniquement des champs `filterable`
- contrôles adaptés aux types supportés par le frontend
- affichage des filtres actifs
- réinitialisation de la recherche et des filtres

## Types De Filtres Frontend

- `text` et `textarea` : champ texte
- `select` : liste si `options` est présent, sinon champ texte
- `checkbox` : choix `Tous`, `Oui`, `Non`
- `date` : champ date
- `number` : champ numérique
- `rating` : champ numérique avec bornes par défaut `min=0`, `max=20`, `step=1`

## Limites Actuelles

- pas de pagination
- pas de tri configurable
- pas de recherche globale multi-collections
- pas encore de recherche dans les champs `searchable`
- pas encore d'exploitation de `faceted`
- les filtres backend metadata utilisent une égalité stricte
- certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict

## Étape Suivante

Lot 5.12 - Recherche backend sur champs `searchable` ou clarification backend des filtres typés.

Objectifs probables :

- exploiter les champs `searchable`
- rechercher sur plusieurs champs d'une collection
- clarifier le contrat backend pour les types number, rating et checkbox
- préparer la future recherche globale multi-collections
