# Footera V21.77: Grounded footwork and smooth action transitions

Production visual changes to the current V21.76 renderer; camera, skinned/GLB models, Quaternius CC0 capture, match results, ball and goalkeeper physics are unchanged.

The 3D highlights now use the same arc-length stride and stance duty cycle for subtle heel-to-toe roll, raised-foot clearance, and support-knee compression during braking. Accelerations release the stance load and extend the recovering leg. Small mirrored yaw/roll values articulate turning plants without changing roots or routes.

This is one additive pass on the existing joint hierarchies, after other contextual choreography but before the saved pass and shot contact animation. It fades fully before the canonical 5.4-second strike and only resumes after follow-through. No extra GLB models or draw calls are created. Every actor reuses its own preallocated scratch frame.

QA: node --test tests/footwork-dynamics.test.cjs. The existing real WebGL tests verify imported boot targets, keeper glove contact and draw-call budgets.

Performance: LOW and standard actor budgets are unchanged. The existing procedural / baseline toggles remain available. This is not a new match physics engine or a major graphical model redesign.
