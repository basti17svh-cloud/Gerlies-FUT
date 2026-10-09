# V21.74 — imported player direction, motion and kit surface

Built on main `1538f0b` (V21.73). Reus Flashback content is unchanged.

The imported humanoid was facing +Z while Footera's animation driver and ball
contacts face -Z. Its local bone axes also differ from the procedural driver.
Copying the driver's Euler angles directly into those axes reversed the visible
player and distorted arm/leg movement.

Changes:

- Rotate the imported mount into Footera's forward direction.
- Convert pose deltas through each bone's neutral player-space basis.
- Solve imported thighs/shins against the existing ankle contact targets, using
  the actual imported limb lengths. Match foot orientation to the driver.
- Keep recovery foot velocity continuous at toe-off and landing. Smooth airborne
  additive poses for the scorer and surrounding players instead of toggling them.
- Reuse the equipped kit atlas, including jersey pattern and number. Correct the
  neckline/sleeves, soften painted-on abdominal contours, colour eyes/brows and
  replace exposed anatomical toes with lightweight shaped football boots.
- Refresh versioned runtime imports and offline cache to V21.74.

Match simulation, choreography paths, ball flight, shot timing, camera and
goalkeeper control are unchanged. The imported model still replaces the main
attacker only; surrounding players retain their existing models and receive the
shared gait transition fix. No motion-capture asset has been introduced.

Validation:

- `node --test tests/3d-player-retarget.test.cjs tests/3d-highlights.test.cjs tests/3d-glb-motion.test.cjs tests/football-animation.test.cjs tests/squad-motion.test.cjs tests/boot-update.test.cjs`
- `node tests/3d-player-prototype.browser.cjs`: imported model in STANDARD/LOW,
  explicit legacy fallback, deterministic seeking, cut/shot/recovery phases.
- `node tests/3d-player-quality.browser.cjs`: same production model inspected in
  central and mirrored cut scenes; ankle target deviation below 7 cm, correct
  forward direction and side mapping, rendered detail captures.
- `node tests/3d-highlights.browser.cjs`: mobile 360/390/412, event ownership,
  score timing, skip/completion, fallback and period direction changes.
- `FOOTERA_SKIP_CAPTURES=1 FOOTERA_GEOMETRY_ONLY=1 node tests/3d-highlights.render.cjs`:
  existing scene geometry, framing, goalkeeper contact and draw-call budget.

Set `FOOTERA_QA_VIDEO=1` for deterministic 30 fps production-frame export. These
offline frames demonstrate poses and continuity, not real-time handset FPS.
For an identical-scene baseline, set `FOOTERA_QA_ROOT` to a V21.73 checkout and
`FOOTERA_QA_LABEL=v21.73`. Diagnostic close cameras exist only in the test script.
