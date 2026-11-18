# Footera V21.468 – Grafik-Sprint 1 (Broadcast-Torraum)

Referenzrichtung: grüner TV-Rasen, Flutlicht, sichtbares weißes Netz und grün-schwarze Footera-LED-Banden. Das ist ein **erster gezielter Qualitäts-Pass**, keine fotorealistische 1:1-Umsetzung des Referenzbilds.

## Änderungen
- Rasen-Shader: doppelte Faserdetails, stabile 5,83-m-Mähstreifen, Torraum-/Elfmeterpunkt-Abnutzung, neutralere Flutlicht-Farbwirkung. Bestehender Material-Shader, keine neue Geometrie und keine zusätzlichen Drawcalls.
- 1024-Pixel-Grastextur mit natürlicherer Grünabstimmung; Fallback und Arena arbeiten ohne doppeltes Streifenmuster.
- Weißeres Netz und etwas besser sichtbare Maschen; unveränderte Ball-/Netz-Kontaktmechanik.
- Broadcasting-Licht: zurückhaltenderes neutrales Key/Fill/Rim statt überheller kühler Kanten.
- Standard-Footera-LED-Bande dunkelgrün mit limefarbenen Akzenten; Spezial-Boards bleiben unverändert.
- Offline-Cache/Modulrevision konsistent auf 21468, Anzeige V21.468.

## Verbindliche Abnahme
- Standard- und 3D-Regressionen sowie neue Sprint-1-Assertions.
- Tatsächlicher WebGL-Screenshot auf 360/390/412 Pixeln und Vergleich mit V21.466 (noch separat zu bewerten).
- Low-/Standard-/High-Tier: keine Grafik- oder Speicherregression, keine verlorenen Highlights; Ball-/Tor-/Rewards-/Accounts-Daten unverändert.
- Keine Verschmelzung mit PR #213: dieser Patch basiert isoliert auf main und bleibt bis zur visuellen QA unveröffentlicht.
