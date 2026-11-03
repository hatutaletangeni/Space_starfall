# LW-01 — Geothermal Playtest Guide and Scientific Limits

## Open the game
Download `PLAY-STARFALL.html` from this branch, using GitHub's Download raw file action, then double-click in Chrome or Edge. No web server, npm or extra files should be needed after the standalone parity check has passed.

## In-game test
1. Use the existing Star Chart to select a Volcanic world, fly there and descend naturally. Existing planets and their orbital coordinates have not changed.
2. Open Explore > Observatory, choose the currently loaded volcanic planet, and inspect GEOTHERMAL candidate types.
3. Select `PLOT GEO 1` or another `PLOT GEO` button. This is a normal flight waypoint, not a teleport. Physically approach the marked source.
4. During a modeled eruption, observe rising plume particles and glowing near-ground lava tracers. Quiet vents retain a small seeded surface indication.
5. Open the existing Environmental Events monitor while landed. Observe source type, time state, reservoir quantity, mass discharge, ash warnings and proximity hazards.
6. Exit via the normal EVA ramp, approach carefully, and take thermometer / seismometer readings using the existing Field Science instruments. Record a source-linked environmental observation; matching readings should link to its journal record.
7. Test 1x/10x/100x, reload, revisit, leave the vent then return. The same stable ID/time/seed should yield the same model state. Verify saved outposts, ramps, rover positions and terrain height are unchanged.

## Models, not claims of full geophysics
- Site heat is a seeded radiogenic/tidal/hotspot proxy. It is not measured U/Th/K abundance nor tectonic convection.
- Vent types include effusive shield-like eruptions, explosive stratovolcanic behavior, fissure flows, cinder-cone eruptions, caldera events, cryovolcanic jets, geysers, fumaroles and mud-pots. They differ in viscosity, eruption duration, mass partition and plume scale. Topographic cones and caldera excavation are NOT simulated.
- Each site has a finite modeled reservoir. An analytic, capped-cycle discharge budget consumes available mass; replenishment represents explicitly modeled deep resupply, not magic mass. Local time queries do not modify saves.
- Plumes and lava paths are capped GPU point effects, attached above the authoritative terrain. They do not yet change collision geometry or leave persistent hardened deposits.
- No full 3D thermofluid solver, lava viscosity-based terrain flow, ash wind advection, real magma chamber pressure field, hydrodynamic geyser or heat-damage owner has been implemented. Heat warnings are informational; solar attenuation and instrument estimates are modeled effects.
- Crystalline cave formations, traversable caves and major terrain reshaping belong in LW-02.

## Mandatory release gates
Run Node tests: `tests/geothermal-lw01.test.cjs` and `tests/geothermal-events-lw01.test.cjs` alongside existing CW01–CW06 tests. Run `node --check` on all changed JS modules.
Run `python3 tools/build-standalone.py` and `python3 tests/standalone-parity.py`; verify the rebuilt HTML is committed on the same branch.
Run real Chrome/Edge file:// WebGL2 smoke, save restoration, non-geothermal worlds, 2368-star seed invariant, UI21 and T19A regressions. Actual GPU frame times, WebGL behavior, and gameplay cannot be claimed verified until measured.

## Rollback
Leave `main` unchanged until the LW01 branch passes all gates. Revert this branch or remove the LW01 module loader plus its small consumers to return to the CW06 baseline without changing save schemas or procedural terrain anchors.
