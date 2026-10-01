# Evolution-Kartendesign V20.07

Alle Evolution-Vorschauen, aktive Spieler ab dem Start und abgeschlossene Upgrades verwenden die gemeinsame Karte mit der freigestellten Vorlage. Bestehende Evolutions werden anhand ihrer Upgrades erkannt. Die Spielerfelder bleiben dynamisch, einschließlich Torwartwerten und Nebenpositionen. Die grüne Sanduhr kennzeichnet weiterhin eine aktive Evolution. Die Größen für Rating und Position berücksichtigen die gemeinsamen Regeln für Bank und Reserve, damit die Flagge in jeder Ansicht ausreichend Abstand hält.

Asset: `assets/footera/card-evolution-v1.webp` (1086 × 1448, transparent, ca. 280 KiB).

Stil: `evolution-card.css`; gemeinsamer Renderer: `cardHTML` in `index.html`. Die Grafik und das Stylesheet sind im Offline-Cache enthalten.

## Asset-Aufbereitung

Die Vorlage wurde mit dem eingebauten Imagegen-Werkzeug bearbeitet. Die PNG-Ausgabe wurde ohne Geometrieänderung in WebP umgewandelt. Der folgende Prompt wurde verwendet:

```text
Use case: precise-object-edit. Asset type: reusable Evolution football player card background for a web game. Image 1 is the edit target and approved visual design. Preserve the exact chrome shield silhouette, peaked top and pointed base, emerald green and violet iridescent crystal shards, dark teal technical grid, all edge detail, the empty dark nameplate at its current position, and the right vertical EVOLUTION lettering and DNA helix. Remove only the example player portrait and shirt, the 84 rating, CM position, German flag, club crest, A. VOSS name, all six stat labels and numbers, and the small stat divider lines. Reconstruct the unobscured dark teal grid behind the removed portrait. Leave all these player-data spaces blank so real player photo, rating, flag, club, name and stats can be overlaid by code. Keep the original 3:4 composition and card position within the canvas, without zooming or rearranging anything. Outside the card silhouette is genuinely transparent alpha, no black rectangular background, no floor, no cast shadow or reflection. Inside the card remains opaque dark teal. No portrait, no person, no numbers, no flags, no club crest, no player name. The only remaining text is the original vertical word EVOLUTION. This is a clean game asset, not a presentation or screenshot.
```
