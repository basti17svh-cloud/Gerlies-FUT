# Tournament winner Pick Icon odds

Backend-only adjustment, effective immediately on 30 October 2026. No frontend runtime or cache change.

The live standard 84+ catalogue contained 136 Icons and 139 non-Icons. Unrestricted catalogue sampling made Icons far too common. Tournament standard Picks now roll a 5% chance per newly opened Pick to include exactly one Icon; otherwise all three choices are non-Icons. Each option remains 84+, distinct by player, and untradeable. The two prize Picks remain unchanged. The history-based variety preference cannot override the Icon roll.

Already generated options are preserved, including unopened UI for an already generated offer. All other Pick sources keep their previous selection logic. Missing eligible normal players fail without consuming or persisting an invalid offer. Ownership checks, row lock, receipt and claim paths remain unchanged.

Validation:
- Isolated PGlite/Postgres: full tournament SQL tests (two Picks, opening/choosing/delivery, revisions, receipt replay, owner and weekly boundaries) passed with the migration applied.
- 1,000 isolated generated tournament offers: all three valid distinct 84+ choices, at most one Icon, observed rate within a broad 2–9% sampling check, exact stored options on repeated opening. Existing three-Icon offers, other standard sources, wrong club and insufficient non-Icon pool checked.
- Nine targeted tournament/account Node tests passed.
- Live function definition confirms the tournament-only 5% roll, one-Icon cap and saved-offer guard. Existing function privileges retained (anon denied, authenticated allowed).
- No player offers or inventory were rewritten. No layout changed; no new mobile layout test was necessary.
