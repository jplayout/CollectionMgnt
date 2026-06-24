# Synology HTTPS / Reverse Proxy

Ce guide décrit la configuration recommandée pour accéder à CollectionMgnt en HTTPS depuis un domaine ou sous-domaine avec le reverse proxy intégré à Synology DSM.

## Objectif

L'objectif est d'exposer CollectionMgnt en HTTPS, par exemple :

```text
https://collection.example.com
```

Cette configuration prépare :

- l'accès confortable depuis téléphone et tablette ;
- l'accès distant hors LAN lorsque le réseau le permet ;
- les futures fonctionnalités d'acquisition assistée qui pourront nécessiter un contexte navigateur sécurisé pour utiliser la caméra.

Ce lot ne met pas en place de fonctionnalité caméra. Il prépare seulement le déploiement HTTPS nécessaire à ce type d'usage.

## Architecture recommandée

L'approche recommandée consiste à faire pointer le reverse proxy DSM vers le frontend uniquement.

```text
Navigateur
  |
  | HTTPS https://collection.example.com
  v
Synology DSM Reverse Proxy
  |
  | HTTP vers le port frontend du NAS, par défaut 8080
  v
Conteneur frontend, Nginx port 80
  |
  | /api proxifié sur le réseau Docker interne
  v
Conteneur backend, port 3000 interne
```

Le backend reste non exposé sur l'hôte Synology. Il est accessible uniquement depuis le réseau Docker interne du projet Container Manager.

Le conteneur frontend sert l'application web et relaie déjà les appels `/api` vers le service backend interne. Il n'est donc pas nécessaire de créer une règle reverse proxy DSM séparée pour `/api`.

## Prérequis

- Un NAS Synology avec DSM et Container Manager.
- CollectionMgnt déjà déployé via `deploy/compose.synology.yml`.
- Le port frontend connu. La valeur par défaut est `8080`.
- Un domaine ou sous-domaine pointant vers le NAS, par exemple `collection.example.com`.
- Un certificat DSM valide pour ce domaine, idéalement Let's Encrypt.
- Les ports `80` et `443` routés vers le NAS si l'accès doit fonctionner depuis Internet.
- Le pare-feu DSM et le routeur configurés pour autoriser l'accès attendu.

Pour un accès uniquement local ou via VPN, l'exposition Internet directe n'est pas obligatoire. Le nom de domaine doit toutefois résoudre vers l'adresse joignable par les appareils qui utiliseront l'application.

## Certificat DSM

Créer ou obtenir un certificat dans DSM pour le domaine utilisé par CollectionMgnt.

Étapes générales :

1. Ouvrir la gestion des certificats DSM.
2. Créer ou ajouter un certificat pour `collection.example.com`.
3. Utiliser Let's Encrypt lorsque le NAS et le domaine permettent la validation automatique.
4. Associer ce certificat au service ou à la règle reverse proxy correspondant à CollectionMgnt.

Les libellés exacts peuvent varier selon la version de DSM. L'important est que le certificat présenté par DSM corresponde au nom de domaine utilisé dans le navigateur.

Les certificats autosignés sont déconseillés pour un usage mobile. Ils déclenchent des alertes navigateur, peuvent compliquer l'accès depuis téléphone/tablette et peuvent bloquer certains usages navigateur sécurisés.

## Règle Reverse Proxy DSM

Créer une règle reverse proxy DSM avec les paramètres suivants.

Source :

```text
Protocol: HTTPS
Hostname: collection.example.com
Port: 443
```

Destination :

```text
Protocol: HTTP
Hostname: localhost
Port: 8080
```

Si `FRONTEND_PORT` a été modifié dans le projet Container Manager, remplacer `8080` par la valeur utilisée.

Selon la configuration DSM, `localhost` peut être remplacé par l'adresse IP locale du NAS. Les deux formes doivent viser le port hôte exposé par le service frontend.

Important :

- ne pas créer de règle DSM séparée pour `/api` ;
- ne pas exposer le port backend sur l'hôte ;
- ne pas ajouter de mapping de port backend dans `deploy/compose.synology.yml` ;
- conserver le frontend comme unique point d'entrée public.

## Redirection HTTP vers HTTPS

La redirection HTTP vers HTTPS est recommandée si DSM le permet.

Objectif :

- éviter l'utilisation accidentelle de `http://collection.example.com` ;
- garantir que le JWT transmis par le frontend reste protégé en transit ;
- améliorer l'expérience mobile en utilisant directement le contexte sécurisé.

Le port `80` peut aussi être nécessaire pour l'obtention ou le renouvellement d'un certificat Let's Encrypt. Si le port `80` est redirigé ou filtré, vérifier que la méthode de validation du certificat reste compatible avec la configuration réseau.

## Tests de validation

Après configuration, valider le parcours complet.

1. Ouvrir `https://collection.example.com`.
2. Rafraîchir une page interne, par exemple une page collection ou une fiche item.
3. Se connecter avec un compte administrateur.
4. Vérifier implicitement `/api/auth/me` en rechargeant l'application après connexion.
5. Importer le dataset de démonstration depuis l'Administration.
6. Uploader une image sur un item.
7. Vérifier l'affichage de la miniature et du média.
8. Télécharger un export CSV depuis une collection.
9. Télécharger l'export JSON applicatif depuis l'Administration.
10. Télécharger une sauvegarde ZIP depuis l'Administration.
11. Tester depuis téléphone ou tablette en Wi-Fi.
12. Tester depuis téléphone ou tablette en 4G/5G si l'accès distant est prévu.

Le backend ne doit pas être accessible directement depuis Internet. Les appels API doivent passer par :

```text
https://collection.example.com/api/...
```

## Points de vigilance

### Limites upload et import

CollectionMgnt limite actuellement :

- les uploads média à 10 MB ;
- les imports JSON natifs à 10 MB.

DSM ou son reverse proxy peuvent avoir leurs propres limites de taille ou de délai. Si un upload ou un import échoue avant que l'application ne réponde, vérifier les limites de requête côté DSM.

### Gros backups

La sauvegarde ZIP peut devenir volumineuse si beaucoup de médias sont stockés. Un téléchargement interrompu peut venir :

- d'un timeout reverse proxy ;
- d'une connexion mobile instable ;
- d'une limite DSM ;
- d'un navigateur mobile qui suspend le téléchargement.

Tester les backups depuis un poste desktop avant de s'appuyer sur le téléchargement mobile.

### Authentification JWT

Le frontend stocke le JWT dans `sessionStorage` et l'envoie via l'en-tête :

```text
Authorization: Bearer <token>
```

Il n'y a pas de cookie de session à configurer côté DSM. HTTPS reste important, car il protège ce token en transit.

### Backend non exposé

Le backend doit rester inaccessible directement depuis l'extérieur. Cette propriété réduit la surface d'exposition et respecte l'architecture du compose Synology.

### En-tête `X-Forwarded-Proto`

Le frontend Nginx transmet déjà des en-têtes proxy au backend, dont `X-Forwarded-Proto`. Dans l'architecture recommandée, le lien DSM vers frontend peut rester en HTTP même si le navigateur utilise HTTPS.

Ce point n'est pas bloquant actuellement, car le backend ne s'appuie pas sur cet en-tête pour générer des redirections HTTPS, des cookies sécurisés ou des URLs absolues. Il devra être réévalué si ces comportements sont ajoutés plus tard.

## Accès mobile

HTTPS est fortement recommandé pour téléphone et tablette.

Un certificat valide évite :

- les alertes navigateur ;
- les blocages liés aux certificats autosignés ;
- les comportements différents entre navigateurs mobiles ;
- les problèmes futurs avec les APIs navigateur sensibles.

Les futures fonctions d'acquisition assistée ou d'utilisation de la caméra nécessiteront un contexte sécurisé HTTPS dans les navigateurs modernes. Cette documentation prépare ce prérequis, sans supposer que ces fonctions existent déjà dans CollectionMgnt.

## Dépannage

### Page inaccessible

Vérifier :

- que le domaine pointe vers le NAS ;
- que le port `443` arrive bien sur DSM ;
- que la règle reverse proxy utilise le bon hostname source ;
- que le projet Container Manager est démarré ;
- que le port frontend hôte correspond à `FRONTEND_PORT`.

Tester aussi l'accès LAN direct :

```text
http://IP_DU_NAS:8080
```

### Certificat invalide

Vérifier :

- que le certificat couvre exactement `collection.example.com` ;
- que DSM associe ce certificat à la règle ou au service reverse proxy CollectionMgnt ;
- que le certificat n'est pas expiré ;
- que la chaîne de certification est reconnue par les appareils mobiles.

Éviter les certificats autosignés pour un accès mobile régulier.

### Erreur 502 ou Bad Gateway

Vérifier :

- que le conteneur frontend est démarré ;
- que la destination DSM pointe vers `localhost:8080` ou vers l'IP du NAS avec le bon port ;
- que `FRONTEND_PORT` n'a pas été changé sans mettre à jour la règle DSM ;
- que le pare-feu local ne bloque pas le port frontend.

### Login impossible

Vérifier :

- que `/api/auth/login` passe bien par `https://collection.example.com/api/auth/login` ;
- que le backend est démarré ;
- que les logs backend ne signalent pas un `JWT_SECRET` absent ou trop court ;
- que le compte administrateur initial a bien été créé ;
- que le navigateur n'a pas conservé une session obsolète après changement de `JWT_SECRET`.

### API inaccessible

Ne pas créer de règle DSM séparée pour `/api`.

Vérifier :

- que le frontend Nginx fonctionne ;
- que les services `frontend` et `backend` sont dans le même projet Container Manager ;
- que le service backend s'appelle toujours `backend` ;
- que le backend écoute sur son port interne `3000`.

### Upload ou import qui échoue

Vérifier :

- que le fichier fait moins de 10 MB ;
- que le navigateur envoie bien la requête en HTTPS ;
- que DSM n'applique pas une limite de taille inférieure ;
- que la connexion mobile n'est pas interrompue ;
- que les logs backend ne signalent pas une erreur de validation.

### Backup interrompu

Vérifier :

- que la sauvegarde fonctionne depuis un navigateur desktop ;
- que la connexion reste stable pendant tout le téléchargement ;
- que DSM ne coupe pas les réponses longues ;
- que le NAS dispose de ressources suffisantes pendant la création de l'archive.

### Accès OK en LAN mais KO en 4G/5G

Vérifier :

- que le domaine public pointe vers l'adresse publique attendue ;
- que les ports `80` et `443` sont routés vers DSM si l'accès Internet direct est utilisé ;
- que le pare-feu DSM autorise la connexion ;
- que le fournisseur d'accès ne bloque pas les ports entrants ;
- que le test mobile n'utilise pas encore le Wi-Fi local ;
- qu'une solution VPN ou tunnel est configurée si le NAS n'est pas exposé directement.
