# Déploiement Docker sur Synology NAS

CollectionMgnt cible un déploiement Docker auto-hébergé.

Synology NAS est la plateforme prioritaire/testée/documentée, mais l'application n'est pas spécifique à Synology. Elle reste compatible avec tout environnement Docker disposant d'un volume persistant.

## Positionnement

- Déploiement recommandé : Docker auto-hébergé
- Plateforme prioritaire : Synology NAS
- Compatibilité attendue : tout environnement Docker avec volume persistant

## Données persistantes

Le volume persistant doit conserver :

- la base SQLite
- les fichiers média
- les données applicatives générées
