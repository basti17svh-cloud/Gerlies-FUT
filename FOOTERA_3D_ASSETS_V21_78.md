# Footera 3D: asset provenance and mobile rendering (V21.78)

## Existing authorized base
- Retain the installed Quaternius CC0 humanoid GLB and integrated CC0 capture clips; keep author and source records in the repo.
- Renderer/engine remains Three.js with deterministic, presentation-only motion.
- V21.78 adds Footera-authored mathematical normal, roughness and occlusion maps at 256×64 RGBA per map (128 KiB raw total), plus per-vertex crevice occlusion. No downloads or third-party texture assets are introduced.
- On mobile LOW, do not allocate the PBR maps: baked vertex detail and existing reduced renderer budgets remain. STANDARD/HIGH use shared maps for the single imported hero model. No extra geometry or draw calls.
- Preserve face/eyes separate from textile normal detail. Root trajectories, ball, final kick moment, keeper, results and score are not changed.

## License review and decision
- **Adobe Mixamo:** Adobe permits royalty-free incorporation of characters and animations into video games. Mixamo materials are not CC0. Adobe's redistribution guidance prohibits offering raw characters/animations to end users or as asset packs. Do **not** add raw Mixamo FBX/GLB motion to a publicly accessible Footera source repo or deploy a separately downloadable asset package without a specific review of licensing and delivery.
  - https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
  - https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400
- **Sketchfab:** each model has its own license. Standard, editorial and Creative Commons terms differ; editorial assets are not for ordinary commercial Footera use. CC BY may need author and source attribution; avoid derivative-share requirements that clash with the game. Check each particular model's page and downloadable-file license before sourcing it. Do not treat a Sketchfab link as approval to embed or mirror the model.
  - https://sketchfab.com/licenses
  - https://sketchfab.com/developers/download-api/guidelines
- **Current release:** no new Mixamo/Sketchfab assets added; existing CC0 provenance and game art remain unchanged.

## Acceptance gate for a future imported player
1. Verify a specific source and explicit redistribution/use license, preserve attribution and all required notices.
2. Validate rig naming, animation retargeting, foot placement, neutral scale and appropriate football boots.
3. Compare GPU draw calls/triangles, VRAM, player visual fidelity, frame times and context-loss fallback at 360/390/412-pixel mobile widths with the same 3D highlight sequence.
4. Only replace a current actor after objective improvement and no material mobile performance regression. Do not ship unlicensed character likenesses or proprietary club branding.
5. Keep LOW fallback and seek-safe deterministic animations; never change simulation outcomes.

## Verification
- `node --test tests/footwork-dynamics.test.cjs tests/player-pbr.test.cjs`
- `node --test tests/3d-player-retarget.test.cjs tests/3d-glb-motion.test.cjs tests/3d-glb-clip-blend.test.cjs`
- `node tests/3d-player-prototype.browser.cjs` and `node tests/3d-player-quality.browser.cjs` require local Playwright/browser and GPU/SwiftShader support.
- Publish only after successful CI/browser checks; inspect GitHub Pages deployment separately.
