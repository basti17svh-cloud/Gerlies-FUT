# Footera 3D Highlights – Phase 1 (V20.89)

## Data boundary

The existing simulator remains authoritative. `simAttack`, `logGoal`, and
`resolveMissedMatchShot` decide and record the event before presenting it.
Only immutable display fields cross into the 3D queue: event ID, type, minute,
team, player ID/name and kit colours. No match object, reward callback or player
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
  suppression, asynchronous scene loading, skip and a 14-second watchdog.
- `3d-highlights-match.js`: bridge to the existing match lifecycle and settings.
- `3d-highlights-scene.mjs`: eight-second Three.js choreography, three attacking
  camera templates and a goal-only celebration camera.
- `3d-highlights.css`: scoped mobile canvas and Bordeaux broadcast HUD.
- `vendor/three/`: pinned r160 and its MIT license; no runtime CDN dependency.

Pending highlights stop the interval immediately. Non-goal ticks finish their
normal simulation work before playback; goal ticks retain the original early
return. The pending guard prevents queued interval callbacks or phase changes
from overtaking playback. The old match's queue is cancelled before replacement
or management; stale promise completions cannot restart another match.

Score, timeline and scene captions wait until playback finishes. The first
3.1 seconds of all four trajectories are identical. The HUD reveals the event
only after 4.5 seconds, without a player rating. Skipping releases the queue;
no simulation event is re-executed. Failed WebGL returns to the text scene or
the existing goal card. Settings are saved locally under
`footera-3d-highlights-v1`, independently of the user's club save.

## Performance and lifecycle

The small queue/bridge loads at startup. Three.js loads on first use and is also
included in the service-worker cache. Every scene stops its animation loop and
disposes geometries, materials, textures, instanced resources and its renderer.
Context-loss, resize, keyboard, abort and watchdog listeners/timers are cleaned
up. A hidden tab skips the scene. DPR is limited to 1–1.5, low-resource devices
start at DPR 1, and a slow-frame check lowers resolution. There are no shadow
maps or external/high-resolution textures; the crowd uses instancing.

## Validation

- `node --test tests/3d-highlights.test.cjs`: queue isolation/deduplication,
  cancellations, watchdog, all four paths, isolated visual RNG, 24 seeded
  pre-integration comparisons, shell assets and syntax checks.
- `node --test tests/matchday.test.cjs tests/chem-boosts.test.cjs tests/playstyles.test.cjs tests/card-layout.test.cjs tests/player-profile.test.cjs tests/boot-update.test.cjs`
- `NODE_PATH=<Playwright installation>/node_modules node tests/3d-highlights.browser.cjs`
  runs Chromium with real WebGL against an isolated local match fixture and
  creates mobile screenshots plus JSON evidence in `test-artifacts/`.
- `.github/workflows/highlights-tests.yml` provides the same regression and
  browser checks on PRs and relevant main changes.

The browser fixture loads production HTML/scripts and disables only database
and account startup; it makes no online account writes and changes no real save.

## Phase 1 limits

Stylised players and generic attacking choreography, no faces or full 3D match.
Post is implemented; crossbar and specialist set-piece choreography are future
extensions. “All highlights” currently equals “Important highlights”. Existing
non-highlight events, penalty shootouts and management retain their prior flow.
There is no frame-rate guarantee for individual phones; incompatible renderers
fall back to 2D/text. Synthetic opponents use the default contrasting away kit;
close kit colours receive a contrasting substitute colour.
