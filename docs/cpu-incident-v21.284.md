# V21.284 – Cloud-Konflikte verursachen PostgREST-Wiederholungsschleifen

27.10.2026, Diagnose und unmittelbare Korrektur im bestehenden Footera-Projekt.

## Befund

Die Datenbank war erreichbar und als ACTIVE_HEALTHY gemeldet. In den Protokollen des vorherigen 24-Stunden-Fensters standen über 1,1 Millionen Meldungen „Cloud-Spielstand wurde während des Abgleichs geändert“. Am 26.10. erreichte das Muster etwa 360.000 Meldungen pro Stunde, am 27.10. etwa 3.576 pro Stunde. Acht PostgREST-Backends ließen sich über Prozess-ID und Fehlercode 40001 zuordnen.

Die Anwendung verwendete für dauerhafte fachliche Revisionskonflikte SQLSTATE 40001. PostgREST 14.18 war tatsächlich aktiv. Supabase dokumentiert für PostgREST 14 einen Fehler, bei dem absichtlich ausgelöste 40001-Ausnahmen Endloswiederholungen und hohe CPU-Last verursachen:
https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions

Die großen kumulierten Laufzeiten von Realtime und vielen API-Transaktionen allein sind keine aktuelle CPU-Prozentmessung. Die konkreten wiederholten Konflikte und die dazu passende API-Version liefern die belastbare Ursache dieses Vorfalls.

## Korrektur

Die Migration `fix_business_conflicts_no_serialization_retry` wurde live angewendet. Sie ersetzt in vier zuvor geprüften Funktionen ausschließlich den ausdrücklich verwendeten Fehlercode 40001 durch PT409: Cloud-Speichern, Gastübernahme, bisherige Pick-Auswahl und kompakte Pick-Auswahl. Bedingungen, Revisionsvergleich, Besitzerprüfungen, Belohnungsschutz, Rechte und Funktionseinstellungen bleiben unverändert. Historische SQL-Dateien werden durch die zuletzt anzuwendende Korrektur ergänzt.

Die bekannten acht Prozess-IDs waren bei der gezielten Bereinigungsprüfung bereits verschwunden; es musste keine Verbindung manuell beendet und kein Projekt neu gestartet werden. Das Frontend akzeptiert den neuen endgültigen Konfliktcode auch bei der Pick-Wiederherstellungsmarkierung und behält die Unterstützung des bisherigen Codes.

## Verifikation und Grenzen

- Alle vier Live-Funktionen enthalten PT409 und keinen ausdrücklich ausgelösten 40001 mehr.
- Ein isolierter Live-SQL-Test mit temporärem Testkonto hat Erst-Speicherung, genau eine PT409-Ablehnung einer alten Revision, unveränderte Revision nach Ablehnung und erfolgreiche korrekte Fortsetzung geprüft. Sämtliche Fixture-Daten wurden per Rollback entfernt; kein vorhandener Spielerstand wurde gelesen oder verändert.
- 148 gezielte Node-Tests bestanden, darunter der neue endgültige PT409-Konflikt bei Picks. Der SQL-Test und die abschließende Migration werden im bestehenden Accounts-CI-Job wiederholt.
- Kein kostenpflichtiges Upgrade, kein Lasttest und keine Änderung an produktiven Guthaben, Picks oder Spielständen.
- Die neue dauerhafte CPU-Auslastung muss separat über die Supabase-Metriken beurteilt werden. Die Fehlerkorrektur ist keine Kapazitätsfreigabe für hunderte gleichzeitige Spieler.
