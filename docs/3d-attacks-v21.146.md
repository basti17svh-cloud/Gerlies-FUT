# V21.146 – zwölf zusätzliche 3D-Angriffe

Aufgebaut auf main `3a944ca`. Die bisherigen 48 Playbook-Angriffe bleiben erhalten; jetzt 60 Playbook-Angriffe plus die bisherigen 42 Basisszenen und vier Defensivszenen.

| Variante | Sichtbarer Ablauf |
| --- | --- |
| `layoff_distance` | Ablage zurück, direkter Distanzschuss aus etwa 24 Metern |
| `switch_distance_left` | Verlagerung nach links, Annahme und angeschnittener Distanzschuss |
| `near_post_driven_left` | Flache Hereingabe, Stürmer startet zum kurzen Pfosten |
| `near_post_header_right` | Hohe Hereingabe von rechts, Kopfball am kurzen Pfosten |
| `six_yard_square_left` | Vorstoß links, Querpass durch den Fünfmeterraum, Direktabschluss |
| `counter_square_right` | Zwei Angreifer im Konter, Querlegen von rechts |
| `byline_pullback_left` | Hinterlaufen, Rückpass von der Grundlinie auf den zentralen Nachrücker |
| `edge_pullback_right` | Rückpass aus dem rechten Strafraum auf einen Distanzschützen |
| `back_post_volley_left` | Flanke von links, Volley am langen Pfosten |
| `overlap_clipped_right` | Rechter Außenverteidiger hinterläuft und hebt die Flanke zum Kopfball |
| `striker_wall_return` | Stürmer lässt klatschen, startet durch und erhält den Rückpass |
| `diagonal_lob_finish` | Diagonaler Lauf in die Schnittstelle, Steilpass und Lupfer |

Die neuen Szenen verwenden eigene zeitgesteuerte Laufwege und Passfenster. Schusskontakt und Ausrichtung folgen dem tatsächlichen Abschlussort. Direkte Flanken erreichen Kopf beziehungsweise Fuß am Abschlusszeitpunkt, statt zuvor auf den Boden zu fallen. Die bestehende gewichtete Auswahl einschließlich Wiederholungsbremse wählt alle zwölf Szenen regulär aus.

Nur Darstellung: Keine Änderung an Matchsimulation, Ergebnis, Torschützen, Karten, Ökonomie oder Keeper-Bewegungsmodell. Keine zusätzlichen Modelle oder Texturen. Geänderte Module und Offline-Cache sind gemeinsam versioniert.

## Gezielte Prüfung

- `node --test tests/new-attacks.test.cjs tests/playbook-variation.test.cjs tests/3d-highlights.test.cjs tests/attack-flow.test.cjs`: **65/65 bestanden**.
- Ballkontinuität bei Passbeginn, Annahme und Abschluss für Tor, Parade, Pfosten und Fehlschuss; beide Schussseiten.
- Kamera-Projektion aller zwölf neuen Angriffe bei 360/390/412 Pixeln und beiden Spielrichtungen; vollständiges Tor einschließlich Netz vor dem Abschluss.
- Echter WebGL-Schnelltest: **60/60 Szenenzeitpunkte bestanden**, zwölf Bilder, mindestens sechs sichtbare Feldspieler, maximal 166 Draw Calls, keine Browserfehler. Aufruf: `node tests/playbook.browser.cjs --new-attacks` (390 × 340 Pixel).
