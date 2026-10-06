Three.js r160 (0.160.0), MIT license. Vendored with one isolated patch: every Math.random() call uses a private visual PRNG, so UUID/resource creation cannot consume the simulation random stream.
Source: https://github.com/mrdoob/three.js/tree/r160
Files: build/three.module.min.js and LICENSE.
Loaded only by the highlight scene module. No runtime CDN dependency.

Upstream SHA-256 before this patch: 3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6
