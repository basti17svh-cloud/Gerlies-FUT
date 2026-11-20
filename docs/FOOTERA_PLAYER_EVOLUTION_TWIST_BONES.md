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
- Letzter erweiterter CI-Lauf für die dedizierten Biomechanik-Tests: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44807772039 (**erfolgreich**, 16/16 Unit-/Rig-/Gait-Tests, WebGL-Render und MP4 bestanden). Testartefakt: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44807772039/artifacts/14663259920.

Der A/B-Test auf **derselben 60-Bone-Geometrie** misst eine Änderung der Beckenposition von [0,0,0] auf ca. [15,996 mm seitlich, 11,994 mm vertikal, 0,176 mm vor/zurück] für die ausgewählte Laufphase. Eine geänderte Becken-Quaternion und tatsächliche Bildunterschiede wurden bestätigt. Aufnahmen: `hip-gait-before-after.jpg`, `hip-walk-stiff-before.png`, `hip-walk-natural-after.png`.

### Qualitätsfazit
Die sichtbar animierte Hüfte ist **ein technischer Verbesserungsschritt, kein finaler fotorealistischer Laufstil**. In echten Bildern stehen die Arme weiterhin deutlich zu weit ab; Fußkontakt und natürliche Gewichtsübernahme benötigen die bereits vorhandenen **Footera-Mixamo-Gait-Clips**, Retarget auf 60 Bones und anschließende Fuß-IK. Das bestehende Live-Gameplay bleibt unverändert. Ein rein mathematischer Hüftschwung soll die authentischen Mocap-Daten ausdrücklich nicht dauerhaft ersetzen.

## Folgeschritt: echte Mixamo-Locomotion auf 60 Bones mit Root Motion

**Ausgangslage:** Der bisherige vereinfachte Stand-/Laufzyklus des Teststudios wurde durch die bereits von Footera ausgelieferten, gebackenen Mixamo-Mocap-Daten ersetzt:
- `walk` (32 Frames @ 30 fps), `jog_fwd` (26 Frames @ 30 fps), `run` (20 Frames @ 30 fps), `sprint` (17 Frames @ 30 fps).
- `3d-player-evolution-mocap.mjs` verwendet den vorhandenen `createCaptureRetarget` und übergibt **52 lokale Ziel-Quaternionen** an den expliziten `locomotion`-Layer des PoseDirectors. Das 60-Bone-Rig benutzt dieselben Original-52-Bones plus die acht verformungskorrigierenden Twist-Bones. Gemessene `hipY`-Bewegung wird moderat als Becken-Hub übernommen.
- Kein neues synthetisches Animationsmaterial und keine Änderungen am produktiven Spiel.

**Warum bloße Fuß-IK nicht reichte:** Der reale WebGL-Vortest https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44810721015 zeigte in einer ausgewählten Standphase des `run`-Clips mit fixiertem Root **0,636 m** Versatz des Schuhs vom Aufsetzpunkt. Der begrenzte 2-Bone-IK-Solver konnte das auf **0,457 m** reduzieren; das ist zu viel. Stärkeres Strecken oder Verdrehen der Knie wäre anatomisch falsch.

**Korrekturprinzip:**
- Die für die Standphase erforderliche Vorwärtsbewegung des **gesamten Spielers** wird direkt aus den relativen Schuhpositionen desselben originalen Mixamo-Clips rekonstruiert. Linker Aufsetzpunkt (Phase 0), rechter Aufsetzpunkt (Phase .5); pro Phase eine Root-Translation zur Aufrechterhaltung der Weltkoordinate des jeweiligen Stützfußes. Kontinuierliche Fortführung über beliebige ganze Gangzyklen.
- `3d-player-evolution-foot-ik.mjs` dient danach nur als **begrenzter** Fuß-Feinkorrekturpass. Knie- und Oberschenkel-Quat werden als `ik`-Layer angemeldet; kein zweiter Writer und keine unkontrollierte direkte Mutation der Skelettstruktur.
- Im 3D-Teststudio folgen Kamera und Licht dem tatsächlich nach vorn laufenden Modell. Schalter: 52/60 Bones, Gehen/Joggen/Laufen/Sprinten, Schrittlänge an/aus, Fuß-IK an/aus sowie Seiten-/Frontansicht. Die QA misst den Stützfuß an zwei verschiedenen Zeitpunkten in absoluten Weltkoordinaten und rendert Gegenüberstellungen.

**Geprüfte Teilergebnisse:** Erste echte WebGL-Renderings sämtlicher vier originaler Gangarten auf 52/60 Knochen und eine 6-Sekunden-MP4 (72 reale Renderframes) bereits erfolgreich erzeugt (https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44810721015). Der neue Root-Motion-Unit-Test bestand im ersten Durchlauf; die vollständige finale Regression mit Weltkoordinaten-Messung ist unter https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44812435876 dokumentiert (Status im GitHub-Workflow kontrollieren, nicht vorbehaltlos als bestanden deklarieren).

**Qualitätsgrenzen:** Das ist ein isolierter freier 3D-Lauf auf einer flachen Testfläche. Die Rückkopplung mit der **autoritativen Ingame-Spielerroute**, Ballkontakten, Tor-/Zweikampf-/Cut-Transitions, unebenem Gelände, Boot-Sohlentest, Support-Timing sowie reale Hardware-FPS ist nicht nachgewiesen. Keine Änderung am Live-Renderer oder am Match-Root-Controller, kein PR-Merge.

## Offene Abnahmepunkte

1. **Optische Sichtprüfung echter Deformationen**: Schulter, Ellbogen, Hüfte, Knie, Trikot-/Hosen-/Stutzen-Säume bei Belastung. Der automatisierte Pixelvergleich erkennt Unterschiede, nicht deren ästhetische Qualität.
2. Reale Footera-Animationen einschließlich Mixamo-Sprints, Richtungswechsel, Schüssen und Kontakt/IK im vollständig integrierten Gameplay; keine Überlagerung konkurrierender Bone-Writer.
3. Echte Smartphone-Messung: FPS, RAM, GPU/Shader-Grenzen, thermisches Verhalten und WebGL-Kontextverlust an repräsentativen Geräten.
4. Benutzerfreigabe vor Merge oder irgendeiner Produktionsaktivierung. `main` und das Livespiel bleiben unverändert.

**Abnahmezustand:** Die technische 60-Bone-Implementierung einschließlich Engine-Testnachweis ist erfüllt; optische und mobile Endabnahme steht noch aus. Nicht als fertig für Produktionsspiel veröffentlichen.


## Schritt 4 – Knee Alignment (20.11.2026, isolierter Entwicklungsbranch)

### Technischer Befund
- Die vier unveränderten originalen Adobe-Mixamo-Captures (walk, jog, run, sprint) sind Grundlage sämtlicher Locomotion-Tests.
- Der ursprüngliche Fuß-IK-Solver projizierte die **bereits retargetete Knieposition** als Pole-Vector. Seitliche Retarget-Fehler wurden dadurch unverändert zur bevorzugten Knie-Beugeebene. Eine beckenbezogene anatomische Ebene gab es bisher nicht.
- Aus der GLB-Bind-Pose ergibt sich ein Knie-Pole-Winkel von ungefähr +27 Grad links beziehungsweise -27 Grad rechts gegenüber der becken- und schuhbezogenen Vorwärtsrichtung. Das zeigt die erhöhte Empfindlichkeit bei beinahe gestrecktem Bein, ist aber noch kein vollständiger Beleg für die Stärke des dynamischen Knie-Schlackerns.
- Skinning/Twist-Bones ändern nicht die Knochenachsen und sind daher nicht die primäre Ursache; die vorhandenen Skin-Gewichte bleiben erhalten.

### Isolierte Korrektur
- Anatomischer Vorwärtsvektor aus der echten Schuhspitze in der Bind-Pose relativ zum Becken; diese Referenz dreht mit der Hüfte mit und bleibt nicht im Weltkoordinatensystem stehen.
- Seitliche Knieachse wird in einen begrenzten 14-Grad-Korridor geführt; zulässige lateral-anatomische Bewegung und originaler Knie-Flex bleiben grundsätzlich erhalten.
- Ursprüngliche Mixamo-Quaternions, reale Schrittlänge, Schuh-Weltrotation, Bone-Längen und vorheriger PoseDirector-Zustand bleiben unangetastet. Knieausrichtung und Fußkontakt können unabhängig aktiviert werden.
- Neue UI-Schalter im Studio: Knieachse stabil/original sowie Knie-Nahaufnahme; dieselbe 60-Bone-GLB, Kamera, Zeitphase und Licht bei A/B.
- Automatisierter Test der vier Original-Gangarten und Richtungsrotationen von +/-0,48 Radiant. Der bisherige Cut-Stresstest ist synthetisch; ein echter vollständig integrierter Richtungswechsel-Clip steht für diesen isolierten Test nicht zur Verfügung.
- Automatisiertes Browser-Skript erzeugt Front- und Seitenansichten (vorher/nachher), Vergleichsblatt, zweispaltige echte GLB/WebGL-MP4 sowie Winkel-, Beuge- und Fußmetriken im JSON-Report.

### Abnahmegrenzen
Der Erfolg ist nur dann belegt, wenn die Node- und WebGL-Regressionssuite besteht und die Bilder sowie MP4 manuell überprüft wurden. Ein Pixelunterschied allein ist kein Qualitätsbeweis. Spielwelt-Integration, echter Cut-Mocap, Smartphone-Hardware-FPS und Match-Root sind weiterhin ausgenommen. Keine Übernahme auf main oder in das Livespiel; PR #240 bleibt Entwurf.

### Verifizierter Abschluss dieses CI-Schritts
- GitHub Actions [Lauf 44815764515](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44815764515) erfolgreich (einschließlich Unit-, Skinning-, Capture-, Browser-WebGL- und FFmpeg-Prüfung).
- Reales Testmaterial als [CI-Artefakt 14669776968](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44815764515/artifacts/14669776968): PNG-Front-/Seitenansichten vor/nach Knee Alignment, Kontaktblatt, vier Sekunden synchronisierte A/B-MP4 aus 48 echten Three.js-Renderframes und JSON-Bericht.
- Vier originale Mixamo-Gangarten, vier Phasen und beide Knie ergeben 32 Messungen. Maximale seitliche Abweichung vor/nach dem Pass: 21,25 Grad / 14,00 Grad. Sechs Messpunkte mit über 14 Grad vorher wurden begrenzt; die übrigen bleiben in ihrer Original-Beugeebene. Die gemessenen Knie-Flexionswinkel blieben beim Vergleich identischer Fußziele gleich.
- World-Foot-Regression im flachen isolierten Studio: ursprüngliches In-place-Fußgleiten in der gemessenen Phase ~0,646 m, mit Capture-Root-Travel <0,00001 m. Gilt nicht als Nachweis für ein echtes Match.
- Manuelle Sichtprüfung der echten PNGs und Videoframes: keine erkennbar abgelösten Körperteile; Knieachse in einigen Phasen subtil besser, aber nicht in allen Frames auffällig. Arme, Gesamtbewegung und Fußkontakt wirken teils weiterhin künstlich. Keine visuelle Premium-Abnahme und keine Livespiel-Freigabe.
- PR #240 weiterhin Draft. Hauptbranch und laufendes Spiel unverändert; kein Merge ohne Nutzerfreigabe.

## Schritt 5 – Schulter-/Oberkörper-Ausrichtung: geprüft (20.11.2026)

- Neues optionales, nicht-destruktives `3d-player-evolution-shoulders.mjs`: misst die tatsächlich nach außen zeigende Oberarmrichtung relativ zu Schultergürtel und Torso, senkt nur Abduktionsausreißer auf ca. 34°. Originale Adobe-Mixamo-Laufcaptures und die gemessenen vorwärts/rückwärts gerichteten Armschwunganteile bleiben Quellmaterial.
- Korrekturdaten als `contact`-PoseDirector-Layer nach `locomotion` und vor Fuß-`ik`, ausschließlich `upperarm_l/r`, keinerlei Eingriff in Hauptmodell, Root, Hände, Unterarme, Hüfte, Schuhe oder Skin-Gewichte.
- Verifizierter CI-Lauf: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44818337937 – **erfolgreich**. 40 echte Messpunkte (walk/jog/run/sprint, je 5 Phasen und 2 Arme): Maximum 58,50° vorher / 34,13° nachher; 5 deutliche Ausreißer korrigiert. Echte 3D-Screenshots Front/Seite, synchroner Original-Mixamo-Vorher/Nachher-Film und vollständiger WebGL-Bericht im Artefakt 14672065632.
- Optischer Befund: weniger abgespreizter Oberarm beim Sprint; allerdings liegt die Hand nach dem Eingriff in der extremsten Pose zeitweise zu nahe am Rücken/Gesäß. Damit **noch keine natürliche Premium-Armführung** nachgewiesen. Automatischer Winkeltest ist kein visuelles Gütesiegel.

## Schritt 6 – Echte aufgezeichnete Richtungswechsel: Laborprototyp (20.11.2026)

- Neue eigenständige Kapselung `3d-player-evolution-transitions.mjs` nutzt tatsächlich im Repository vorhandene Adobe-Mixamo-Captures `strafe_left`, `strafe_right` und `jog_back`. Die Quellen werden im identischen 52-Hauptknochen-Retarget (60-Knochen-Modell mit echten Twist-Bones) verarbeitet, nicht durch synthetische Cut-Pose ersetzt.
- Quaternion-Slerp mit glatter Gewichtskurve: echter Laufclip → echte laterale/rückwärtige Aufzeichnung → Laufclip. Ausgangs- und Endposes lassen sich mit den jeweiligen 100%-Originalcaptures vergleichen; die vorhandene Walk/Jog/Run/Sprint-API bleibt unverändert.
- Eigenständige interaktive Labor-Modi für linke/rechte Seitwärtsbewegung und Backpedal; Original-Skinning, Original-Mixamo-Armbewegungen und optionaler Schulter-Pass bleiben erhalten. Keine Zweit-Writer der Knochen, keine Manipulation des Originaldatensatzes.
- Tests prüfen verschiedene Bewegungsrichtungen, 52 Quaternions inklusive Rücksetzen nach dem Sampling, Übergangspunkte, originale Quellposen und FK-Konsistenz der rekonstruierten Fußpositionen. CI rendert eine echte MP4 mit den drei Bewegungsarten sowie Standbilder und ein Kontaktblatt.
- **Offene Einschränkungen:** Diese Vorschau zeigt noch keine physikalisch korrekt berechnete seitliche Root-Trajektorie, Fußfixierung beim echten Cut, Pivot-/Drehimpuls und Mobil-Gerätebenchmark. Sie ist bewusst ein in-place-Skelett-/Skinning-Bewegungstest; nicht als produktionsfertige Match-Cut-Animation deklarieren.
- Erster Prüflauf https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44820410126 scheiterte an einer überstrengen Quaternion-Vergleichsassertion zwischen normalisierten Resultaten und nicht explizit normierten Source-Quat. Der Vergleich wurde auf beide normierten Quaternions korrigiert. Folgelauf: https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44820600653 – bei Erstellung dieser Notiz noch nicht abgenommen.
- PR #240 bleibt Draft; kein Merge und keine Änderung am Livespiel.

## Schritt 7 – Stützfuß-Root im Richtungswechsel (20.11.2026, geprüft)

- Entwicklung ausschließlich in `feature/player-evolution-twist-bones`: `3d-player-evolution-direction-contact.mjs` wertet die echten lokalen FK-Schuhpositionen aus der originalen Adobe-Mixamo-Run/Strafe/Backpedal-Überblendung mit 90 Hz aus. Der jeweils niedrigere Fuß bestimmt mit Hysterese und minimaler Haltezeit den vorläufigen Stützfuß. Beim Stützfußwechsel entsteht der neue Anker an der aktuellen Schuhposition; die Root-Translation bleibt stetig. Root-Geschwindigkeit auf 7,5 m/s begrenzt; die unveränderten Mixamo-Bone-Quaternions werden nicht überschrieben.
- Neuer Studio-Schalter `Stützfuß-Root: an/aus`, getrennt von Knie-/Schulter-Optionen. Vollständige A/B mit identischen Originalcaptures; echte GLB-WebGL-Ansichten, 36-frame synchronisierte Vorher/Nachher-MP4 und JSON-Metriken erzeugt. Die A/B-Screenshots sind wegen der Root-folgenden Kamera **nicht aussagekräftig für die Wegstrecke** (beide Spieler weitgehend zentriert); Vergleich über Schuh-Weltpositionen und Root-Track ist maßgeblich.
- **Erfolgreicher vollständiger GitHub Actions-Lauf:** https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44824505413
- **Originalartefakt:** https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/44824505413/artifacts/14674201364 ; enthält GLB, Original-Skinning, echten Mixamo-Richtungswechsel und QA `direction-foot-contact-real-3d-before-after.jpg`, `footera-direction-foot-contact-3d-before-after.mp4`, `report.json`.
- 3 echte aufgezeichnete Richtungen, je 8 Browser-Prüfzeiten und 90-Hz-Unit-Regression: pro Richtung 10 erkannte Stützfußwechsel; **0** speed-clamping Fälle; Höchstgeschwindigkeit 6,78 m/s links, 6,57 m/s rechts/rückwärts; maximale Stützfußabweichung in den ausgewerteten browserbasierten Stichproben links 1,60 mm, rechts 1,85 mm, rückwärts 1,91 mm. Die auf 90 Hz diskretisierte Stützfußspur liegt in den gespeicherten Rasterwerten an den Footprints (numerische Genauigkeit); der abweichende Stichprobenrest ergibt sich aus zeitlicher Interpolation.
- Die berechnete Root-Spur folgt der gemessenen Schuhbahn: linker Seitwärtsschritt bewegt sich während der aktiven Phase nach links, rechter nach rechts, Rückwärtsclip reduziert während der aktiven Phase die Vorwärts-Z-Komponente; die Animation ist weiter eine Überblendung zwischen Original-Mixamo-Clips.
- **Kritische Grenzen:** Stützfuß wird aus Schuhhöhe **heuristisch** erkannt; echte Bodenberührung und Foot-IK/Schuhsohlenrotation bei Richtungswechseln noch nicht realisiert, kein Welt-Collision-Test, keine Laufgeschwindigkeit/Trägheit mit Match-Root, kein Nachweis für Touchscreen-Hardware-FPS. Die Hände/Arme und der Trikotkörper wirken beim Sprint noch stellenweise steif, die frontal/seitlichen Vergleichsscreenshots machen Wegstrecken optisch nicht erkennbar. **Keine visuelle Premium- oder Live-Gameplay-Freigabe**.
- Nächster fachlich sinnvoller Schritt ist Ground-Contact und IK für die tatsächliche Spielwelt mit Fußabrollung, sauberem Kontaktphase-/Übergangstracking, kontrollierten Hüft-/Kniepositionen, sowie fixed-camera Root-Trajektorie-A/B. Main und Live-Spiel weiterhin unverändert, PR #240 Draft ohne Merge.

## Schritt 8 – Ground Contact & Foot IK 2.0 (20.11.2026, isolierte Implementierung)

**Status:** Änderungen im isolierten Branch umgesetzt; Premium-Sichtabnahme bleibt bis zur Sichtung der neuen echten WebGL-Bilder/MP4 offen. Die GitHub-Actions-Ergebnisse des Step-8-Commits sind separat zu prüfen, bevor ein Test-Erfolg behauptet wird.

### Technische Änderungen
- `3d-player-evolution-foot-ik.mjs`: Im GLB-Standmodell werden Schuhsohlen-Markierungen für Ferse und Zehen aus den niedrigsten **tatsächlich vorhandenen, je Fuß gewichteten Boot-Mesh-Vertices** bestimmt. Falls eine Geometrie keine hinreichenden Foot-Skin-Gewichte hat, ist der **Bone-Fallback explizit diagnostiziert** und darf nicht als gemessene Schuhsohle bezeichnet werden.
- Auf den echten originalen Walk-/Jog-/Run-/Sprint-Mixamo-Clips wird nur im Stützfuß-Intervall ein begrenztes vertikales Knöchelziel (höchstens 7 cm) aus der tatsächlichen Sohle gebildet. Eine gemessene Fersen-/Zehen-Steilheit wird in der Fußrotationsachse gedämpft (höchstens 0,2 rad), primär in der mittleren Standphase. Fersenaufsatz und Zehenabdruck der Capture-Vorlage werden **nicht** durch einen erfundenen Zyklus ersetzt.
- `3d-player-evolution-direction-contact.mjs`: Die bereits bestehende rein Mixamo-basierte Footprint-/Root-Spur liefert außerdem Standalter, geglättetes Stützgewicht und Standphasenanteil. Richtungswechsel-Foot-IK nutzt **nur** den inferierten Stützfuß, die Schwungphase bleibt Mixamo; die Spielerroutenquelle ist unverändert.
- Fuß-IK 2.0 liegt ausschließlich hinter neuen Teststudio-Schaltern und dem bisherigen PoseDirector-`ik`-Layer. Keine Änderungen an 60-/52-Bone-Hierarchien, Originalcapturedaten, Build-Exporter, `main` oder Livespiel. Die schon vorhandene Knee-Alignment-Korrektur bleibt vorgeschaltet.
- Das Studio hat einen eigenen Weltkamera-Schalter. In `window.footeraQaRender` bleibt der neue Ground-Pass standardmäßig ausgeschaltet, um ursprüngliche Step-7-Regressionen A/B identisch fortführen zu können. Über das interaktive Studio ist die Option separat zuschaltbar.

### Automatisierte Qualitätsprüfungen
- Neue `tests/player-evolution-ground-contact.test.mjs` prüfen alle vier echten Gangarten, Foot-Swing/Contact, obere Winkel-/Höhen-Grenzen, Rücksetzbarkeit der IK-Quaternions und alle drei realen Richtungs-Captures.
- Der Browser rendert für alle vier Gangarten plus Links-/Rechts-Strafe und Rückwärtsbewegung echte Bilder mit identischem 60-Bone-Modell, gleicher Szene, gleicher Zeit und **fester Weltkamera**. Ein 60-Frame-FFmpeg-Video legt Foot-IK vorher/nachher synchron nebeneinander: `footera-ground-ik2-fixed-camera-before-after.mp4`.
- Kontaktblatt `foot-ik2-fixed-camera-real-3d-before-after.jpg`, 14 einzelne `foot-ik2-*-before/after.png` und `report.json` werden in den offiziellen GitHub-Actions-Artefakten bereitgestellt, sofern die vollständige CI-Pipeline erfolgreich ausgeführt wird.

### Nicht als gelöst behaupten
- Kontakt ist weiter eine flache Testfläche ohne World-Terrain-Raycasts, echte Sohlendruckmessung oder physische Kollision. Bind-Pose-Markierungen sind eine geometrische Annäherung.
- Realer Match-Root, Ballinteraktion, belastbare Beschleunigungs-/Bremskinetik, Höhenunterschiede und Smartphone-Hardware-Performance sind nicht validiert.
- Automatisierte Quaternion-Grenzen und Bilder sind keine menschliche biomechanische Premium-Abnahme. Schleifende oder schwebende Sohlen können trotz bestandener Unit-Tests auftreten; hierfür sind das Kontaktblatt und die MP4 gezielt zu prüfen.
