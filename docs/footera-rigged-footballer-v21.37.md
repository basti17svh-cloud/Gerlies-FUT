# Footera V21.37 – Skinned footballer pilot

A real two-actor `THREE.SkinnedMesh` prototype is now in the existing production highlight renderer.

## What changed
- The striker and goalkeeper use a connected skeleton of 14 `THREE.Bone` joints and a single skinned weighted surface each, with jersey/shorts/skin/socks/sleeves material groups.
- Skin-weighted geometry spans the waist, arms, elbows, thighs, knees and shins, reducing solid limb seams and preserving the original rig's foot and glove attachments.
- `THREE.AnimationMixer` drives a dedicated torso motion bone with seekable 10.4-second animation clips for scorer and goalkeeper. The existing V21.36 action clips still control striker/keeper poses and supported foot trajectories.
- Home/away/goalkeeper kit colors and patterns reuse the existing Footera material pipeline.
- The other field players retain existing instanced silhouettes until this pilot has passed objective mobile and visual acceptance tests.
- Original match results, choice of highlight, shot impact, keeper contact, score hold, TV camera, 2D fallback, WebGL quality tiers and screenshot capture stay unchanged.

## What is not claimed
- No licensed or motion-captured animations have been imported.
- The new figure is original generated mesh geometry, not a photorealistic artist-created character.
- The change is a working skinning integration and a basis for a future asset and motion-retargeting pipeline. The quality improvement must be judged from the actual browser video and performance tests before rollout to more actors.

## Checks
- Bone binding, normalized skin weights, animated mixer, deterministic seek, offline loading.
- Production WebGL geometry checks assert two skinned actors and preserve goal/saved-chance contact checks.
- CI 390px video records the actual Footera highlight, not a separate showcase engine.

## Performance correction after first complete browser run
The initial surface had twelve Three.js material groups per actor and exceeded the production limit of 115 draw calls (117–125 observed). The fix combines the existing club's rendered shirt fabric and the shorts/skin/socks/sleeve swatches into one shared UV atlas **per skinned actor**. Each weighted figure now submits **one** SkinnedMesh draw instead of one draw per anatomical band; material patterns stay derived from the saved match kit.

The V21.37 workflow separates fast deterministic geometry, keeper-contact and draw-call assertions from costly screenshot/video production. The real 390px video workflow records the release independently. Full screenshots remain available through the standalone render script.
