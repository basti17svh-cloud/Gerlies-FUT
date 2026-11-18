# Footera V21.469 · Schritt 1.5

18. November 2026 · [Pull Request #215](https://github.com/basti17svh-cloud/Gerlies-FUT/pull/215) · Basis `main` bei `4d01375`

## Umsetzung

- Die Oberränge bestehen aus modellierten Tritten und Setzstufen. Zugänge, Überstände, Leuchtengehäuse und Dachträger verwenden die bestehende Geometriegruppe. Die neun Bauformen behalten ihre jeweiligen Dächer, Flutlichtmasten, den Stadionbogen, die Kuppel, die Fanwand oder die Bergkulisse.
- Gerundete 3D-Zuschauer, unterschiedlich gefärbte Trikots und gefüllte hintere Reihen erzeugen Tiefe. Vereinsfahnen mit zwei Stoffdesigns, Clubnamen und wellenabhängiger Schattierung verwenden den bestehenden Instancing-Pfad. Auf mobilen Stufen zeichnen Texturflächen die weiter entfernten Fans.
- Der Rasen nutzt zwei Blattdetail-Skalen, 5,83-Meter-Mähstreifen und dezente Abnutzung im Torraum und am Elfmeterpunkt. Die Nachtbeleuchtung ist neutraler, die Beleuchtungsgehäuse sind sichtbar und die Schatten sind weniger dominant.
- Das Tornetz hat eigene Segmente für Rückwand, Dach und Seiten. In Treffernähe bewegt es sich lokal. Die Kugelbahn bleibt an die existierende Matchszene gebunden. Die versetzte Replay-Kamera folgt dem Schuss und zeigt am Ende das gesamte Tor. Nach einer Sichtprüfung wurde der Kamerastand höher gesetzt, damit die Fanblöcke die Sicht freigeben.
- [PR #214](https://github.com/basti17svh-cloud/Gerlies-FUT/pull/214) lieferte die geprüften Ausgangsänderungen für Rasen, Licht und Werbebanden. [PR #213](https://github.com/basti17svh-cloud/Gerlies-FUT/pull/213) wurde auf seine Änderungen an Modellstart und Sekundärbewegung geprüft. Dieser Branch verwendet die freigegebenen Spieler-Assets und Bewegungspfade von `main`.

## Verifikation

| Prüfung | Ergebnis |
| --- | --- |
| Standardregression | 1.414 Tests bestanden |
| WebGL2 · Stadionbau | Alle neun Varianten gerendert. Dach, Oberrang, Masten und jeweilige Zusatzgeometrie geprüft. |
| Produzierter Matchday-Highlight-Ablauf | Bei 360, 390 und 412 CSS-Pixeln jeweils echter MetaHuman, identischer Modellstatus, Tor einmal gezählt und Matchday nach Überspringen wieder aktiv. |
| Matchday-Teammanagement | 17 Browser-Prüfungen bestanden, darunter Bank, Karten, Auswechslungen und Layout in allen drei Breiten. |
| WebGL-Fallback | Kontextverlust gab Matchday wieder frei. Ohne WebGL übernahm die 2D-Toranzeige mit genau einem Treffer. |
| Vollständige Browser-Suite | Der erste lokale Durchlauf erreichte bei 390 CSS-Pixeln das Tor-HUD innerhalb des Test-Timeouts von 30 Sekunden nicht. Der isolierte Screenshot- und Ablaufnachweis lief in allen drei Breiten durch. |
| Hardware | Desktop-Chromium mit SwiftShader und Mobilprofilen. Framerate, Akku und Thermik auf einem physischen Smartphone sind offen. |

### Renderaufwand beim Tor

Die Zahlen stammen aus `WebGLRenderer.info.render` bei identischem Match, Ansichtsbereich und Kamerabild. Draw Calls und Dreiecke sind Arbeitsmengen, aus denen sich keine Geräte-FPS ableiten lassen.

| Breite | Stufe | Dreiecke vorher | Dreiecke nachher | Draw Calls vorher / nachher | Liniensegmente vorher / nachher |
| --- | --- | ---: | ---: | ---: | ---: |
| 360 px | Low | 1.368.574 | 1.313.162 | 292 / 292 | 872 / 2.039 |
| 390 px | Standard | 1.798.194 | 1.736.086 | 274 / 274 | 135 / 2.576 |
| 412 px | Standard | 1.798.194 | 1.736.086 | 274 / 274 | 135 / 2.576 |

## Bildnachweis

Die Angriffs- und Torbilder stammen aus der tatsächlich gerenderten Rivals-Partie in Footera. Das Testprofil nutzt Heimteam gegen Auswärtsteam, Minute 38, feste Trikots, klare Witterung und einen festgelegten Finesseschuss. Der Renderer wird im Test für den Bildvergleich bei 4,40 und 7,08 Szenensekunden angehalten. Die Baseline-Position samt Rotation und Sichtfeld wird auf das Nachher-Bild übertragen. Das Stadionbild zeigt den echten Einlauf bei 2,65 Szenensekunden. Ein zusätzliches Nachher-Bild zeigt die neue Replay-Kamera.

`FOOTERA_CHROMIUM=/pfad/zu/chromium node tests/premium-stadium.browser.cjs /pfad/zu/main-worktree /pfad/zu/bildnachweisen`

`FOOTERA_CHROMIUM=/pfad/zu/chromium node tests/premium-stadium-variants.browser.cjs`

PR #215 bleibt ein Entwurf. Für die Live-Freigabe stehen die visuelle Abnahme und ein Test auf einem physischen Smartphone aus.
