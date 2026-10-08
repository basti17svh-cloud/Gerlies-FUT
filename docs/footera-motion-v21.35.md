# Footera V21.35 – Bewegung zuerst

Scope: production Three.js motion only. No player card, match result, xG, scoring, goalkeeper save outcome, stadium or club kit changes.

- Export `locomotionDynamics` for speed-aware acceleration lean and balanced inside/outside foot planting on turns.
- Ball carriers use compact steps and lower arm swing rather than the same stride as free runners.
- Defensive slide/block/aerial animations only trigger with the rendered ball in reach; a defender cannot collapse to the ground well away from play.
- Slide tackle uses bracing, leg extension and recovery rather than abrupt 34 cm mesh drop through turf.
- Shared carrier/ball queries are hoisted outside the 16-actor frame loop.
- Stronger motion requires new animation assets and rigged clip blending later; this version is an incremental motion foundation, not photorealistic footballers.
- Retains 16 field actors + keeper, side directions, camera, kick impact timing and quality tiers.
- Video QA uses the real production renderer in a 390px browser. Chromium software rendering is not an S24 Ultra FPS benchmark.
