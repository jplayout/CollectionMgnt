# Fixtures BnF SRU

Réponses publiques du Catalogue général capturées le 1 octobre 2026 avec
`recordSchema=dublincore`, `maximumRecords=5` et la requête combinée
`(bib.isbn adj "<ISBN>") or (bib.ean adj "<ISBN>")`.

- `isbn-9782813206596.xml` : Le traité des cinq roues, ARK `cb43716047d`.
- `ean-9782952221702.xml` : La Horde du contrevent, ARK `cb401159952` ;
  l'identifiant ISBN est `2952221707`, l'EAN figure dans `dc:description`.
- `isbn-9791036362842.xml` : Murtagh, ARK `cb47357919k`.

Source et conditions de réutilisation :
[API SRU Catalogue général BnF](https://api.bnf.fr/fr/api-sru-catalogue-general),
Licence ouverte de l'État. Les tests lisent ces fichiers locaux ; aucun appel
réseau externe n'est exécuté par les tests permanents.

Public BnF SRU responses captured on 1 October 2026 for offline regression
tests. They exercise ISBN-13, EAN-only edition matching and the 979 prefix.
The EAN fixture intentionally retains the ISBN-10 present in the catalogue.
