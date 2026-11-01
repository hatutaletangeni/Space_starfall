# STARFALL — Update 2 Implementation Tracker

Baseline: `STARFALL-NAVIGABLE-STARS-original.zip`. This release is intentionally feature-flagged. No missions, RPG progression or economy were added.

| Slice | Additive code present | Pure math tests | Mock browser UI | Actual GPU gameplay | Status |
|---|---|---|---|---|---|
| 2A SI profiles, deterministic time, optional Kepler | Yes | PASS | PASS (default orbital compatibility) | NOT VERIFIED | Experimental, baseline preserved |
| 2B optional central-gravity flight, fuel, flight computer | Yes | PASS incl. 10 circular orbits | PASS controls/readouts | NOT VERIFIED | Engineering opt-in; full gameplay pending |
| 2C atmosphere, drag, lift, heat | Yes | PASS vacuum/density/speed/cooling | Included via flight module | NOT VERIFIED | Simplified physical model |
| 2D observatory, science properties, export | Yes | PASS profile/temperature monotonicity | PASS panel & selection | NOT VERIFIED | Scientific estimates, not actual observations |

## Release decision

**Experimental feature release with Assisted fallback**. Do not describe this as production-certified: GPU-rendered manual acceptance, FPS, atmosphere-entry impact and complete EVA/rover/boarding loop under Engineering mode remain to be verified on target hardware. Original working release is untouched in `backup/`.

Test evidence: `reports/TEST-RESULTS.md`, `reports/orbit-invariants.csv`. Assumptions: `SCIENCE-MODELS.md`.
