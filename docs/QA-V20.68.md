# Prüfung V20.68 – 05.10.2026

Ausgangspunkt: aktueller main c080ad7 (V20.67). Kein Zurücksetzen.

## Änderungen

- Offene Online-Ranglisten laden neue Endergebnisse automatisch nach. Verspätete Antworten eines zuvor gewählten Freundes dürfen die neue Auswahl nicht ersetzen. Wiederholte Ergebnis-IDs über Seitengrenzen zählen einmal.
- Nach Wiederverbindung, erneuter Realtime-Anmeldung und Rückkehr zur App werden Duell, ungelesene Nachrichten, aktueller Chat und Rangliste nachgeladen. Offline-/Verbindungsfehler werden im Online-Bereich angezeigt.
- Chats laden die neuesten 120 Nachrichten in zeitlicher Reihenfolge. Eine verspätete Antwort darf keinen inzwischen anders gewählten Chat überschreiben.
- Sichtbare Version, Manifest, Mobilvorschau und Service-Worker-Cache auf V20.68 erhöht. Kartenrenderer, Kartendesigns, Markt, Events und SBC-Anforderungen unverändert.

## Automatisierte Abnahme

70 gezielte Tests bestanden: Startup/Spielstand, Boot-Updates, POTM, Wettbewerbe, Online-Duelle, Synchronisierung, Freunde-Hub und TOTW-Zeitgrenzen. Alle Seiten-Skripte auf JavaScript-Syntax geprüft; git diff --check ohne Fehler.

Prüffälle umfassen den Squad-Battles-Reset am 05.10. um 09:00 Europe/Berlin, erhaltene Währungen/Vereinsbestände/POTM-Teilpunkte, eingefrorene Wochenbelohnungen, einmalige POTM-Abholung nach Preisnachlass, Pack-Wiederherstellung, doppelte Online-Ergebnis-IDs, verspätete Antworten und Reconnect.

Die breitere ursprüngliche Testsuite ist nicht vollständig grün: 18 identische Fehlschläge auf unverändertem V20.67 und auf dem bearbeiteten Stand. Viele isolierte Testkontexte vermissen aktuelle Helfer wie isSpecialPricedItem, SPECIAL_MARKET_MIN, SPECIAL_PRICE_CURVE, isEvolutionItem und stopMatchTimer; weitere Erwartungen betreffen Marco-Geschenk und Matchmanagement. Diese bestehenden Befunde wurden nicht durch Änderungen an Spielsystemen verdeckt.

## Live-Prüfung

- Separater Testverein im Cloud-Browser gegründet. Verein/Währungen bleiben nach Neuladen erhalten; Freundescode und Kopierbutton geprüft.
- Tatsächliche POTM-Teilabgabe: 62er Bronze, 20 Punkte. Warnung vor Entfernung aus dem gespeicherten Team sichtbar; bestätigte Abgabe schreibt genau 20 Punkte. Ein neuer Start der mobilen Ansicht behält diese 20 Punkte und 5.000 Coins.
- Responsive App über die vorhandene HTTPS-Seite tests/mobile-preview.html bei 320, 390 und 430 Pixel Breite geprüft. POTM-Detailansicht ohne horizontalen Dokumentüberlauf; Navigation zum Freunde-Hub funktioniert. Dies ist eine responsive Browserprüfung, kein physisches Android-Gerät.
- Zwei separate anonyme Supabase-Testidentitäten: Codeauflösung, Einladung, Annahme, Halbzeitbereitschaft, Abpfiff und erneute Ergebnisabfrage. Beide erhalten dieselbe Rangliste und je ein gewertetes Spiel; erneuter Tick verändert das Endergebnis nicht. Die Spieluhr wurde ausschließlich für dieses Testduell beschleunigt; normale Spielerduelle wurden nicht verändert.
- Nachricht zwischen beiden Testidentitäten einmal empfangen, Lesebestätigung vom Empfänger gespeichert und vom Absender gelesen. Reconnect im Client zusätzlich durch die gezielten Tests abgesichert.

Der persönliche bestehende Spielstand des Nutzers und ein historischer Spielstand mit bereits erreichtem rabattiertem POTM-Ziel stehen im Browser nicht zur Verfügung. Diese Grenzfälle wurden mit gespeicherten Fixtures geprüft; keine tatsächliche Abholung aus dem Nutzerverein behauptet.

## Veröffentlichungsweg

Die konkurrierende EA-TOTW-Aufgabe ist pausiert. Das eigene Footera-TOTW bleibt aktiv, wird mittwochs 18:45 Europe/Berlin vorbereitet und durch die vorhandene Datumssperre ab 19:00 aktiv. Auftrag: 18 Männer, genau 2 TW, maximal 2 Spieler pro Verein; vorhandene releaseDate-Einträge nicht doppelt erzeugen. Zeitgrenzen vor/ab 19:00 sowie Oktober-Zeitumstellung getestet. Der nächste geplante Lauf ist 07.10.2026; sein tatsächlicher Erfolg kann heute noch nicht abgenommen werden.
