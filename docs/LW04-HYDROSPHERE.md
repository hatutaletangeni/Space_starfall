# LW-04 — Ocean surfaces, waves, immersion and buoyancy

STATUS: development implementation; actual Chrome/Edge WebGL2 gameplay and FPS NOT VERIFIED. Stacked on LW03 (and LW02/LW01).

## Implemented
- A deterministic H2O hydrosphere prior for Ocean, Temperate and Lush worlds using existing CW01 composition. Original rocky or airless worlds are never assigned seas.
- Stable cubemap-aligned water meshes using the same immutable terrain tile coordinates. Only original flat sea-basin triangles are covered; island meshes and saved ground collision are unchanged.
- Water is rendered in the actual existing 3D engine, not as a CSS overlay: animated, sun-lit surface normals, specular highlights and viewing-angle Fresnel tint; wind conditions adjust wave amplitude.
- Ocean surfaces have a separate presentation-only offset above original height-zero basin terrain, allowing visible water volume without moving old ships or outposts.
- Scene unit explicitly maps to 1,000 meters. Wave height follows three seeded gravity/wind-responsive Gerstner-like sinusoidal components (linear superposition, not full wave dispersion), reported in meters.
- Archimedes buoyancy calculations use water density, displaced volume, local gravity, SI forces and weight. Hydrostatic water pressure equals density × gravity × depth. Temperature/salinity are modeled priors.
- EVA automatically enters swimming motion over actual ocean basins. The astronaut moves more slowly, can ascend with Q or dive with E and carries their suit lamp. Entry is eased instead of instant vertical teleportation; swim depth is bounded to 45 m for compatibility with stylized scale.
- Distinct underwater color and fog attenuation replace air effects when the camera is submerged. The actual 3D astronaut moves with the swimmer instead of staying on the seabed.
- Observatory reports hydrosphere presence, water species, liquid density, local wave height, computed depth, hydrostatic pressure and current swimming state.
- One new deterministic test covers actual seed-742 2,368-star galaxy, fixed wave fields, wind sensitivity, water-only tiles, dry-land masking, buoyancy force, pressure and bad inputs.

## Important limitations
- The old planet ground-height geometry, ship landing contact and previously saved structures are unchanged. The new water is a separate surface/volume proxy; **ships, rovers and outposts do not yet float or undergo hydrostatic hull forces**.
- Wave displacement uses a small analytic approximation and artistic shader normal ripples. It is not fluid particle conservation, shallow-water equations, CFD, coastal erosion or solved buoyancy torque.
- The game has an existing non-human 1 scene unit = 1,000 meter scale. Astronaut mesh proportions are still stylized and swimming is deliberately constrained. Depth and pressure units remain physically explicit, but visual avatar and cabin scales are not realistic.
- Water mask samples the original flat sea basins. No voxel excavation, real-time terrain edits, moving coastlines, tides, rivers, persistent lakes or deep bathymetric generation are implemented.
- Scuba oxygen consumption, underwater corrosion, pressure-induced damage, sound propagation, swimming strokes, marine wildlife, subsurface vehicles, ship splashes and underwater wave acoustics are NOT implemented.
- Weather-driven waves affect the sea appearance but do not mechanically load vehicles. The physics model is read-only and deterministic.
- Browser GPU/real file:// gameplay, old-save visual regression, shader compilation, actual FPS and single-file execution require live verification, not just source tests.

## Playtest checklist
1. Download raw PLAY-STARFALL.html from feature/lw04-hydrosphere-buoyancy; open offline in Chrome or Edge.
2. From the seed-742 Star Chart choose `star-0-p4` (Ocean), or another Ocean planet. Fly/land normally; exit the ship via the existing ramp and walk toward an ocean basin.
3. Over flat ocean terrain, EVA enters swimming automatically. W/S move, A/D turn, Q ascends, E dives, L toggles suit lamp. Check ocean surface reflections, underwater tint, and character attachment.
4. Open Observatory: compare water presence, wave height, depth and hydrostatic pressure while changing dive depth. Test Q/E limits and movement back onto a dry shore.
5. Change time 1x/10x/100x. Wave motion should remain tied to simulation time and weather wind, not camera position. Test weather, rain and waves together.
6. Verify vacuum/rocky worlds have no water overlay. Verify outposts, ship landing, rover, existing cave interiors, UI and engineering still behave.
7. Run Node tests/hydrosphere-lw04.test.cjs and all earlier tests; python3 tools/build-standalone.py and python3 tests/standalone-parity.py. Check WebGL2 shader compilation and instrument output in a real browser.

## Rollback
New module scripts and renderer/flight hooks can be reverted to LW03 without rewriting save data, because LW04 writes no new persistent state and does not mutate galaxy or terrain generation.
