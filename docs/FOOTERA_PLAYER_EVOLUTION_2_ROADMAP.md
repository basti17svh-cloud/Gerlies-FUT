# FOOTERA – PLAYER EVOLUTION 2.0 | Verbindliche Roadmap (Schritte 12–18)

**Projekt:** Footera – Build Your Era  
**Repository:** `basti17svh-cloud/Gerlies-FUT`  
**Entwicklungsbranch:** `feature/player-evolution-twist-bones`  
**Pull Request:** [#240](https://github.com/basti17svh-cloud/Gerlies-FUT/pull/240) (Draft)  
**Stand der Planung:** 21.11.2026  
**Ziel:** Realistischer, hochwertiger 60-Bone-3D-Fußballspieler ohne Schlurfen, schwebende Füße, Knie-Flattern, unnatürliche Hüfte oder deformierte Körperteile; anschließend belastbare Einbindung in Footera.

> **Verbindliche, chatübergreifende Arbeitsreferenz.** In **jedem neuen Chat** über die Player Evolution diese Datei **und den aktuellen GitHub-Branch/PR sowie laufende GitHub Actions** zuerst prüfen. Eine historische Statusmeldung ersetzt niemals aktuelle Testdaten. Dieses Dokument ist die Roadmap, kein Nachweis dafür, dass Arbeit abgeschlossen wurde.

## Ausgangslage und Freigaberegel

- MetaHuman-/Mixamo-basiertes 60-Bone-Modell, echte WebGL-Videos und QA-Tests existieren im Entwicklungsbranch.
- Schritte 1–11 wurden entwickelt; in Schritt 11 blieben schwebende Standfüße (über 20 cm), Schlurfen bei Backpedal und unnatürliche Root-Y-Korrekturen sichtbar.
- **Schritt 12 – Foot Plant Lock & Natural Gait** ist implementiert, aber erst nach echten Video- und Messprüfungen als abgeschlossen zu bezeichnen. Aktuelle Arbeitsläufe unter GitHub Actions abfragen; Stand bei Anlage: WebGL-QA lief noch.
- **Keine eigenmächtigen Merges oder Änderungen an `main`/Live-Spiel.** Ausschließlich auf dem Entwicklungsbranch arbeiten, PR #240 offen halten. Jede wichtige Änderung mit Tests, aussagekräftiger QA und nachvollziehbaren Vorher-Nachher-Videos dokumentieren.

## Geplante Schritte

### Schritt 12 – Foot Plant Lock & Natural Gait | ABNAHME AUSSTEHEND
**Ziel:** Standfuß in Weltkoordinaten stabil fixieren, realistischen Bodenkontakt und Fußabrollen erzeugen. Kein Schlurfen, keine schwebenden Standfüße, kein Rutschen.  
**Abnahme:** Echtes 60-Bone-WebGL-Video (mind. 15 s, Originalgeschwindigkeit) mit direktem Vorher/Nachher, Walk/Jog/Run/Sprint/Strafe/Backpedal, messbarer Fußdrift, Hover, Penetration und Root-Y-Zuckern; visuelle Sichtung und grüne CI. Keine geschönten Ergebnisse.

### Schritt 13 – Natural Locomotion Engine | GEPLANT
**Ziel:** Ganzheitliches Gangsystem statt isolierter Fußkorrekturen: Schrittlänge/-frequenz passend zur tatsächlichen Root-Geschwindigkeit, phasentreue Wechsel Walk/Jog/Run/Sprint und Rückwärtslaufen, saubere Übergänge und plant-/swing-basierte Fußführung.  
**Abnahme:** Bewegungen im Originaltempo ohne Schlurfen/Fußrutschen oder Root-Speed-Overshoot; Vergleich mit Schritt 12 und quantifizierte Verbesserungen in allen Gangarten. Keine neue Version übernehmen, solange Schritt 12 kritisch fehlschlägt.

### Schritt 14 – Dynamic Turns & Momentum | GEPLANT
**Ziel:** Flüssige 45°-/90°-/180°-Drehungen, Sidesteps, Beschleunigung, Abbremsen und Gewichtsverlagerung; Hüfte/Schultern/Standbein folgen plausibler Dynamik. Keine Drehung „auf der Stelle“ mit gleitenden Füßen.  
**Abnahme:** Richtungswechsel aus verschiedenen Geschwindigkeiten mit stabilem Fußkontakt, intakter Knieachse und dokumentierten Videos ohne Zucken.

### Schritt 15 – Full Body Dynamics | GEPLANT
**Ziel:** Natürliche anatomische Kopplung von Hüfte, Rumpf, Wirbelsäule, Schultern, Armen und Kopf sowie Twist-Bone-/Skinning-Verformungen. Steife Hüfte, seitliches Knie-Flattern und Gummi-Effekte endgültig eliminieren.  
**Abnahme:** Front/Seite/Rückansicht und Zeitlupe **nur ergänzend** zum Echtzeitclip; kein Clipping, Überdehnen oder abrupte Körpersprünge.

### Schritt 16 – Football Movement & Ball Interaction | GEPLANT
**Ziel:** Hochwertige Fußballaktionen: Ballannahme, Dribbling, Passen, Schießen, Tackling, Zweikampf und Übergänge zum Lauf. Fuß-Ball-Kontakt mit Timing, Distanz und Körperbalance synchronisieren.  
**Abnahme:** Echte Interaktionsclips mit verlässlichem Touchpoint, ohne Durchdringung, Ballteleportation oder foot sliding.

### Schritt 17 – Premium Player Appearance | GEPLANT
**Ziel:** Spieleroptik: korrekte Proportionen, Gesichter, Frisuren, Trikots, Haut-/Stoffmaterial, Schuhe, Muskel- und Skinningdeformation. Einheitliches hochwertiges Master-Modell ohne Sonderlayout.
**Abnahme:** Nah-/Fernaufnahmen, verschiedene Körpertypen und Bewegungen, mobile GPU-/Asset-Budget-Prüfung; keine regressiven Verformungen.

### Schritt 18 – Match Integration & Optimization | GEPLANT
**Ziel:** Kontrollierte Einbindung in das echte Footera-Match mit 22 Spielern, Beleuchtung, Broadcast-Kamera, Gameplay-Animationen und Smartphone-tauglicher Performance.  
**Abnahme:** Mobile Regressionstests inkl. FPS/Memory/GPU und realistischer Spielszenen. Erst nach expliziter Freigabe des Nutzers darf ein Merge nach `main` überhaupt erwogen werden.

## Ablauf für neue Chats – verbindlich

1. Diese Datei und `docs/FOOTERA_PLAYER_EVOLUTION_TWIST_BONES.md` lesen; Branch und PR #240 verifizieren.
2. Neueste Workflows/Artefakte/Screenshots/Videos abrufen; **Status von Schritt 12** und ausstehende Fehler beurteilen.
3. Nächsten **unabgenommenen** Schritt mit minimalem Risiko bearbeiten; keine Arbeit als abgeschlossen deklarieren, solange QA oder Video fehlen.
4. Original-Mixamo-Bewegungen und reales WebGL testen. Vorher/Nachher in Echtzeit, klare Kennzahlen, echte Links und offene Fehler melden.
5. Ergebnisse, Entscheidungen und nächsten Schritt hier dokumentieren. Alle Änderungen ausschließlich auf dem angegebenen Entwicklungsbranch; `main` unangetastet.

**Priorität:** Qualität vor Geschwindigkeit. Erst standfeste, natürliche Bewegung, dann Fußball-Interaktionen und Grafik. Die Roadmap darf bei neuen Erkenntnissen angepasst werden, Änderungen aber hier dokumentieren.
