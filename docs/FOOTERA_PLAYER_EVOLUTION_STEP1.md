# Footera Player Evolution 2.0 – Schritt 1: technisches Fundament

**Stand:** Isolierter Entwicklungsbranch `feature/player-evolution-step1-rig`. Keine Änderung am Live-Spiel, an `main`, an Spielständen oder an vorhandenen GLB-Assets.

## Festgestellte Risikostellen (Codeprüfung)

In `3d-player-prototype.mjs` arbeiten derzeit mehrere Bewegungsquellen nacheinander auf derselben Figur:

1. Die Ausgangspose wird über `createPlayerSpaceRetarget` aus dem vorhandenen Driver auf das importierte Skelett übertragen.
2. `createUalPoseLayer` und `createGlbClipLayer` steuern zusätzlich Oberkörper/Arme und das Clip-Blending.
3. `createGaitCaptureLayer` fügt importierte Laufanimationen hinzu; `athleticBody` und `leanIntoTurn` ergänzen zeitweise prozedurale Bewegungen.
4. `capturedBody.applyLegs` und `gaitBody.applyLegs` können nacheinander auf Beine wirken.
5. `matchFeet`, `plantFoot`, `liftFoot`, `pinFoot` und `touchFoot` korrigieren nachfolgend die Beine bzw. Füße.
6. `3d-secondary-motion.mjs` verschiebt anschließend Haar- und Trikotvertices im Shader.

**Befund:** Die Reihenfolge und Mehrfachzuständigkeiten sind ein technisch plausibler Risikofaktor für Gelenksprünge, Gummi-Effekte und steife Posen. Die konkrete Ursache einer einzelnen sichtbaren Fehlanimation ist damit **noch nicht nachgewiesen**; dafür benötigen wir reproduzierbare Vergleichsaufnahmen und Laufzeitdiagnostik.

Außerdem laden die bisherigen Spieler zur Laufzeit `footera-humans.glb` (MakeHuman) und anschließend nach Möglichkeit `footera-metahuman.glb`, sonst `footera-real.glb`. Die neue Modellgeneration muss nicht erneut von einem solchen Fallback-Prozess abhängig gemacht werden, ohne dessen Status sichtbar zu machen.

## Umsetzung in diesem Branch

Neu: `3d-player-evolution-rig.mjs` mit

- einem eindeutigen **52-Knochen-Vertrag**, abgeleitet aus der bisherigen Footera-GLB-Exportpipeline (Becken, Wirbelsäule, Arme, Beine, Füße und Finger);
- einer **Skelettprüfung** auf fehlende/doppelte Gelenke, falsche Eltern-Kind-Hierarchien und ungültige Restrotationen sowie einer Hautgewichts-/SkinnedMesh-Prüfung;
- einem **rest-pose-basierten Retargeter**, der Quaternions im Spielerkoordinatensystem statt rohe lokale Eulerwinkel überträgt und das Zielmodell beim Berechnen nicht verändert;
- einem **Pose Director** als einzigen Schreiber auf dem Ziel-Skelett (Basis → Laufbewegung → Aktion → Ballkontakt → IK); eindeutige Zuständigkeiten und explizite Prioritäten statt unkontrollierter Überlagerung;
- automatisierten Tests für Hierarchie, Skinning, gespiegelte/verdrehte Knochen, Seek-Stabilität und Konflikte zwischen Animationsquellen.

Der Retargeter erzeugt **lokale Quaternion-Posen**, der Pose Director setzt sie nach festgelegten Regeln um. Das Live-System importiert diese Module bisher absichtlich nicht.

## Regeln für den neuen Master-Spieler (Schritt 2)

- Nur **ein Rig** pro Körper-Generation; weibliche und männliche Modellvarianten behalten identische Steuer-Namen für bewegliche Gelenke.
- Körper, Trikot, Stutzen, Haare, Gesicht und Schuhe werden korrekt gewichtet und dürfen sich bei extremen Posen nicht ablösen.
- T-/A-Pose, Weltorientierung, Maßstab, Knie-/Ellbogenbeugung und Schuhsohlen sind vor Animationsimport zu validieren.
- Kein zweiter Animator darf ein schon belegtes Gelenk ohne explizite Layer-Priorität überschreiben.
- Ganganimationen, Richtungswechsel und Ballkontakte werden auf realistische Stand- und Schwungphasen geprüft; IK greift zuletzt.
- Niedrige Detailstufen sind für die mobile Webansicht Voraussetzung. Qualität anhand echter Renderbilder und Gerätetests, nicht allein anhand bestandener Unit-Tests, bewerten.
- Ausgangsmaterialien nur mit geprüften Lizenzbedingungen verwenden.

## Abnahme vor Live-Einsatz

1. Alle neuen und relevanten Bestands-Unit-Tests bestehen.
2. Ein einzelner neuer rigged Master-Spieler besteht vollständige Restpose-, SkinnedMesh- und Animationsprüfungen.
3. Sichtbare A/B-Aufnahmen in identischen Szenen (Idle, Walk, Sprint, Abbremsen, 90°-Drehung, Schuss, Torjubel, Torwartparade) ohne abgelöste Körperteile oder Fußrutschen.
4. 360/390/412 px Smartphones und Desktop: Qualität/FPS/VRAM gegenüber bestehendem Modell vergleichen.
5. Erst nach separater Freigabe in die echte Spielansicht übernehmen; `main` bleibt bis dahin unverändert.

**Wichtig:** Schritt 1 liefert das geprüfte technische *Fundament* und eine isolierte Arbeitsgrundlage. Ein neuer detaillierter 3D-Körper, neue Frisuren, Gesichter oder echte Capture-Animationen sind damit **noch nicht erstellt**.
