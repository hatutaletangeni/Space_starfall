# LW-01 — Geothermal cause-and-effect engineering slice

Status: work in progress, not a completed volcano renderer.

## Implemented
- Deterministic candidate geothermal sites on existing seeded Rocky, Volcanic, Ocean, Lush, Temperate and Ice worlds without changing celestial IDs, terrain heights or saved site locations.
- Different modeled sources: fissure, effusive, explosive, cryovolcanic, geyser, fumarole.
- Pressure/recharge cycle, estimated mass flow, magma or vapor flow, and ballistic plume-height model with thermal flux, gravity and ambient pressure inputs.
- The existing field-science thermometer and seismometer respond near an active vent; previous saved instrument readings remain unchanged.
- Existing Observatory and planetary-events readouts expose candidate site types, locations relative to current explorer and current modeled activity; Observatory provides ordinary flight waypoints to vents.

## Important incomplete functionality
- Active vents have capped near-field 3D billboard plume particles in the existing renderer, but NOT YET volumetric lava meshes, lava transport, ash advection or deposited mass. Mass flow is an analytical proxy, not yet charged against a persistent finite reservoir.
- No new terrain collisions, caves, earthquake propagation, lava thermal damage or geyser jet collisions are implemented. Plume visuals are lightweight particle approximations.
- Atmospheric precipitation and pressure/phase assessment are still legacy approximations. An active geyser candidate is a model prior, not proof of liquid water.
- Functional fluid, mass-conservation, volcanic cone, hazards and spatial effects are the subsequent LW-01 substeps. Keep branch draft until these and standalone tests are validated.

## Build / test
node tests/geothermal-lw01.test.cjs
node --check src/physics/geothermal-lw01.js
python3 tools/build-standalone.py
python3 tests/standalone-parity.py

Also run original tests and browser WebGL2/file:// seed-742 navigation and land on an actual volcanic or water world; check Events and Observatory, contact thermometry, 1x/10x/100x, time reloading, old saves and frame times. PLAY-STARFALL.html parity is not verified in this session. Do not claim tested or merge prematurely.
