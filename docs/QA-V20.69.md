# Abschließende Prüfung V20.69 – 05.10.2026

V20.69 ergänzt die Online-Korrekturen aus V20.68 um die Bereinigung aller 18 bereits auf V20.67 vorhandenen Testfehler. Ausgangspunkt ist main 5cd368b; kein Reset. Der Bericht QA-V20.68.md dokumentiert die vorherige Zwischenprüfung.

## Vollständige Abnahme

- 263 von 263 Tests bestanden, keine fehlgeschlagenen oder übersprungenen Tests (`node --test tests/*.test.cjs`).
- Nach dem Versionswechsel zusätzlich alle 9 Boot-/Update-Tests bestanden. Hauptskripte und beide Inline-Skripte bestehen `node --check`; `git diff --check` ohne Befund.
- Isolierte Tests laden nun die tatsächlichen aktuellen Preis- und Evolution-Helfer aus der App. Preisgrenzen werden mit Werten oberhalb der Grenze geprüft; gültige aktuelle Icon-Leitpreise bleiben eigenständig getestet.
- Marco-Geschenk: Andere Profile erhalten diesen Anspruch nicht. Bastis eigene zusätzliche Geschenke dürfen weiter gewährt werden. Reload und atomare Speicherung bleiben geprüft.
- Matchmanagement: aktueller Extraktionsmarker, unverbindliche Wechselplanung, Torwartschutz und maximal fünf bestätigte Wechsel geprüft. Elfmeterschießen führt die tatsächlichen zeitgesteuerten Schützen aus und beendet das Spiel erst nach der Entscheidung.
- Kein Änderung an Kartenrenderer, Designs, Marktpreisen oder Geschenkregeln notwendig. Die 18 Befunde waren veraltete isolierte Testumgebungen beziehungsweise Erwartungen.

## Die drei Arbeitspunkte

1. Spielstände, Squad Battles, POTM und Belohnungen: gezielte Tests erhalten Verein, Währungen, Teilpunkte und bereits beanspruchte Belohnungen. Wochenwechsel Montag 09:00 Europe/Berlin und einmalige Abholung nach POTM-Preisnachlass geprüft. In einem separaten Browserverein tatsächlich 20 POTM-Punkte eingereicht und nach Neustart erhalten; 4.250 Coins nach einem Testpack bleiben beim Versionsupdate erhalten.
2. Online-Freundschaftsspiele: zwei getrennte Backend-Sitzungen absolvieren Codeauflösung, Einladung, Annahme, Halbzeit und Abpfiff. Beide sehen dieselbe Rangliste, erneuter Tick zählt das Ergebnis nicht nochmals. Nachricht und Lesebestätigung geprüft. Zusätzlich mobile Browser-Sitzung: Code hinzufügen, Einladung annehmen, Halbzeitbereitschaft, App neu laden und laufendes Matchday aus der Historie wieder öffnen. Reconnect, verspätete Antworten, Ergebnis-Duplikate und neueste 120 Chatnachrichten sind durch die neuen Clienttests abgedeckt. Die Uhr wurde ausschließlich für die beiden QA-Duelle beschleunigt.
3. TOTW: konkurrierende EA-Aufgabe deaktiviert und eigener Auftrag aktiv bestätigt. Vorbereitung Mittwoch 18:45 Europe/Berlin, Aktivierung 19:00 über Datumssperre. 18 männliche Karten, 2 TW/5 Abwehr/6 Mittelfeld/5 Angriff, maximal 2 pro Verein; keine doppelten releaseDate-Einträge. Datumssperre und Oktober-Zeitumstellung getestet.

Die im mobilen Browser bereits geöffnete Rangliste übernimmt den anschließenden Abpfiff automatisch: ein Spiel, 1:0 für Codex Test C, drei Punkte für den Sieger und genau ein Eintrag in der Ergebnis-Historie.

## Grenzen der Abnahme

320/390/430 Pixel wurden im responsiven Browser geprüft, kein physisches Android-Gerät. Der persönliche vorhandene Nutzer-Spielstand ist hier nicht verfügbar; historische rabattierte POTM-Abholung wird deshalb durch gespeicherte Fixtures geprüft. Der nächste tatsächliche automatische TOTW-Lauf am 07.10. kann heute noch nicht bestätigt werden.
