# Footera V21.82 – Quaternius across the rendered Matchday squad

The previous release mounted the licensed Quaternius humanoid GLB on the scorer only. The 3D Highlight scene currently represents 16 field actors plus the defending goalkeeper, not a complete 22-player tactical pitch. All **17 actually rendered participants** now mount distinct skinned, animatable clones of the Quaternius model from one downloaded CC0 source.

- Team assignment: `RUNS[i].team` maps to `attackKit` or `defendKit`, derived from `event.team` and `kitColors(event)`. `queueMatch3D` snapshots `match.kickoffKits.home/away` – the kit chosen before kickoff is authoritative.
- Shared kit rendering: standard/high uses the existing per-player exact club-shirt atlas for all patterns and shirt/shorts/socks; LOW adds a kit atlas when a legacy skeleton has no skin texture. Different clubs are never silently painted with identical default jerseys.
- Keeper: original keeper pose remains authoritative; a Quaternius humanoid follows it. Existing goalkeeper glove meshes are preserved.
- Motion: all GLB bodies are animated at the same deterministic time using existing per-actor run, turn, acceleration and gait. No simulation state is changed.
- Performance: reduced fabric PBR outside key players, shared source asset, low-quality crowd budget, full cleanup and original procedural fallback when any required GLB cannot mount.
- Licensing: Quaternius Universal Base Characters CC0 1.0, already documented in `assets/footera/models/README.md`.
- Legacy baseline remains available. The failed MakeHuman experimental model remains quarantined.
- Actual QA: `tests/3d-player-prototype.browser.cjs` asserts 16 imported field actors + imported goalkeeper, kit patterns for both teams, WebGL budget. The Mobile matchflow and existing simulation regression workflows must pass before this becomes a verified performance improvement.

No invented video or static illustration is used as evidence.
