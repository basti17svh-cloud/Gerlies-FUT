# Footera Stripe Live – Vorbereitung V21.135 (12.10.2026)

## AKTUELLER STAND V21.135 (ersetzt ältere Statusmeldungen unten)
- **Stripe-Geschäftsmodell:** Der Betreiber berichtet von zwei ausdrücklichen Stripe-Supportaussagen: (a) Zahlungen seien zulässig, weil Footera Points nicht in Echtgeld rückwandelbar seien; (b) gegen die zufallsgenerierten Pack-Spieler bestünden "keinerlei Einwand oder Bedenken". Dies ist eine Betreiberangabe; die originale Stripe-Korrespondenz liegt hier nicht zur unabhängigen Prüfung vor. Allgemeine Kontofreigabe und spezielle Pack-Freigabe sind sachlich zu trennen.
- **Betreiberfreigabe:** Veröffentlichung wurde im Chat am 12.10.2026 ausdrücklich gewünscht. **Technische Go-Live-Voraussetzungen sind trotzdem nicht erfüllt. Echtgeld bleibt OFF.**
- **Supabase LIVE Edge Functions deployed (aber gesperrt):** `footera-live-checkout` (JWT verpflichtend), `footera-live-webhook` (JWT aus, erfordert Stripe-Signatur), `footera-live-spend` (JWT verpflichtend). Die Sandbox-Endpoints bleiben unverändert.
- **Keine Stripe-Live-Webhook-Registrierung:** Read-only-Abfrage im LIVE-Stripe-Konto zeigte null Webhook-Endpunkte. `FOOTERA_LIVE_PAYMENTS_ENABLED`, `FOOTERA_LIVE_WEBHOOK_ENABLED`, `FOOTERA_LIVE_SPENDING_ENABLED` bleiben ungesetzt/aus; außerdem ist für Points-Ausgabe nun `FOOTERA_LIVE_DELIVERY_ENABLED=true` notwendig. Nie ohne abgeschlossene Backend-Delivery aktivieren.
- **Migration tatsächlich angewendet:** `online/footera-live-entitlements-v21.135.sql`. Jeder verifizierte Live-Points-Abzug schreibt in **derselben DB-Transaktion** ein serverseitiges, nutzergebundenes Entitlement (`pending`). Fehlgeschlagene Debits hinterlassen kein Entitlement; Replay derselben ID bucht nicht erneut, auch wenn das Angebot inzwischen geschlossen wurde.
- **Aktueller LIVE-Katalog:** 13 Packs + 1 Season Pass; 0 Artikel aktiviert. Evolution-Katalogtypen im Schema vorbereitet, noch keine freigeschalteten Angebote. Bereits ausgerollte 8 Stripe-Pakete bleiben unverändert.
- **Client-Anbindung vorläufig lesend:** `FooteraPaidWallet.refreshLive()` und `liveState()` lesen nur die eigene Live-Wallet und serverseitige Entitlements; kein Vermischen mit Sandbox-Points und keine automatische Kartenvergabe.
- **Sicherheits- und Rollback-Tests:** SQL-Test in `BEGIN`/`ROLLBACK` für Abbuchung + Entitlement, Replay, deaktivierten Katalog, veränderte Kauf-ID/Artikel-Kombination und unzureichendes Guthaben durchgeführt. Nach Testabschluss: 0 Live-Wallets, 0 Live-Payments, 0 Live-Spends, 0 Live-Entitlements. Sensible Echtgeld-RPCs sind für `anon` und `authenticated` nicht aufrufbar.
- **Regression:** `tests/footera-live-payments.test.cjs` + GitHub-Actions-Workflow. Statische Sicherheitsverträge sind nicht gleichbedeutend mit Zahlungs-End-to-End-Tests.

### Harte Blocker für den öffentlichen Echtgeldstart
1. Signierten Stripe-LIVE-Webhook mit eigenem LIVE-Secret beim Stripe-Konto registrieren; Secrets nur in Supabase hinterlegen, niemals in GitHub. Checkout darf erst nach verifiziertem Webhook aktiviert werden.
2. Serverautoritatives Inventar, nachvollziehbares Pack-Ergebnis, Evolutionen und Premium-Season-Pass-Berechtigungen implementieren: Ein `pending`-Entitlement ist absichtlich **keine** ausgelieferte Ware. Keine Points ausgeben, bevor die Lieferung transaktional und nach Browserabbruch wiederherstellbar ist.
3. Tests: signierter Erfolg, schlechte Signatur, Test-/Live-Trennung, abgebrochener/verspäteter Kauf, doppelte Events, Teil-/Vollrefund, Dispute gewonnen/verloren, ungültige Identität, Reload/Logout/Endgerätewechsel, Lieferung genau einmal, fehlendes/abgelaufenes Pack und Ausfallszenarien.
4. Steuer, digitale Inhalte, Altersfreigabe, zufallsbasierte Kaufhinweise und Verbraucherrechte prüfen. Eine Stripe-Zahlungsfreigabe ist keine eigenständige jugend- oder verbraucherschutzrechtliche Freigabe.
5. Erst dann kontrollierter Canary-Rollout und explizite Flag-Aktivierung. Kein Echtgeld-Testkauf automatisch auslösen.

---
## Historische Dokumentation V21.129–V21.132 (teilweise überholt)

# Footera Stripe Live – Vorbereitung V21.129 (12.10.2026)

## Status: ABSICHTLICH NICHT LIVE
- Stripe-Live-Konto: `acct_1UPUg3QsfnvccsH8`, Zahlungen laut Stripe-Konto aktiviert, acht Live-Produkte und aktive EUR-Einmalpreise vorhanden.
- Die spezielle Stripe-Vertriebs-/Risiko-Prüfung für den Einsatz gekaufter Points in zufallsbasierten Spieler-Packs steht **noch aus**. Allgemeine Konto-Freigabe reicht nicht als ausdrückliche Bestätigung des Geschäftsmodells.
- Der öffentliche Points-Shop leitet weiterhin **ausschließlich** auf `online/stripe-sandbox-test.html` (Testmodus).
- Die bestehenden Edge Functions `footera-stripe-checkout`, `footera-stripe-webhook`, `footera-spend-points` sind **Sandbox-only** und wurden für Live nicht verändert.
- Im Stripe-Live-Konto existiert derzeit **kein** registrierter Live-Webhook-Endpunkt. Nicht vor Fertigstellung der kritischen Schutzmechanismen erstellen.
- `online/footera-live-checkout.ts` und `online/footera-live-webhook.ts` sind nur **Quelltext auf GitHub**, NICHT in Supabase deployed.
- Auch nach späterem Deployment ist der Checkout durch `FOOTERA_LIVE_PAYMENTS_ENABLED=true` (fehlt derzeit) standardmäßig gesperrt. Der Webhook hat ein getrenntes Freischalt-Flag `FOOTERA_LIVE_WEBHOOK_ENABLED=true`.
- Kein Live-Secret oder Webhook-Signing-Secret wurde in GitHub gespeichert oder verändert.

## Isolierte serverseitige Live-Buchhaltung – ERLEDIGT
Migration: `online/footera-live-wallet-v21.129.sql` (in Supabase angewendet).
- `public.footera_live_points_wallets`: eigene Wallet pro registriertem Footera-Nutzer, Saldo + Summen.
- `public.footera_live_stripe_payments`: eigene idempotente Einmalzahlungstabelle mit eindeutiger LIVE-Session und Payment Intent.
- Die Testtabellen `footera_points_wallets`, `footera_stripe_point_payments`, `footera_points_spends` bleiben unverändert.
- RLS aktiviert; eigener Wallet-Saldo lesbar nur für angemeldeten Eigentümer, keine Browser-Schreibrechte. Live-Zahlungsledger für Browser komplett verborgen.
- `footera_credit_verified_live_stripe_points`: nur `service_role`; LIVE-Session, bestätigtes Nutzerkonto, genau eines der acht Pointspakete und exakten Betrag erforderlich. Wiederholte Session ergibt `already_credited`.
- `footera_reconcile_verified_live_payment_loss`: nur `service_role`; kumulierter bestätigter monetärer Verlust kann erneut und in niedrigerer Reihenfolge ohne zusätzliche Abbuchung verarbeitet werden. Bei bereits verwendeten Points kann der Saldo negativ werden (Schuldbetrag). Eine vollständige Behandlung gewonnener Disputes bzw. Wiederherstellungen fehlt noch.
- Test mit SQL-Transaktion und `ROLLBACK`: doppelte 500-Points-Gutschrift, Teil- und Vollkorrektur, Wiederholung geprüft. Keine fiktiven Dauerbuchungen. Bei Abschluss der Tests: 0 Live-Zahlungen / 0 Live-Wallets.

## Vor Echtgeld-Veröffentlichung ZWINGEND offen
1. Schriftliche geschäftsmodellspezifische Antwort von Stripe zu zufallsbasierten Packs erhalten; etwaige Einschränkungen befolgen.
2. Live-Webhook und Checkout unter getrennten `FOOTERA_STRIPE_LIVE_SECRET_KEY` (sk_live) und `FOOTERA_STRIPE_LIVE_WEBHOOK_SECRET` (whsec) in Supabase Secrets bereitstellen. Nie Sandbox-Geheimnisse überschreiben oder in JS/GitHub speichern. Checkout erst freischalten, **nachdem** der signierte Webhook zuverlässig ist.
3. Live-Webhook-Endpunkt, vollständig signierte Events, Replay, verzögerte Zahlung, Serverausfall, stornierte Zahlung, Teil-/Vollrefund, Chargeback-Eröffnung und gewonnene/verlorene Disputes umfassend testen. Der vorbereitete Webhook hat derzeit keine vollständige Dispute-Wiederherstellungslogik; er darf noch **nicht** für Echtgeld aktiviert werden.
4. Pack-Entitlements, Premium Season Pass, Evolutions, Transfermarkt und alle anderen Echtgeld-Ergebnisse in die serverautoritativ gespeicherte Ökonomie integrieren. Aktuelle `state.points` bzw. lokale Clubdaten sind durch den Browser änderbar. Keine Echtgeld-Points zur Ausgabe in diesen Systemen aktivieren, bis die Verarbeitung sicher und idempotent ist.
5. Account-Löschung und gesetzlich erforderliche Buchungs-/Aufbewahrungsfristen, Steuer-/USt.-Konfiguration, digitale Inhalte, Alters- und Glücksspielrecht, Transparenz über zufallsbasierte Packs sowie Rückerstattungspolitik prüfen.
6. Testfälle in sicherer isolierter Umgebung durchspielen; Canary-Rollout und Monitoring, anschließend Freischalt-Flag nur nach dokumentierter Abnahme.

## LIVE-Preise (verifiziert am 12.10.2026)
| Points | EUR | LIVE Price-ID |
| ---: | ---: | --- |
| 100 | 0,59 | `price_1UPdtOQsfnvccsH8pdYUhygp` |
| 500 | 2,99 | `price_1UPdtOQsfnvccsH80HCwRrM1` |
| 1.050 | 5,99 | `price_1UPdtOQsfnvccsH8rFzOH13y` |
| 1.600 | 8,99 | `price_1UPdtOQsfnvccsH8yCkvO3Jk` |
| 2.800 | 14,99 | `price_1UPdtOQsfnvccsH8i5VxQkZ8` |
| 5.900 | 29,99 | `price_1UPdtOQsfnvccsH8oq9eD9Fg` |
| 12.000 | 59,99 | `price_1UPdtRQsfnvccsH80XIQSOGj` |
| 18.500 | 89,99 | `price_1UPdtTQsfnvccsH8tcjwUyxt` |

## Rollback / Abschaltstrategie
- Live-Checkout bleibt ohne Flag unbenutzbar; niemals Live-Zahlungen durch Secrets allein aktivieren.
- Für einen sofortigen Stop bei späterer Aktivierung `FOOTERA_LIVE_PAYMENTS_ENABLED` auf `false` setzen, laufende Webhook-Verarbeitung und Belegbuchhaltung aber nicht blind deaktivieren.
- Nicht die LIVE-Tabellen oder Zahlungsbelege löschen, wenn reale Käufe stattgefunden haben.


## V21.130–V21.132 – Sicherheitsausbau (12.10.2026)
- Migration `online/footera-live-spend-v21.130.sql` ist in Supabase angewendet.
  - `public.footera_live_store_items`: vertrauenswürdige, standardmäßig **deaktivierte** Katalogeinträge für 13 Packs und den Season Pass S1.
  - `public.footera_live_point_spends`: pro Kauf eine eindeutige UUID und Eigentümer/Artikel/Preis-Buchung. Season-Pass-S1 zusätzlich pro Nutzer eindeutig (zweiter Kauf wird abgelehnt).
  - `public.footera_spend_verified_live_points`: service_role-only, Preis kommt nur aus dem serverseitigen Katalog. Keine negativen Salden durch normale Käufe. Abgebrochene/fehlgeschlagene Käufe führen zum Rollback.
  - `online/footera-live-spend.ts` liegt als **nicht deployte** Edge-Funktion bereit; verweigert jeden Kauf ohne `FOOTERA_LIVE_SPENDING_ENABLED=true`.
- Migration `online/footera-live-risk-v21.131.sql` ist in Supabase angewendet.
  - `footera_reconcile_verified_live_payment_risk`: prüft kumulierte, bestätigte Rückerstattungen und aktuellen Streitfall-Haltebetrag; Bearbeitung wiederholter Events ist idempotent. Bei gewonnenem Streitfall werden zuvor gesperrte Points wiederhergestellt; bestätigte Rückerstattungen werden dadurch **nicht** rückgängig gemacht.
  - `footera_reconcile_verified_live_payment_loss` ist als veraltete Funktion für service_role deaktiviert.
  - `online/footera-live-webhook.ts` wurde als vorbereiteter **nicht deployter** Quellcode auf die aktuelle Risk-API umgestellt. Stripe Live API liefert den aktuellen Zustand der Charge, Refunds und Disputes. Vor Produktion auf echten Live-Events und mit automatisierten API-Mocks prüfen.
- Migration `online/footera-live-auth-rls-v21.132.sql` schließt anonym angemeldete Sessions vom Lesen des Live-Guthabens und der Live-Ausgaben aus.
- SQL-Transaktionstests mit ROLLBACK bestanden:
  - Doppelgutschrift, Pack-Debit-Wiederholung, Guthabenmangel, pro Saison eindeutiger Premium Pass;
  - Streitfall-Eröffnung, wiederholte Streitfallmeldungen, Streitfall-Gewinn, Teilrefund, veraltete Refunddaten;
  - volle Rückerstattung, obwohl der Käufer Points bereits ausgegeben hat, erzeugt negative Bilanz statt Punkte-Inflation.
- Live-Wallet, Live-Zahlungen und Live-Spends hatten zum Testabschluss jeweils **0 Datensätze**. Katalogeinträge sind `enabled=false`.
- Supabase Security Advisors weisen projektweit auf bestehende, ältere SECURITY DEFINER RPCs hin, die mit `authenticated` aufrufbar sind. Unsere neuen Echtgeld-RPCs sind ausdrücklich nur für `service_role` ausführbar. Die RLS-Info `RLS enabled no policy` für die geheimen Live-Tabellen ist **absichtlich**: öffentliche Lese-/Schreiboperationen bleiben gesperrt.

### Weiterhin harte Release-Blocker
- Kein Echtgeld-Webhooks/Checkout/Spending-Endpoint wurde deployed, kein Echtgeld-Flag aktiviert.
- Echtgeld-Entitlements sind **noch nicht** mit dem Browser-Spiel, serverautoritativem Verein/Inventar, Season-Pass-Zustand und den Evolutionen verbunden. Der bisherige Cloud-Spielstand ist nicht sicher genug für Echtgeldgegenstände.
- Nicht nur SQL-Tests: komplette End-to-End-Integration mit Stripe Live, Signaturprüfungen, Fehlzuständen und automatisierten Tests steht noch aus.
- Refunds/Disputes-Prozess (auch Rückläufer, Teilstreitfälle, widersprüchliche Events), Steuer/Verbraucherschutz/Altersvorgaben und Geschäftsmodellfreigabe noch abschließend prüfen.
