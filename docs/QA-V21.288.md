# V21.288 – approved TOTW 7 release gate

28 October 2026. Base: current main `4fc48ca03fcc3ac5bb57c4f1686c1186a678c65b`.

## Changes

- Keep the approved 18-player TOTW 7 roster, ratings, portraits and master renderer. Its release remains 28 October 2026 at 19:00 Europe/Berlin (18:00 UTC), ending 4 November at 19:00 Berlin.
- Correct Balerdi's TOTW fallback league to Serie A while retaining Roma and its badge. The regression executes the actual merge function with absent and outdated base data.
- Regenerate the checked-in Pick catalog. Only the five approved TOTW 7 cards rated 85+ were upserted into the live catalog, retaining the existing Pick eligibility rule. No existing offers, selected options, player saves or rewards were modified. Historical teams were not rewritten in the live database.
- Synchronize title, visible build, main script, manifest description/start URL, worker registration and cache at V21.288.
- Replace the hard-coded TOTW 7 script revision test with a check against the actual runtime build. Fix the promo regression's arithmetic (50,000 + 100,000 + 500,000 + initial 10 = 650,010); promo rewards themselves are unchanged.

## Completed verification

- 933 of 933 local standard Node tests passed across 132 test files, with no skips. This includes account/save recovery, Picks, rewards, startup/update, content gates, cards, packs, market, SBCs, evolutions and targeted 3D rules. The four long-running simulation files are excluded, not claimed as passed.
- The real database catalog update was first executed inside a rolled-back transaction with assertions: five eligible cards, zero before 18:00 UTC, five from 18:00 UTC, and the correct 4 November end. The same scoped transaction was then committed and its five rows read back.
- Existing TOTW rules verify TOTW 6 at 17:59:59 UTC and approved TOTW 7 at 18:00:00 UTC, plus roster balance, club uniqueness, exclusion of TOTW 5/6 and overlapping events, and all 18 cached portrait files.

## Release verification still required at this commit

GitHub CI, deployed Pages content and mobile browser checks are verified after publication; do not infer their success from this source commit. A local Chromium download failed in this environment. Personal Samsung-PWA/device switching, real account mail and production Player Pick selection were not performed. No load-test/capacity claim is made.
