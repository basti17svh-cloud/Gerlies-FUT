# Footera V21.134 — Spielerstatistik / Instagram-Auswertung

## Was wurde eingerichtet?
- Online-Statistik unter `online/footera-analytics-dashboard.html` (nur nach Anmeldung und ausdrücklicher Adminfreigabe).
- Supabase Edge: `footera-analytics` (opt-in Tracking: `verify_jwt=false`, Origin-Prüfung, JSON-Validierung) und `footera-analytics-admin` (authentifizierter, admin-allowlistgeschützter Statistikbericht mit JWT).
- Migrationen: `online/footera-analytics-v21.133.sql`, `online/footera-analytics-retention-v21.134.sql` wurden auf dem bestehenden Supabase-Projekt `idxydyrihtyecvfjvtuk` angewendet.
- `footera-points-shop.js` lädt isoliert `footera-visitor-analytics.js`; Store-Preislogik / Echtgeld-Stripe bleibt unangetastet.
- Service-Worker-Version `footera-v21-134-visitor-analytics` stellt neue Browserdateien bereit.

## Messung
**Aus bestehenden Backend-Daten, ohne Besucher-Zustimmung:** Anzahl aller Auth-Konten, echter E-Mail-Registrierungen (ohne anonyme Gäste), bestätigter Registrierungen, ausstehender E-Mail-Bestätigungen, Profile, Profile mit `last_seen_at` in den letzten 24 Stunden bzw. 7 Tagen. Diese Zahlen unterscheiden Konten von Personen.

**Ab Installation, nach freiwilliger Statistik-Einwilligung:** Unique Browser (nicht Unique Personen) pro Tag, 7 und 30 Tage, Login-Aktivität eines bestätigten Kontos im Browser mit Einwilligung, Traffic-Herkunft (Instagram, Facebook, TikTok, Google, direkt, sonstige).

**Seit Installation:** Neue Vereinsgründungen durch einen `AFTER INSERT` Trigger auf `footera_online_profiles`. Die sechs bereits vorher erstellten Profile bleiben im Bestand, werden aber **nicht** fälschlich als neue Gründungen datiert.

**Instagram-Link zur Verwendung in Bio / Story:**
`https://basti17svh-cloud.github.io/Gerlies-FUT/?utm_source=instagram`

Besucher müssen der Statistik zustimmen. Ohne Zustimmung kann weder die Besucherzahl noch die Instagram-Reichweite vollständig sein. Bots, Cookiesperren, verschiedene Browser und gelöschte Browserdaten beeinflussen die Werte. Die eingebauten Kennzahlen sind keine gerichts- oder revisionssichere Reichweitenmessung.

## Datenschutz- und Sicherheitsmodell
- Nein und Ja werden im Browser gespeichert. Vor Zustimmung keine Besucherereignisse. Ein minimales dauerhaftes `Statistik`-Menü erlaubt nachträgliche Zustimmung oder Widerruf und Löschung.
- Browser generiert ausschließlich nach Zustimmung eine zufällige UUIDv4. Supabase speichert nur ihren SHA-256-Hash (nicht den Klartext); keine IP, E-Mail-Adresse, Browserkennung oder vollständige URL in den Analytics-Tabellen. Browserseitig wird nur die erlaubte Herkunftskategorie übertragen.
- Nach Widerruf stoppt das Tracking sofort; die Browserkennung wird gelöscht. Der Dienst verarbeitet nach Möglichkeit die Löschung der pseudonymen Besucherereignisse. Bei Übertragungsfehlern wird die Löschanfrage erneut versucht.
- Consent-Browserkennungen und besuchsbezogene/optionale Aktivitätsdaten werden bei neuen Besuchsereignissen nach 90 Tagen entfernt. Für einen strikten automatischen Löschplan ohne Traffic ist ggf. später `pg_cron` oder ein weiterer Wartungsprozess vorzusehen.
- Nutzergebundene Aktivität/Vereinsgründungsdaten werden bei Kontolöschung durch FK `ON DELETE CASCADE` entfernt.
- Datenbanktabellen mit RLS gesperrt, außer `service_role` kein direkter Zugriff. Öffentliche Besucher-RPC und aggregierter Adminbericht sind nur von `service_role` aufrufbar, nicht von `anon`/`authenticated`.
- Adminreport `footera-analytics-admin` prüft die **bestätigte Supabase-Identität** und `public.footera_analytics_admins`, dann liest er ausschließlich Aggregatzahlen. Die öffentlich verfügbare HTML-Datei selbst enthält keine vertraulichen Statistiken.
- Vor Veröffentlichung die Datenschutzerklärung für optionale Analytics, Zwecke, Rechtsgrundlage, Widerruf, Messunsicherheit und Aufbewahrung ergänzen. Gerade bei Minderjährigen rechtlichen Rat einholen.

## Owner-Freischaltung – noch ausstehend
**Keine Admin-Berechtigung wird per Vermutung vergeben.** Der Nutzer muss bestätigen, mit welcher E-Mail-Adresse er tatsächlich **in Footera angemeldet ist**. Dann als Admin in Supabase aufnehmen:

```sql
insert into public.footera_analytics_admins(user_id)
select id from auth.users
where lower(email)=lower('<BESTÄTIGTE FOOTERA LOGIN EMAIL>')
  and email_confirmed_at is not null
  and not coalesce(is_anonymous,false)
on conflict (user_id) do nothing;
```

Danach im selben Browser anmelden und die Seite öffnen:
`https://basti17svh-cloud.github.io/Gerlies-FUT/online/footera-analytics-dashboard.html`

Wenn keine Zeile durch den SQL-Befehl eingefügt wird, handelt es sich nicht um ein bestätigtes passendes Footera-Konto. Kein Fallback auf Gastuser oder Stripe-E-Mail.

## Verifikation 12.10.2026
- Datenbankmigrationen erfolgreich.
- SQL-Transaktionstests mit Rollback: zwei Ereignisse desselben Browsers => ein täglicher Besucher, Herkunft Instagram, freiwillige Aktivitätszählung eines echten Nutzers, Opt-Out löschte Besuchs-/Aktivitätszeilen.
- Private Summary-RPC liefert bestehende Konten und Profile korrekt.
- Neuer Admin-Endpunkt deployed, aber ohne Admin-Row noch nicht im Browser-End-to-End verifiziert. Frontend/GitHub Pages-Laufzeittest steht noch aus; zuverlässige Besuchererfassung nicht als produktiv bestätigt ohne Live-Browsertest.
- Keine Stripe-Echtgeldfunktionen geändert.
