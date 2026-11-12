# STARFALL 9C — Force-Driven Winged Creatures and Visual Verification

9C replaces the 9B sinusoidal hover path for **living aerial foragers** with a bounded force-integrated aerodynamic model. It preserves all 9A population, energy, mass, life-cycle and save logic. Existing translucent organisms, pulsing internal hearts, digestive sacs and GPU wing deformation remain intact.

## Actual flight model

In each local, active ecological patch, fliers have a 3D position, velocity, flight bank, wing phase and flight mode (cruise, climb, descent, stall). Their steering follows a seeded moving foraging waypoint, but **positions are not set by a scripted circular path**. Instead velocity changes under forces:

- Atmosphere: `rho = P / (287.05 T)` (effective Earth-like gas constant approximation; pressure/temperature from biosphere).
- Dynamic pressure: `q = 0.5 rho |v_air|^2`.
- Wing lift `L = q S Cl(alpha)`; drag `D = q S [Cd0 + k Cl^2 + soft stall penalty]`.
- Banked lift creates lateral acceleration; wingbeats provide bounded thrust; planet gravity acts downward.
- Wind is bounded and locally variable. Terrain samples constrain contact height; wing and banking animation follow integrated state.
- Dynamics run at fixed 30 Hz with at most 14 integration steps per rendered update. Entity and memory limits remain bounded.

This is a **simplified point-mass lift/drag/thrust winged-flight model**, not resolved CFD, aeroelastic wings, or a validated biological flight simulator. Local ecology flight coordinates are metres within a stylized display-scale adapter; STARFALL's astronomical compatibility mapping (1 scene unit = 1000 metres) is not applied to creature anatomy.

## Remaining honest scope limits

Physics is simulated near the player rather than over the entire galaxy. For large time jumps (>8 seconds), only the flight pose reinitializes from a stable per-ID seed; the underlying creature population, feeding and reproduction persist under the 9A clock. High time warp caps flight substeps and may render local flight more slowly than the world clock. The near-field simulation doesn't model migration between sites, articulated wing CFD, or species-specific muscle fatigue.

## Reproducible tests

```sh
node --check src/ecology/flight-dynamics9c.js
node --check src/ecology/ecology-ui.js
node tests/aerodynamics9c.test.cjs
node tests/living-biosphere.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/ecology9b-browser.py
python tests/aerodynamics9c-browser.py
```

The 9C GitHub Actions workflow runs the physics tests, rebuilds both offline standalones, runs real Chromium WebGL2 with SwiftShader, captures screenshots and gathers desktop/mobile frame-time samples in `artifacts/ecology9c/`. These are **CI software-renderer FPS**, not measurements on your Windows computer or phone. A hardware playtest remains necessary before asserting target-device frame rate or appearance.

For hardware inspection: launch latest `PLAY-STARFALL.html` (PC) or `PLAY-STARFALL-MOBILE.html` (mobile, landscape). Land on a tier 3–4 biological world, open Mission → Explore → Ecology, find a Living Patch with flyers, then view them outside the ship. Look for banking turns, climbing/descending, flapping, translucent skins and visible hearts/stomachs from close range. Compare FPS and stutter in the same scene before/after at 1× and 100×.

## Risk and rollback

Affected files: `src/ecology/flight-dynamics9c.js`, `src/ecology/ecology-ui.js`, `index.html`, corresponding generated desktop/mobile standalone files, tests, this documentation and CI. No ecology or galaxy save migrations are required. The previous 9B game on `main` at `3ac5aff3af06939838ace1c3c5ba468c7b6ef2e0` remains a rollback point.
