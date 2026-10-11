# Footera – Zufallspacks und Echtgeld-Points: technische und rechtliche Freigabeprüfung

Stand: 11. Oktober 2026 · Footera V21.121 · Geltungsbereich: PWA (Deutschland), spätere native App

## Ergebnis

**Kein Echtgeld-Launch freigegeben.** Footera besitzt nun eine gemeinsame Zufallspack-Engine mit mathematisch berechenbaren Quoten; ein Echtgeldzahlungssystem, das revisionssicher und serverautoritativ ist, ist jedoch noch nicht umgesetzt. Eine anwaltliche Prüfung und eine verbindliche Altersklassifizierung fehlen ebenfalls.

## Bereits technisch umgesetzt und prüfbar

- [x] Für kaufbare und vorhandene Packs ist ein Wahrscheinlichkeits-Button vor dem Kauf erreichbar.
- [x] Packgewichtung und Quotenberechnung teilen dieselbe Engine (`pack-odds.js`, `generatePack`).
- [x] Propack-Chance »mindestens eine Karte ab GES X« wird aus gewichteten Mengen ohne Duplikate berechnet, nicht mehr durch Stichproben geschätzt.
- [x] Garantierter Basis-GES-Mindestwert und feste Seltenheits-/Chemie-Boost-Zusagen werden gesondert angezeigt.
- [x] Icon-Zusatzchance und deren möglicher Ersatz einer Basis-Karte werden in die veröffentlichten Quoten eingerechnet.
- [x] Aktive Event- und TOTW-Karten fließen beim Aufruf der Quotenansicht mit ihren aktuellen angezeigten Ratings ein.
- [x] Bei einem unvollständigen Pool wird kein vermeintlich garantiertes vollständiges Pack verkauft (keine Abbuchung).
- [x] Automatische Tests der Wahrscheinlichkeitsformeln gegen kleine vollständig auswertbare Beispielfälle sowie Integrations- und Storetests.
- [x] Versionierung und PWA-Cache-Aktualisierung.

**Mathematisches Modell:** Innerhalb jeder disjunkten Pack-Kategorie werden `k` verschiedene Basisspieler mit Mengenwahrscheinlichkeit `P(S) = (∏_{i∈S} w_i) / Σ_{|T|=k} (∏_{j∈T} w_j)` gezogen, `w_i ∝ 1.62^(-OVR_i)`. Garantiegruppen werden auf mindestens einen Treffer oberhalb der garantierten Basisspielerstärke konditioniert. Die Spezialkartenüberlagerung (Event/TOTW) wird für die Anzeige anhand aktiver Karten ermittelt. Icons bilden einen unabhängigen Zusatzwurf mit den im Pack definierten Wahrscheinlichkeiten; bei Erfolg ersetzen sie einen passenden Basisslot. Prozentwerte sind rechnerisch bestimmt und für die Anzeige gerundet. **Das ist eine bewusste Umstellung** gegenüber der alten sequentiellen Ziehung mit 120 Wiederholungsversuchen und Fallback; ältere Monte-Carlo-Quoten wären für die alte Engine nicht als mathematisch exakt einzustufen gewesen.

## Blocker für echte Zahlungen

- [ ] Serverautoritative Wallet für gekaufte Points: der Browser und `save_data.points` sind keine vertrauenswürdige Zahlungsquelle.
- [ ] Getrennte, unveränderbare Transaktionsbuchung mit Account-ID, Provider, Währung, Menge, Beleg, Zeit, Status und Idempotenzschlüssel.
- [ ] Zahlungsanbieter einschließlich Steuer-/Rechnungs- und Rückerstattungsprozess auswählen (Web-PWA getrennt von App-Store-Käufen).
- [ ] Verifizierte serverseitige Payment-Webhooks, Signaturprüfung und Gutschrift **erst nach** bestätigter erfolgreicher Zahlung.
- [ ] Webhook-Duplikate und Race Conditions abfangen; Rückbuchungen, Chargebacks, Kündigung und Kontolöschung kontrolliert behandeln.
- [ ] Einschränkungen von Supabase RLS und Edge Functions testen: Spieler dürfen Geldwallet, Preise, Transaktionen und Premiumgutschriften nicht über modifizierte Clients schreiben.
- [ ] Kaufbeschränkungen und Schutzmaßnahmen für Minderjährige; Abfrage tatsächlicher Altersfreigabe, elterliche Freigaben und gegebenenfalls Kauf-/Ausgabenlimits.
- [ ] Transparente Verbraucherinformationen vor Bezahlung (Bruttopreis, ggf. Steuern, Anbieter, Leistungsumfang, Widerruf, digitale Bereitstellung, Support).
- [ ] Geografische Verfügbarkeit von zufallsbasierten Echtgeldelementen prüfen, insbesondere unterschiedliche Regelungen je Land.
- [ ] Rechtsprüfung durch geeignete anwaltliche Beratung zu Glücksspielrecht, Jugendmedienschutz, Verbraucherrecht, digitalem Handel, Datenschutz, Monetarisierung und der Handelsfunktion von Karten.
- [ ] App-Store-Freigabewege und Abrechnungsbedingungen prüfen; in nativen iOS-/Android-Apps gelten teils App-Store-/Play-Billing-Pflichten und nur programmgesteuerte Ausnahmen.

## Quellen zur Plattform- und deutschen Einordnung

- Apple App Review Guidelines, 3.1.1 – In-App-Käufe und Offenlegung von Lootbox-Chancen: https://developer.apple.com/app-store/review/guidelines/de/
- Google Play Payments Policy – zufällige virtuelle Gegenstände, Chancen **vor und unmittelbar beim Kauf**: https://support.google.com/googleplay/android-developer/answer/9858738?hl=en
- USK, Leitkriterien zur Alterskennzeichnung / Jugendschutzrisiken bei Lootboxen: https://usk.de/update-der-leitkriterien-fuer-alterskennzeichen-usk-beirat-verankert-nutzungsrisiken-in-der-bewertung-digitaler-spiele/
- Europäisches Verbraucherzentrum Deutschland – Lootboxen und deutsche Rechtslage (Stand 13. März 2026): https://www.evz.de/themen/einkaufen-digitales/gaming/lootboxen/

**Wichtig:** Diese Checkliste ist eine technische/produktrechtliche Vorprüfung und kein anwaltliches Rechtsgutachten. Ein erfolgreiches GitHub-Pages-Deployment allein ist weder ein Beweis für die Zahlungs- noch für die rechtliche Compliance.
