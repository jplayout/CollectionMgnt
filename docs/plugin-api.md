# Plugin API

État courant : v0.12-lot10.2.0.

## Structure

Chaque plugin est un dossier.

```text
plugin-name/
├── manifest.json
├── fields.json
└── icon.svg
```

---

# manifest.json

Exemple :

```json
{
  "id": "games",
  "name": "Jeux Vidéo",
  "version": "1.0.0",
  "supportsImages": true,
  "supportsLoans": true
}
```

## Champs

| Champ | Obligatoire |
|---------|---------|
| id | Oui |
| name | Oui |
| version | Oui |
| supportsImages | Oui |
| supportsLoans | Oui |

---

# fields.json

Décrit les champs du plugin.

Exemple :

```json
[
  {
    "name": "platform",
    "label": "Plateforme",
    "type": "select",
    "required": true,
    "searchable": true,
    "filterable": true,
    "faceted": true
  }
]
```

Les préférences d'affichage utilisateur ne font pas partie du contrat plugin.
Elles ne doivent pas être ajoutées dans `fields.json` et sont persistées côté application avec les clés `displayPreferences.<pluginId>`.
L'interface d'édition des préférences écrit dans ces préférences applicatives et ne modifie jamais les fichiers `fields.json`.
La vue liste dense des listes items réutilise les préférences applicatives `list.highlightedFields` pour choisir ses champs metadata.
Il n'existe pas de propriété plugin `table.columns` à ce stade.

La configuration de tri utilisateur ne fait pas encore partie du contrat plugin.
Il n'existe pas de propriété `sortable` dans `fields.json` à ce stade.
Les champs metadata triables par `GET /api/items?sort=...` sont inférés côté backend depuis les champs du plugin courant et les types supportés : text, textarea, select, date, number, rating et checkbox.

L'export CSV collection utilise les noms techniques `field.name` comme en-têtes de colonnes metadata.
Les labels `field.label` restent destinés à l'affichage utilisateur et ne sont pas utilisés comme identifiants stables d'export.

---

# Types réellement validés actuellement

Le backend et le formulaire frontend dynamique valident actuellement les types suivants :

- text
- textarea
- number
- date
- checkbox
- select
- rating

---

# Types documentés mais non encore supportés

Ces types restent prévus dans le modèle de plugins, mais ne doivent pas être considérés comme disponibles tant que la validation backend n'est pas implémentée :

- multiselect
- url
- email
- barcode
- isbn

---

# Recherche

## searchable

Participe actuellement à la recherche large `search` de `GET /api/items`.

Quand un plugin courant est fourni avec `plugin=...`, les champs metadata déclarés `searchable: true` sont recherchés avec `LIKE` en plus de `items.title` et `items.description`.

Les champs `searchable` utilisés par le backend viennent du schéma plugin chargé côté serveur. La query utilisateur ne peut pas fournir sa propre liste de champs recherchables.

Sans paramètre `plugin`, `search` cherche actuellement dans `items.title` et `items.description`, mais pas dans les metadata de tous les plugins.

## globalSearch

Participe à la recherche globale.

## filterable

Ajoute automatiquement un filtre sur `GET /api/items` quand le plugin courant est fourni.

Les filtres utilisent le type déclaré dans `fields.json` :

- text, textarea et select : égalité insensible à la casse simple
- checkbox : valeurs query acceptées `true` ou `false`, converties en `1` ou `0` côté backend
- number : nombre fini obligatoire
- rating : nombre fini obligatoire, borné par `min`/`max` avec défaut 0..20
- date : date réelle au format `YYYY-MM-DD`

Si `options` est déclaré pour un champ `select`, la valeur du filtre doit correspondre à une option valide.

Les filtres invalides sont rejetés par l'API avec une réponse 400.

Les filtres range (`rating_min`, `rating_max`, `date_from`, `date_to`) ne sont pas disponibles actuellement.

## faceted

Ajoute automatiquement une facette.

---

# Validation

## required

Champ obligatoire.

## min

Valeur minimale.

## max

Valeur maximale.

## rating

Un champ `rating` est une note numérique bornée.

Par défaut :

- `min` = 0
- `max` = 20
- `step` = 1 côté frontend

Les propriétés `min`, `max` et `step` peuvent être déclarées dans `fields.json` pour surcharger ces valeurs.

Le backend valide actuellement `min` et `max`. `step` est utilisé uniquement par l'interface frontend pour le champ HTML.

Les affichages avancés de type étoiles, pourcentage, note sur 5 ou note sur 100 sont prévus comme évolution future et ne sont pas disponibles actuellement.

## pattern

Expression régulière.

## options

Valeurs autorisées pour un champ `select`.

---

# Plugins standards

Les plugins standards fournis dans `backend/plugins` restent volontairement simples.
Ils utilisent uniquement les types réellement validés actuellement et n'ajoutent pas
encore de champs ISBN, EAN, UPC ou code-barres.

## books

Collection : Livres.

Champs metadata :

- `author`
- `genre`
- `publisher`
- `publication_date`
- `read`
- `rating`

## movies

Collection : Films.

Champs metadata :

- `director`
- `genre`
- `format`
- `release_date`
- `watched`
- `rating`

## consoles

Collection : Consoles.

Champs metadata :

- `manufacturer`
- `type`
- `region`
- `release_date`
- `condition`

## others

Collection : Autre.

Champs metadata :

- `category`
- `maker`
- `acquired_date`
- `condition`
- `location`
- `favorite`

## Acquisition assistée

L'acquisition assistée par ISBN, EAN, UPC, code-barres, scan mobile/tablette,
recherche automatique externe, pré-remplissage des champs et récupération
éventuelle de métadonnées ou images est une fonctionnalité future distincte.
Elle ne fait pas partie de l'enrichissement simple des plugins standards.
