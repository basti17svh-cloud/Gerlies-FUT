# Footera – gezielter Schnelltest, 14.10.2026

Geprüfter main: `1af3a73d0e92eae9b247484d42fb2eba45c82fbb`, sichtbare Version V21.145.

## Ergebnisse

- 132 vorhandene Node-Prüfungen bestanden: Konto, Eigentümerzuordnung, Start, Updates, lokale Sicherung/Wiederherstellung, TOTW5-Freigabe und Zeitgrenzen, Wochenwechsel/Belohnungen, Pack-Wiederherstellung, Auktionen, SBC-Abgabe und Evolutions.
- Drei kurze Match-Prüfungen bestanden: Platzverweis, Übernahme der defensiven Starttaktik und Anzeige des tatsächlichen Torschützen.
- Im echten verbundenen Backend wurde die vorhandene Cloud-Speicherfunktion gelesen: dauerhaftes Konto erforderlich, anon ohne EXECUTE-Recht, Eigentümerprüfung beim Lesen und Revisionsprüfung beim Speichern. Ein veralteter Stand wird mit SQLSTATE 40001 abgewiesen. Keine produktiven Datensätze geändert.
- Vier veraltete Testumgebungen korrigiert: Pack-Wiederherstellung, SBC-Abgabe und Evolutions laden die echte Funktion `isFooteraLiveCard`; der Taktiktest erhält die inzwischen erforderlichen Trikot-Testdaten.
- TOTW-Vorgaben in Content-Konzept und den beiden aktiven Planungsprompts auf maximal einen Spieler pro Verein vereinheitlicht. Explizite Freigabe erforderlich; ausbleibende Änderungen sind keine Freigabe. Die alte EA-TOTW-Aufgabe bleibt deaktiviert.

## Zeitgrenzen

TOTW5: 14.10.2026, 19:00 Europe/Berlin; davor TOTW4, danach TOTW5 in Packs und TOTW4 weiter im Archiv. Rivals: Donnerstag, 15.10.2026, 09:00 Europe/Berlin. Die gezielten Zeitgrenzen- und Einmalverbuchungsprüfungen sind bestanden.

## Grenzen

Die Auth-/Cloud-Funktionstests nutzen simulierte Sitzungen; der Backendabgleich war lesend. Tatsächliche Mailzustellung, echter Bestätigungslink, zwei reale Geräte und die installierte Samsung-Android-PWA wurden in diesem Schnelltest nicht abgenommen. Kein neuer vollständiger Mobil-/WebGL-Test und keine Langlauf-Balancing-Abnahme. Der umfassende Simulationslauf wurde zugunsten der drei kurzen Matchprüfungen abgebrochen.

Nur Dokumentation und Tests geändert. Deshalb bleibt die ausgelieferte Anwendung V21.145; kein neuer Runtime-/Cache-Release.

## Wiederholen

```sh
node --test tests/footera-accounts.test.cjs tests/startup-state.test.cjs tests/boot-update.test.cjs tests/footera-backup.test.cjs tests/totw5-release.test.cjs tests/weekly-rewards.test.cjs tests/competition-system.test.cjs tests/pack-recovery.test.cjs tests/market-auctions.test.cjs tests/sbc-submission.test.cjs tests/evolutions.test.cjs
node --test --test-name-pattern='named red card|pregame defensive tactic|real scorer card' tests/match-simulation.test.cjs
```
