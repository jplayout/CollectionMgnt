# Recherche

État courant : v0.8-lot5.12.

## Disponible

La recherche d'items est disponible dans la liste d'une collection.

Capacités backend actuellement utilisées par `GET /api/items` :

- filtrage par plugin via `plugin`
- recherche large via `search`
- recherche simple par titre via `title`, conservée pour compatibilité
- filtres metadata sur les champs déclarés `filterable`
- égalité stricte sur les valeurs metadata via `json_extract`

## Recherche `search`

Le paramètre `search` cherche dans :

- `items.title`
- `items.description`
- les champs metadata déclarés `searchable` dans le plugin courant

Exemples :

- `GET /api/items?search=zelda` cherche dans les titres et descriptions
- `GET /api/items?plugin=games&search=nintendo` cherche aussi dans les metadata `searchable` du plugin `games`
- `GET /api/items?plugin=games&search=nintendo&platform=Switch` combine la recherche large et les filtres `filterable`

Si `title` et `search` sont présents, les deux contraintes sont combinées en `AND`.

## `searchable` Et `filterable`

- `searchable` ajoute un champ metadata à la recherche large `search` du plugin courant.
- `filterable` expose un filtre dédié et applique une égalité stricte sur le champ metadata.
- Un champ peut être à la fois `searchable` et `filterable`.
- Les champs `searchable` utilisés par le backend viennent uniquement du schéma plugin, jamais de la query utilisateur.

Capacités frontend disponibles :

- champ de recherche large
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
- pas de recherche globale multi-plugins sur les metadata `searchable`
- pas de FTS
- pas de ranking des résultats
- pas encore d'exploitation de `faceted`
- les filtres backend metadata utilisent une égalité stricte
- la recherche utilise `LIKE` et ne gère pas finement les accents ni la normalisation Unicode
- certains filtres typés sont finalisés côté frontend en attendant un contrat backend plus strict

## Étape Suivante

Lot 5.13 - Clarification du contrat backend des filtres typés.

Objectifs probables :

- clarifier le contrat backend pour les types number, rating et checkbox
- réduire les filtres finalisés côté frontend
- préparer la pagination et le tri configurable
