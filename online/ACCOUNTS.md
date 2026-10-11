# Footera-Konten – Google, E-Mail, Cloud (V21.109)

Diese Version verwendet den bestehenden Supabase-Auth-Client in `friend-online.js`. Bei vorhandenen Gastkonten erhält `auth.linkIdentity({ provider: 'google' })` dieselbe User-ID; Freundescodes und bestehende Duelle bleiben so dem Konto zugeordnet. Für E-Mail-Gastumwandlung wird zunächst `auth.updateUser({ email })` aufgerufen, die Adresse verifiziert und anschließend ein Passwort vergeben.

## Einmalige Betreiber-Einrichtung (noch erforderlich)

1. Supabase → Authentication → Providers → Google aktivieren. In Google Cloud Console ein OAuth-Webclient für Footera mit Zustimmungsbildschirm erstellen, Client ID und Client Secret in Supabase eintragen.
2. In Google Cloud als **Authorized redirect URI** exakt `https://idxydyrihtyecvfjvtuk.supabase.co/auth/v1/callback` hinterlegen. Die OAuth-Callback-URL darf nicht mit der GitHub-Pages-Adresse verwechselt werden.
3. Supabase → Authentication → URL Configuration: Site URL und Redirect Allow List auf die tatsächliche veröffentlichte Footera-URL setzen, gewöhnlich `https://basti17svh-cloud.github.io/Gerlies-FUT/`. Exakte veröffentlichte Adresse vorher prüfen.
4. Supabase → Authentication → Providers / Identity Linking: **Manual identity linking** einschalten, damit bestehende Gastkonten Google mit gleicher Supabase User-ID verknüpfen können.
5. Supabase → Authentication → Providers → Email: E-Mail/Passwort und Bestätigungsmails aktivieren. Für produktiven E-Mail-Versand eigenes SMTP konfigurieren, Zustellbarkeit sowie Passwort-Reset prüfen.
6. HTTPS und autorisierte Domains/Datenschutzinformationen prüfen; Google kann für öffentliches OAuth-Branding zusätzliche Verifizierung verlangen.

Die Browser-Konfiguration in `online-config.js` enthält ausschließlich öffentliche Projekt-URL und publishable key. **Client Secret und Service Role gehören niemals nach GitHub.**

## Ablauf und Sicherheit

- Bestehende Gäste: **Mit Google verknüpfen**. Keinesfalls "Bei anderem Google-Konto anmelden" wählen, wenn die bestehende Online-ID erhalten bleiben soll.
- Ohne bestehende Sitzung: **Mit Google anmelden** oder E-Mail-Registrierung.
- E-Mail-Gast: zuerst E-Mail bestätigen, dann ein Passwort im Konto-Dialog vergeben; ohne Verifizierung kann das Passwort noch nicht gesetzt werden.
- Auf zweitem Gerät: anmelden, dann bewusst **Aus Cloud laden**. Die lokale Sicherung wird vor Ersetzen unter `footera-before-restore` abgelegt.
- Erstes Gerät: nach Kontoverknüpfung mit **In Cloud sichern** speichern. Cloud-Sicherung ist bewusst manuell; keine automatische Überschreibung zwischen Geräten.
- Die lokale Spielstand-Kennung `footera-cloud-owner` verhindert, dass ein fremder lokaler Spielstand automatisch als Online-Profil einer anderen angemeldeten Identität hochgeladen wird. Falls beim neuen Konto noch keine Cloud-Sicherung existiert, den lokalen Verein erst ausdrücklich zuordnen.
- `footera_cloud_saves`: RLS nur für dauerhaft angemeldeten Eigentümer, RPC prüft User-ID und die erwartete Revision. Kein direktes INSERT/UPDATE für Browserrollen. Server-Echtgeldwallet ist **nicht** Teil dieser Änderung; `save_data.points` ist weiterhin clientgeneriert und darf niemals als verlässlicher Zahlungsnachweis gelten.
- Anonyme Gastkonten bleiben bis zu einer erfolgreichen Verknüpfung nicht wiederherstellbar. Keine Konten vorab löschen, keine automatisch zusammengeführten Spielstände bei existierenden Konten.

## Prüfung vor Liveschaltung

1. Gastkonto A erstellen, Freundescode notieren, mit Google verknüpfen, nach Redirect gleiche User-ID und gleichen Freundescode prüfen.
2. Google-Abmeldung und Login nach Neustart testen; kein neues Gastkonto darf auf bestehendem Gerät erzeugt werden.
3. Auf zweitem Browser mit Google anmelden und Cloud-Spielstand kontrolliert herunterladen; Mannschaft, Coins, Packs und Founder-Karten prüfen.
4. E-Mail-Anmeldung mit Bestätigung und Passwort-Zurücksetzen prüfen; unerlaubte/andere Cloud-Spielstände dürfen nicht lesbar sein.
5. Gleichzeitiges Speichern mit veralteter Revision muss abgelehnt werden.
6. Bestehende Gast-Live-Duelle, Freunde und Profile auf zwei Geräten regressionsprüfen.
7. Den Echtgeld-Shop erst nach separater serverautoritativer Wallet-/Transaktionsbuchhaltung und Stripe-Webhooks aktivieren.

Die Migration `online/footera-accounts-v21.109.sql` wurde im verbundenen Supabase-Projekt ausgeführt. Google OAuth muss noch im jeweiligen Betreiberkonto aktiviert werden.

## V21.113 – Spieler-Einstieg mit Gastmodus

Neue Installationen ohne lokalen Footera-Spielstand erhalten beim ersten Start die Kontoauswahl mit Google, E-Mail und „Als Gast spielen“. Bereits angelegte Vereine werden **nicht** mit einem erzwungenen Startdialog unterbrochen. Die Gastoption verwendet eine bestehende anonyme Supabase-ID oder legt eine an, wenn noch keine Sitzung existiert; sie ersetzt niemals einen dauerhaften Account. Die Kontooption bleibt später im Spiel erreichbar.

Der Spielstand bleibt beim Gast lokal und ist ohne Verknüpfung mit einem dauerhaften Account nicht geräteübergreifend wiederherstellbar. Die Cloud-Sicherung wird weiterhin ausdrücklich ausgelöst und kann nur von dauerhaft angemeldeten Eigentümern genutzt werden. Die produktive Einrichtung des Google-OAuth-Providers und des Mailversands bleibt eine separate Betreibereinstellung. Wettbewerbs- und Markt-Zugriffsbeschränkungen für Gastkonten sind damit **noch nicht** umgesetzt; dazu braucht es serverseitige Durchsetzung, um Umgehungen zu verhindern.
