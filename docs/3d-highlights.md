# Footera 3D Highlights – Broadcast (V20.96)

## Data boundary

The existing simulator remains authoritative. `simAttack`, `logGoal`, and
`resolveMissedMatchShot` decide and record the event before presenting it.
Only immutable display fields cross into the 3D queue: event ID, type, minute,
team, player ID/name, goalkeeper name, kit colours, period and attack direction. No match object, reward callback or player
attributes are passed to Three.js. Resource UUIDs in the pinned Three.js copy
use a private visual RNG and do not consume the simulation's Math.random stream.

The pre-existing missed-shot roll classifies the last 3.5% of rolls as a visual
post hit; the underlying non-goal outcome and statistics are unchanged. Saves
and wide shots with xG >= 0.16 qualify as big chances. Blocked shots stay in the
existing text flow. No extra shots, goals, defenders or random draws are added.
Full names are recorded in an additional event display field when available;
scorer identity and existing statistics keys stay unchanged.

## Modules

- `3d-highlights.js`: four modes, immutable snapshots, serial queue, duplicate
  suppression, asynchronous scene loading, skip and an 18-second queue watchdog.
- `3d-highlights-match.js`: bridge to the existing match lifecycle and settings.
- `3d-highlights-scene.mjs`: 10.4-second broadcast choreography, fixed world touchline camera,
  16 moving outfield players and an articulated goalkeeper.
- `3d-highlights.css`: scoped mobile broadcast aperture and Footera HUD outside the picture.
- `vendor/three/`: pinned r160 and its MIT license; no runtime CDN dependency.

Pending highlights stop the interval immediately. Non-goal ticks finish their
normal simulation work before playback; goal ticks retain the original early
return. The pending guard prevents queued interval callbacks or phase changes
from overtaking playback. The old match's queue is cancelled before replacement
or management; stale promise completions cannot restart another match.

Score, timeline and scene captions wait until playback finishes. The matchday
clock alone immediately adopts the frozen event minute. The first 5.4 seconds
of all four trajectories are identical. Foot/ball release occurs at 5.4 seconds,
physical impact at 6.65 seconds, HUD reveal at 6.8 seconds, without a rating. Skipping releases the queue;
no simulation event is re-executed. Failed WebGL returns to the text scene or
the existing goal card. Settings are saved locally under
`footera-3d-highlights-v1`, independently of the user's club save.

## Performance and lifecycle

The small queue/bridge loads at startup. Three.js loads on first use and is also
included in the service-worker cache. Every scene stops its animation loop and
disposes geometries, materials, textures, instanced resources and its renderer.
Context-loss, resize, keyboard, abort and watchdog listeners/timers are cleaned
up. A hidden tab skips the scene. DPR is limited to 1–1.45. LOW starts at DPR 1 without shadow maps or fill light
and with reduced crowd density. STANDARD uses 1024px directional shadows.
Player geometry, paths and camera are identical. Players, stadium structures
and crowd are instanced. The existing slow-frame check now reduces shadows,
crowd and resolution; sustained extremely slow frames return to 2D/text.
The renderer watchdog is 16 seconds; the queue also covers module loading.

## Validation

- `node --test tests/3d-highlights.test.cjs`: queue isolation/deduplication,
  cancellations, watchdog, all four paths, isolated visual RNG, 24 seeded
  comparisons against the V20.95 main commit, shell assets and syntax checks.
- `node --test tests/matchday.test.cjs tests/chem-boosts.test.cjs tests/playstyles.test.cjs tests/card-layout.test.cjs tests/player-profile.test.cjs tests/boot-update.test.cjs`
- `NODE_PATH=<Playwright installation>/node_modules node tests/3d-highlights.browser.cjs`
  runs Chromium with real WebGL against an isolated local match fixture and
  creates 360/390/412px screenshots plus JSON evidence in `test-artifacts/`.
- `NODE_PATH=<Playwright installation>/node_modules node tests/3d-highlights.render.cjs`
  captures exact frames of production `play()` inside Footera, then checks
  projected player counts, camera distance and real glove/ball mesh contact in
  both quality modes and all four periods.
- `.github/workflows/highlights-tests.yml` provides the same regression and
  browser checks on PRs and relevant main changes.

The browser fixture loads production HTML/scripts and disables only database
and account startup; it makes no online account writes and changes no real save.

## Direction and field geometry

`getMatchPeriod` reads the existing `halftimeLogged`, `extraTimeStarted` and
`extraTimeBreakLogged` flags. It never infers a half from the minute. A 45/90/105
minute event queued before the phase transition therefore retains its original
period, including any future stoppage time. `getAttackDirection(team, period)`
is the only side policy: home attacks -Z in periods 1/3, +Z in 2/4; away is
opposite. Snapshots freeze both fields before asynchronous playback.

One field group rotates the pitch, both goals, all players, keeper, ball and
paths together. The stadium and camera stay on the same WORLD touchline. The
30-degree tele camera tracks only four metres and stays at least 101 metres
from its target, including celebration. No result-dependent camera variation.

The pitch is 105×68 m, goals 7.32×2.44 m with 12cm posts and 1.9m-deep nets.
Both penalty areas, six-yard boxes, spots, arcs, halfway line, centre circle,
corner markings and flags are present. Feet, hip/knee joints and the ball
share the same release timing; a two-bone keeper arm solver reaches the frozen
save impact point. Post rebound, net ripple and parry start after contact.

## Scope

Presentation only: generic running-match choreography, no autonomous 3D match
or added simulation event. The existing simulator currently supplies post hits,
not separate crossbar events. Other events, penalty shootouts and management
retain their established flow. “All highlights” equals “Important highlights”.
No phone-specific frame-rate guarantee; hardware and measured frame times
select rendering details or the established fallback. Player forms never change
between quality modes. Similar shirts trigger a contrasting complete away kit;
the goalkeeper uses a separate contrasting colour.
