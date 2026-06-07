# Plugin API

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

Participe à la recherche avancée.

## globalSearch

Participe à la recherche globale.

## filterable

Ajoute automatiquement un filtre.

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

## pattern

Expression régulière.
