# V21.31 — Vereins-Trikots im Matchday

Ursache: `matchKitClone` akzeptierte nur die bisherigen 13 Trikotmuster. Neue Designs wie `reverse` und `fade` fielen bei Trikotwahl und Anpfiff auf `solid` bzw. `diagonal` zurück. Vereinsfarben und Spielstand waren korrekt gespeichert.

Fix: Vereinseditor und Matchday verwenden dieselbe hoisted `cleanClubKit`-Funktion. Alle 20 verfügbaren Muster und vier gespeicherten Kleidungsfarben bleiben unverändert erhalten. Die Vorschau zeigt zusätzlich das eigene bzw. vorhandene gegnerische Vereinswappen. Designs und Matchsimulation bleiben unverändert. Version, Manifest und Service-Worker-Cache auf V21.31 angehoben.

Prüfung:
- Regression vor dem Fix reproduziert: `reverse / home` wurde zu `solid`.
- Alle 20 Editor-Optionen über Speichern/Normalisierung und Matchday-Kopie auf beiden Trikots geprüft; ungültige Eingaben behalten sichere Ersatzwerte.
- 80 relevante Node-Tests erfolgreich.
- Echter Chromium-Lauf: grün-rotes Heimtrikot mit Gegenschärpe, Schwarz-Weiß-Auswärtstrikot mit Verlauf, Wappen beider Teams, manuelle Auswahl, Auto-Kontrast, 360/390/412 px ohne Überlauf, Anpfiff und Weitergabe an die 3D-Trikotaufbereitung einschließlich Hose/Stutzen.
- Matchday-Screenshot visuell geprüft; keine JavaScript-Ausnahmen.
