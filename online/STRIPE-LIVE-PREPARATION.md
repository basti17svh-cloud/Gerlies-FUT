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
