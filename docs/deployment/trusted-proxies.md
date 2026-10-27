# Proxies de confiance / Trusted proxies

## Français

`TRUSTED_PROXIES` est une variable **backend**, optionnelle. Absente, vide ou
composée d'espaces, elle conserve `trustProxy: false`. Derrière nginx, les clients
partagent alors le quota de son adresse de connexion. Aucun quota n'est modifié.

Une valeur renseignée contient des IP ou CIDR séparés par des virgules, avec
espaces possibles autour des entrées. Fastify résout nativement XFF depuis le
correspondant TCP jusqu'au premier intermédiaire non autorisé ; les adresses plus
éloignées sont ignorées. `X-Real-IP` et `Forwarded` ne sont pas des sources
alternatives pour le rate limiting. Aucun `keyGenerator` personnalisé n'est ajouté.

Le démarrage refuse : entrée vide, hostname, port, alias réseau, nombre de sauts,
`true`, `false`, `*`, `/0`, adresse non spécifiée ou réseau de base nulle, bits hôte
non nuls dans un CIDR, préfixe non canonique, zone IPv6 et **tout CIDR IPv4-mapped
IPv6**, y compris hexadécimal ou `/128`. Utiliser la notation IPv4 pour ces réseaux.
Une IP mapped exacte sans préfixe est acceptée, sauf l'équivalent non spécifié
`::ffff:0.0.0.0` (y compris ses écritures hexadécimales). Une IP client résolue
invalide reçoit `400` avant le compteur, sans recopier sa valeur dans la réponse. Les
en-têtes Helmet et `Permissions-Policy` sont appliqués avant ce refus.

Le lockfile fixe proxy-addr à **5.1.2**. La version 5.1.0 était affectée par
[CVE-2026-92395](https://github.com/fastify/proxy-addr/security/advisories/GHSA-8cmm-mhw6-v7xq),
corrigée à partir de 5.1.1. La validation applicative complète cette mise à jour ;
elle ne la remplace pas. Le test de régression exerce le paquet résolu par Fastify.
Aucun nouveau paquet n'est ajouté. Cette mise à jour transitive est un prérequis
direct du lot, à intégrer avant toute activation de la confiance proxy.

### Accès direct, Docker et Podman

En accès direct, laisser la variable vide. Le Compose racine continue de publier
`${BACKEND_PORT:-3000}:3000`, sans limitation à loopback. Retirer ce mapping dans
votre configuration ou restreindre réellement son accès si seul un proxy doit
joindre le backend. Le `EXPOSE` du Dockerfile ne publie pas de port à lui seul.

Avec nginx, autoriser son IP **telle que vue par le backend**, après vérification.
Exemple documentaire à remplacer par vos adresses réellement contrôlées :

```env
TRUSTED_PROXIES=192.0.2.10,2001:db8:10::5
```

Un CIDR canonique tel que `192.0.2.0/28` n'est approprié que si **tous** ses membres
sont des proxies maîtrisés. Ne pas autoriser tous les réseaux privés, le bridge
Docker complet ou une passerelle Podman par commodité. Les IP conteneur peuvent
changer ou être réattribuées : prévoir une attribution stable maîtrisée ou revoir
la liste à chaque changement. Aucun subnet ni IP statique n'est imposé par les
Compose livrés. La variable runtime est transmise uniquement au backend, avec
Docker comme Podman. En lancement Node direct, l'exporter explicitement :
`server.js` ne charge pas automatiquement le fichier `.env` racine.

### Proxy externe et Synology DSM

Le parcours recommandé reste client → DSM → frontend nginx → backend. Le Compose
Synology ne publie toujours pas le backend. Autoriser nginx et les intermédiaires
externes nécessaires après vérification de leur identité et de leurs en-têtes.
Exemple fictif pour deux proxies : `TRUSTED_PROXIES=192.0.2.10,192.0.2.20`.
Sans DSM dans la liste, la résolution s'arrête à son adresse et son quota reste
partagé. Un proxy autorisé doit remplacer les déclarations client ou ajouter son
correspondant réel à XFF, jamais relayer aveuglément une IP choisie par le client.

Le nginx fourni conserve cet ajout et réécrit `Host`, `X-Forwarded-Host`,
`X-Real-IP` et `X-Forwarded-Proto`. `trustProxy` affecte aussi `request.host`,
`request.hostname` et `request.protocol`. Les en-têtes host/proto d'un correspondant
non autorisé sont ignorés ; les proxies autorisés doivent les normaliser. nginx
transmet son propre `$scheme` : derrière la terminaison TLS DSM, le backend peut
voir `http`. Ce lot conserve cette sémantique et ne déduit pas HTTPS d'une valeur
fournie par le navigateur. Ces obligations s'appliquent aussi à un proxy externe
visant directement le backend. La normalisation nginx `real_ip` reste une variante
optionnelle, avec sa propre liste stricte de proxies et son module à vérifier.

La réécriture de `X-Forwarded-Host` par `$host` empêche un en-tête XFH indépendant
de remplacer le Host retenu par nginx. Elle **ne valide pas le Host HTTP ni les
domaines autorisés** : `$host` peut lui-même provenir de la requête client. Cette
configuration ne fournit pas de liste de domaines autorisés. Un éventuel besoin
de validation des domaines pour une décision applicative doit être traité
explicitement ; la normalisation XFH ne constitue pas cette validation.

### Identifier les adresses réellement vues

1. Dans une instance de validation, commencer avec la variable vide. Relever les
   ports avec `docker port` / `podman port` et les sockets hôte. Avec `inspect`, ne
   consulter que les champs réseau utiles, sans afficher les variables/secrets.
2. Envoyer des requêtes depuis deux clients, par chaque entrée prévue et chaque
   accès direct restant. Avec la confiance désactivée, le `remoteAddress` des logs
   Fastify est le correspondant TCP du backend.
3. Vérifier la configuration effective de nginx et DSM/du proxy externe. Au besoin,
   instrumenter temporairement l'instance locale pour comparer
   `request.raw.socket.remoteAddress`, `request.ip` et `request.ips`. Une fois la
   confiance activée, le `remoteAddress` journalisé peut différer du socket.
   Ne pas créer de route publique de diagnostic ni journaliser des identifiants.
4. Tester XFF falsifié en accès direct et via proxy, puis l'isolation des clients.
   Si NAT/Podman fait apparaître proxy et accès directs sous la même passerelle,
   **ne pas autoriser cette passerelle** : isoler les chemins réseau d'abord.
5. Refaire ces vérifications après changement de proxy, moteur, réseau ou IP.
   L'absence de publication ne protège pas d'un participant non fiable au réseau.

Les compteurs restent locaux au processus et réinitialisés au redémarrage. Des
clients partageant une IPv4 publique ou un `/64` IPv6 partagent encore un quota ;
IPv4 et mapped IPv6 équivalentes partagent une clé. Les attaques distribuées depuis
de vraies IP différentes et un proxy compromis restent des risques résiduels.

## English

`TRUSTED_PROXIES` is an optional **backend** variable. Missing, empty or whitespace
values keep `trustProxy: false`; clients behind nginx then share its socket-address
quota. No quota is changed. Non-empty values are comma-separated explicit IPs or
CIDRs; surrounding whitespace is accepted. Fastify resolves XFF natively from the
TCP peer to the nearest untrusted intermediary and ignores addresses beyond it.
`X-Real-IP` and `Forwarded` are not alternate rate-limit identity sources. No custom
`keyGenerator` is introduced.

Startup rejects empty entries, hostnames, ports, aliases, hop counts, `true`,
`false`, `*`, `/0`, unspecified addresses or zero-base networks, CIDRs with host
bits set, non-canonical prefixes, IPv6 zones and **all mapped IPv6 CIDRs**, including
hexadecimal spellings and `/128`. Use plain IPv4 networks instead. Exact mapped
IPs without a prefix are accepted except the unspecified equivalent
`::ffff:0.0.0.0`, including hexadecimal forms. Invalid resolved client IPs receive
`400` before quota accounting without reflecting the value. Helmet and `Permissions-Policy`
headers are applied before that rejection.

The lockfile pins proxy-addr **5.1.2**, fixing
[CVE-2026-92395](https://github.com/fastify/proxy-addr/security/advisories/GHSA-8cmm-mhw6-v7xq)
(5.1.0 affected, fixed from 5.1.1). Application validation supplements this update;
it does not replace it. Regression coverage exercises Fastify's resolved package.
No new dependency is added. This targeted transitive update is a direct prerequisite
of this feature and must be integrated before enabling proxy trust.

### Direct access, Docker and Podman

Leave the variable empty for direct access. Root Compose still publishes
`${BACKEND_PORT:-3000}:3000` without a loopback-only binding. Remove that mapping
in your deployment or enforce network restrictions when only a proxy should reach
the backend. Dockerfile `EXPOSE` does not publish a host port by itself.

For nginx, trust its address **as actually seen by the backend**. The examples
above use documentation addresses and must be replaced. A canonical CIDR such as
`192.0.2.0/28` is appropriate only when every member is a controlled proxy. Do not
trust all private networks, an entire bridge or a Podman gateway for convenience.
Container IPs may change or be reassigned: use controlled stable addressing or
recheck after changes. Supplied Compose files impose no static address/subnet.
Both engines pass this runtime variable only to the backend. For direct Node
startup, export it explicitly; `server.js` does not load the root `.env` file.

### External proxies and Synology DSM

The recommended path remains client → DSM → frontend nginx → backend. Synology
Compose does not publish the backend. Trust nginx and necessary external proxies
only after checking identity and header handling. The two-address example above
represents two controlled proxies; without DSM in the list, resolution stops at
DSM and its clients share a quota. Trusted proxies must overwrite declarations
or append their actual peer to XFF, never blindly relay a client-selected IP.

The supplied nginx preserves XFF append behavior and rewrites Host,
X-Forwarded-Host, X-Real-IP and X-Forwarded-Proto. Trust also affects `request.host`,
`request.hostname` and `request.protocol`: untrusted peers cannot set these through
forwarding headers; trusted peers must normalize them. nginx forwards its own
`$scheme`, so the backend may see `http` behind DSM TLS termination. This change
preserves that behavior and does not infer HTTPS from browser declarations.
Custom proxies connecting directly to the backend have the same obligations.
nginx `real_ip` is an optional alternative requiring its own strict proxy list
and module verification; it is not implicitly enabled.

Rewriting `X-Forwarded-Host` with `$host` prevents an independent XFH header from
overriding nginx's selected Host. It **does not validate the HTTP Host or allowed
domains**: `$host` can itself come from the client request. This configuration
provides no domain allowlist. Any application requirement for domain validation
must be addressed explicitly; XFH normalization does not provide that validation.

### Discover actual peer addresses

1. Start on a validation instance with an empty variable. Check ports with
   `docker port` / `podman port` and host sockets. Inspect only necessary network
   fields, without dumping environment variables or secrets.
2. Send requests from two clients through all intended and remaining direct
   paths. With trust disabled, logged `remoteAddress` is the backend socket peer.
3. Check effective nginx and DSM/external configuration. If necessary, temporarily
   instrument local validation to compare `request.raw.socket.remoteAddress`,
   `request.ip` and `request.ips`. With trust enabled, logged `remoteAddress` may
   differ from the socket. Expose no public diagnostic route and log no credentials.
4. Verify forged XFF on direct/proxied paths and client isolation. If NAT/Podman
   collapses proxies and direct clients onto one gateway, do not trust that
   gateway: isolate network paths first.
5. Recheck after proxy, engine, network or IP changes. An unpublished backend
   port does not exclude untrusted peers on the container network.

Counters remain per process and reset on restart. Clients sharing a public IPv4
or an IPv6 `/64` still share a quota; equivalent IPv4/mapped IPv6 forms share a
key. Distributed attacks from real IPs and compromised proxies remain possible.
