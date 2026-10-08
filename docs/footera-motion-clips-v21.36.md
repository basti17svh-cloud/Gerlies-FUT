# Footera V21.36 — authored keyed motion clips

The current production Three.js scene and game simulation remain authoritative. This step adds a new lightweight local ESM clip library rather than new footballer models.

**Authored movement clips:** jog, sprint, dribble, cut/plant; normal, finesse, power, low driven, header, volley and bicycle finishing; goalkeeper save/beaten responses.

- Clips are hand-keyframed rotation curves, *not* imported motion capture.
- Smooth keyframe interpolation and role-sensitive blending use arc-distance phase, measured speed/turn and real ball control.
- Existing grounded gait and supported boot positions remain in charge of locomotion; clips supply distinct body, arm, ankle and action silhouettes.
- Different finishing clips overlay the existing timed shot-contact choreography; simulation outcome and ball trajectory are never changed.
- Keeper posture clips do not replace the existing saved-ball/glove IK target.
- Scratch animation buffers are allocated per actor at construction and reused, with no additional animated meshes, allowing LOW/STANDARD/HIGH tier performance and 2D fallback.
- Offline PWA cache and boot version updated to 21.36.
- CI includes automated motion keyframe tests and a 390px recording with real production WebGL.
- More realistic full-body movement would require a skinned rig and licensed/retargeted mocap data, tested on a physical Android handset. That is a separate milestone.
