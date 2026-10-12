# Footera Stripe Sandbox – vorbereitete Integration (Stand 2026-10-12)

## Status
- **Sandbox only.** Keine Echtgeld-/Live-Aktivierung, keine reale Punkte-Gutschrift bestätigt.
- Supabase Edge Functions: `footera-stripe-checkout` (JWT erforderlich), `footera-stripe-webhook` (signierter Stripe-Webhook; JWT absichtlich deaktiviert).
- `STRIPE_SECRET_KEY` (sk_test_...) ist vom Betreiber in Supabase Secrets hinterlegt.
- **Noch erforderlich:** Stripe-Sandbox-Webhook anlegen, das dabei erhaltene `whsec_...` als `STRIPE_WEBHOOK_SECRET` in Supabase Secrets speichern.
- Endpunkt: `https://idxydyrihtyecvfjvtuk.supabase.co/functions/v1/footera-stripe-webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.
- Checkout-Code: `online/footera-stripe-checkout.ts`; Webhook-Code: `online/footera-stripe-webhook.ts`.

## Sandbox-Produkte (jeweils einmalige Zahlung)
| Pack-ID | Name im Stripe-Katalog | EUR |
|---|---|---:|
| 100 | 100 Footera Points | 0,59 |
| 500 | 500 Footera Points | 2,99 |
| 1050 | 1.050 Footera Points | 5,99 |
| 1600 | 1.600 Footera Points | 8,99 |
| 2800 | 2.800 Footera Points | 14,99 |
| 5900 | 5.900 Footera Points | 29,99 |
| 12000 | 12.000 Footera Points | 59,99 |
| 18500 | 18.500 Footera Points | 89,99 |

## Sicherheitsmodell
- Das Checkout-Backend ermittelt den angemeldeten, verifizierten Supabase-User über ein gültiges JWT. Nur eine erlaubte Pack-ID kommt vom Browser; Preis, Produkt und Points stammen aus dem serverseitig definierten Katalog. Es wird ein aktiver einmaliger Testpreis im Stripe-Katalog mit exakt entsprechendem Namen und Betrag verlangt.
- Der Webhook prüft die Stripe-Signatur am **rohen** HTTP-Body über Web Crypto, ruft die Checkout-Session erneut über Stripe ab und verifiziert Sandbox-Status, Bezahlung, User-ID, Pack-ID, Preis und Line Item.
- SQL: `public.footera_points_wallets`, `public.footera_stripe_point_payments`, `public.footera_credit_verified_stripe_points(text,text,uuid,integer,integer)` (nur `service_role` darf diese Funktion ausführen).
- Stripe-Checkout-Session ist eindeutiger Buchungsschlüssel. Datenbanktransaktion schreibt Zahlung + erhöht Wallet **atomar**. Wiederholung derselben Session kann keine weiteren Points erzeugen.
- `footera_points_wallets`: Eigentümer können nur **lesen**, keine direkten Browser-INSERTs/UPDATEs; Stripe-Buchungen für normale Browserrollen nicht zugänglich.
- Die Funktion `footera-stripe-webhook` hat `verify_jwt=false`, **weil Stripe keinen Supabase-JWT mitsendet**. Stattdessen ist die verifizierte Stripe-Signatur verpflichtend.
- Keine Secret Keys in GitHub, Github Pages oder Spielstanddaten.

## Noch NICHT erledigt
1. Webhook `STRIPE_WEBHOOK_SECRET` speichern.
2. Sandbox-Probekauf durchführen, echte Stripe-Event-Zustellung, Fehlversuche und Idempotenz kontrollieren.
3. **Wichtig:** Bestehende `state.points` / `save_data.points` sind noch clientseitig manipulierbar; Store und Pack-Kauf müssen auf eine **serverautoritative** Wallet-Ausgabe und Cloud-Synchronisierung umgestellt werden, bevor bezahlte Points im Spiel verwendet oder Live-Zahlungen aktiviert werden.
4. Rückzahlungen/Chargebacks, Account-Löschung mit Aufbewahrungspflichten, steuerliche Prüfung, rechtliche Freigabe für Zufallspacks sowie Stripe-Freigabe für diese Produktart bleiben für Live offen.
5. Live-Zahlungen sind ausdrücklich **deaktiviert**. Beide Edge-Funktionen akzeptieren nur Stripe-Testmodus.

Bei einer erfolgreichen Testzahlung sind die serverseitigen Points in `public.footera_points_wallets` sichtbar, noch nicht automatisch in der clientseitigen Store-Anzeige.
