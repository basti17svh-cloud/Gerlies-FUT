# Footera V21.75 — CC0 capture blend, Mixamo preparation

This release builds on V21.74. No match outcomes, ball trajectory, camera, goalkeeper, or foot IK are changed.

The lead GLB attacker uses real Quaternius Universal Animation Library Standard CC0 captured motion channels already present in 3d-mocap-data.mjs. A new locomotion sampler mixes Idle, Walk, Jog and Sprint using the distance-based gait phase. Smooth velocity crossfades avoid discrete speed-band jumps. The captured upper-body channels supplement existing player-space retargeting; the verified boots/ankles and shot contact remain controlled by Footera. This introduces no runtime network assets.

For A/B testing, set localStorage key footera-3d-motion-source to procedural and start a new scene. Removing the key restores CC0 clip blending. The existing footera-3d-player-model=legacy fallback is unchanged.

MIXAMO: This release contains no Adobe Mixamo assets. Adobe permits Mixamo use in video games but restricts redistribution of raw motion files. Public GitHub Pages makes raw-asset distribution a licensing consideration; no downloaded FBX/GLB clip should be committed without appropriate rights. This first motion-capture integration uses the already verified Quaternius CC0 source instead.
Adobe FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
Adobe community licensing guidance: https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400

The GLB lead attacker is the only imported model. This is not yet a full 22-player mocap library. Match simulation still controls scores, shots and outcomes.

QA: node --test tests/3d-glb-clip-blend.test.cjs; existing highlight regression tests; imported GLB browser/quality and mobile real-WebGL tests; final geometry/draw-call/keeper check.
