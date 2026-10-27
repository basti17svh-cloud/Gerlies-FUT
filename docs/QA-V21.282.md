# Footera V21.282 – vollständiger Sicherungsweg

Ergänzung zur Rundumprüfung in `QA-V21.281.md`, 27.10.2026.

Die Prüfung des angebotenen Notfall-Exports hat einen weiteren tatsächlichen Fehler aufgedeckt: Nach einem fehlgeschlagenen lokalen Schreibvorgang verwendete die Dateisicherung noch den alten localStorage-Stand. Export und Rückfallsicherung vor einem Datei-Import verwenden jetzt einen validierten Schnappschuss des laufenden Spiels. Ohne laufenden Spielzustand bleibt der bisherige Speicher-Fallback bestehen.

Zwei neue Tests prüfen den Export einschließlich aktueller Münzen, Champions-Fortschritt und Pick-Quittung sowie die Rückfallsicherung beim Import trotz älterem Datenträgerstand. Alle 157 betroffenen Speicher-, Konto-, Start-, Update- und Cachetests bestanden nach dieser Ergänzung. Zusammen mit den vorherigen Prüfungen sind 938 verschiedene lokale Tests erfolgreich: 918 aus der Standardgruppe, 15 Matchday-Tests und fünf gezielte Simulationstests.

Für V21.281 haben die GitHub-Jobs Accounts, Player Picks (echtes Chromium, einschließlich Handy-Zurück), Weekly Rewards, Legacy (echter Browser), Crest, Share/Invite, Pack-Sicherheit und TOTW sowie Pages-Deployment erfolgreich abgeschlossen. Die unveränderte Pick-Navigation wird in V21.282 erneut durch denselben Browserjob geprüft. Der vollständige persönliche Zwei-Geräte-Abgleich und echte Mailzustellung bleiben weiterhin offen; die Tests ersetzen diese Abnahme nicht.

Die 15 lokalen Matchday-Tests sind inzwischen vollständig abgeschlossen und bestanden. Die lokalen Langläufe zu Chemie-Balancing, gegnerischen Spielstilen und vollständiger Matchsimulation werden weiterhin nicht als abgeschlossen gewertet. Die früheren, mehrfach gestarteten Gesamtläufe werden nicht als zusätzliche erfolgreiche Tests gezählt.
