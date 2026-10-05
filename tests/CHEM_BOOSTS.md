# Chemie-Boosts – V20.78

Die sechs Definitionen und alle Zahlen stehen in `chem-boosts.js`.
Ein Pfeil entspricht maximal +2, zwei +4 und drei +6. Individuelle Chemie
0/1/2/3 skaliert mit 0, 1/3, 2/3 und 1; gerundet auf ganze Werte und auf
99 begrenzt. OVR, Basisdaten, Eventwerte und Evolution-Daten bleiben erhalten.

`chemBoostInventory` enthält Stückzahlen. Spieler erhalten ausschließlich
`chemBoost: { id, appliedAt }`. Bestätigter Austausch verbraucht ein neues
Item und entfernt den bisherigen Boost ohne Rückerstattung. Abbruch, gleiche
Boosts, fehlender Bestand und veraltete Vorschau verbrauchen nichts.

Gold-Packs: ein zusätzlicher Slot mit 25 % Drop-Chance. Promo-Packs: zwei
zusätzliche Slots mit jeweils 30 %. Alle sechs Boosts werden gleich gewichtet.
`chemBoostSlots` erlaubt später explizite Verbrauchsitem-Slots. Founder- und
persönliche Geschenk-Packs sowie TOTW-Belohnungen behalten ihre bisherigen
Inhalte. `generatePack` erzeugt weiterhin ausschließlich garantierte Spieler;
Verbrauchsitems werden separat in `pendingChemBoosts` gespeichert, wiederhergestellt
und ohne Spieler-Duplikatlogik gesammelt.

Die lokale attributbasierte Matchengine erhält effektive Werte über
`currentMatchBase` und `opponentMatchBase`. Chemie wird beim Anpfiff fixiert,
Einwechselspieler erhalten 0 Chemie. Rollen, Fokus, Taktik, Teamrating, OVR und
sämtliche bestehenden Wahrscheinlichkeiten bleiben unverändert. Keine zweite
Boost-Wahrscheinlichkeit und keine weitere pauschale Teamstärke. Ergebnisse
werden pro Match zwischengespeichert, ohne Spielerdaten zu überschreiben.
Serverberechnete Online-Live-Freundschaftsspiele behalten ihre bestehende
Engine; diese verwendet bisher Teamrating/Chemie, keine Einzelattribute.
Die Boost-ID wird ergänzend im Freundesprofil mitgeführt.

## Reproduzierbare Prüfungen

- `node --test tests/*.test.cjs` – vorhandene und neue Regressionen.
- `tests/chem-boosts.test.cjs` – Definitionen, Chemie 0–3, Cap, echte Matchadapter,
  Inventar, atomarer Verbrauch, Austausch, alte Saves, Pack-Slots und PWA.
- `tests/chem-boost-balance.test.cjs` – 3.540 vollständige Matches:
  sechs Boosts und kein Boost mit Chemie 0–3; alle 15 Paarungen; starke und
  schwache Teams (84 gegen 50). Tore, Gegentore, xG, Abschlüsse, Ballbesitz,
  Zweikämpfe/Defensivaktionen und Siegquote. Bei 0 Chemie exakt dieselben
  Seed-Ergebnisse wie ohne Boost. Maschinenlesbare Ergebnisse in
  `/tmp/chem-boost-balance-results.json`.
- `tests/chem-boost-preview.html` – Originaloberfläche mit erfundenem Testverein,
  sechs Inventarstapeln, langem Namen, ausgerüstetem Boost und Zusatzitems im
  Pack-Ergebnis. Breiten 320/390/430. Ausschließlich Speicher im Arbeitsspeicher,
  keine Onlineanmeldung, Käufe oder Änderungen an bestehenden Spielständen.

Die Matchday-Fixtures wurden um die in main bereits vorhandenen Rollen- und
Attributfunktionen ergänzt. Der Schussblock-Test verwendet den aktuellen
Wahrscheinlichkeitsbereich. Die Update-Fixture enthält die neuen offenen
Verbrauchsitems und prüft, dass ein PWA-Update deren Zuweisung abwartet.
