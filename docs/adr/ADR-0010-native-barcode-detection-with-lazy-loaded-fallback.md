# ADR-0010 — Native Barcode Detection With Lazy-Loaded Fallback

> Francais en premier. English version below.

---

# Francais

Status

Accepted

Context

Le scan camera mobile doit remplir un identifiant produit sans appeler de
provider et sans envoyer d'image au backend. `BarcodeDetector` offre une voie
native efficace sur les navigateurs compatibles, mais son support reste
incomplet, notamment selon les plateformes mobiles et certains navigateurs.

Decision

CollectionMgnt utilise `BarcodeDetector` en priorite uniquement si l'API existe
et declare le support reel des formats MVP via `getSupportedFormats()`.

Quand le natif est absent ou insuffisant, le frontend charge `@zxing/browser`
par import dynamique. Ce fallback JavaScript reste hors du bundle initial et
n'est instancie que pour le scan camera.

Le scanner traite exclusivement localement les formats `ean_13` et `upc_a`.
ISBN-10 n'est pas annonce comme symbologie camera et QR Code reste hors
perimetre.

Le scanner ne connait ni plugin, ni provider, ni formulaire. Il emet un resultat
brut normalise que les lots suivants pourront brancher aux champs `isbn` ou
`barcode`.

Consequences

Positive

- Le chemin natif minimise CPU et batterie quand le navigateur le permet.
- iOS, Firefox et les navigateurs sans `BarcodeDetector` peuvent utiliser le
  fallback ZXing.
- Le fallback n'augmente pas le bundle initial.
- Aucune image, frame ou valeur scannee n'est envoyee ou persistee par le
  scanner.
- Les flux camera sont arretes apres succes, fermeture, erreur et unmount.
- La separation scanner/provider reste conforme a ADR-0008.

Negative

- Le premier scan sur fallback peut payer le cout de chargement du chunk ZXing.
- La validation metier checksum et l'anti-repetition restent a traiter dans le
  lot d'integration.
- La validation Android/iPhone reelle reste necessaire avant generalisation UX.

---

# English

Status

Accepted

Context

Mobile camera scanning must fill a product identifier without calling a provider
and without sending images to the backend. `BarcodeDetector` provides an
efficient native path on compatible browsers, but support remains incomplete
across mobile platforms and some browsers.

Decision

CollectionMgnt prefers `BarcodeDetector` only when the API exists and reports
real MVP format support through `getSupportedFormats()`.

When native detection is missing or insufficient, the frontend loads
`@zxing/browser` through a dynamic import. This JavaScript fallback stays out of
the initial bundle and is instantiated only for camera scanning.

The scanner processes only local `ean_13` and `upc_a` formats. ISBN-10 is not
advertised as a camera symbology and QR Code remains out of scope.

The scanner knows nothing about plugins, providers or forms. It emits a
normalized raw result that later lots can connect to `isbn` or `barcode` fields.

Consequences

Positive

- The native path minimizes CPU and battery usage when the browser supports it.
- iOS, Firefox and browsers without `BarcodeDetector` can use the ZXing
  fallback.
- The fallback does not increase the initial bundle.
- No image, frame or scanned value is sent or persisted by the scanner.
- Camera streams are stopped after success, close, error and unmount.
- The scanner/provider separation remains aligned with ADR-0008.

Negative

- The first fallback scan pays the ZXing chunk loading cost.
- Business checksum validation and repeated-detection handling remain for the
  integration lot.
- Real Android/iPhone validation is still required before broad UX rollout.
