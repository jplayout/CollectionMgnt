# Mobile Camera Validation / Validation Camera Mobile

Document de validation terrain pour le lot 15.2.

Field validation document for batch 15.2.

## Decision / Decision

Etat courant / Current status: **incomplet / incomplete**.

L'Epic 15 ne peut etre marque termine que lorsque Chrome Android et Safari
iPhone ont ete testes sur appareils reels, sans defaut bloquant de permissions,
de cycle de vie camera ou de remplissage de champ.

Epic 15 can be closed only after Chrome Android and Safari iPhone have been
tested on real devices, with no blocking defect around permissions, camera
lifecycle or field filling.

## Deployment Baseline / Base De Deploiement

Les essais doivent utiliser / Tests must use:

- `main` a jour / up-to-date `main`;
- images Docker reconstruites ou recuperees apres le merge 15.1 /
  Docker images rebuilt or pulled after the 15.1 merge;
- URL HTTPS valide, avec certificat accepte par l'appareil mobile /
  a valid HTTPS URL with a certificate trusted by the mobile device;
- cache navigateur actualise si necessaire / refreshed browser cache when
  needed.

Procedure de confirmation frontend / Frontend confirmation procedure:

1. Ouvrir l'URL HTTPS de test sur le mobile.
2. Se connecter avec un compte de test.
3. Ouvrir un formulaire de creation livre et verifier que le bouton `Scanner`
   est visible pres du champ ISBN.
4. Ouvrir un formulaire de creation jeux ou films et verifier que le bouton
   `Scanner` est visible pres du champ `barcode`.
5. Forcer un refresh complet du navigateur si le bouton n'apparait pas apres
   deploiement d'une nouvelle image.
6. Noter la version ou l'image Docker testee dans la matrice ci-dessous.

English:

1. Open the HTTPS test URL on the mobile device.
2. Sign in with a test account.
3. Open the book creation form and check that the `Scanner` button is visible
   near the ISBN field.
4. Open a game or movie creation form and check that the `Scanner` button is
   visible near the `barcode` field.
5. Force a full browser refresh if the button is missing after deploying a new
   image.
6. Record the tested Docker version or image in the matrix below.

Do not collect, store, export or attach camera images, video frames or scanned
frames.

Ne pas collecter, stocker, exporter ou joindre d'image camera, de frame video ou
de frame scannee.

## Device Matrix / Matrice Appareils

Status values / Valeurs de statut: `success`, `failed`, `not tested`.

Adapter values / Valeurs adaptateur: `native`, `ZXing`, `unknown`.

| Platform | Required | Device | OS/version | Browser/version | HTTPS URL | Docker image/version | Test date | Status | Observations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Android Chrome | yes | Android real device | TBD | Chrome TBD | TBD | TBD | TBD | success | Field report: Android already works. Complete exact device, OS, browser and image before merge. |
| Android Samsung Internet | recommended | TBD | TBD | Samsung Internet TBD | TBD | TBD | TBD | not tested | Test if available. |
| Android Firefox | recommended | TBD | TBD | Firefox TBD | TBD | TBD | TBD | not tested | Useful to exercise the ZXing fallback. |
| iPadOS Safari or PWA | blocking fix validation | iPad/tablet real device | TBD | Safari or PWA TBD | TBD | TBD | TBD | failed | Field report before fix: permission granted, modal opens, preview stays black, no detection. Retest required after fix. |
| iPhone Safari | yes | TBD | iOS TBD | Safari TBD | TBD | TBD | TBD | not tested | Required before closing Epic 15. |
| iPhone Chrome | optional | TBD | iOS TBD | Chrome TBD | TBD | TBD | TBD | not tested | Uses WebKit on iOS. |

## Result Columns / Colonnes De Resultat

Use these columns for every test case / Utiliser ces colonnes pour chaque cas:

| Field | FR | EN |
| --- | --- | --- |
| Status | reussi, echoue, non teste | success, failed, not tested |
| Observations | notes terrain, erreurs, comportement visible | field notes, errors, visible behavior |
| Open time | temps approximatif d'ouverture du scanner | approximate scanner opening time |
| Detection time | temps approximatif de detection du code | approximate code detection time |
| Adapter | natif, ZXing ou inconnu si non identifiable | native, ZXing or unknown if not identifiable |

## General Cases / Cas Generaux

| ID | FR | EN | Status | Observations | Open time | Detection time | Adapter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEN-01 | Bouton `Scanner` visible sur champ scannable. | `Scanner` button visible on a scannable field. | not tested |  |  |  | unknown |
| GEN-02 | Permission camera accordee. | Camera permission granted. | not tested |  |  |  | unknown |
| GEN-03 | Permission camera refusee; saisie manuelle disponible. | Camera permission denied; manual input remains available. | not tested |  |  |  | unknown |
| GEN-04 | Camera arriere utilisee. | Rear camera is used. | not tested |  |  |  | unknown |
| GEN-05 | Fermeture par bouton. | Closed with the close button. | not tested |  |  |  | unknown |
| GEN-06 | Fermeture par Escape si clavier disponible. | Closed with Escape when a keyboard is available. | not tested |  |  |  | unknown |
| GEN-07 | Retour correct au formulaire apres fermeture. | Correct return to the form after closing. | not tested |  |  |  | unknown |
| GEN-08 | Reouverture apres fermeture. | Reopened after closing. | not tested |  |  |  | unknown |
| GEN-09 | Plusieurs scans successifs. | Several successive scans. | not tested |  |  |  | unknown |

## Books / Livres

| ID | FR | EN | Status | Observations | Open time | Detection time | Adapter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BOOK-01 | EAN-13 / ISBN-13 valide detecte. | Valid EAN-13 / ISBN-13 detected. | not tested |  |  |  | unknown |
| BOOK-02 | Champ ISBN rempli avec la valeur scannee. | ISBN field filled with the scanned value. | not tested |  |  |  | unknown |
| BOOK-03 | Lookup declenche uniquement par l'action utilisateur decidee. | Lookup triggered only by the decided user action. | not tested | Expected: button `Rechercher`, no automatic lookup after scan. |  |  | unknown |
| BOOK-04 | Suggestion non appliquee automatiquement. | Suggestion is not applied automatically. | not tested |  |  |  | unknown |
| BOOK-05 | Correction manuelle possible apres scan. | Manual correction possible after scan. | not tested |  |  |  | unknown |
| BOOK-06 | ISBN illisible ou checksum invalide signale sans bloquer la saisie. | Unreadable ISBN or invalid checksum reported without blocking input. | not tested |  |  |  | unknown |

## Barcode / Code-Barres

| ID | FR | EN | Status | Observations | Open time | Detection time | Adapter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BAR-01 | EAN-13 valide detecte. | Valid EAN-13 detected. | not tested |  |  |  | unknown |
| BAR-02 | UPC-A valide detecte si un objet reel est disponible. | Valid UPC-A detected if a real item is available. | not tested |  |  |  | unknown |
| BAR-03 | Champ `barcode` rempli avec la valeur scannee. | `barcode` field filled with the scanned value. | not tested |  |  |  | unknown |
| BAR-04 | Aucun lookup automatique Games/Movies tant qu'aucun resolver n'existe. | No automatic Games/Movies lookup while no resolver exists. | not tested |  |  |  | unknown |
| BAR-05 | Recherche par titre toujours disponible. | Title search remains available. | not tested |  |  |  | unknown |

## Real Conditions / Conditions Reelles

| ID | FR | EN | Status | Observations | Open time | Detection time | Adapter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REAL-01 | Faible luminosite. | Low light. | not tested |  |  |  | unknown |
| REAL-02 | Reflet sur emballage brillant. | Reflection on glossy packaging. | not tested |  |  |  | unknown |
| REAL-03 | Code incline. | Tilted code. | not tested |  |  |  | unknown |
| REAL-04 | Code petit. | Small code. | not tested |  |  |  | unknown |
| REAL-05 | Code legerement abime. | Slightly damaged code. | not tested |  |  |  | unknown |
| REAL-06 | Portrait. | Portrait orientation. | not tested |  |  |  | unknown |
| REAL-07 | Paysage. | Landscape orientation. | not tested |  |  |  | unknown |
| REAL-08 | Connexion mobile ou Wi-Fi lent. | Mobile connection or slow Wi-Fi. | not tested |  |  |  | unknown |
| REAL-09 | Temps de chargement du fallback ZXing. | ZXing fallback loading time. | not tested |  |  |  | unknown |

## Defects And Fixes / Anomalies Et Corrections

Only fix issues reproduced on a real device.

Ne corriger que les anomalies reproduites sur appareil reel.

For each fix / Pour chaque correction:

- document device and browser / documenter appareil et navigateur;
- describe the reproducible scenario / decrire le scenario reproductible;
- add an automated test if the case can be simulated / ajouter un test
  automatise si le cas peut etre simule;
- preserve ADR-0004 and ADR-0010 / preserver ADR-0004 et ADR-0010;
- never add lookup or provider logic to `CameraScanner` / ne jamais ajouter de
  lookup ou provider dans `CameraScanner`.

| ID | Device/browser | Scenario | Severity | Status | Fix | Automated test |
| --- | --- | --- | --- | --- | --- | --- |
| IOS-001 | iPadOS tablet, Safari or PWA mode TBD, iPadOS version TBD | Permission granted and modal opens, but the video preview remains black and no barcode is detected. | blocking | fix pending real-device retest | ScannerService now sets `autoplay`, `muted`, `playsInline`, `srcObject`, waits for metadata/dimensions, calls `video.play()`, falls back from `facingMode: ideal` to `video: true`, and reports a dedicated preview/playback error instead of leaving a black modal. | `frontend/e2e/camera-scanner.spec.js` covers `srcObject`, `video.play()`, iOS video properties, play rejection, zero dimensions, close before metadata, constraint fallback and ZXing shared stream. |
| IOS-002 | iPadOS tablet, Safari or PWA mode TBD, iPadOS version TBD | Permission granted, preview appears briefly, then becomes black. | blocking | fix pending real-device retest | The 15.2 correction was insufficient because zero preview dimensions could trigger the fallback constraints branch after a stream had already been obtained. The 15.2.1 correction guarantees one `getUserMedia` call per successful scanner session; `{ video: true }` is attempted only when the first `getUserMedia` rejects before returning a stream. Track `mute`, `unmute` and `ended` events are instrumented in development without camera labels, frames or barcode data. | `frontend/e2e/camera-scanner.spec.js` covers one successful `getUserMedia` call, no second call while dimensions are zero, fallback only on pre-stream rejection, muted track without a reopen loop, ZXing shared stream and close/reopen session boundaries. |
| IOS-003 | iPadOS tablet, Safari or PWA mode TBD, iPadOS version TBD | Safari permission is accepted, camera appears briefly, then the modal closes immediately or the stream is stopped. | blocking | fix pending real-device retest | Audit found no backdrop click, focusout, blur, visibilitychange or global click close path. Closure paths are close button, Escape, scan result, parent `open=false` and unmount. The 15.2.2 correction avoids focusing the close button during permission, adds explicit scanner states, ignores backdrop pointer events during permission/preparing video, requires pointerdown and pointerup to both happen on the backdrop after `scanning`, and logs close reasons in development. | `frontend/e2e/camera-scanner.spec.js` covers normal backdrop close in `scanning`, ignored backdrop during permission, pointerdown before permission plus pointerup after permission, dialog clicks, close button during permission, stable video node, no stop after permission resolution without explicit close, visibilitychange/blur, and Scanner button no-submit behavior. |
| IOS-004 | Safari macOS and iPadOS Safari/PWA, exact versions TBD | Production Docker build shows a preview briefly, then black, but development-only console traces are unavailable in the field. | blocking diagnostic | diagnostic added, retest required | The scanner now exposes an explicitly enabled visible diagnostic panel when the URL contains `cameraDebug=1`. It records safe session, stream, track, video, adapter and lifecycle state in memory only, adds a preview-only switch to disable detection, and provides a copy button for sanitized diagnostic text. | `frontend/e2e/camera-scanner.spec.js` covers hidden-by-default diagnostics, explicit activation, no local/session storage persistence, getUserMedia updates, track mute/ended, srcObject clearing, preview-only without adapters and sanitized copy output. |
| IOS-005 | Safari macOS and iPadOS Safari/PWA, exact versions TBD | ZXing fallback receives a normal decode error after preview starts; the preview turns black because the shared MediaStream is stopped. | blocking | fix pending Safari macOS and iPadOS retest | Root cause proven: `ZxingBarcodeAdapter` calls `reader.decode(video)` directly and previously treated only `NotFoundException` as retryable. `ChecksumException` and `FormatException` now stay retryable, keep the stream attached, schedule the next scan at the existing interval and emit safe diagnostics. Unknown decode errors, import failures and permanent setup errors remain fatal. | `frontend/e2e/camera-scanner.spec.js` covers NotFound, Checksum and Format retries without `onError`, no premature `track.stop` or `srcObject = null`, unknown fatal errors, manual stop cancellation and a Checksum -> NotFound -> valid result flow with preview still active. |

## iPadOS Retest Procedure / Procedure De Retest iPadOS

Use the deployed 15.2.1 image over HTTPS.

Utiliser l'image 15.2.1 deployee en HTTPS.

1. Clear the browser cache or install/open the refreshed PWA.
2. Open a scannable `isbn` or `barcode` field and tap `Scanner`.
3. Grant camera permission.
4. Keep the modal open for at least 10 seconds.
5. Confirm that the preview does not flash then turn black and that the modal
   does not close immediately after permission acceptance.
6. Confirm that the code can be detected or, if the preview cannot start, that
   a user-facing error appears instead of an indefinite black preview.
7. Close and reopen the scanner, then confirm that the second session starts
   only after the first stream has stopped.
8. Record Safari vs PWA mode, iPadOS version, browser version, Docker image,
   open time, detection time and adapter if identifiable.

Development diagnostic logs may be used during retest. They must contain only
session id, `getUserMedia` call count, constraints, stream id, track id,
`readyState`, `muted`, `mute`/`unmute`/`ended`, `srcObject` set/null, stop calls
adapter name, close reason, event type, event target/currentTarget,
`document.visibilityState` and timestamps. Do not collect frames, images,
barcodes or camera labels.

## Visible Diagnostic Panel / Panneau Diagnostic Visible

Use this procedure only for field debugging of the black preview issue.

Utiliser cette procedure uniquement pour diagnostiquer le probleme d'aperçu
noir sur le terrain.

1. Open the same HTTPS production URL and add `?cameraDebug=1`. If the app
   redirects to login, keep `cameraDebug=1` in the final URL.
2. Open the scanner. A small `Diagnostic camera` panel must appear above the
   preview without hiding the video.
3. First test with detection enabled and note whether the preview turns black.
4. Reopen the scanner, enable `Desactiver la detection`, then confirm whether
   the preview remains stable without BarcodeDetector or ZXing.
5. Tap `Copier le diagnostic` and paste the text into the field report.
6. Remove `cameraDebug=1` from the URL after the diagnostic session.

English:

1. Open the same HTTPS production URL and add `?cameraDebug=1`. If the app
   redirects to login, keep `cameraDebug=1` in the final URL.
2. Open the scanner. A small `Diagnostic camera` panel must appear above the
   preview without covering the video.
3. First test with detection enabled and record whether the preview turns black.
4. Reopen the scanner, enable `Desactiver la detection`, then check whether the
   preview remains stable without BarcodeDetector or ZXing.
5. Tap `Copier le diagnostic` and paste the text into the field report.
6. Remove `cameraDebug=1` from the URL after the diagnostic session.

Expected interpretation / Interpretation attendue:

- preview stable with detection disabled: adapter or detection lifecycle likely;
- preview still black with detection disabled: video, stream, CSS or Vue
  lifecycle likely;
- `track mute`, `track ended`, `srcObject cleared`, `stop` or `close` events
  before user close are important observations.

The copied diagnostic may include / Le diagnostic copie peut inclure:

- session id, scanner state and close reason;
- selected adapter: `native`, `zxing` or `none`;
- `getUserMedia`, `video.play`, `stop`, `srcObject` set/null counters;
- stream present/active status and safe generated stream identity;
- number of tracks, `readyState`, `muted`, `mute`/`unmute`/`ended` counters;
- `video.srcObject`, `paused`, `readyState`, `videoWidth` and `videoHeight`;
- detection attempt counters plus separate `notFound`, `checksum`, `format`
  and `fatal` counters;
- document visibility and relative timestamps;
- the 30 most recent safe diagnostic events.

The diagnostic must never include / Le diagnostic ne doit jamais inclure:

- camera images, video frames or scanned frames;
- barcode values;
- secrets, credentials or provider identifiers;
- exact camera labels or device names.

No diagnostic payload is sent to the backend. The option is not persisted in
`localStorage` or `sessionStorage`.

Aucun diagnostic n'est transmis au backend. L'option n'est pas conservee dans
`localStorage` ou `sessionStorage`.

Example sanitized output / Exemple de sortie nettoyee:

```text
Camera diagnostic
sessionId=7
state=scanning
adapter=none
getUserMedia=1
stream=true/true
tracks=1 track(s): live/muted
srcObject=true stable=true
video=4 1280x720 paused=false
play=1 stop=0 srcSet=1 srcNull=0
component=mounted
closeReason=
error=
detection=attempts:3 notFound:1 checksum:1 format:0 fatal:0
visibility=visible
events:
12ms getUserMedia requested
420ms getUserMedia resolved
435ms stream attached
451ms video play resolved
463ms first dimensions
510ms detection retryable ChecksumException
```

## Known Limits / Limites Connues

Out of scope / Hors perimetre:

- QR Code;
- continuous scanning / scan continu;
- sound or vibration / son ou vibration;
- advanced camera selection / selection avancee de camera;
- web resolution of Games/Movies barcodes / resolution web des barcodes
  Games/Movies;
- iCollect import / import iCollect;
- new provider architecture / nouvelle architecture provider.

Known technical limits / Limites techniques connues:

- Safari and Chrome on iOS both use WebKit / Safari et Chrome iOS utilisent
  tous deux WebKit.
- The adapter may be `unknown` from the UI if the browser does not expose enough
  safe information / l'adaptateur peut rester `unknown` depuis l'UI si le
  navigateur n'expose pas assez d'information sure.
- First fallback use can include ZXing lazy-load time / le premier usage fallback
  peut inclure le temps de chargement lazy-load de ZXing.
- iPadOS fix validation still requires a real-device retest after deployment /
  la correction iPadOS necessite encore un retest sur appareil reel apres
  deploiement.
- 15.2.1 specifically prevents a successful stream from being replaced by an
  automatic constraints fallback / 15.2.1 empeche le remplacement d'un flux
  obtenu par un fallback automatique de contraintes.
- 15.2.2 specifically protects the permission return path from accidental
  backdrop/focus-related closure / 15.2.2 protege le retour de permission
  contre une fermeture accidentelle liee au backdrop ou au focus.
- 15.2.3 adds an explicit production diagnostic panel behind `cameraDebug=1`;
  it is a field diagnostic aid, not a replacement for real iPadOS retest /
  15.2.3 ajoute un panneau diagnostic production explicite derriere
  `cameraDebug=1`; c'est une aide terrain, pas un remplacement du retest reel
  iPadOS.
- 15.2.4 keeps normal ZXing decode errors retryable: `NotFoundException`,
  `ChecksumException` and `FormatException` no longer stop the shared stream /
  15.2.4 conserve les erreurs normales de decodage ZXing en retry:
  `NotFoundException`, `ChecksumException` et `FormatException` n'arretent plus
  le flux partage.

## Final Field Report / Rapport Terrain Final

Complete this section after the real-device campaign.

Completer cette section apres la campagne sur appareils reels.

- Tested device/browser matrix / matrice appareils/navigateurs testes:
  Android reported successful; iPadOS tablet failed before correction; exact
  browser mode, iPadOS version and image version still TBD.
- Field results / resultats terrain: Android works; iPadOS permission granted
  but preview black before correction; first iPadOS correction showed the image
  briefly, then black.
- Observed defects / anomalies constatees: IOS-001 black camera preview on
  iPadOS after permission grant; IOS-002 stream appears to become muted or
  replaced after a brief preview; IOS-003 modal closes or stream stops just
  after permission acceptance; IOS-004 production diagnostics needed because
  Safari macOS/iPadOS can reproduce the black preview without development
  console traces; IOS-005 ZXing retryable decode errors could stop the
  MediaStream and leave the modal open with a black preview.
- Fixes applied / corrections eventuelles: IOS-001 frontend scanner startup
  hardening; IOS-002 single-stream-per-session hardening; IOS-003
  permission/backdrop close hardening; IOS-004 explicit visible diagnostic
  panel and preview-only mode; IOS-005 retryable ZXing decode error
  classification, pending real Safari macOS and iPadOS retest.
- Known limits / limites connues: see above
- Decision / decision: Epic 15 incomplete until iPadOS/Safari retest and
  required iPhone Safari row pass
- Commit confirmation / confirmation commit: no commit created
