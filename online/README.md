# Footera Live-Duelle

Die bisherige Friendly-Simulation gegen einen gespeicherten Profilcode bleibt erhalten. Live-Duelle nutzen einen gemeinsamen Spielstand: Beide Spieler sehen denselben Matchday, ändern ihre eigene Taktik, wechseln bis zu fünf Spieler und bestätigen die Halbzeit. Der Server führt die Uhr, Tore und Ergebnisliste. Ein abgebrochenes Duell zählt nicht. Gewertete Duelle bilden pro Freund eine Tabelle mit Sp, S, U, N, Toren, Differenz und Punkten (3/1/0). Es gibt keine Coins, Packs oder Rivals-Punkte.

## Online-Dienst einrichten

1. Ein Supabase-Projekt erstellen. Unter **Authentication → Providers → Anonymous Sign-Ins** die anonyme Anmeldung aktivieren.
2. `online/footera-duels.sql` im SQL Editor des Projekts ausführen. Die Tabellen verwenden Row Level Security. Nur die beiden Teilnehmer können ihre Duelle lesen; direkte Schreibrechte auf die Duelltabelle gibt es nicht. Match-Aktionen laufen über geprüfte Datenbankfunktionen.
3. In `online-config.js` die Projekt-URL (`https://…supabase.co`) und den **publishable/anon key** einsetzen. Niemals einen `service_role`- oder Secret-Key in dieses öffentliche Repository schreiben.
4. Die aktualisierte Website veröffentlichen und auf zwei Geräten mit jeweils gefüllter Startelf und sieben Bankspielern testen. Beide müssen nach dem ersten Online-Start ihren **neuen Profilcode** austauschen. Alte Codes bleiben für die Offline-Friendlies gültig, enthalten aber keine Online-ID.

Die Buttons „Live-Duell“ und „Vergleich“ erscheinen erst bei gültiger Projektkonfiguration und einem neuen Freundescode. Einladungen lassen sich unter Freunde annehmen, ablehnen oder zurückziehen. Wer das Matchfenster schließt, kann über „Letzte Duelle“ zurückkehren. Wenn beide Geräte geschlossen sind, läuft die Spieluhr nicht weiter; die Partie wartet auf die Rückkehr.

Anonyme Konten sind an die lokale Browser-Anmeldung gebunden. Werden die Browserdaten gelöscht oder wird das Gerät gewechselt, lässt sich die Online-ID ohne spätere Konto-Verknüpfung nicht wiederherstellen. Deshalb sind die Live-Duelle vorerst ohne spielwirtschaftliche Belohnungen. Für längerfristige Freundesligen wäre als nächster Schritt ein wiederherstellbares Konto sinnvoll.


## V20.32 – aktuelle Mannschaften von Freunden

Bei bestehenden Supabase-Projekten einmal `online/footera-friend-squads-v20.32.sql` im SQL Editor ausführen. Danach veröffentlicht Footera bei Änderungen automatisch die aktuell aktive Mannschaft und zusätzlich alle weiteren vollständig besetzten Teams (maximal drei). In der Freundesansicht wird der aktuelle Online-Stand geladen; das aktive Team steht zuerst. Die bisherige Einzel-`squad`-Spalte bleibt für Live-Duelle und Abwärtskompatibilität erhalten.
