# Footera Footballer Prototype (CC0)

Asset: `footballer-prototype.glb`, sourced from Quaternius **Universal Base Characters — Standard** (Superhero Male).
- Official source: https://quaternius.com/packs/universalbasecharacters.html
- Distribution: Creative Commons CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Verified source copy: https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/public/assets/character.glb
- Original source Git blob SHA-1: `b3fd79533fdb9fcedd077744f7e120920eb6cc97`
- Source: packaged original glTF mesh, skeleton, and reference pose; 65-bone rig. **No animation clips**.
- The source materials are monochrome. Footera uses runtime team kit materials for the prototype.
- Attribution optional under CC0. No branded or celebrity assets used.
- Import is source-pinned, verified and committed by the dedicated GitHub workflow.

This prototype is not a photorealistic player or a fully animated finished model. If unavailable, the existing player remains as fallback.

# Footera Human Players (CC0), V21.192

Asset: `footera-humans.glb`, built by `tools/build-footera-humans.py` from the MakeHuman 1.x system assets.
- Source: MakeHuman base mesh, morph targets, skins and proxies (haircuts `short01`, `short02`, `short04`, `afro01`, `ponytail01`; `Full_beard`, `Moustache`; three eyebrow sets; `Low-Poly` eyes; `male_casualsuit04` cut into shirt and shorts; `shoes05`), as packaged in npm `makehuman-data` 0.0.2.
- Licence: MakeHuman's system assets are CC0 1.0 (https://www.makehumancommunity.org/content/license.html, https://creativecommons.org/publicdomain/zero/1.0/).
- One athletic body with face-shape morph targets shared by body, hair and clothes; the game bakes each player's face once when the highlight starts.
- The skeleton copies the bone frames of `footballer-prototype.glb`, so the Quaternius CC0 mocap and the existing retarget and foot IK drive it.
- Kits, numbers, names and crests are painted per player at runtime from the saved club identity. No photos, no real likeness, no branded assets.
- Rebuild: download `makehuman-data` 0.0.2, unpack it and run `python3 tools/build-footera-humans.py <package> assets/footera/models/footera-humans.glb` (needs numpy and Pillow).

# Footera Realistic Players (CC BY 4.0), V21.433

Asset: `footera-real.glb`, built by `tools/build-footera-real.py` from the Sketchfab model "Man Player".
- Credit: This work is based on "Man Player" (https://sketchfab.com/3d-models/man-player-4c7133dbb06e4136891d59231372d818) by RiverofCreative (https://sketchfab.com/RiverofCreative) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).
- Changes: posed from T-pose to the A-pose of `footera-humans.glb`, re-rigged onto the same 52 Footera bones and Quaternius-matched frames, boots cut low, socks added, skin under the kit removed, textures re-packed (skin atlas, tint maps for hair, lashes and boots), kit painted per player at runtime.
- The credit is also in the GLB (`extras.footera.credit`) and in the game (Extras, "Quellen").
- Men's players use it; women's players keep the MakeHuman body. localStorage `footera-3d-real=0` turns it off.
- Rebuild: download the model as glTF from Sketchfab, unzip, run `python3 tools/build-footera-real.py <folder>` (numpy, Pillow). The raw download is never committed.
