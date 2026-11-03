# LW-01 — Geothermal cause-and-effect engineering slice

Status: work in progress, not a completed volcano renderer.

## Implemented
- Deterministic candidate geothermal sites on existing seeded Rocky, Volcanic, Ocean, Lush, Temperate and Ice worlds without changing celestial IDs, terrain heights or saved site locations.
- Different modeled sources: effusive lava/shield-style, explosive stratovolcano-style, fissure, cinder cone, caldera, cryovolcano, geyser, boiling mud-pot and fumarole.
- Pressure/recharge cycles using radiogenic, tidal and hotspot heat priors, magma viscosity, conduit resistance, source temperature and ambient pressure. A finite reservoir limits each cycle's mass discharge, partitioned into conserved lava, ash and vapor fractions; plume-height physics is an analytical approximation.
- The existing field-science thermometer and seismometer respond to local heat and seismic activity; ash discharges reduce local solar transmission. Previous saved instrument readings remain unchanged.
- Existing Observatory and environmental journal expose candidate sites, location, fluid inventory, active event state, hazard warnings and observable source-linked journal events. Observatory provides ordinary flight waypoints to vents. A real seed-742 volcanic body is used in a regression test.

## Important incomplete functionality
- Active vents have capped 3D billboard eruption plumes and near-ground lava tracers aligned with existing terrain, but NOT volumetric lava meshes, collision-aware lava flow, ash advection or persistent deposits. A finite *modeled* reservoir is accounted for analytically, not through a long-term conserved world geochemistry simulation.
- No new terrain collisions, caves, earthquake propagation, lava thermal damage or geyser jet collisions are implemented. Plume visuals are lightweight particle approximations.
- Atmospheric precipitation and pressure/phase assessment are still legacy approximations. An active geyser candidate is a model prior, not proof of liquid water.
- Full fluid mechanics, actual volcanic cone/caldera excavation, persistent surface deposits and mechanical/thermal damage are subsequent milestones. Keep branch draft until these and standalone tests are validated.

## Build / test
node tests/geothermal-lw01.test.cjs
node tests/geothermal-events-lw01.test.cjs
node --check src/physics/geothermal-lw01.js
python3 tools/build-standalone.py
python3 tests/standalone-parity.py

Also run original tests and browser WebGL2/file:// seed-742 navigation and land on an actual volcanic or water world; check Events and Observatory, contact thermometry, 1x/10x/100x, time reloading, old saves and frame times. PLAY-STARFALL.html parity is not verified in this session. Do not claim tested or merge prematurely.
