# V21.30 — Vereinswappen und Trikoteditor

Aufbauend auf main 37fdd4ff, ohne Änderungen an Matchsimulation oder Spielerkarten.

- Drei fest eingebaute Sterne, mehrfaches Innenschild und Metallplakette ersetzt durch kompakte Fußballwappen. Sieben eigenständige Konturen, sechs editierbare Vorlagen, fünf Flächenmuster, optionaler Lorbeer und 0–3 Sterne.
- Alle 36 Motive sind färbbare Vektoren. Adler, Löwe, Wolf, Stier und Lilie erhalten flächige Embleme. Grundfläche, Zweitfläche, Symbol, Schrift, Rand und Zierdetails sind unabhängig einstellbar.
- Alte Spielstände erhalten sichere Standardwerte; Vereinsfarben überschreiben individuell konfigurierte Wappenfarben nicht mehr. Speichern, JSON-Weitergabe und Neuladen behalten alle Optionen.
- Größenfehler: `kitHTML(kit, crest)` übergab das Wappen als truthy `mini`. Die Editorvorschau verwendet jetzt ausdrücklich `kitHTML(kit, false, crest)` und 190 × 205 CSS-Pixel. Miniaturen im Kopfbereich bleiben Miniaturen.
- 20 Trikotmuster: sieben zusätzliche Designs (Gegenschärpe, Doppelband, Schachbrett, Rauten, Verlauf, geteilter Mittelstreifen, Kontrastabschlüsse). Normalisierung, Vorschau und 3D-Texturen unterstützen die neuen IDs.
- Asset-Versionen, Manifest und Service-Worker-Cache gemeinsam angehoben.

## Prüfung

64 relevante Node-Tests erfolgreich (Wappen, Vereinsidentität, Cache-/Updateverhalten, betroffene 3D- und bestehende Build-Prüfungen).
Chromium: 360 / 390 / 412 px ohne horizontalen Überlauf, sechs Vorlagen, große Heim-/Auswärtsvorschau samt Wappen, unabhängige Farbwechsel und Sterne, tatsächliches Speichern und Neuladen. Screenshots von Wappen und Trikots visuell geprüft. Keine JavaScript-Ausnahmen.
