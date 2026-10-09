# Footera V21.83: Quaternius kit alignment
The live kickoff outfit is obtained from frozen `match.kickoffKits`, passed to `kitColors`, then rendered on all 16 outfield Quaternius players and the goalkeeper. No result or camera logic is changed.

Fixed: all 20 club-identity patterns; correctly oriented front and back cloth atlases, number on back only; independent sleeve patterns, correctly selected shorts/socks colors and cuffs; small bounded fabric allowance in place of oversized torso inflation. LOW uses the same team pattern with reduced PBR, with its legacy fallback intact. MakeHuman remains disabled.

The `Footera Quaternius Kit Proof` browser test renders genuine WebGL screenshots and checks exact RGB on front/back atlas, every pattern ID, outfit snapshot, and mobile draw calls.

This is textured body geometry, not a separate physical cloth simulation. It does not prove every possible custom badge or sponsor decal. Manual visual review is still required before certifying all poses.