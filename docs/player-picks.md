# Player Picks — V21.168

Im Store unter „Meine Player Picks“ können angemeldete, bestätigte Konten ihre Belohnungen öffnen. Champions liefert rote, untauschbare 85+-Karten (1 aus 4); Rivals und Squad Battles liefern normale Gold-Picks gemäß ihren Belohnungsstufen.

Der Server speichert Angebote beim ersten Öffnen. Schließen oder erneutes Laden würfelt keine neuen Spieler. Die Bestätigung schreibt genau eine angebotene Karte und die verbrauchte Berechtigung in derselben Datenbanktransaktion. Bereits vorhandene identische Karten landen im SBC-Speicher. Netzwerkfehler können mit „Einlösung abschließen“ wiederholt werden; abweichende Cloud-Versionen erfordern zunächst die Wiederherstellung des aktuellen Cloud-Spielstands.

## Betrieb und Katalog

- `online/footera-player-picks.sql` ist die einmalige Schema-/RPC-Migration. Sie wurde vor dem Frontend ausgerollt. Folgemigrationen separat erstellen, nicht erneut CREATE TABLE ausführen.
- `node scripts/build-pick-catalog.cjs` erzeugt `online/footera-pick-catalog.sql` aus den freigegebenen TOTW-Daten in `footera-app.js` mit vollständigen Werten. Die SQL-Datei bei jeder TOTW-Veröffentlichung anwenden. Zeiten werden in Europe/Berlin berechnet.
- Zusätzliche freigegebene Events benötigen eigene Katalogeinträge mit korrekten Werten und Start-/Endzeit. Der Generator übernimmt derzeit ausschließlich TOTW. Abgelaufene Events gehören nicht in den aktuellen Pool.
- Normale Goldkarten kommen aus dem freigegebenen `footera_live_player_catalog`. Der Katalog ist nur serverseitig lesbar; RLS ohne Client-Lesepolicy ist beabsichtigt.
- Weniger berechtigte Sonderkarten als Optionen (z. B. die neue TOTW fehlt noch im Katalog): seit V21.215 (`online/footera-player-picks-fallback-v21.215.sql`) füllen die zuletzt veröffentlichten Katalogkarten das Angebot auf, jeder Spieler höchstens einmal. Erst wenn auch die nicht reichen, bleibt der Pick erhalten und Öffnen meldet den fehlenden Pool. Es werden keine Ersatzratings erzeugt.
- Testgutschriften erfolgen nur administrativ und mit einem eindeutigen source_key/slot, damit Wiederholung keine zusätzlichen Picks erzeugt.

## Vertrauensgrenze

Anzahl, Mindestwertung, Optionen und Einlösung werden serverseitig bestimmt. Die bisherigen Wettbewerbsergebnisse stammen weiterhin aus dem Cloud-Spielstand des clientseitigen Spiels. Diese Integration macht die Matchresultate nicht serverautoritativ; eine zukünftige Wettbewerbsabsicherung muss Ergebnisse separat verifizieren.

## Prüfung

```sh
node --test tests/champions-player-picks.test.cjs tests/competition-system.test.cjs tests/weekly-rewards.test.cjs tests/champions.test.cjs tests/card-layout.test.cjs tests/footera-accounts.test.cjs
NODE_PATH=/tmp/footera-browser/node_modules node tests/player-picks.browser.cjs
```

Der Browsertest verwendet Playwright 1.51.1/Chromium und prüft 360/390/412 px, lesbare Kartenmaße, Fortsetzen, Bestätigen und idempotente lokale Übernahme. Konto-Tests decken verlorene Antworten und veraltete Cloud-Versionen ab. `online/footera-player-picks.test.sql` prüft echte Datenbanktransaktionen einschließlich fremder Konten, ungültiger Auswahl, wiederholter Einlösung und Duplikaten. Er erzeugt isolierte Testkonten und rollt alle Änderungen zurück; nur administrativ in einer Testumgebung ausführen.
