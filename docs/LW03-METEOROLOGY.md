# LW-03 — Composition-sensitive atmosphere, climate, wind, precipitation

STATUS: Development slice. The model is bounded/seeded and is not a 3D atmospheric GCM, numerical fluid model or calibrated forecast. Based on CW01–CW06, LW01, LW02. Keep unmerged until browser verification.

## Implemented
- `src/physics/meteorology-lw03.js`: atmospheric columns derive from CW01 gases, field pressure/temperature, mean molecular mass and scene gravity; exposes density from ideal gas and scale height H=RT/(Mg).
- Pure deterministic, body-fixed spatial storm cells advect with simulation time; climate does not regenerate when the camera moves or the galaxy is reloaded. Wind includes a rotation/Coriolis term and latitude gradients. Source T includes diurnal and seasonal approximations.
- Condensation screens H2O, methane, ammonia and CO2 by gas inventory, temperature and approximate Clausius-Clapeyron vapor pressure; bounded humidity and water-column precipitation mass flux. Airless moons and rocky vacuum bodies have no atmospheric clouds, rain, lightning, wind or attenuation. CO2 haze and dust do not require water.
- Explicit modeled regimes include terrestrial cloud, rain, snow, charged rainstorms and lightning flashes, warm-ocean cyclone screening, sand/dust events, CO2 frost/haze, methane or ammonia condensation only when temperatures and pressures permit. Not every seeded body admits every weather regime; none is forced.
- Existing `StarfallEvents` event journal now receives source-linked meteorological events instead of independently re-rolling old atmospheric weather; geothermal, seismic and impact sources remain independent.
- Existing field thermometer uses the weather temperature when an atmosphere is present. Existing solar collection checks weather solar transmission, EVA walking slows in high wind and truck/rover traction is reduced when wet or dusty.
- Existing cloud shell now responds to source-linked cloud coverage; fog/sky color responds to event opacity. New capped 3D near-player precipitation/dust billboards fall relative to local gravity. Charged convective periods cause short luminous lightning traces; never on vacuum worlds.
- Existing Environmental Events monitor and Observatory display wind, T, cloud, species, rate of precipitation and hydrostatic scale height. Existing world IDs, heights, orbits, ships, rover saves and ruins are not modified.

## Known limitations — do not claim these as complete
- Fixed coarse climate formula is an approximate diagnostic model, not a globally conservative radiation + moisture solver or exact weather forecast. Time interpolation of state may show discrete regime boundaries; cloud, storms and fronts are represented by correlated advecting seeded cells rather than full PDE advection.
- Cloud visuals are multi-frequency shell noise plus bounded point weather particles; not ray-marched volumetric clouds. No true self-shadowing volumetrics, true thunder, raindrop splash surface deformation or wet-ground persistent material evolution.
- Methane/ammonia systems only precipitate if the modeled pressure/temperature saturation test allows it. Seeded gas giants currently have no physical cloud-depth/weather navigation layer, so giant cloud meteorology is deferred.
- Stellar wind, CMEs, auroras and nebula radiation are **space weather** and belong in LW06, not this atmospheric stage. Old decorative auroras are suppressed rather than mislabeled causal atmospheric storms.
- EVA wind resistance and wheel traction are bounded mobility modifiers, not solved rigid-body aerodynamics or hydrodynamic tire friction. Lightning currently provides a visual flash and event record, not electrical hardware damage.
- No verified live WebGL2 browser playtest or measured FPS in this edit session. Existing save compatibility and renderer visibility must be manually smoke-tested.

## Quick standalone tests
1. Download `PLAY-STARFALL.html` from branch `feature/lw03-causal-meteorology` and open directly in Chrome/Edge. No internet scripts should be needed.
2. Locate Ocean, Temperate/Lush, Desert/Volcanic, Ice and airless moon worlds. Check Observatory weather and Environmental Events in EVA while time changes 1x/10x/100x.
3. Ocean body seed-742 `star-0-p4` admits rain/rainstorms, Desert `star-0-p2` dust and Moon atmospheric vacuum. These are scientific procedural outputs, not guaranteed weather at every time or place.
4. Compare precipitation and cloud rendering to Event display and thermometer readings. Verify reduced solar panel output under storms, reduced vehicle traction and wind resistance. Check lightning only during charged wet storms.
5. In vacuum verify stars remain visible and no clouds, rain or lightning appear. Verify old ships, ramps, caves, outposts, rover and Science UI still work.
6. Run `node tests/meteorology-lw03.test.cjs`, CW01–CW06 and LW01–LW02 tests, `python3 tools/build-standalone.py`, `python3 tests/standalone-parity.py`, browser WebGL2 and FPS regression.

## Rollback
Branch based on `feature/lw02-mountains-caves`, not main. Remove LW03 module and its consumers to return to LW02; the LW03 implementation stores no persistent weather state and does not migrate original saves.
