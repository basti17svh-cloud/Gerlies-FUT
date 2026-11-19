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

## Sound hören (Earshot)

- Wer Sounds ändert oder beurteilt (`footera-sound.js`, `3d-stadium-sound.mjs`, `assets/sounds/`), hört sie vorher und nachher mit Earshot an, statt nur den Code zu lesen: `bash scripts/sound/hear.sh` (alle Cues) oder `bash scripts/sound/hear.sh kick-shot net` (nur diese). Ergebnis: `test-artifacts/sound/earshot-report.md` mit Beschreibung, Treffer gegen die gewünschte Beschreibung (strong / plausible / weak / no match) und Messwerten, dazu die WAVs.
- `scripts/sound/render-game-sounds.cjs` spielt jeden Cue mit dem echten `footera-sound.js` in Chromium in einen OfflineAudioContext über den Master-Bus des Spiels. Neue Sounds dort als Cue mit englischer Soll-Beschreibung und Verwechslungen (`alts`) eintragen.
- `scripts/sound/earshot-setup.sh` installiert Earshot (MIT, github.com/Leonxlnx/earshot, auf v0.4.1 gepinnt) samt zwei CPU-Modellen (~2,5 GB, beim ersten Mal ca. 10 min). Nie in CI einbauen. Die Cloud-Umgebung erlaubt dafür download.pytorch.org, download-r2.pytorch.org, huggingface.co und dessen CDN-Hosts; fehlt ein Host, meldet das Skript das.
- Earshot-Urteile sind Hinweise eines Modells, keine Abnahme. Synthetische Sounds (Pfiff, Pfosten) werden oft als „no match" erkannt; das ist ein Grund, genauer hinzuhören, aber Basti entscheidet, wie es klingt. Vorher/Nachher immer mit denselben Cues vergleichen.

## Werkzeuge (V21.480, Basti 19.11.2026)

- **3D-Modelle verkleinern (glTF-Transform + meshoptimizer, MIT):** Das Spiel lädt `assets/footera/models/compressed/footera-{humans,real,metahuman}.glb` (verlustfrei, 19–34 % kleiner) und fällt bei Fehlern auf die Originale zurück. Nach jedem Neubau eines dieser Modelle mit `tools/build-footera-*.py`: `npm i --no-save @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 meshoptimizer@1.3.0 && node tools/compress-footera-models.mjs`. `tests/compressed-models.test.mjs` prüft mit dem Spiel-Decoder, dass die Kopien bitgleich zu den Originalen sind. Keine Quantisierung einschalten: der Code liest `position.array` direkt.
- **Ladezeit (Lighthouse CI, Apache-2.0):** `.github/workflows/lighthouse.yml` misst bei jedem PR main und PR auf einem simulierten Handy und schreibt die Werte in die Job-Zusammenfassung. Blockiert nie, warnt nur bei deutlich langsamerem Start.
- **Selbst durchklicken (Playwright MCP, Apache-2.0):** `.mcp.json` startet `scripts/claude/playwright-mcp.sh` (iPhone-13-Größe, headless). Spiel z. B. mit `python3 -m http.server 8123` ausliefern und `http://localhost:8123/index.html` öffnen. Screenshots landen in `test-artifacts/playwright-mcp/`.
