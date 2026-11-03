# LW-02 — Mountains, erosion interpretation and traversable caves

Status: IMPLEMENTED DEVELOPMENT SLICE; source tests pass, actual WebGL2 camera/landing playtest unverified. Do not merge until validated. Stacked on LW-01.

## Implemented
- Stable planet-fixed cave sites for volcanic, rocky, ice, ocean, temperate, lush and desert bodies; no gas-giant or shattered-world caves.
- Cave categories: lava tubes, fissure caves, impact fractures, fault fractures, solution/karst-like caves, weathered cavities, cryogenic fractures and ice crevasses. Dry desert candidates do not claim water-solution caves.
- Cave mouths sample the ORIGINAL `Starfall3D.groundHeight` to seek exposed ground. Existing object IDs, surfaces, orbits, landings and structures are never regenerated.
- Near-field cave entrances are triangulated 3D rock-and-shadow meshes, not flat map icons, with bounded WebGL resources.
- Real enclosed interior tunnels, including ceilings, arch walls, walkable floors, small mineral features and descending paths. Exactly the same path center and width functions back the walk collision and surface mesh; first-person EVA uses W/S and A/D. Headlamp illuminates the cave; direct sunlight is suppressed while underground.
- Approach a cave mouth physically (within 7 scene units) and press X. This enters a bounded local underground interior using the existing ruin interior camera/transition system; ESC returns you to the original ground height at the entrance.
- Observatory lists modeled cave categories, regional landform causes and PLOT CAVE waypoints. X logs a geological exploration survey and bounded checkpoint depth under a NEW geologyLW02 save namespace.
- Deterministic regional landform interpretation: compressional ridges, fault scarps, alluvial fans, volcanic ridges, impact uplift, glacial valleys/ridges, coastal cliffs and weathered uplands. Rock strata coloring is adapted to the existing terrain biome renderer; water and ice material colors are protected.
- Old planetary ground-height function is unchanged; old save anchors, original site heights, ship ramp, rover dynamics and ruins remain authoritative.

## Honest limitations
- The cave entrance to underground interior is an explicit close-range X transition, not a continuous excavated hole cut in the original global surface triangulation. Inside the cave, the camera, walls, ceilings and walking collision are 3D; it is not a fake dark painted depression.
- The present collision model is planar along a winding 3D corridor with descending floor. It keeps the avatar above the floor; roof and walls are visual/analytic boundaries, not arbitrary 6-axis rigid-body or rover collisions. No driving the rover underground yet.
- Heights of preexisting mountain ranges have not been changed to avoid breaking preexisting save anchors. 'Tectonics', 'impact uplift', 'glacial erosion' are seeded plausible interpretations of old heightfields, not a solved lithospheric deformation/erosion equation.
- Cave checkpoint records persist exploration depth and geology observations; the user reenters from the surface after loading rather than being forcibly spawned underground.
- No groundwater flow, rockfall physics, re-meshable dig tool, cave-bearing mapping instruments or lava-tube formation history solver yet.
- No actual browser WebGL2 file:// smoke or measured FPS has yet passed; do not claim otherwise.

## Test instructions
1. On feature/lw02-mountains-caves download raw PLAY-STARFALL.html and open in Chrome/Edge offline.
2. Choose a real landable Volcanic, Ice or Temperate body using the existing Star Chart. Open Observatory and PLOT CAVE. Approach normally, land, EVA, walk to the physically rendered entrance arch.
3. Press X within 7 scene units. Walk with W/S, turn A/D, move the mouse, and turn on suit headlamp with L. Test walls and floor descent. Press X to log a geological survey; ESC to surface.
4. Reload save, verify the cave survey journal persists and old outposts remain unchanged. Check cave revisits at 1x/10x/100x and old ruin interiors.
5. Run node tests/living-geology-lw02.test.cjs; python3 tools/build-standalone.py; python3 tests/standalone-parity.py; all preceding LW01 and CW tests; Chrome/Edge WebGL2 regression.

## Rollback
Branch feature/lw02-mountains-caves is based on feature/lw01-geothermal-causality. LW02 is additive and can be reverted by restoring the LW01 base, leaving CW+LW01 saves intact. The geologyLW02 save namespace is independent and optional.
