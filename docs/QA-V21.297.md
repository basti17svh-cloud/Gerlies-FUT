# V21.297 — Halloween-Team-1-Cup

Stand: 29.10.2026. Zur Veröffentlichung am 30.10.2026 um 19:00 Uhr Europe/Berlin freigegeben; noch nicht veröffentlicht.
Basis: aktueller main 4b9c730 / V21.296.

## Verhalten

- 30.10.2026 19:00 bis 06.11.2026 19:00 Europe/Berlin. Eine vor Ende angepfiffene Partie kann bis zwei Stunden nach Ende abgeschlossen werden.
- Drei gewonnene Runden; nach Niederlage dieselbe Runde erneut. Keine besonderen Kaderanforderungen, normale vollständige Mannschaft erforderlich.
- Viertelfinale: 15.000 Coins. Halbfinale: ein untauschbares 15×-82+-Spieler-Pack. Finale: ein untauschbarer 1-aus-3-Halloween-Team-1-Pick.
- Alle 18 ursprünglichen Team-1-Spieler gleichberechtigt im fest eingefrorenen Pool, einschließlich 84er. Keine SBC-/Objective-Karten oder Team 2. Reguläres Blutmond-Upgrade bleibt über den bestehenden Renderer wirksam.
- Drei feste, verschiedene Angebote pro Pick; Wiederöffnen würfelt nicht neu. Bestehende Pick-Einlösung übernimmt Karten und Duplikate.
- Einmal pro Konto und Stufe, atomare Cloud-Quittungen, Revisionsschutz, wiederholbare Bestätigung bei verlorener Antwort. Kein Eingriff in vorhandene Spielstände durch das SQL-Setup.
- Die Ergebnisse stammen wie bei den bestehenden Offline-Wettbewerben aus der clientseitigen Simulation. Diese Erweiterung ist keine neue serverseitige Anti-Cheat-Validierung der Matchsimulation.

## Durchgeführte Prüfungen

- 975/975 lokale Standardtests bestanden (davon elf neue Cup-/Kontotests). Angrenzende Konto-, Speicher-, Pick-, Belohnungs- und Updateprüfungen enthalten.
- Isolierter PGlite-Test mit @electric-sql/pglite@0.3.14: echte SQL-Skripte und tests/sql/halloween-cup.test.sql bestanden. Der Datenbankname-Guard wurde ausschließlich für die isolierte In-Memory-Datenbank angepasst. Die Testtransaktion stellt die Cup-Zeit auf nach Ende; produktives SQL verwendet now().
- SQL: unverdiente Runde, falscher Besitzer, veraltete Revision, Wiederholung nach verlorener Antwort, einmalige Coins-/Pack-/Pick-Vergabe, unveränderliche Optionen, vollständiger Team-1-Pool, Auswahlzustellung und Schutz vor entfernten Cloud-Quittungen geprüft.
- Browseroberfläche mit isolierten Testdaten bei 360/390/412 Pixeln: visuell geprüft; gemessene documentElement.scrollWidth jeweils exakt 360/390/412, kein horizontaler Überlauf.
- Vollständige lokale Spieloberfläche mit isoliertem Testverein und simulierter Eventzeit: Hub → Cup → Aufstellung → normaler Anpfiff → Ergebnisübergabe → Halbfinale freigeschaltet. Das Testresultat 2:0 wurde absichtlich durch den Test-Harness gesetzt; dies war kein vollständig durchgespieltes Match und keine Prüfung der Simulationsbalance.
- Die Browserkontrolle fand einen fehlenden Spielstilnamen in der Gegner-Vorschau; das Profil enthält nun den lesbaren Namen. Gezielter Test ergänzt.

## Belohnungsanpassung vom 29.10.2026

Auf Bastis Wunsch: 15.000 Coins, ein untauschbares 15×-82+-Spieler-Pack (jeder Spieler mindestens 82 GES) und unverändert der 1-aus-3-Halloween-Team-1-Pick. Anzeige, lokale Zustellung, Cloud-Abgleich und SQL-Vergabe sind angepasst. Der Packtyp reward-82-15 wird über die vorhandene Belohnungspack-Registrierung bereitgestellt und ist nicht im Shop kaufbar.

Nach dieser Anpassung: 32 gezielte Cup-, Konto-, Wettbewerbs- und Pick-Synchronisationstests bestanden; der isolierte PGlite-SQL-Ablauf erneut vollständig bestanden. Keine Veröffentlichung vorgenommen.

## Flexible Promo-Rotation ab 30.10., 19:00 Uhr

Die normale Rotation umfasst 14 verschiedene Tagesmischungen. An sechs von vierzehn Tagen erscheint entweder ein Jumbo-Seltene-Spieler-Pack oder ein Ultimatives Pack, jeweils mit anderen Packs kombiniert. Die übrigen Tage enthalten reguläre Promo-Mischungen. Pro Angebot gelten je nach Tagesmischung 8, 10 oder 12 Käufe; Eventpack-Limits bleiben eigenständig. Alle Geräte verwenden denselben Berliner Tageswechsel um 19 Uhr. Bestehende ausdrücklich terminierte Sonderangebote haben weiterhin Vorrang.

Kaufprüfung und Anzeige verwenden dasselbe aktuelle Angebotsobjekt. Die globalen Packdefinitionen werden nicht verändert. Abgelaufene Kaufbuttons können keine nicht mehr verfügbaren Packs kaufen.

Produktionsschema ausschließlich lesend abgeglichen: Cloud-Speicherfunktion enthält die aktuelle Gastkonto-Unterstützung. Der additive Schutz für Cup-Quittungen prüft die tatsächlich benötigten Eigentümer-/Revisions-/Belohnungsabschnitte statt eines veralteten Kommentars. Isolierte SQL-Prüfung verwendet jetzt ebenfalls die aktuelle Gastkonto-Migration als Basis.

## Vor Veröffentlichung offen

- GitHub-Upload/PR/CI und echter Postgres-Workflow. Der Upload wurde durch automatische Freigabeprüfung wegen fehlender ausdrücklicher Veröffentlichungsfreigabe und als unverifiziert eingestuftem GitHub-Ziel abgelehnt. Kein Umweg wurde genutzt.
- Anwendung der beiden neuen Backend-Skripte auf dem verifizierten Footera-Projekt, anschließende Berechtigungs-/Funktionskontrolle.
- Merge/Pages-Veröffentlichung und Abgleich der ausgelieferten Versions-/Cachedateien.
- Echte Geräteabnahme und vollständiger realer Kontoablauf ab Eventstart. Keine produktiven Belohnungen oder Spielstände wurden verändert.

## Dateien / Reihenfolge

1. online/footera-halloween-cup-v21.297.sql
2. online/footera-halloween-cup-pool-v21.297.sql
3. Runtime-Release erst nach grünen Prüfungen und Backendkontrolle.

Die private Pool-Tabelle wird nur für diesen Cup genutzt. Bestehende normale/Champions-Pick-Pools bleiben unverändert.
