# V21.160 – action-aware match simulation

The simulator now chooses an attack, a suitable shooter and a finishing technique before calculating the result. Goals and missed shots carry the same `actionKind` and `finish` into the highlight bridge. Presentation selection cannot turn a distance attempt into a tap-in or a header.

## Existing settings

| Setting | Simulation effect |
| --- | --- |
| Build-up | Patient play favors combinations; fast play favors through balls and costs fitness. |
| Attack focus and width | Change the distribution of wide attacks, crosses, cutbacks and switches. |
| Dribbling | Changes individual-run frequency. Dribbling, pace, physicality and relevant control styles decide duels. |
| Crossing | Changes cross frequency. Passing/crossing decides delivery; heading, strength, jumping, height and aerial styles decide the aerial contest. |
| Long shots | Changes distance-attempt frequency, not the shooter's ability. Weak shooters are less likely to take these attempts. |
| Pressing and depth | Pressing makes build-up harder; higher pressing/depth cost fitness and leave more space for through balls. |

Existing mentality, roles, chemistry and chemistry boosts remain in the calculation. The effective card values feed the action module for both sides. Genuine individual attributes are used when supplied; otherwise the six card stats provide an explicit fallback. OVR does not replace a present shooting stat.

For a neutral keeper and 100 fitness, the same base distance chance of 0.18 yields about 1.2% conversion at 40 SHO and 13.7% at 90 SHO before relevant PlayStyles. Distance quality is reduced separately, and distance finishing scales cubically relative to 75 SHO. Other finishes use a quadratic curve. Neither a PlayStyle nor a tactic guarantees success.

PlayStyles contribute only to relevant passing, control, defensive, aerial, finishing, goalkeeper or fitness checks. Plus has a larger bounded benefit. Gamechanger applies to difficult finishes in close late games. Long Throw affects throw-in build-up; Far Throw affects distribution by the actual attacking goalkeeper. Dead Ball also helps corner delivery.

Assigned free-kick and penalty takers are selected before the finishing calculation. Unavailable takers fall back to a suitable current outfield player. Corners, throw-ins, keeper distribution, turnover counters, direct free kicks and penalties now use the existing multi-phase planner with visible routes, animations and broadcast cameras. In All Highlights mode, missed low-xG attempts can also be shown.

## Verification

- `node --test tests/match-actions.test.cjs tests/squad-tactics.test.cjs tests/matchday-event-cards.test.cjs tests/playstyles.test.cjs`
- `node --test --test-name-pattern='simulation resolves' tests/match-simulation.test.cjs`
- `node --test tests/match-simulation.test.cjs` for statistical calibration.
- `NODE_PATH=<playwright modules> node tests/match-actions.browser.cjs` for the real app and WebGL at 360/390/412 px. `FOOTERA_CHROMIUM` optionally specifies a browser binary.

The browser fixture pins scenario selection/results solely to cover all three paths; probability assertions use the real finishing function and seeded simulation separately.

## Extended playback

The six plans from main are connected to simulation-owned events. Saves start keeper distribution, some blocked shots create corners, touchline losses create throw-ins, and a successful interception/tackle can precede a counter. There is no second result roll in the renderer. Corner assignments are respected on both sides.

The extended clock retains each plan’s 13–25 second duration and the 1.25-second canonical shot flight. Counter ownership is contested during interception, then changes to the attacking side. All coordinates retain the same half-specific field orientation. The additional attacking keeper uses the existing rig; the defending keeper keeps the existing save animation.

Focused checks: `node --test tests/extended-match.test.cjs`; `node tests/extended-match.browser.cjs` with Playwright. Browser coverage uses all six production simulator-to-queue-to-WebGL paths at 360/390/412 px, both field orientations, full goal framing and continuous ball positions.
