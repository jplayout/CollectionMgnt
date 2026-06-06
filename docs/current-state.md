# État actuel

Version : v0.5-lot3.6

## Fonctionnel

- Chargement dynamique des plugins
- Synchronisation plugins -> BDD
- CRUD items
- Recherche dynamique
- Schema API
- Validation dynamique des champs basée sur fields.json
- Correctif GET /api/items

## Lot 3.6 livré

Validation dynamique :

- title obligatoire
- metadata optionnel, objet simple si fourni
- required
- text
- textarea
- select
- checkbox
- date
- rating
- number
- pattern
- min/max pour number et rating

Correctif :

- GET /api/items utilise les repositories définis dans le bon scope

## Prochaine étape

À définir
