# T07 — Operational satellite bus, Kepler navigation and orbital science

Base: verified T06 `17328681a24f093a9a0b7a73198ad0f6ad68acc5`.  
Branch: `feature/t07-operational-satellite-bus`.  
Scope: 7C orbital observatory and relay models, original T03 transport, 7F photography, 6G survey evidence, 7B orbit. Nothing merged to stable.

## Why this is a new adapter and not a second satellite simulation

`src/physics/launch-systems.js::orbit` remains the **only orbital position authority**: newly launched satellites with `inertial2d` use their achieved bound Kepler state with real period, eccentricity, periapsis and apoapsis, and older saves retain the documented legacy circular orbit fallback. T07 never rewrites that orbit or invents propulsion. Maneuvers and propellant-based impulses are **UNAVAILABLE** until actual fuel and actuator equipment exist.

`StarfallSatelliteOps7C.ensure(s)` and the original `launch7.satellites[]` array own all battery joules, solar flux, temperature, installed science category and original observation recorder. `StarfallOrbitalBusT07.bus(s)` adds only an optional versioned `s.ops7c.t07` object within that same source record. No sidecar save key or duplicate satellite battery exists.

T01's original 5-second operational clock calls the existing `7C.step`, which integrates original sunlight/eclipse/charging, thermal and loads, then T07's finite slew/acquisition overhead against the **same `ops7c.energyJ`**. Unloaded bodies are resolved through the same T01 source snapshot ephemeris; a missing body or host star cannot be replaced by the player's current world. Missing or excessive time skip records a fault/review, never a silently fabricated pass.

## Installed payloads and acquisition

Two original 7B payload classes remain:

- **Observatory:** the existing installed camera, spectrometer and atmosphere instruments are selectable and generate distinct numerical 7C data records, with actual source-owned seed, time, position, altitude, uncertainty, duration and an explicit `quality:'model-derived'` tag. A terrain camera also requests a genuine 7F photograph; its image bytes/thumbnail live **only in original 7F IndexedDB**, not inside a fake 7C image or `launch7` save.
- **Relay:** existing powered radio equipment and finite T04 custody buffer, but **no science camera or spectrometer**. It cannot schedule science jobs.

Use the Rocket Lab **Satellite Operations Console** (unchanged owner) to command SAFE, SOLAR_TRACK, NADIR_IMAGING, GROUND_TRACK or RELAY_TRACK. Attitude commands slew at a modeled **3°/s**, cost up to 44 W during maneuver, 17 W tracking, require pointing error at most **2.2°** for science and may fault on insufficient energy. SAFE immediately isolates relay forwarding; a slewing camera is blocked until stable.

The `ACQUIRE ORBITAL OBSERVATION` / `SCHEDULE SCIENCE EXPOSURE` buttons now queue one bounded on-board job lasting camera **12 s**, spectrometer **16 s**, atmosphere **10 s**. The T01 scheduler finishes it only on a valid actual orbital ephemeris, suitable altitude/periapsis, health/thermal envelope, reserves, correct settled attitude, payload storage, and daylight for the camera. Interrupted eclipse, inadequate battery or unsafe pointing postpones it with a visible reason; repeated failures lead to `PAUSED` review rather than a fictitious measurement. Jobs are capped at 20 and completion/fault history is bounded.

The 7C numeric `orbital-camera` observation and 7F real GPU photograph share `t07JobId`, but have separate IDs and data owners. A successful numeric capture **does not itself prove** that the 7F image rendered; missing WebGL leaves an original 7F `AWAITING_RENDER` record, never a stock photo. `7F` only reveals images after the original T03 **acknowledged** byte transfer.

## Real radio and contact windows

The original `StarfallCommsT03` route checks actual same-body ship transceiver power, ground batteries/antennas, antenna alignment, planetary obstruction, satellite power, bandwidth and valid licensed endpoints. A satellite commanded SAFE cannot relay, and the original `7C.relayOperational` is used by real T03/T04 candidate routes. No T07 function silently commissions an interplanetary ground station or adds a new receiver when the player is landed.

With T03 present, `7C.downlink` now delegates to the **shared persistent T03 packet ledger**; old standalone 7C callers still have the old bounded fallback when T03 isn't loaded. **Records are not removed from source-owned onboard `ops7c.storage` until the complete T03 packet is received and ACKed.** During radio blackout, antenna outage, bad geometry, receive power loss or partial bytes, the original T03 state machine owns pause/retry. On success the original `StarfallScienceUI.ingestOrbital` receives the record and `StarfallSurveyUI.recordOrbitalFootprint` maps it with the original footprint ID; the original camera archive handles its own independent image receipt.

The new T07 diagnostic predicts up to three **real same-system** powered ground receiver passes, three sunlight windows, Kepler period, orbital speed, footprint radius and estimated battery replenishment using the original orbital function and the actual ephemeris for each sample. Predictions use a bounded maximum **480 samples**, not a second continuous orbit integrator, and do not claim visibility without a currently powered actual receiver. This is a deterministic forecast under current power/geometry assumptions, not a guaranteed future transmission ACK (weather/faults can change).

## Operational console and observability

The existing Satellite Operations Console now exposes: source ID, achieved orbit height/period/velocity/eccentricity/periapsis/apoapsis, orbital footprint location, actual solar vs 1150 W rating, battery J/kWh, model heater temperature, load/attitude W, mode and slew error, memory jobs, fault history, radio delay and actual/predicted pass/sun windows, and explicit **maneuvers unavailable** warning. No ship/EVA controls, rover movement keys or rocket integrator were modified.

## Save, backward compatibility, and rollback

- Existing `launch7.schema=1` and original `ops7c.schema=1` are retained. The optional `ops7c.t07.schema=1` migrates defaults lazily. Original save imaging7f/IndexedDB and T03 receipts remain untouched.
- An existing observatory in legacy nadir attitude starts NADIR_IMAGING; an existing safe pointed observatory starts SAFE; a legacy relay starts RELAY_TRACK unless the user explicitly puts it in SAFE. No old science file is silently deleted.
- `PLAY-STARFALL.html` must always be generated by `python tools/build-standalone.py` and pass exact `tests/standalone-parity.py`.
- Roll back to verified [T06 branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t06-autonomous-rover-lifecycle), after exporting your save and 7F portable camera archive.

## Known limitations — never overclaim

- **Full rocket-to-science mission is not proven by controlled orbital test fixtures.** Existing 7B real force-integrated rocket is not rewritten, but fully flown observatory launch → bound orbit → distant observation → station ACK still requires T18 human/GPU commissioning.
- **T08 is still missing** for Planet A → Planet B or cross-system radio, including sending remote rover photographs home.
- T07 attitude control is a deliberately bounded angular-error/power state model, **not** rigid-body reaction-wheel dynamics/propellant/thruster torques, angular momentum unloading or structural thermal FE. Orbit maneuvers are UNAVAILABLE; no free delta-v.
- Sensor spectrum and atmospheric inversion are source seeded approximations, not astronomical ground truth; uncertainties are explicitly game-modeled. Terrain-capture WebGL bytes are real Starfall shader readbacks, distinct from numeric terrain elevation measurement.
- The original 7C solar/eclipse/temperature model is a lumped model, not a detailed deployed panel incidence or thermal finite-element engine. Solar rated 1150 W, bus loads, pointing overhead and finite Joules are separately displayed, but there is no full power harness electrical nodal solution on the spacecraft.
- The original 7C legacy standalone downlink fallback remains immediate batch, but **all actual in-game routes use T03** (priority/bytes/ACK). T08 will extend antenna topology to other planets.
- No detailed orbital swath stitching, multi-band image calibration, automated global coverage assignment or continuous high-resolution instrument scanning; source-owned survey footprint receipts and next-window forecast are the current scope.
- Software-WebGL Chromium tests do not demonstrate sustained real laptop GPU FPS, dozens of simultaneous distant satellites or physical launch and manual camera commissioning.

## Verification commands

```bash
for t in tests/*.test.cjs; do node "$t" || exit 1; done
python tests/standalone-parity.py
python tests/antenna-hardware-t04-browser.py
python tests/remote-imaging-t05-browser.py
python tests/rover-lifecycle-t06-browser.py
python tests/orbital-bus-t07-browser.py
```

Model: `tests/orbital-bus-t07.test.cjs` verifies achieved orbit/eccentricity from original StarfallLaunch, solar/eclipses, pointing error, cumulative power, real scheduled camera vs numeric records, payload lock, radio SAFE, bounded storage, real receiver forecast and save migration. Browser: `tests/orbital-bus-t07-browser.py` uses actual offline Chromium `file://`, controlled achieved elliptical orbital state, real 7C/T01 clock, real powered ship route/T03, image rendering and reload. Those fixtures must not be described as an entirely hand-flown expedition.
