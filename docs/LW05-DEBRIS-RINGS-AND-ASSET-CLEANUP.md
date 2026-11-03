# LW05 — Physical Asteroids, Planetary Rings and Fleet Asset Explorer cleanup

STATUS: Draft feature branch based on LW04. Original galaxy seed 742, 2,368 star catalog, orbit locations, terrain heights and saves remain unchanged.

## Requested Fleet & Asset Explorer cleanup
- `src/physics/operations-ui-t16.js` no longer lists `assets:'asset-manager'` in the UI panels receiving an OPERATIONS / ACTUAL STATUS injected card. The entire oversized top status section disappears from the Fleet & Asset Explorer; existing asset search, filter, hierarchy, details, compact/pin and close buttons stay unchanged.
- The Fleet & Asset Explorer header breadcrumb now reads STARFALL / ASSETS / SYSTEMS & ASSEMBLIES / 7B.1, without mislabeling the asset-only explorer as Operations.
- Other genuine Operations consoles (main, launch, satellite, engineering workbench, field, etc.) retain their own T16 status cards; physical systems and reporting owners are not removed.
- `tests/asset-explorer-no-operations-lw05.test.cjs` ensures the injected card cannot return unnoticed.

## LW05 new physics and rendering
- The original `sys.belts[].rocks` and `body.ring` procedural source arrays remain the authoritative orbital objects. LW05 uses stable `(beltId,index)` and `(bodyId,index)` derivatives; it does not insert new planets, stars or save IDs.
- `src/physics/debris-lw05.js` maps each existing belt point to a continuous, repeating orbital location, seeded density, approximate bounding radius and rotation. 80-facet rough, asymmetrical asteroid meshes mimic small fractured moons and preserve deterministic appearance.
- Ring bodies additionally get 180 source-linked individual rocky moonlets on an explicitly modeled inclined ring plane, with varying size, density, orbital period and tumbling. Existing ring annulus now has finer dust/ice radial bands and stable clear ring gaps.
- Near-player rocks use eight cached GPU meshes, bounded to 55 visible candidates and a radius-18,000 scene-unit range. Far debris remains batched, sparse point representations to avoid 420 separate draw calls in every system.
- The existing physical ship gets proximity checks against rock bounding spheres and real-time warnings; contact produces a bounded collision displacement/velocity impulse and normalized 0–1 ship-health wear. Engineering-mode velocity and position are reconciled after contact. This is a simple sphere collision response, not a 6DOF fracture solver.
- The Observatory reports belt counts, rocky ring structures and nearest debris clearance. `renderStats().debrisRisk` exposes the nearest source-linked hazard for debugging.

## Limitations (do not misstate as complete)
- This is an intentionally bounded physical rendering/interaction slice. Each irregular mesh uses a bounding sphere collision proxy; no detailed polyhedron-vs-hull contact manifold, rigid-body torque conservation, mesh fragmentation, thermal vaporization or dust-grain collisions.
- Rock orbital phases use the existing stylized game orbit times, plus small seeded per-rock period variation. These are Kepler-inspired approximations in legacy coordinates; not high-precision n-body integration. Ring moonlets share the existing ring plane, but not a full collisional viscosity/self-gravity treatment.
- Stellar belts remain sparsely populated. An asteroid belt is mostly empty space and should not become a packed wall of rocks. No forced fake collisions in open space.
- Ring dust is an annular surface with colored bands and gaps, not a full light-scattering volumetric dust solver or a particle-by-particle optical-depth radiative transfer.
- Source-linked particle impostors remain outside the near-field 3D zone. 3D mesh draw calls and collision checks are intentionally capped.
- Actual Chrome/Edge file:// GPU test, FPS, all previous stage smoke cases, saved old mission restorations and new shader/mesh rendering are still NOT VERIFIED until manually tested. Do not merge before smoke checks.

## Quick test
1. Download `PLAY-STARFALL.html` from `feature/lw05-physical-asteroids-rings`, open offline in Chrome or Edge. Select Fleet & Asset Explorer and check that the huge Operations / Actual Status top panel is GONE; asset search, hierarchy, details, pin/compact and close must still work.
2. Travel to a star system containing a belt (the unchanged star chart generates many). On close approach, irregular rotating rock meshes replace old point sprites. Keep a safe distance and test collision warning. The speed and ship health response are bounded but should not trigger without physical overlap.
3. Approach a ringed planet and observe the ring bands, gaps and individual orbiting irregular moonlets. Fly through a thin part of the ring and check the proximity display. Check no ring rocks on non-ring bodies.
4. Confirm the existing 2,368 stars for seed 742, stable planet/moon positions, normal EVA, seamless landings, rover, outposts, geology, weather and swimming.
5. Test both Assisted and Engineering flight. Verify a contact impulse does not create false high-energy velocity or destroy the vehicle, and the ship health remains in [0,1].
6. Run `node tests/debris-lw05.test.cjs` and `node tests/asset-explorer-no-operations-lw05.test.cjs` plus all legacy tests, `python3 tools/build-standalone.py`, `python3 tests/standalone-parity.py`, and full WebGL2 file:// smoke / FPS comparison.

## Rollback
All physics is additive. Restore the LW04 branch to disable new debris and keep its prior legacy ring sprites and belt points. To restore only the UI card, re-add `assets:'asset-manager'` in the T16 operations panel map (not recommended because user explicitly requested the card removed). No original save migration required.
