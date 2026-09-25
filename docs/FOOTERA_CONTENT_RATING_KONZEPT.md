# Footera – Content- & Rating-Konzept

Stand: 25.09.2026

## 1. Grundidee

Footera bekommt ein eigenes, automatisiertes Live-Content-System mit:

- eigenen Ratings
- eigener Stat-Berechnung
- automatisierter Weekly-Stars-Auswahl
- eigener Event-Spieler-Auswahl
- eigener Footera-Kartensprache
- kontrollierter Power Curve
- möglichst viel Automatik
- manueller Admin-Freigabe als letzte Kontrollinstanz

Grundprinzip:

```
Reale Spielerleistung / Footera-Datenbank
→ Footera Rating Engine
→ Spieler-Auswahl
→ Stat-Boosts
→ Kartendesign
→ Release
```

## 2. Footera Rating Engine

Sichtbare Feldspielerwerte:

**TEM – SCH – PAS – DRI – DEF – PHY**

Diese entstehen aus internen Einzelattributen.

### TEM
- Antritt
- Sprinttempo

### SCH
- Abschluss
- Schusskraft
- Fernschüsse
- Offensivpositionierung
- Volleys

### PAS
- Kurzpass
- Langpass
- Übersicht
- Flanken
- Effet

### DRI
- Ballkontrolle
- Dribbling
- Beweglichkeit
- Balance
- Reaktion
- Ruhe

### DEF
- Defensives Stellungsspiel
- Abfangen
- Zweikampf
- Grätsche
- Kopfball

### PHY
- Stärke
- Ausdauer
- Aggressivität
- Sprungkraft

## 3. Gesamtrating

Das GES ist **nicht** der Durchschnitt der sechs Kartenwerte. Jede Position hat eigene Gewichtungen.

- **ST:** Abschluss, Positionierung, Tempo, Ballkontrolle
- **ZOM:** Dribbling, Übersicht, Kurzpass, Ballkontrolle
- **ZM:** Passspiel, Ballkontrolle, Reaktion, Ausdauer
- **ZDM:** Abfangen, Passspiel, Zweikampf, Stellungsspiel
- **IV:** Defensive Wahrnehmung, Zweikampf, Stärke, Kopfball
- **RV/LV:** Tempo, Ausdauer, Defensive, Passspiel
- **Flügel:** Tempo, Dribbling, Ballkontrolle, Flanken

## 4. Torhüter

Eigenes TW-System:

**HEC – FAN – ABS – REF – SPE – POS**

Das TW-GES wird ausschließlich aus torwartspezifischen Attributen berechnet.

## 5. Basis-Rating-Stufen

- 40–64 = Bronze
- 65–74 = Silber
- 75–79 = Gold
- 80–84 = Starkes Gold
- 85–87 = Topspieler
- 88–90 = Weltklasse
- 91–92 = absolute Weltspitze
- 93+ = normalerweise keine Basiskarten

95–99 sollen erst später in der Saison über Events, Evolutions, Live-Karten und Endgame-Content entstehen.

## 6. Meta Score

GES und Marktwert werden getrennt.

Interner **Footera Meta Score** berücksichtigt u. a.:

- GES
- Tempo
- relevante Positionswerte
- Nebenpositionen
- Skills
- schwachen Fuß
- Spielertyp
- Beweglichkeit
- Körper/Physis
- offensive bzw. defensive Nutzbarkeit

Der Meta Score beeinflusst:
- Marktpreis
- Seltenheit
- Nachfrage
- Event-Auswahl

Ein sehr meta-starker 82er kann dadurch teurer sein als ein langsamer 86er.

## 7. Weekly Stars / Team der Woche

Release: **Mittwoch 19:00 Uhr**

Auswertung der vorherigen Fußballwoche anhand von:
- Einsatzminuten
- Toren
- Assists
- Matchrating
- Chancen
- Passleistung
- Zweikämpfen
- Abfangen
- Clean Sheets
- Paraden
- gehaltenen Elfmetern
- besonderen Match-Momenten

### Positionsabhängiger Performance Score

**ST**
- Tore ca. 30 %
- Assists ca. 10 %
- Abschluss ca. 15 %
- Matchrating ca. 25 %
- Offensivleistung ca. 20 %

**ZM/ZOM**
- Matchrating ca. 25 %
- Assists ca. 20 %
- Chancen ca. 20 %
- Passleistung ca. 20 %
- Tore ca. 15 %

**IV**
- Matchrating ca. 25 %
- Zweikämpfe ca. 20 %
- Abfangen ca. 20 %
- Clean Sheet ca. 20 %
- Passspiel ca. 15 %

**TW**
- Paraden ca. 30 %
- Gegentore ca. 15 %
- Clean Sheet ca. 20 %
- Matchrating ca. 25 %
- Elfmeter/Großchancen ca. 10 %

Spieler werden innerhalb ihrer Positionen miteinander verglichen.

## 8. Weekly-Stars-Kader

Zielgröße: ca. 18 Spieler.

Beispiel:
- 2 TW
- 5 Verteidiger
- 6 Mittelfeldspieler
- 5 Angreifer

### Verbindliche Regel

**MAXIMAL 2 SPIELER PRO VEREIN.**

Weitere Regeln:
- keine dauerhafte Bevorzugung von Top-5-Ligen
- auch kleinere Ligen können vertreten sein
- Mindestspielzeit erforderlich
- nicht ständig dieselben Spieler
- starke Einzelleistungen sollen erkennbar belohnt werden
- Positionsbalance
- Liga- und Nationenvielfalt

## 9. Weekly-Stars-Boosts

Keine pauschalen +2/+3-Boosts. Die Verbesserung richtet sich nach der tatsächlichen Leistung.

Beispiel ZOM mit 2 Toren + 1 Assist:

**Basis 87**
- TEM 86
- SCH 80
- PAS 85
- DRI 92
- DEF 48
- PHY 68

**Weekly Stars 89**
- TEM 87
- SCH 85
- PAS 88
- DRI 94
- DEF 49
- PHY 70

Der größte Boost landet in den Bereichen, die zur Leistung passen.

## 10. Weekly-Stars-Automatik

```
ECHTE SPIELDATEN
→ Footera Performance Engine
→ Positions-Ranking
→ Regelprüfung
→ max. 2 Spieler pro Verein
→ Weekly-Stars-Kader
→ Footera Rating Engine
→ individuelle Stat-Boosts
→ Weekly-Stars-Kartendesign
→ Admin-Freigabe
→ Mittwoch 19:00 live
```

Optional:
- Mittwoch 18:45 automatische Vorbereitung
- ohne Änderung automatische Veröffentlichung um 19:00

## 11. Events

Empfehlung: **ein großes Event ungefähr alle 3 Wochen**.

Rhythmus:
- Event startet
- ca. 2 Wochen Laufzeit
- anschließend ruhigere Content-Phase
- danach neues Event

## 12. Event-Ablauf

Beispiel 14 Tage:

**Tag 1**
- Hauptteam
- SBC-Spieler
- Objectives
- Event-Evolution

**Tag 4**
- Mini Release
- z. B. 3 weitere Spieler

**Tag 7**
- neue SBC / kleine zweite Welle

**Tag 10**
- weiterer Objective-Spieler

Danach Abschlussphase und Vorbereitung des nächsten Events.

## 13. Event-Spieler-Auswahl

Events werden nicht nach Wochenleistung ausgewählt, sondern nach Thema.

Beispiel **Neon Rush**:
- schnelle Spieler
- explosive Flügel
- offensive Außenverteidiger
- agile ZOM/ST

Mögliche Gewichtung:
- 40 % Themen-Passung
- 20 % Meta-/Marktrelevanz
- 15 % Liga- und Vereinsvielfalt
- 15 % bisherige Spezialkarten des Spielers
- 10 % allgemeine Attraktivität

Schutzregeln:
- nicht immer dieselben Superstars
- verschiedene Ligen
- verschiedene Nationen
- verschiedene Vereine
- mehrere Preisklassen
- wenige absolute Chase Cards
- auch günstige und ungewöhnliche Spieler

## 14. Event-Team-Aufbau

Beispiel für 15 Event-Spieler:

- 2 Headliner: ca. 90–91
- 3 sehr starke Karten: ca. 88–89
- 5 mittlere Karten: ca. 85–87
- 5 günstige/ungewöhnliche Karten: ca. 82–84

Die Grenzen hängen von der Saisonphase ab.

## 15. Power Curve

**September/Oktober**
- normale Evos ca. max. 84–86
- hochwertige bezahlte Evo evtl. 87
- Event-Headliner ca. max. 90

**November/Dezember**
- stärkere Karten ca. 87–92

**Frühjahr**
- ca. 90–94

**Endgame**
- ca. 93–97+

**99**
- extrem selten
- nur besondere Endgame-Karten

## 16. Event-Kartendesign

Jedes Event erhält **ein Masterdesign**.

Beispiel Neon Rush:
- dunkler Hintergrund
- Cyan als Hauptfarbe
- Magenta als Sekundärfarbe
- diagonale Neonlinien
- Blitz als Event-Symbol
- eigene Packanimation

Dynamisch eingesetzt werden:
- Spielerbild
- Name
- Rating
- Position
- Nation
- Verein
- Liga
- Stats

Es werden keine fertigen Einzelkarten pro Spieler benötigt.

## 17. Standard-Kartenserien

**Basis**
- Bronze
- Silber
- Gold

**Live**
- Weekly Stars

**Events**
- eigenes Masterdesign je Event

**Entwicklung**
- Evolution

**Prestige**
- Legends / Footera Legends

Alle Karten folgen einem Footera-Masterlayout und bleiben dennoch klar unterscheidbar.

## 18. Admin / Content Control Center

Privater Admin-Bereich mit z. B.:

**WEEKLY STARS 5**
Release: Mittwoch 19:00

Pro Spieler:
- Spieler ändern
- Rating ändern
- Stats ändern
- Position ändern
- Karte entfernen

Automatische Prüfungen:
- max. 2 Spieler pro Verein
- Power Curve
- Dubletten
- zu häufige Spezialkarten
- Positionsbalance
- Liga-/Nationenvielfalt

Buttons:
- Vorschau
- Speichern
- Veröffentlichen

Optional kann Footera vorbereiteten Content automatisch veröffentlichen, wenn bis zur Deadline keine manuelle Änderung erfolgt.

## 19. Zielbild

Footera soll langfristig ein eigenes Live-Service-System haben:

- Weekly Stars automatisch nach realen Leistungen
- Events automatisch nach Thema + Datenbank + Power Curve
- eigene Footera Rating Engine
- leistungs- und positionsabhängige Stats
- eigener Meta Score für Marktpreise
- eigene Footera-Kartendesigns
- Automatik liefert Vorschläge, Admin behält die Kontrolle

## 20. Kurzformel

### Footera Basis
```
Spielerdaten
→ Einzelattribute
→ 6 Kartenwerte
→ positionsabhängiges GES
→ Meta Score
→ Marktwert
```

### Weekly Stars
```
Reale Wochenleistung
→ Performance Score
→ Positions-Ranking
→ max. 2 Spieler pro Verein
→ individuelle Boosts
→ Weekly-Stars-Karte
→ Admin-Freigabe
→ Mittwoch 19:00
```

### Events
```
Event-Thema
→ passende Spielertypen
→ Auswahl-Algorithmus
→ Vielfalt + Power Curve
→ Stat-Boosts
→ Event-Masterdesign
→ SBCs / Objectives / Evo
→ Release
```
