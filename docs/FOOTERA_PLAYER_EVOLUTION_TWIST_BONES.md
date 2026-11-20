# FOOTERA PLAYER EVOLUTION – verpflichtende Twist-Bone-Prüfung

**Sicherheitsstatus:** experimentell, ausschließlich Branch `feature/player-evolution-twist-bones` (basiert auf Schritt 2). Keine Änderung am laufenden Spiel oder `main`.

## Bestätigter Befund

Der aktuelle Footera-MetaHuman-Build (`tools/build-footera-metahuman.py`) fasst zahlreiche ursprüngliche MetaHuman-Joints auf das gemeinsame **52-Bone-Rig** zusammen. Insbesondere Twist-/Corrective-Joints werden ihren nächsten Standard-Gelenken zugeordnet. Die feinere Drehdeformation entlang der Arme und Beine geht damit verloren. Das ist eine plausible, noch nicht als alleinige Ursache bewiesene Erklärung für den Eindruck von sich verdrehenden Gummigliedmaßen.

**Neue Pflichtanforderung:** Vor jeder Veröffentlichung des überarbeiteten Spielermodells müssen acht zusätzliche skinningfähige Twist-Joints existieren und richtig animiert werden:

- `upperarm_twist_l/r` – linker und rechter Oberarm.
- `lowerarm_twist_l/r` – linker und rechter Unterarm.
- `thigh_twist_l/r` – linker und rechter Oberschenkel.
- `calf_twist_l/r` – linke und rechte Wade.

Nur benannte Knochen ohne echte Vertex-Gewichte reichen **nicht** aus.

## Isolierter 60-Knochen-Prototyp

- `tools/build-player-evolution-twist.py` baut die separate Datei `footera-evolution-twist-prototype.glb` **aus dem bestehenden** `footera-evolution-master.glb`, ohne diesen zu überschreiben.
- Die acht Twist-Joints werden als zusätzliche Kinder der jeweiligen primären Extremitätenknochen angelegt. Die ursprüngliche Eltern-Kind-Hierarchie der 52 Animationsjoints bleibt unverändert.
- Für jeden Twist-Joint werden eigene Bind-Positionen und inverse Bind-Matrizen erzeugt. Die Gewichtung wird bei geeigneten Körper-, Trikot-, Hosen- und Stutzenvertices neu verteilt. Pro Vertex bleiben maximal vier Skinning-Influences und ihre Summe ist weiterhin 1.
- `3d-player-evolution-twist.mjs` prüft Bindung und Vertex-Einfluss. Die experimentelle Korrektur zerlegt lokale Quaternionen in Swing/Twist und verteilt die axiale Verdrehung graduell. **Der Bewegungs-Driver für die vorhandenen 52 Knochen wird nicht überschrieben.**
- `tests/player-evolution-twist.test.mjs` kontrolliert Knochenhierarchie, Geometrie-Unverändertheit, echte Vertex-Gewichte, Rücksetzbarkeit, wiederholte Posen und einen 90°-Twist-Test.
- CI erstellt Modell und Testbericht als herunterladbares GitHub-Artefakt und schreibt den Prototyp nach erfolgreichem Check nur auf den Twist-Branch.

## Prüfung des ersten Prototyps (20.11.2026)

**Blockiert – keine fertige 60-Bone-GLB veröffentlicht.** Der GitHub-Actions-Lauf ist absichtlich an der Bedingung gescheitert, dass jedes Twist-Gelenk mindestens 20 tatsächlich gewichtete Körpervertices haben muss. Im 52-Bone-Quellmodell hat der Oberarm links nach der ersten Diagnose lediglich 62 stark von `upperarm_l` beeinflusste Körpervertices, der linke Oberschenkel nur wenige. Die korrekte räumliche Auswahl für Twist-Influences ist damit noch nicht zuverlässig möglich.

**Technische Konsequenz:** Nicht die Anzahl der Twist-Joints manipulieren und keine entfernten Körpervertices künstlich an diese Joints binden. Zuerst müssen die Limb-Skinning-Gewichte des Quell-Exports überprüft und gegebenenfalls neu von der MetaHuman-DNA auf den Footera-Rig übertragen werden. Dann die acht Twist-Joints mit korrekter Bindepose, Einflusszonen und Video-A/B-Test erneut erzeugen. Bis dahin **nicht mergen**.

## Wichtige Abnahmebedingungen

Das neue 60-Knochen-Modell darf **nicht** wegen bloßer grüner Unit-Tests ins Live-Spiel gelangen. Zusätzlich erforderlich:

1. Tatsächliche 3D-A/B-Aufnahmen mit **reinen axialen Verdrehungen** der Ober-/Unterarme und Ober-/Unterschenkel (±90°), einschließlich 0°, 45° und 90°, ohne Nahtöffnung oder Texturzerreißen.
2. Realistische Lauf-, Schuss-, Arm- und Richtungswechselanimationen, ohne Verdopplung der Twist-Rotation. Kritisch: Schulter-zu-Oberarm, Handgelenk und Hüfte/Knie.
3. Test der 60-Bone GLB-Datei in Three.js auf PC und Smartphone einschließlich Performance und WebGL-Kontextverlust.
4. Ein explizites Freigabesignal, **bevor** alte GLBs ersetzt oder neue Bewegungen in den Liveszenen aktiviert werden.

**Nicht behaupten:** Die zusätzliche Gelenkstruktur alleine garantiere anatomisch perfekte Körperverformung. Gewichte, Posen, Gelenklimits und der gesamte Animationsstapel müssen gemeinsam geprüft werden.
