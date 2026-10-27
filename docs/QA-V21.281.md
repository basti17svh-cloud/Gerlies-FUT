# Footera V21.281 – Rundumprüfung und Fehlerbehebung

Stand: 27.10.2026. Ausgangspunkt: main, `4a4f1d7cca27afe931375757c0a3b30a93b093ea` (V21.280).

## Behobene Fehler

- **Lokales Speichern:** Bei einem Speicherfehler blieb bisher der alte Datenträgerstand erhalten, der Speicherauftrag wurde aber verworfen. Jetzt bleibt der laufende Stand als ungespeichert vorgemerkt und wird bei der nächsten Aktion, beim Fokuswechsel zurück ins Spiel und beim Verlassen erneut geschrieben. Der erste Fehler zeigt einen Hinweis und stößt den bestehenden Cloud-Abgleich an, der den laufenden Stand lesen kann. Wiederholte Fehler lösen keine endlose Kette von Cloud-Abgleichen aus. Ein voller Speicher wird dadurch nicht automatisch vergrößert; bei fortbestehendem Fehler muss der aktuelle Stand bei geöffnetem Spiel synchronisiert oder exportiert werden.
- **Pick-Zustellung:** Eine serverseitig bestätigte Auswahl gilt erst nach erfolgreichem lokalen Schreiben als abgeschlossen. Bei einem lokalen Schreibfehler bleibt die Wiederherstellungsmarkierung erhalten. Erneutes Bestätigen liefert dieselbe Serverquittung und legt den Spieler lokal nicht doppelt ab.
- **Android-Zurück bei Picks:** Das Schließen über die gemeinsame Navigation informiert jetzt den Pick-Controller. Eine unsichtbare offene Auswahl kann dadurch nicht länger weitere Picks und den automatischen Cloud-Abgleich blockieren. Während Öffnung oder Einlösung läuft, bleibt das Fenster geschützt.
- **Offline-Evolutionsauswahl:** Die vorgeladene CSS-Adresse stimmte nicht mit der Hauptseite überein. Der Cache lädt jetzt die tatsächlich eingebundene Version. Eine neue Prüfung gleicht sämtliche lokalen Skript- und Stylesheet-Adressen der Hauptseite mit dem Offline-Cache ab.
- **Prüfautomatik:** Zwei veraltete Testannahmen (20 statt 27 Trikotmuster; alte PlayStyles-CSS-Version) wurden korrigiert. Diese hatten die bisherigen Legacy- und 3D-Browserjobs vor deren Browserphase abgebrochen. Die neuen Speicher- und Pick-Tests sind in die passenden CI-Jobs aufgenommen.

## Prüfung

- 915 Prüfungen aus 131 Standard-Node-Testdateien bestanden. Erfasst sind unter anderem Start/Updates, Konten und Cloud-Konflikte, Rewards, Picks, Packs, Verein/Aufstellung, Markt, SBCs, Evolutions, Karten, Content-Zeitgrenzen und 3D-Szenen.
- Anschließend der zusätzliche Account-Test zur Wiederholung nach lokalem Pick-Schreibfehler ergänzt; alle 118 Account-Tests bestanden. Damit sind 916 verschiedene Prüfungen dieser Standardgruppe erfolgreich.
- Weitere fünf gezielte Matchtests bestanden: Platzverweis, defensive Starttaktik, tatsächlicher Torschütze, Taktik-/PlayStyle-/Schützenauflösung sowie passende Folgeangriffe nach Paraden, Blocks und Ballverlusten.
- Neue Navigationstests prüfen Zurück während einer laufenden Anfrage und nach Abschluss; Speichertests prüfen Quotenfehler, den unveränderten alten Datenträgerstand, spätere Wiederholung, Cloud-Benachrichtigung und Schutz vor verspätetem Schreiben während einer Wiederherstellung.
- Der bestehende mobile Pick-Browsertest wurde um Zurück während einer gehaltenen Serveranfrage sowie normales Schließen und erneutes Öffnen erweitert. Browserprüfung erfolgt über GitHub Actions; im lokalen Arbeitscontainer konnte Chromium nicht heruntergeladen werden.

## Grenzen und offene Abnahme

- Kein echter Zwei-Geräte-Abgleich des persönlichen Kontos, keine echte Mailzustellung und keine Prüfung der installierten Samsung-PWA. Account-/Cloud-Regressionen verwenden isolierte simulierte Sitzungen. Keine produktiven Guthaben, Picks oder Spielstände geändert.
- Vier aufwendige Simulationstestdateien sind nicht als vollständig bestanden gewertet: `chem-boost-balance`, `match-simulation`, `footera-opponent-balancing`, `matchday`. Die fünf oben genannten kurzen Matchtests wurden separat abgeschlossen. Dies ist keine neue Langlauf-Balancing-Abnahme.
- Das beigefügte Content-Konzept vom 25.09. enthält ältere Planungsregeln (z. B. zwei Spieler pro Verein). Für TOTW gilt weiterhin die spätere Vorgabe: höchstens ein Spieler pro Verein und ausdrückliche Freigabe. Ein langfristiges automatisches Content-/Admin-System ist kein erledigter Bestandteil dieser Fehlerbehebung.
- Die fehlgeschlagene TOTW7-Asset-Ausführung vom 27.10. scheiterte am Push auf einen inzwischen geänderten Vorbereitungsbranch; die nachfolgenden separaten Posterläufe waren erfolgreich. Keine Veröffentlichung oder Änderung der geplanten Teams in dieser Prüfung.
