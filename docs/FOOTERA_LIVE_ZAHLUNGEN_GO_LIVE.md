# FOOTERA – Echtgeld-Umstellung (Go-Live-Gates)
Stand: 12.10.2026 · GitHub: `basti17svh-cloud/Gerlies-FUT` · Branch: `main`

## Ausgangslage

- Stripe-Konto **Footera LIVE** kann technische Zahlungen verarbeiten. Das ist **keine** nachgewiesene Freigabe für das konkrete Modell „Echtgeld → Footera Points → zufallsbasierte Spieler-Packs“.
- Getrennter LIVE-Webhook mit acht Stripe-Events eingerichtet.
- Acht Live-Pakete und Preise; Serverseite prüft die exakten Price-IDs und Cent-Beträge.
- LIVE-Checkout/Webhook als Supabase Edge Functions bereitgestellt, mit unabhängigen Live-Secrets und Flags.
- Sandbox-Käufe wurden bereits getestet. Sandbox-Points und LIVE-Points sind zwei **verschiedene** Postgres-Wallets.
- Ein automatisierter Test mit simulierten Stripe/Datenbank-Ereignissen ist **kein** Echtgeld-End-to-End-Test.
- Nutzerportal und öffentlicher Shop stehen solange bewusst auf **Sandbox**.

## UNBEDINGTE Bedingungen vor öffentlichen Echtgeld-Zahlungen

### 1. Rechtliche und vertragliche Eignung

- [ ] Ausdrückliche, nachvollziehbare **schriftliche Stripe-Freigabe** für **Footera Points**, ihren Erwerb mit Euro, zufallsbasierte Spieler-Packs, Handels-/Transfermarktmechanik und alle relevanten Zahlungsarten. Kontoverifizierung oder aktivierte Kartenzahlungen allein genügen nicht.
  - **Stand 13.10.2026:** Der Projektinhaber hat einen Text einer angeblichen Stripe-Supportantwort bereitgestellt: Zustimmung zum Echtgeldkauf zufallsbasierter Spielerpacks unter der Bedingung, dass Nutzer die Inhalte nicht gegen Echtgeld tauschen können. **Die Originalquelle/Authentizität ist noch nicht belegt.** Die Antwort erwähnt das zweistufige Modell *Euro → Footera Points → zufallsbasierte Packs* nicht ausdrücklich. Vor öffentlichem Go-Live im Stripe-Supportfall Absender, Datum, Account-Bezug und ausdrücklich diesen zweistufigen Kaufweg bestätigen lassen. Dies ist eine Vertrags-/Zahlungsanbieterprüfung, keine eigenständige rechtliche Einschätzung.
- [ ] Klärung des Geschäftsmodells in Deutschland und Zielmärkten, insbesondere Lootbox-/Verbraucherschutz, Minderjährigenschutz und digitales Guthaben durch qualifizierte rechtliche Prüfung.
- [ ] Rechte/Nutzungsfreigaben für betroffene Spielerbilder, Namen, Logos und sonstige kommerzielle Spielinhalte geklärt.
- [ ] Vollständige Nutzertexte und Pflichtinformationen: Impressum, Datenschutzerklärung, Bedingungen für digitale Inhalte/virtuelle Punkte, Preise, Widerrufserklärungen, Support/Kontakt, transparente Pack-Wahrscheinlichkeiten, Verfügbarkeit und Zahlungshinweise.
- [ ] Keine realwertige Einlösung/Auszahlung von virtuellen Punkten oder Karten; falls eine solche Funktion existiert, erneute Risikoprüfung.
- [ ] Klar definierte Regeln für Rückerstattung, Teilrückerstattung, Chargeback, bereits verbrauchte Points und gewährte Packinhalte.

### 2. Backend und Echtgeld-Abrechnung

- [x] Stripe LIVE-Key separat von Sandbox; `rk_live_` zulässig, bei ausreichend eingeschränkten Berechtigungen.
- [x] Stripe LIVE-Webhook-Endpunkt, Signaturvalidierung im Backend implementiert.
- [x] Exakte Stripe-LIVE-Preisprüfung ohne vom Browser gelieferten Betrag.
- [x] LIVE-Gutschrift über nur serverseitige Postgres-RPCs vorgesehen.
- [x] Sandbox-Wallet und LIVE-Wallet getrennt; Wallet-Anzeige sowie alte Sandbox-Gewährung bei LIVE-Shop nicht vermischen.
- [ ] Verifizierter Test von Stripe LIVE-Webhooks mit **echter Signatur**, Empfang, Datenbankgutschrift, zeitgleichem Retry, doppelter Zustellung und Zahlungsstatus.
- [ ] Überprüfung aller Stripe-Checkout-, Preis- und Webhook-API-Berechtigungen des `rk_live_`-Schlüssels (auch Refund- und Dispute-Retrieval).
- [ ] Stripe `checkout.session.completed` / asynchrone Events / verzögerte Finalisierung / ausbleibende Events inklusive Replay- und Nachbearbeitung.
- [ ] Datensatz für jede Zahlung, Gutschrift und Ausgabe wird serverseitig protokolliert; automatisierte Differenzprüfung zwischen Stripe und Wallet.
- [ ] Rückerstattungs-, Dispute- und negativer Saldo-Fall vollständig getestet.
- [ ] Monitoring + Support-Verfahren für fehlgeschlagene oder doppelte Gutschriften eingerichtet.

### 3. Spielerinventar und Auslieferung

- [x] LIVE-Draw-Pool, Versionierung, serverseitige Pack-Routinen und atomare Speicherprozesse vorbereitet.
- [ ] LIVE-Store-Items/Pack-Spezifikationen derzeit bewusst **deaktiviert**. Für jeden freizugebenden Gegenstand müssen `enabled` und `fulfillment_ready` erst **nach** bestandener E2E-Prüfung freigegeben werden.
- [ ] Durchgängige Kontrolle, dass eine bezahlte Karte nach Speichern, Neuladen, Abmelden, anderem Gerät und Crash-Retry sichtbar, verwendbar und demselben Konto/Verein zugeordnet ist.
- [ ] Keine Umwandlung von Sandbox-Points in LIVE-Points. Bisherige Sandbox-Points bleiben im Testkonto gespeichert, werden aber im Live-Spiel **nicht** zum Guthaben addiert; Sandbox-Pack-Rewards nicht erneut gewähren.
- [ ] Bestätigung von Erstkäufer-/Account-/Minderjährigenschutz, Kaufhistorie und Zahlungsbeleg.
- [ ] Vergleich der realen Packwahrscheinlichkeiten mit den öffentlich angezeigten Werten.

### 4. Freischaltung: geordnet und reversibel

1. Schriftliche Zahlungsanbieter- und Rechtsfreigaben dokumentieren.
2. Vollständige Tests in Sandbox und nicht belastende Simulationen bestehen.
3. Kontrollierten ersten **realen** Kleinstbetrag nur nach ausdrücklicher Autorisierung durchführen; daraus wird keine allgemeine Freigabe abgeleitet.
4. Receipt, ID, Points, Login, Webhook, Refund/Dispute, echte Kartenauslieferung überprüfen.
5. Wenn alles grün: vollständige Live-Wallet/UI, historische Sandbox-Isolation und veröffentlichtes Verbraucher-Informationsmaterial testen.
6. **Erst danach** notwendige serverseitige Flags und Store-Konfiguration aktivieren. Nie ausschließlich Browser-Flags verwenden.
7. Rollout überwachen; Fehler → Shop/Spending-Flags auf `false` setzen, bezahlte Buchungsbelege aber **nicht** löschen.

## Bekannte Release-Schalter (nicht eigenmächtig aktivieren)

- `FOOTERA_LIVE_PAYMENTS_ENABLED` – Erlaubnis zum Erstellen von Stripe Checkout-Sitzungen.
- `FOOTERA_LIVE_WEBHOOK_ENABLED` – signierte Stripe-Events dürfen LIVE gutschreiben.
- `FOOTERA_LIVE_SPENDING_ENABLED` – Ausgaben aus der LIVE-Wallet.
- `FOOTERA_LIVE_DELIVERY_ENABLED` – vollständige Lieferung.
- `FOOTERA_LIVE_PACKS_ENABLED` – Packkauf und serverseitige Ziehung.
- `window.FOOTERA_LIVE_STORE_ENABLED` – nur Anzeige-/Shop-Umschalter, **keine** Zahlungsberechtigung.

## Hinweise

- Niemals `sk_live_`, `rk_live_`, `whsec_`, Supabase Service Role Keys oder GitHub Action Tokens in Repository-Dateien, Chat oder Logs veröffentlichen.
- Sandbox-Datensätze bleiben zur Nachvollziehbarkeit erhalten. Auf Wunsch gesondert archivieren; kein automatischer Lösch- oder Echtgeld-Konvertierungsprozess.
- Siehe Stripe-Richtlinie zu eingeschränkten/unerlaubten Geschäftsmodellen: https://stripe.com/legal/restricted-businesses
