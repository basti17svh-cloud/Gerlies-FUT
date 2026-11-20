# Footera Player Evolution 2.0 – Schritt 2: Master-Prototyp

**Stand:** Separater Branch `feature/player-evolution-step2-master` (auf Schritt 1 aufbauend). Kein Rollout, keine Änderungen an der laufenden Match-Engine und keine Veränderung der Spieler-Datenbank.

## Realer Modellbau

Ausgangsbasis ist der im Footera-Projekt vorhandene MetaHuman-Export. Das neue `footera-evolution-master.glb` wird in einem reproduzierbaren Build erzeugt – **nicht** als fremde Stock-3D-Figur, gerendertes KI-Bild oder alternative Spiellogik. Die alte MetaHuman-Datei bleibt intakt.

`tools/build-player-evolution-master.py` erstellt eine unabhängige GLB-Datei mit:

- Subtil verändertem athletischem Brust-/Rumpf-/Beinvolumen, wobei Körper, Trikot, Hose und Stutzen dieselbe proportionale Umformung erhalten, statt auseinanderzulaufen.
- Geometrisch modellierten (millimeterkleinen) Stofffalten im Trikot und in der Hose sowie zurückhaltenden PBR-Rauigkeitskorrekturen.
- Normierten Skinning-Gewichten bei Erhalt der ursprünglichen anatomischen Gelenkzuordnung. Vollständige 52-Knochen-Hierarchie, vorhandene Gesichts-Morphs, Frisuren und Originaltexturen bleiben erhalten.
- GLB-Quellnachweis/Original-Lizenzhinweisen in Metadaten, Modell- und SHA-256-Informationen.

**Grenze:** Das ist ein neues, separat exportiertes und überarbeitetes Master-Asset **auf Basis des bisherigen MetaHuman-Körpers**, noch kein von Grund auf neu modellierter Mensch. Eine wirklich neue Gesichts- und Haarmodellierung erfordert eigenständige DCC-Arbeit und Referenzen; diese wird nicht fälschlich behauptet.

## Interaktives Vergleichsstudio

`player-evolution-lab.html` bietet echten Three.js/WebGL-Renderbetrieb mit genau einem aktiven geladenen Master oder dem alten MetaHuman-Modell, identischer Kamera und Licht, Vorder- und Rückseite, Gesichts-Nahaufnahme, 360°-Drehung und einfacher technischer Gelenkpose. Das Testtrikot ist in Petrol mit dunkler Hose, Stutzen, Rückennummer 15 und Footera-Beschriftung gehalten. Das bestehende Vereinsdesign-System wird **nicht** geändert.

Der Gelenk-Test dient zunächst als **Deformationsprüfung**, nicht als Behauptung bereits natürlicher Lauf-, Schuss- und Jubelanimation. Diese kommen in Schritt 3.

## Belege

`.github/workflows/player-evolution-master.yml` baut die GLB aus dem originalen Repo-Asset, führt Geometrie-, Skelett- und MetaHuman-Regressionstests durch, rendert die Modelle tatsächlich im Chromium mit Three.js und erzeugt:

- 8 PNGs (alte/neue Ganzkörperfront, Dreiviertel, Rückseite, Gesicht).
- Ein Vorher-Nachher-Kontaktbild als JPEG.
- Ein 4-Sekunden-MP4 mit 360°-Drehung und technischem Gelenk-Test des neuen Masters.
- JSON-Berichte zu Modelländerungen und WebGL-Checks.

Alle Belege werden als GitHub Actions Artifact `footera-player-evolution-step2-proof` angeboten (Aufbewahrung 30 Tage). Nach erfolgreichen Checks wird das generierte Master-GLB ausschließlich in den Step-2-Entwicklungsbranch geschrieben; **kein Merge nach main**.

## Abnahme und nächste Etappe

Schritt 2 ist erst dann als technisch erfolgreich anzusehen, wenn sowohl Geometrie-Tests als auch Browser-Aufnahmen erfolgreich erzeugt wurden. Eine visuelle Verbesserung wird nicht aus grünen Unit-Tests abgeleitet. Vor Veröffentlichung müssen die Bilder und das Video angesehen werden.

**Schritt 3:** Durchgehendes, anatomisch kontrolliertes Bewegungsset in den Pose Director integrieren; Idle/Walk/Jog/Sprint, Richtungswechsel, Ballkontakt, Schuss, Jubel sowie Fuß-/Handkontakt-IK. Gleiche Szene, gleicher Zeitpunkt und Vergleich auf PC und Smartphone. Erst danach Freigabe zur Integration ins Livespiel.
