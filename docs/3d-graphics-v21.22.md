# V21.22 — broadcast graphics

Built on main `5adcc98cdffe2556bc29b52e1d228aec219a09c5` (V21.21).

The supplied reference emphasises athletic silhouettes, connected terraces,
fine grass variation, directional lighting, contact shadows and a complete box
net. Production V21.21 captures showed disconnected dark stadium corners,
rectangular spectators, exaggerated simultaneous running strides and detached
ground shadows. The existing elevated touchline camera position and target paths are retained.
A 4.6-degree near-wing FOV allowance keeps the complete goal roof in frame and
fades smoothly during the finish; the original ground-centre-only guard missed
this clipping on 360/390/412 phones.

Changes in the existing renderer:

- Shared oval loft geometry gives shirts a chest, waist, shoulders and neckline;
  heads have a jaw and skull profile, and limbs have thigh, knee, calf and wrist
  contours. All seventeen actors retain the existing articulated skeleton.
- Small procedural cloth maps render every existing saved kit pattern directly
  on the shirt. Shirt, shorts, socks and goalkeeper colours still come from the
  immutable kickoff snapshot. No external model or texture is downloaded.
- Running phase follows travelled distance. Stride amplitude follows actual
  presentation movement speed. Grounding lowers the support foot to the turf.
  Pass, shot, keeper interception and ball paths retain their existing timing.
- A 1024px procedural turf map combines mowing bands, broad colour variation,
  blade noise and subtle goalmouth wear. Adjusted ambient/key/fill lighting
  retains more colour and shape. Shared 64px contact shadows replace hard discs.
- The goal gains roof cross-mesh, ground anchors and rear tension supports;
  existing timed impact and net ripple remain intact. A small ball panel map
  improves rotation/readability without changing trajectory or result.
- Rounded corner terraces join the existing stands. Concrete aisles and a
  recessed concourse add depth. Existing instanced crowd reactions and flags
  remain; supporters gain tapered torsos, hair shading and pitch-facing poses.

LOW keeps lower geometry segments, fewer spectators, contact shadows and a
1.15 DPR cap. Slightly wider LOW pitch markings prevent broken subpixel lines. STANDARD retains 1024px shadow maps and up to 2 DPR on capable
phones. HIGH uses 2048px shadows, more geometry/crowd detail and up to 2.25 DPR.
The existing adaptive reduction and extreme-performance fallback remain active.

The simulation, camera position/target choreography, score-impact bridge, event queue, card
renderer and goal-overlay layout are unchanged. A scoped crest positioning fix
neutralises inherited kit-mini offsets that previously pushed the correct badge
outside its overlay column; no crest identity or card rendering is replaced. The only index/loader changes
are release/cache references. No simulation RNG is used by procedural assets.

Validation uses the existing production play loop in an isolated match fixture,
not a substitute scene. Captures include 360/390/412 goals, both wings, central
build-up, goalkeeper contact, configured kits and LOW rendering. The browser
suite checks score reveal, real scorer/special cards, home/away crests, skip,
fallbacks, mobile bounds, timers and duplicate-event prevention.

Two pre-existing test issues were corrected before visual work: stale V21.20
release assertions in the V21.21 shell, and geometric bounds left over from the
older camera. V21.21's actual camera-to-offset-target distance was 38.01–69.00m;
the existing near-side cutback had four visible field players at its widest
phase. The updated guards reflect those measured baseline values, retain all
ball/carrier/goal projection tests, and do not change the camera position or target paths. A new projected-roof
regression covers both directions and all three phone widths through delivery.
