# V21.151 – Kamera älterer Flanken

Auf V21.150 aufgebaut; bestehende Content-, Kosmetik- und SBC-Änderungen erhalten.

- Kameraschwenk bei älteren Flanken, Hereingaben und Rückpässen bis zum Abspiel zurückgehalten; anschließend weich auf den Strafraum ausgerichtet.
- Blick stärker ins Spielfeld und nach unten ausgerichtet, um den Tribünenanteil zu reduzieren.
- Mindestbildwinkel bei hinterlaufenden Außenverteidigern angepasst, damit Mitspieler im Ausschnitt bleiben. Bildwinkel bleibt pro Szene ruhig.
- Die produktive geglättete Kamerafahrt ist direkt prüfbar; neue zwölf Angriffe, Spielerbewegung, Ballverlauf und Simulation behalten ihre bisherigen Abläufe.
- Renderer, Ladeverweis, Offline-Cache und sichtbare Version gemeinsam aktualisiert.

Prüfung: 59 Node-Tests bestanden (`3d-highlights`, `3d-camera-director`, `old-cross-camera`, `new-attacks`). Geber und vollständiges Tor bei 360/390/412 Pixeln in beiden Spielrichtungen geprüft. Echter WebGL-Test `node tests/playbook.browser.cjs --camera-fix`: sechs Szenen, 30 geprüfte Zeitpunkte, mindestens sechs sichtbare Feldspieler, höchstens 163 Draw Calls, keine Browserfehler; Bilder gesichtet. Kein vollständiger Spiel-/Balancinglauf.
