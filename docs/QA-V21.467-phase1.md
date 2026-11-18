# Footera V21.467 – Phase 1: model readiness and calmer secondary motion

Stand: 18.11.2026. Ausgangsbasis `main` V21.466.

## Ursachen und Änderung
1. `3d-highlights.js` startete das 3D-Bild sofort nach Auslösen von `prepareFooteraHumanModel()`. Auch wenn MakeHuman oder der realistische Körper kurz danach fertig geladen waren, klonte `makeScene()` bereits das alte GLB. Nun erhält das Modell vor dem Szenenaufbau bis zu 950 ms für die Basis und bei verfügbarer Basis maximal weitere 450 ms für den realistischen Männerkörper. Abbruch und Timer werden sauber behandelt. Keinesfalls werden 45 Sekunden auf den GLB-Timeout gewartet.
2. `3d-secondary-motion.mjs` berechnete Beschleunigung direkt aus minimalen Head-Bone-Positionsdifferenzen: Seeks, Szenensprünge und Ruckler erzeugten unnatürliche Haar-/Trikotimpulse. Neue Distanzprüfung setzt bei Sprüngen die Feder zurück, ein zeitskaliertes Tiefpassfilter glättet Kopfgeschwindigkeiten. Federdämpfung, maximale Auslenkung und Stoffflattern sind reduziert.
3. Service Worker, Build-Badge und Manifest wurden auf V21.467 synchronisiert. Geänderte Scripts verwenden neue Cache-Adressen.

## Unverändert
Keine Änderung am tatsächlichen Match-Ergebnis, Torwahrscheinlichkeiten, PlayStyles, Transfermarkt, Besitz, Packs, Rewards oder Spielständen. Keine neuen Modelle bzw. externen Asset-Lizenzen.

## Qualitätssicherung / Abnahme
- Unit-Regressionen: `node --test tests/secondary-motion.test.mjs tests/phase1-model-readiness.test.cjs`
- Gesamte Standard-Suite: `node scripts/run-standard-regression.cjs`
- Echte Chromium-Grafikprüfung (360/390/412 px), reale Mobilgeräte und vorher/nachher-FPS müssen separat abgenommen werden.
- Prüfen: Kaltstart mit ausgeschaltetem Cache, wiederholte Highlights, Abbruch während Modell-Download, MetaHuman-/Real-/MakeHuman-Fallback und Torjubel.
- Erwartete Restrisiken: auf langsamer Verbindung ist trotz 1,4 s Maximal-Wartezeit in der ersten Szene noch der MakeHuman-Fallback möglich. Die ausgelieferten Modelle sind nicht durch neue Geometrie ersetzt worden. Ein globaler Qualitäts- oder Performancegewinn ist ohne Gerätemessung nicht nachgewiesen.

## Rückgängig machen
Ein Revert der Phase-1-Commits stellt das Verhalten ohne Migrationen des Spielstands wieder her.
