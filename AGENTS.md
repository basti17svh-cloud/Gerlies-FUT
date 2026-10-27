# Footera – verbindliche Arbeitsgrundsätze

Diese Anweisung gilt für Arbeiten im gesamten Repository. Sie hält Bastis ausdrücklichen Qualitätsanspruch vom 27.10.2026 fest.

## Haltung und Verantwortung

Footera ist Bastis Herzensprojekt. Arbeite konzentriert, präzise und mit der Sorgfalt eines verantwortlichen Mitentwicklers. Verlässlichkeit und ein stimmiges Spielerlebnis haben Vorrang vor schnellen Erfolgsmeldungen. Basti soll Fehler nicht wiederholt selbst entdecken und nachfordern müssen. Setze diesen Anspruch durch überprüfbare Arbeit um; verspreche keine Fehlerfreiheit.

## Umsetzung

- Beginne mit dem aktuellen main und prüfe den tatsächlichen Stand. Bewahre bestehende Änderungen und Spielstände.
- Behebe die belegte Ursache und prüfe angrenzende betroffene Abläufe. Eine ausgeblendete Fehlermeldung ist keine Fehlerbehebung.
- Betrachte Anzeige, Serverbestand, Aktion, Speicherung, erneutes Öffnen und gegebenenfalls Gerätewechsel als zusammenhängenden Ablauf.
- Bei Konto-, Reward-, Pack- und Pick-Änderungen prüfe passende Fehlerfälle: langsame oder verlorene Antwort, Wiederholung, doppelte Auslösung, veraltete Revision sowie Konto-/Vereinswechsel. Keine doppelte Gutschrift und kein unbemerkter Fortschrittsverlust.
- Erfinde keine offenen Belohnungen aus Ladezuständen oder alten Quittungen. Zählungen müssen den bestätigten verfügbaren Bestand wiedergeben.
- Bewahre Eigentümerprüfungen, Revisionsschutz und bestätigte Belohnungen. Verwende für fachliche Konflikte in der eingesetzten PostgREST-Version PT409 statt absichtlich ausgelöstem SQLSTATE 40001.
- Nutze weiterhin das universelle Karten-Masterlayout. Prüfe betroffene mobile Oberflächen bei 360, 390 und 412 Pixeln. Bei ausschließlich für PC beauftragten Änderungen bleibt die Handyansicht erhalten.
- Aktualisiere bei Runtime-Releases Versionsangaben, betroffene Asset-Adressen und Service-Worker-Cache konsistent.

## Nachweis und Kommunikation

- Teste gezielt und mit angemessenem Aufwand. Prüfe, ob Tests das gewünschte Nutzerverhalten belegen oder versehentlich einen Fehler festschreiben.
- Nutze isolierte Testdaten. Verursache keine unnötige Produktionslast; führe Lasttests in einer geeigneten isolierten Umgebung aus.
- Unterscheide lokale Tests, simulierte Backend-Sitzungen, echte Browserprüfungen und reale Geräte-/Produktionsprüfungen.
- Melde nur überprüfte Ergebnisse als erledigt. Laufende Jobs, fehlende Abnahmen und verbleibende Unsicherheiten bleiben ausdrücklich offen.
- Viele bestandene Tests ersetzen weder reale Ablaufprüfungen noch einen Nachweis für hunderte gleichzeitige Spieler.
- Belege Performance-Aussagen durch passende Messungen. Das Ende einer Fehlerschleife ist noch kein gemessener neuer CPU-Prozentwert.
- Berichte klar: Ursache, Änderung, tatsächlich durchgeführte Prüfung und wesentliche offene Punkte. Keine unbelegten Zusicherungen oder behaupteten Hintergrundarbeiten.
