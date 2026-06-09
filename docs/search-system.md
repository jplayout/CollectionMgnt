# Recherche

État courant : v0.10-lot5.15.

## Disponible

La recherche d'items est disponible dans la liste d'une collection.

Capacités backend actuellement utilisées par `GET /api/items` :

- filtrage par plugin via `plugin`
- recherche large via `search`
- recherche simple par titre via `title`, conservée pour compatibilité
- filtres metadata sur les champs déclarés `filterable`
- filtres metadata via `json_extract`, insensibles à la casse simple pour text, textarea et select, stricts pour checkbox, number, rating et date
- validation backend des valeurs de filtres selon le type déclaré dans le schéma plugin
- pagination via `page` et `pageSize`
- tri configurable via `sort` et `direction`

## Recherche `search`

Le paramètre `search` cherche dans :

- `items.title`
- `items.description`
- les champs metadata déclarés `searchable` dans le plugin courant

La recherche `search` est explicitement insensible à la casse simple sur ces champs.

Exemples :

- `GET /api/items?search=zelda` cherche dans les titres et descriptions
- `GET /api/items?plugin=games&search=nintendo` cherche aussi dans les metadata `searchable` du plugin `games`
- `GET /api/items?plugin=games&search=nintendo&platform=Switch` combine la recherche large et les filtres `filterable`
- `GET /api/items?plugin=games&search=nintendo&page=2&pageSize=24` combine recherche, filtres éventuels et pagination
- `GET /api/items?plugin=games&sort=rating&direction=desc&page=1&pageSize=24` combine tri metadata et pagination

Si `title` et `search` sont présents, les deux contraintes sont combinées en `AND`.

## Pagination

`GET /api/items` retourne une réponse enveloppée :

```json
{
  "items": [],
  "total": 153,
  "page": 2,
  "pageSize": 24,
  "totalPages": 7
}
```

Paramètres disponibles :

- `page` : entier supérieur ou égal à 1, défaut 1.
- `pageSize` : entier entre 1 et 100, défaut 24.

La pagination est combinable avec `plugin`, `title`, `search` et les filtres metadata `filterable`.
Le total est calculé avec les mêmes contraintes que la liste retournée.
Les valeurs invalides de `page` ou `pageSize` retournent une réponse 400.

## Tri

`GET /api/items` accepte :

- `sort` : champ trié, défaut `title`.
- `direction` : `asc` ou `desc`, défaut `asc`.

Le tri par défaut est `title` ascendant, car `title` est le champ obligatoire commun à tous les items.

Champs système triables :

- `title`
- `created_at`
- `updated_at`

Le tri `sort=created_at&direction=desc` reste disponible explicitement.

Champs metadata triables :

- champs du plugin courant uniquement ;
- types supportés : text, textarea, select, date, number, rating et checkbox.

Le tri metadata nécessite un plugin connu via `plugin=...`, afin que le backend puisse valider le champ depuis le schéma plugin.
Un tri metadata sans plugin connu retourne une réponse 400.
Les valeurs invalides de `sort` ou `direction` retournent une réponse 400.
Le tri est appliqué avant `LIMIT` / `OFFSET`.
Le total reste calculé avec les mêmes filtres/recherche, indépendamment du tri.
Un tie-breaker stable via `id` est appliqué aux tris.

## `searchable` Et `filterable`

- `searchable` ajoute un champ metadata à la recherche large `search` du plugin courant.
- `filterable` expose un filtre dédié sur le champ metadata.
- Un champ peut être à la fois `searchable` et `filterable`.
- Les champs `searchable` utilisés par le backend viennent uniquement du schéma plugin, jamais de la query utilisateur.

## Casse Des Filtres

- `search` est insensible à la casse simple sur titre, description et metadata `searchable`.
- `title` reste disponible pour compatibilité et est insensible à la casse simple.
- Les filtres `filterable` de type text, textarea et select sont insensibles à la casse simple.
- Les filtres `filterable` de type checkbox, number, rating et date restent stricts.
- Les types et noms de champs utilisés par les filtres viennent uniquement du schéma plugin.

## Filtres Typés

- `text` : égalité insensible à la casse simple.
- `textarea` : égalité insensible à la casse simple.
- `select` : égalité insensible à la casse simple ; si `options` est déclaré, la valeur demandée doit correspondre à une option valide.
- `checkbox` : accepte uniquement `true` ou `false`, convertit en `1` ou `0`, puis compare la valeur booléenne JSON.
- `number` : accepte uniquement un nombre fini, puis compare numériquement.
- `rating` : accepte uniquement un nombre fini, applique `min`/`max` avec défaut 0..20, puis compare numériquement.
- `date` : accepte uniquement une date réelle au format `YYYY-MM-DD`, puis compare strictement la chaîne stockée.
- Les valeurs de filtres invalides retournent une réponse 400.
- Les filtres range comme `rating_min`, `rating_max`, `date_from` et `date_to` ne sont pas disponibles dans ce lot.

Capacités frontend disponibles :

- champ de recherche large
- filtres dynamiques générés depuis le schéma plugin
- affichage uniquement des champs `filterable`
- contrôles adaptés aux types supportés par le frontend
- affichage des filtres actifs
- réinitialisation de la recherche et des filtres
- affichage du total d'items
- navigation paginée précédente/suivante
- sélection du champ trié et de l'ordre de tri
- retour à `title` / `asc` si le tri courant n'est plus disponible après changement de schéma

## Types De Filtres Frontend

- `text` et `textarea` : champ texte
- `select` : liste si `options` est présent, sinon champ texte
- `checkbox` : choix `Tous`, `Oui`, `Non`
- `date` : champ date
- `number` : champ numérique
- `rating` : champ numérique avec bornes par défaut `min=0`, `max=20`, `step=1`

## Limites Actuelles

- pas de recherche globale multi-collections
- pas de recherche globale multi-plugins sur les metadata `searchable`
- pas de FTS
- pas de ranking des résultats
- pas de filtres range
- pas encore d'exploitation de `faceted`
- les filtres backend metadata text, textarea et select sont insensibles à la casse simple ; checkbox, number, rating et date restent stricts
- la recherche et les filtres textuels/select ne gèrent pas finement les accents ni la normalisation Unicode

## Étape Suivante

Filtres range sur rating/date.
