# V21.25 — footballer motion and silhouette

Continues the V21.22 graphics on current main V21.24 (`bc2aa856`). The reference image remains a visual target, not a
claim of achieved photorealism. This step concentrates on the real match actors.

## Forward movement

The previous root heading already followed local -Z travel, but the elbows bent
backwards and the sine-wave gait did not explicitly plant a support foot. Knees
in the goalkeeper's crouch also bent opposite to the field-player anatomy.

The revised shared rig uses two-bone leg targets. A planted foot travels backwards
relative to the advancing pelvis, while the other foot lifts and swings forwards.
Ankle counter-rotation keeps the boot level. Phase follows distance travelled;
stance duration and stride length vary with speed. Arms bend forwards and swing
opposite the legs. The upper body moves independently of the grounded lower body.

Heading includes the existing chase and celebration offsets, so orientation
follows the final displayed travel. Stationary actors retain their last path
tangent. The shot blends into the existing contact pose and back into running.
Keeper anticipation uses a forward crouch with consistent knee/ankle flexion.

## Shared model

Refined chest and shoulder cross-sections, slight upper-body width variation,
neckline, sleeve/sock trim, a shaped nose and ears, rear hair contours, varied hair
and football boots make the body and facing direction clearer. Existing saved
kit colours and patterns remain authoritative. All parts retain shared geometry
and instancing; there are no external model assets or additional dependencies.

## Scope and evidence

The crowd gains varied resting arm poses attached to the shoulders, modest height
variation and shaded clothing in deeper rows; instance counts/draw calls stay fixed.

Final screenshot review exposed broken subpixel pitch markings in LOW. A shared
one-pixel centreline reinforces the existing ribbons at distance, costing one
additional draw call in LOW only. STANDARD and HIGH are unchanged.

Camera paths, field, ball paths, impact timing, match bridge, card renderer
and simulation are unchanged. Release references are the only index.html edits.

Regression coverage checks foot placement and backwards-relative support travel,
plus actual rendered torso direction against velocity for both directions and
all presentation sequences. Production captures retain 360/390/412, LOW,
STANDARD and HIGH. A real-time 390px match video records a right-wing attack in
the first half and a left-wing attack after the side change. Software-browser
footage is visual/lifecycle evidence, not a physical-handset FPS measurement.
