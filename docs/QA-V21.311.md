# V21.311 – Turniere

## Verhalten

Spielen → Turniere enthält Bronze Cup, Silber Cup, Offenen Cup und den vorhandenen Halloween-Cup. Drei Runden: Viertelfinale, Halbfinale, Finale. Niederlagen setzen den aktuellen Versuch zurück. Nach einem Titel ist ein neuer Versuch möglich. Der erste Turniersieg jeder Ausgabe bleibt als Belohnungsnachweis erhalten, auch während weiterer Versuche. Ausgabewechsel: Donnerstag 19:00 Europe/Berlin. Bereits verdiente ältere Wochenbelohnungen bleiben abholbar.

| Cup | Kader einschließlich Bank | Siegerbelohnung pro Konto und Woche |
| --- | --- | --- |
| Bronze | 40–64 GES | 7.500 Coins + 2 Premium-Goldspieler-Packs |
| Silber | 65–74 GES | 15.000 Coins + 2 Packs mit je 3×83+ |
| Offen | Freie Mannschaft | 20.000 Coins + 2 Picks mit je 1 aus 3, mindestens 84 GES |

Packs und Picks sind untauschbar. Die bestehenden Halloween-Belohnungen werden durch diesen Release nicht verändert. Normale Matchbelohnungen bleiben beim weiteren Spielen bestehen.

## Umsetzung

`tournaments.js` nutzt die bestehende Vorschau, Matchsimulation, Matchverwaltung und Ergebnisverbuchung. Gegner werden aus passenden vorhandenen Spielern aufgebaut; die Zielstärke steigt je Runde. Rosterregeln werden vor Vorschau/Anpfiff und bei Änderungen im Matchmanager geprüft. Gespeicherte Startkadernachweise begleiten die drei Siege. Spielstände nutzen das vorhandene Cloudformat; bestätigte Lieferungen verwenden `challengeClaims` und dessen bestehenden Verlustschutz.

Die neue SQL-Migration ergänzt ausschließlich eine private Receipt-Tabelle und Cup-RPCs. Der Claim prüft Kontoinhaber, Verein, Basisrevision, Turnierwoche, drei verschiedene chronologische Siege und 18 zulässige Spieler je Anpfiff. Coins, zwei Packs bzw. zwei Pick-Entitlements, Cloudrevision und Receipt werden atomar geschrieben. Bei Wiederholung wird dasselbe Receipt zurückgegeben. Die bestehende Pick-Auswahl übernimmt feste Angebote und die endgültige Spielerlieferung.

Private Receipts haben RLS und keine Client-Tabellenrechte. Keine Client-Policies sind beabsichtigt: ausschließlich die authentifizierte, eigentümergeprüfte private Funktion schreibt sie. Der Advisor-Hinweis zu RLS ohne Policy ist hier erwarteter Default-Deny; keine neue Performance-Meldung betrifft Turniere.

## Tatsächlich geprüfte Abläufe

- 1.017 Tests der lokalen Standardsuite bestanden (einschließlich bestehender Account-, Pick-, Reward-, Match- und Cacheprüfungen).
- Isolierte PGlite/Postgres-Engine: unverdiente Claims, falscher Eigentümer, veraltete Revision, wiederholte/verlorene Bestätigung, genaue Packmengen, zwei 84+-Picks, feste Pickoptionen und Spielerlieferung, neue Wochenbelohnung sowie Verlustschutz alter Receipts.
- Browser mit echten Repository-Dateien und Spielerdaten, isoliertem lokalen Spielstand, blockierten externen Diensten: 360/390/412 Pixel ohne horizontalen Überlauf; Übersicht und Siegeransicht visuell geprüft. Gegner aller Cups liegen im erlaubten Ratingband.
- Browser: drei beschleunigte Matchabschlüsse über die echten `startMatch`-/`finishMatch`-Handler, darunter ein injiziertes Elfmeterschieß-Ergebnis; Turniersieg und verdiente Belohnung nach Neuladen erhalten. Dies ist kein Durchlauf einer unbeschleunigten kompletten Simulation und kein Produktionskonto-Test.
- Recovery-Tests: Unterbrechung nach serverseitiger Verbuchung, gleiche Belohnung erneut abholen, kein zweiter lokaler Coin-Zuwachs, Sperre eines anderen Claims sowie Konto-/Vereinswechsel während der Anfrage.
- Produktiv nach Migration ausschließlich lesend geprüft: RPC vorhanden, RLS aktiv, keine anonymen Claims, keine Client-Schreibrechte und bestehender `challengeClaims`-Schutz weiterhin vorhanden. Keine persönlichen Spielstände oder echten Guthaben für Tests geändert.

Die neue GitHub-Workflowdatei wiederholt die gezielten Tests, die SQL-Tests auf isoliertem Postgres und die mobilen Browserprüfungen.
