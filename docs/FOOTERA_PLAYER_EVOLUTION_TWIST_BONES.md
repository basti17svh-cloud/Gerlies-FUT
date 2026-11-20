# Footera Player Evolution 2.0 – Twist-Bones, Skinning und echtes WebGL-QA

**Status (20.11.2026): 60-Bone-Entwicklungsmodell erstellt und automatisierte 3D-Testserie erfolgreich.** Nur `feature/player-evolution-twist-bones`, PR #240 (**Entwurf**); kein Merge, keine Änderung von `main`, keine Aktivierung im Livespiel.

## Nachgewiesene Ursache

`tools/build-footera-metahuman.py` führt ursprüngliche MetaHuman-Twist-/Corrective-Joints dem 52-Knochen-Footera-Rig zu. Die axialen Verformungsinformationen sind damit nicht mehr separat steuerbar.

Im ersten experimentellen Exporter war darüber hinaus die Argumentreihenfolge beim Aufruf von `modify_weights` **vertauscht**: `modify_weights(pos, joints, weights, ...)` statt `modify_weights(pos, weights, joints, ...)`. Da beide glTF-Attribute in Uint8 vorliegen können, blieb die Verwechslung unerkannt. Die semantische Prüfung lehnt solche Verwechslungen nun ausdrücklich ab.

## Implementierung

- Neue echte Twist-Joints `upperarm_twist_l/r`, `lowerarm_twist_l/r`, `thigh_twist_l/r`, `calf_twist_l/r` — zusammen 60 Knochen.
- Zusätzliche Bind-Matrizen, lokale Gelenkpivots und anatomisch begrenzte, nach Elternknochen und Segmentfortschritt ausgewählte Gewichte auf Körper und tatsächlich sichtbarer Kleidung.
- Keine künstliche Gewichtung entfernter Mesh-Bereiche. Ursprüngliche 52 Bones und deren Hierarchie, Positionsgeometrie, Morphs, Materialien und Bilder bleiben erhalten.
- Vier Skinning-Influences pro Vertex, normierte Gewichte und gültige Skin-Indizes.
- Der nicht-live `3d-player-evolution-twist.mjs`-Solver verteilt axiale Drehung als eigene Korrekturstufe **nach** dem 52-Bone-Pose-Commit.
- Experimentelle GLB: `assets/footera/models/footera-evolution-twist-prototype.glb`.
- Echtes Vergleichsstudio: `player-evolution-twist-lab.html` (52-Bone Master vs. 60-Bone Twist GLB).

## Tatsächlich gewichtete Vertices

Zahl pro Twist über Körper, Trikot, Hose und Stutzen. Das ist ein Einflussnachweis und **kein** Beweis für schon perfekte Bewegung.

| Segment | Links | Rechts |
|---|---:|---:|
| Oberarm | 318 | 316 |
| Unterarm | 361 | 359 |
| Oberschenkel | 419 | 407 |
| Wade | 368 | 369 |

## Tests und echte Bilder/Video

**GitHub Actions: erfolgreicher Lauf** [44805902555](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44805902555).

- 13/13 Unit-, Rig-, Skinning- und Quaternion-Tests bestanden.
- Reale Three.js/WebGL/GLTFLoader-Renderbilder von jedem Twist-Bone bei 0°, +45°, +90° und −90°.
- 52/60-Bone-A/B-Bildvergleich bei +90° für alle acht Bones, sichtbare Pixelunterschiede nachgewiesen.
- Technische Lauf-, Schuss- und Richtungswechselposen gerendert; diese sind **keine vollständige Original-Mixamo-Matchanimation**.
- FFmpeg-MP4 aus **72 echten Renderframes**, 12 FPS, 6 Sekunden, Modi axial/walk/cut/kick.
- Mobiler Browser-Smoke-Test bei 412×915: GLB geladen, Skinning-Audit bestanden. **Keine Messung echter Smartphone-GPU-FPS.**
- Playwright ohne Page-Skriptfehler beendet; alle genannten Checks bestanden.
- Testartefakt: [A/B-Screenshots, Vergleichsblatt, MP4, GLB und Prüfbericht (ZIP)](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44805902555/artifacts/14662757858) (GitHub-Artefakte 30 Tage gespeichert).
- Dateinamen im ZIP: `real-3d-before-after-contact-sheet.jpg`, `footera-60-bone-engine-proof.mp4`, `report.json`, `skin-report.json`, Gelenk- und Bewegungs-`.png` sowie die experimentelle `.glb`.

## Sichtprüfung der echten Renderdateien

Die generierten PNGs, das Kontaktblatt und mehrere Frames des MP4 wurden nach dem erfolgreichen CI-Lauf tatsächlich geöffnet und verglichen.

**Befund:** Das 60-Bone-Modell zeigt in den ±90°-Tests andere Deformationen als der 52-Bone-Master. Im Normalmaßstab sind viele dieser Unterschiede jedoch **dezent**; aus dem A/B-Bild folgt noch kein überzeugender Premium-Qualitätssprung. Besonders die Armhaltung und Oberarm-/Schulterpartie wirken in einzelnen Stand- und Bewegungsaufnahmen weiterhin relativ steif. Die Walk-/Kick-/Cut-Aufnahmen sind bewusst synthetische Stressposen und noch **keine** hochwertigen echten Match-Mocap-Sequenzen. In den betrachteten Einzelbildern waren keine völlig losgelösten Körperteile zu erkennen; eine Prüfung jedes einzelnen deformierten Dreiecks ist damit ausdrücklich nicht bewiesen.

**Urteil zur Optik:** technisch funktionsfähiger 60-Bone-Kandidat, **visuelle Premium-Abnahme nicht bestanden / weiter offen**. Nicht mit «realistische Bewegungen fertig» gleichsetzen.

## Folgeanalyse: steife Hüfte im echten Testvideo (20.11.2026)

Das hochgeladene 4,6-Sekunden-Video mit dem 60-Bone-Studio zeigt nur einen **synthetischen Lab-Laufzyklus**, nicht die tatsächlichen Mixamo-Locomotion-Clips des Spiels. Die bisherige Funktion `jointPose()` bewegt ausschließlich Extremitäten und winzige Wirbelsäulenwinkel; `pelvis` fehlt vollständig im Laufzyklus. Die Hüfte bleibt daher fast starr, obwohl Beine und Knie schwingen. Das ist eine **Animation-/Pose-Steuerungsursache**, nicht automatisch ein defekter Hüft-Skin-Exporter.

Die separat analysierte 60-Bone-GLB hat auf dem Short-Mesh im Hüftbereich (Y zwischen .78 m und 1.02 m) **503 von 605 Vertices**, die bereits einen gemischten Anteil von Becken und Oberschenkeln von jeweils über .1 besitzen. Eine willkürliche pauschale Hautgewichtsänderung am Becken ist darum nicht gerechtfertigt.

### Isolierter Hip-Gait-Test (nicht live)
- `3d-player-evolution-gait.mjs`: vorhersagbares Phasen-Sampling für Becken-Yaw/Roll/Pitch, seitliche Gewichtsverlagerung (max. 16 mm), kleine vertikale Beckenbewegung (max. 12 mm), gegenläufige Wirbelsäule, Knie-/Arm-Schwung. Absolutwerte aus der Bind-Pose, keine additive Drift.
- `player-evolution-twist-lab.html`: Schalter „Hüfte: natürlich/bisherige“ plus Hüft-Nahansicht; nur im Entwicklungsstudio.
- `tests/player-evolution-gait.test.mjs`: Grenzen, Periodizität, Gegenbewegungen, stabiler Reset sowie Argumentvalidierung.
- `tests/player-evolution-twist.browser.cjs`: echte WebGL-A/B-Aufnahmen `hip-walk-stiff-before.png` und `hip-walk-natural-after.png` mit identischer 60-Bone-GLB, Pose-Unterschieden und Bewegungsmesswerten.
- Erster Browser-AB-Lauf: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44807745121 (**erfolgreich**).
- Letzter erweiterter CI-Lauf für die dedizierten Biomechanik-Tests: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44807772039 (Status im Actions-Dashboard einsehbar).

### Qualitätsfazit
Die sichtbar animierte Hüfte ist **ein technischer Verbesserungsschritt, kein finaler fotorealistischer Laufstil**. In echten Bildern stehen die Arme weiterhin deutlich zu weit ab; Fußkontakt und natürliche Gewichtsübernahme benötigen die bereits vorhandenen **Footera-Mixamo-Gait-Clips**, Retarget auf 60 Bones und anschließende Fuß-IK. Das bestehende Live-Gameplay bleibt unverändert. Ein rein mathematischer Hüftschwung soll die authentischen Mocap-Daten ausdrücklich nicht dauerhaft ersetzen.

## Offene Abnahmepunkte

1. **Optische Sichtprüfung echter Deformationen**: Schulter, Ellbogen, Hüfte, Knie, Trikot-/Hosen-/Stutzen-Säume bei Belastung. Der automatisierte Pixelvergleich erkennt Unterschiede, nicht deren ästhetische Qualität.
2. Reale Footera-Animationen einschließlich Mixamo-Sprints, Richtungswechsel, Schüssen und Kontakt/IK im vollständig integrierten Gameplay; keine Überlagerung konkurrierender Bone-Writer.
3. Echte Smartphone-Messung: FPS, RAM, GPU/Shader-Grenzen, thermisches Verhalten und WebGL-Kontextverlust an repräsentativen Geräten.
4. Benutzerfreigabe vor Merge oder irgendeiner Produktionsaktivierung. `main` und das Livespiel bleiben unverändert.

**Abnahmezustand:** Die technische 60-Bone-Implementierung einschließlich Engine-Testnachweis ist erfüllt; optische und mobile Endabnahme steht noch aus. Nicht als fertig für Produktionsspiel veröffentlichen.
