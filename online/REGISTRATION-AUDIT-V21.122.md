# Footera Registrierung – Prüfung V21.122

Prüfung: 11.–12.10.2026. Erste Analyse: `6bf8b9ed9167d7ee49e4be0f99db66c36cb3302d`. Zur Veröffentlichung auf den inzwischen aktuellen `main` `9ad87a2` (V21.121) übernommen. Packpreise und exakte Packwahrscheinlichkeiten bleiben erhalten.

## Testgrenzen

Alle Browserprofile und Spielstände sind isolierte QA-Daten. Der vollständige Browserablauf verwendet Chromium, den echten Supabase-JavaScript-SDK und den tatsächlichen Footera-Code mit simulierten Auth-/Cloud-HTTP-Antworten. Es ist kein Nachweis einer tatsächlichen E-Mail-Zustellung. Die Spielerdaten entsprechen der im Spiel verwendeten CSV-Quelle. Die Browserläufe schreiben niemals in die produktive Cloud.

Zusätzlich wurden die Live-Startseite, die öffentliche Auth-Konfiguration, echte Registrierung und falsches Passwort mit einer einmaligen QA-Adresse unter `example.invalid`, ein neu erstelltes anonymes Testkonto und dessen verweigerter Zugriff auf Cloud-Spielstände geprüft. In der Datenbank wurde ausschließlich der Bestätigungsstatus dieser konkreten QA-Adresse gelesen; sie existiert und bleibt unbestätigt. Bestehende Konten/Vereine wurden nicht geändert. Die beiden isolierten Auth-Testkonten wurden nicht gelöscht.

Kein Postfachzugriff verfügbar. Die installierte Android-PWA auf dem Samsung-Gerät wurde nicht bedient. Service Worker sind im deterministischen Browserlauf bewusst deaktiviert; dessen Browserneustart ist daher kein PWA-Nachweis.

## Ergebnisse nach Anforderung

| Nr. | Funktion | Nachweis / Grenze |
|---|---|---|
| 1 | Kontoauswahl vor Vereinsgründung | Fehler auf Live und in `main` reproduziert: JS/CSS fehlten in der Startseite. Behoben; Chromium bestätigt Kontoauswahl vor Benutzername/Starterset. |
| 2 | E-Mail und Passwort registrieren | Live-API akzeptiert isolierte QA-Registrierung (HTTP 200); unbestätigter Datensatz nachgewiesen. UI mit realem SDK und simuliertem Backend geprüft. |
| 3 | E-Mail-Versand und Bestätigung | Request angenommen. Tatsächlicher Versand, Zustellung, E-Mail-Inhalt und echter Bestätigungslink **nicht verifiziert**. Bestätigungs-Callback und erneute Anforderung simuliert. |
| 4 | Ungültige Eingaben, vorhandene Adresse, falsches Passwort | Ungültige Adresse/kurzes Passwort, unbestätigte Anmeldung und doppelte Registrierung im Browser geprüft. Falsches Passwort zusätzlich an Live-API (HTTP 400, `invalid_credentials`). Keine bereits existierenden fremden Konten verwendet. |
| 5 | Weiterleitung nach Bestätigung | Callback mit realem SDK und synthetischer Testsitzung geprüft, inklusive abgelaufenem Link. Tatsächliche Supabase Redirect-Allowlist und E-Mail-Weiterleitung mangels echtem Bestätigungslink **nicht abschließend verifiziert**. |
| 6 | Benutzername und Vereinsgründung | Echter Spielablauf: Benutzername, Liga auswählen, Starterset öffnen, 18 Karten. |
| 7 | Automatische Vereinszuordnung | Richtige Test-User-ID/Club-ID beim ersten Cloud-Write; bestehende/fremde Eigentümer und abweichende Cloud-Vereine geschützt. Produktive RLS-Richtlinie gelesen: Eigentümerprüfung und Ausschluss anonymer Konten. |
| 8 | Mein Profil | Benutzername, Vereinsname, E-Mail, Kartenanzahl entsprechen dem isolierten Konto/Spielstand. |
| 9 | Abmelden / wieder anmelden | Echte Browserbedienung mit simuliertem Auth-Backend. Falsches Passwort erhält lokalen Verein; erneuter Login ordnet korrekt zu. Abmelden betrifft nur das aktuelle Gerät. |
| 10 | Reload, Browserneustart, PWA | Reload und Schließen/Neustarten des Chromium-Prozesses mit separatem persistentem QA-Profil geprüft. Neues Browserprofil mit vorhandener Cloud-Sicherung geprüft. PWA-Start-URL, Cache- und Asset-Versionen aktualisiert; installierte Android-PWA **nicht verifiziert**. |
| 11 | Google-Button entfernt | Kontooberfläche enthält weder Google-Anmeldung noch Google-Verknüpfungsbutton. Live-Provider ist deaktiviert. Keine OAuth-Integration vorgenommen. |
| 12 | Gast → E-Mail-Konto | Bestehende Gast-ID und Verein bleiben erhalten; Callback und Passwortfestlegung im Browser simuliert. Echter Mailweg **nicht verifiziert**. |
| 13 | Konto löschen | Ausschließlich simuliert: Browsermodul und exakte Version 1 der bereitgestellten Edge Function mit vollständig gemocktem SDK. Kein echter Löschaufruf. |

## Behobene Fehler

- Konto-JavaScript und CSS fehlten vollständig in `index.html`, obwohl der Service Worker beide Dateien cachte.
- Leere Boot-Autosaves wurden als bestehende Vereine gewertet: Kontoauswahl und Wiederherstellung in einem neuen Browser konnten ausfallen.
- Ein bestätigtes Konto ohne Registrierungsmarkierung auf dem neuen Gerät erhielt vor Vereinsgründung keine Eigentumszuordnung.
- Gastregistrierung konnte eine fremde lokale Eigentumsmarkierung ersetzen. Sie wird jetzt abgewiesen.
- Veraltete Registrierungsmarkierungen konnten bei einer bestätigten Kontolöschung den Schutz eines fremden lokalen Vereins aushebeln. Ein expliziter Eigentümer hat jetzt Vorrang.
- Ausstehende Spiel-Autosaves konnten beim Neuladen nach Wiederherstellung/Löschung die alten In-Memory-Daten erneut schreiben. Der Austausch pausiert solche Writes bis zum Reload.
- Der erste automatische Cloud-Upload konnte einen bestätigten Gast vom noch erforderlichen Passwortschritt weg neu laden. Die Eingabe bleibt nun offen; ausstehende Registrierung wird nach Reload wieder angezeigt.
- Die frisch bestätigte reguläre Registrierung behält keinen unnötigen Passwortschritt: das Passwort wurde bereits bei Signup vergeben.
- Doppelte/verschleierte Signup-Antworten berechtigen nicht zur Vereinsübernahme. Neue Registrierungen werden an die zurückgegebene User-ID gebunden.
- Fehlerhafte/abgelaufene Bestätigungslinks werden sichtbar erklärt. Auth-Fehler erhalten verständliche deutsche Meldungen.
- Nach Aktionen wurden vorher alle Cloud-Buttons wieder aktiviert, auch ohne Berechtigung. Die Berechtigungen werden erneut gerendert.
- Login normalisiert die E-Mail; der temporäre Prüfclient verarbeitet keine URL-Sitzung. Parallele Initialisierung registriert nur einen Auth-Listener.

## Reproduzierbare Tests

102 gezielte Node-Tests bestanden: 87 Konto-/Start-/Sicherungsprüfungen plus 15 Prüfungen der inzwischen hinzugekommenen Packpreise und Packwahrscheinlichkeiten.

```sh
node --test tests/footera-accounts.test.cjs tests/footera-account-deletion-server.test.cjs tests/friend-online.test.cjs tests/friend-online-sync.test.cjs tests/footera-backup.test.cjs tests/startup-state.test.cjs tests/boot-update.test.cjs tests/pack-odds.test.cjs tests/pack-pricing.test.cjs
```

12 vollständige Chromium-Szenarien bestanden (Auth-/Cloud-Antworten simuliert). Browserprüfung:

```sh
FOOTERA_TEST_CHROMIUM=/path/to/chromium \
FOOTERA_TEST_SDK=/path/to/supabase-umd.js \
FOOTERA_TEST_PLAYERS_CSV=/path/to/dataset_ea_fc_27.csv \
node tests/browser-account-registration.cjs
```

Benötigt Playwright; der Test verwendet lokale Fixtures für den SDK und die originale `DB_SOURCES`-CSV. Mobile Viewports: 360, 390 und 412 Pixel. Passwörter/Sitzungstoken werden nicht in Testlogs geschrieben. Backend-Löschfixture: `tests/fixtures/footera-delete-account.deployed.ts`, unveränderte Version 1 der Live-Funktion; es wird ausschließlich eine VM mit simulierten SDK-Aufrufen ausgeführt.

Die GitHub-Workflow-Prüfung wurde um die serverseitigen Löschsimulationen und Trigger für Startseite/Cache/Manifest erweitert. Commit und tatsächlicher Deployment-Status werden nach Push separat im Abschlussbericht genannt.
