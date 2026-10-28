# V21.289 – Stabilisierungsrunde vom 28.10.2026

## Ausgangsstand und Rückkehrpunkt

- Ausgangspunkt: `main` bei `178e4a313567b9237c51c26e6cc19d4044032ca9`, Runtime V21.288.
- Rückkehrzweig: `stability/baseline-2026-10-28-v21-288` auf diesem unveränderten Commit.
- Vor der Änderung wurden `index.html`, `footera-app.js`, `service-worker.js`, `manifest.webmanifest`, `footera-account.js` und `footera-backup.js` vom echten Pages-Host gelesen: alle sechs bytegleich mit dem Ausgangsstand.
- Die jüngsten Prüfungen des Ausgangsstands einschließlich 3D waren erfolgreich. Ältere Fehlermeldungen vom Vortag wurden nicht als aktuelle Fehler übernommen.

## Ursache und Korrektur

Die Dateiwiederherstellung wartete auf eine IndexedDB-Rückfallsicherung, ohne anschließend den laufenden oder gespeicherten Spielstand erneut zu vergleichen. Neue Aktionen und eine parallele Cloud-Wiederherstellung konnten dadurch überschrieben werden. Nach einem fehlgeschlagenen lokalen Speichern konnte der echte `pagehide`-Handler die importierte Datei beim Neuladen wieder mit dem alten Arbeitsspeicherstand überschreiben. Zwei Importe konnten gleichzeitig laufen.

V21.289 serialisiert Dateiimporte, prüft nach der asynchronen Sicherung erneut laufenden Stand, gespeicherten Stand und aktive Aktionen und bricht bei Änderungen ohne Ersetzung ab. Die abschließende Ersetzung und das Neuladen verwenden die bestehende Speichersperre; bei einem Schreibfehler wird sie zurückgenommen. Offene und unbestätigte Picks sowie POTM-Abgaben blockieren speziell die Dateiwiederherstellung. Die gemeinsam von Konto- und Pick-Abläufen verwendete Aktionsprüfung behält ihre bisherige Bedeutung.

Version, Hauptskript, Backup-Skriptadresse, Manifest und Service-Worker-Cache sind auf V21.289 abgestimmt. Persönliche Spielstände, produktive Belohnungen und freigegebener Content wurden nicht verändert.

## Dauerhafte Prüfung

`node scripts/run-standard-regression.cjs` ermittelt alle Standardtests im Testverzeichnis. Der neue Workflow `Footera Standard Regression` führt sie für Pull Requests und Änderungen an `main` mit Node 22 aus. Ausgeschlossene separate Simulationsdateien werden ausdrücklich ausgegeben: `chem-boost-balance`, `match-simulation`, `more-goals`, `footera-opponent-balancing`. Der bestehende Accounts-Workflow reagiert jetzt auch auf Backup-Code und die zugehörigen Tests.

Vier neue Fehlerfälle schlugen vor der Korrektur fehl. Die neun gezielten Wiederherstellungsfälle und 152 angrenzenden Konto-/Speicher-/Pick-Tests bestanden lokal. Der vollständige Standardlauf enthält 954 Tests in 133 Dateien ohne übersprungene Tests. Alle elf Workflows des endgültigen PR-Stands `3c219fe6629e8d3f18805ff0e04813660067e4ae` wurden erfolgreich abgeschlossen. Der Squash-Commit auf `main` ist `d073a7106549d79e8b2d4062ac7fb3821956c71f`; sein Git-Baum `619470f42d3050c7e6da7c55fc4a8663baea9cb4` stimmt exakt mit dem geprüften Baum überein. Die automatisch erneut gestarteten Main-Läufe sind Wiederholungen desselben Codes und werden hier nicht vor ihrem Abschluss als bestanden gezählt.

Der echte Chromium-PWA-Test verwendet isolierte Daten und prüft Online-/Offline-Start, Entfernung alter Caches, Spielstanderhalt, TOTW-Vorschau mit 18 Porträts bei 360/390/412 px sowie die simulierte 19-Uhr-Grenze. Zusätzlich wird eine Datei offline wiederhergestellt, die IndexedDB-Rückfallsicherung gelesen und ein verspäteter Schreibversuch beim tatsächlichen Neuladen abgewehrt. Der mobile Pick-Test prüft Öffnen, Zurück, erneutes Öffnen, Bestätigen und Lieferung bei 360/390/412 px mit simuliertem Backend.

## Nachweise des endgültigen Stands

- [Änderung und vollständige PR-Prüfungen](https://github.com/basti17svh-cloud/Gerlies-FUT/pull/81)
- [954 Standardtests](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935666)
- [Konten und echte lokale Postgres-Prüfung](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935688)
- [Mobile Pick-Auswahl und Lieferung](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935758)
- [PWA, Offline-Wiederherstellung und TOTW-Zeitgrenzen](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935535)
- [Vollständiger 3D-/WebGL-/Geometrielauf](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935529)
- [Motion Lab](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40688935725)

Mobile TOTW7- und Pick-Screenshots wurden zusätzlich angesehen. Die Chromium-Sitzungen verwendeten isolierte Spielstände und simulierte Backend-Antworten; die SQL-Prüfung lief gegen einen eigenen Postgres im GitHub-Runner. Das sind keine persönlichen Produktionssitzungen.

## Veröffentlichung und Live-Abgleich

[Pages-Veröffentlichung des Runtime-Commits](https://github.com/basti17svh-cloud/Gerlies-FUT/actions/runs/40691609156): erfolgreich. Alle sechs folgenden Dateien wurden anschließend vom echten Live-Host mit HTTP 200 abgerufen und waren bytegleich mit dem geprüften Stand. Sichtbare Version, Hauptskript-/Backup-Adresse, Manifest und Worker-Cache enthalten die abgestimmte V21.289.

| Live-Datei | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 85170 | `76e0d2cfa1d5753bceb1e7e160d0681ef52fb020445477ca6a5ab617f7e8b347` |
| `footera-app.js` | 847888 | `3f6815e49812123ddefc1bfed8638b6740628cb4e6fa1bdec9c44f139b634a59` |
| `service-worker.js` | 11760 | `1ec7fb94a772dff60bec03ea4f1eaa7f8751e7f94a885449a8650e94cfb2a151` |
| `manifest.webmanifest` | 842 | `2f2be4d5ff14ab4fcfd595f998db96a524d98f59a15ed818d7ed89e608225ecb` |
| `footera-account.js` | 104056 | `a6f0d6e2524f540c56250c287a933e0163f993707ed6cdb496994614b824cafc` |
| `footera-backup.js` | 11826 | `c08b5dabd9c0ebc816706d2235171c818950f9967b96b28bc099e3fe9e2b2b91` |

Die neue Standardprüfung, Accounts, Picks, Weekly Rewards, Legacy, Pack-Sicherheit, Crest und Share/Invite waren auch auf `main` erfolgreich. Die automatisch gestarteten Wiederholungen von 3D, Motion Lab, Match Balance und Zeitgrenzen liefen beim Dokumentationsabschluss noch. Für 3D, Motion Lab und Zeitgrenzen liegen bereits die vollständig erfolgreichen PR-Prüfungen des identischen Codes vor; die vier separat ausgeschlossenen statistischen Simulationsdateien werden nicht als neu vollständig bestanden ausgegeben.

## Cloud-Befund ohne Datenänderung

Am 28.10.2026 um 14:28 Berliner Zeit wurde das bestehende Projekt `idxydyrihtyecvfjvtuk` als `ACTIVE_HEALTHY` gemeldet. Die vier untersuchten Cloud-/Pick-Funktionen enthielten keinen ausdrücklichen `40001`-Code mehr; Cloud-Speichern und Gastübernahme enthielten PT409. Die Stichprobe von `pg_stat_activity` zeigte abseits der Diagnose keine aktive Abfrage. Das ist keine CPU- oder Kapazitätsmessung.

Die abgefragten Eigentümer-/Teilnehmer-RLS-Regeln begrenzten Cloud-Saves, Profile, Wallets, Duelle und Nachrichten auf den zugehörigen Benutzer oder Teilnehmer. Die Advisors meldeten unter anderem sechs nicht abgedeckte Fremdschlüssel als INFO, Hinweise auf privilegierte RPCs und Gastzugriff sowie deaktivierten Schutz gegen bekannte kompromittierte Passwörter. Das ist keine abgeschlossene Sicherheitsprüfung; Rechte und Indizes wurden nicht pauschal geändert.

Hinweise zur gezielten späteren Bewertung: [Fremdschlüssel-Indizes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [privilegierte RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Gastzugriff](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins), [Passwortschutz](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Die Logabfrage für 13:30–14:30 Berliner Zeit lieferte nur drei Pooler-Einträge und keine Postgres-Logabdeckung. Daraus wird ausdrücklich keine Fehlerfreiheit oder nachhaltige CPU-Entlastung abgeleitet. Es gab keinen Produktionslasttest und keine Änderung produktiver Spielstände.

## Noch getrennt abzunehmen

- Physisches S24 Ultra mit installierter PWA sowie echter Handy-/PC-Wechsel mit demselben Konto.
- Tatsächliche E-Mail-Zustellung und Wiederherstellung des Kontozugangs.
- Beobachtung des tatsächlichen TOTW7-Livebetriebs nach 19:00. Ein einmaliger rein lesender Prüfauftrag ist für 28.10.2026, 19:05 Europe/Berlin eingerichtet.
- Gemessene dauerhafte CPU-/Speichernutzung und belastbarer Kapazitätsnachweis, falls höhere Spielerzahlen geplant werden.

Für den Gerätetest zuerst den vorhandenen Stand sichern; dann Verein/Guthaben prüfen, ein normales Spiel abschließen, Belohnung einmal erhalten, App vollständig schließen und erneut öffnen. Am zweiten Gerät denselben Konto-/Vereinsstand laden und prüfen, dass ein älterer Stand nicht unbemerkt zurückgeschrieben wird. Dieser Ablauf wurde nicht auf Bastis Geräten behauptet oder durchgeführt.
