# STARFALL — Update 7 Engineering Integration & Playability Prompt Pack

**Version:** 1.0 · **Prepared:** 2026-11-02  
**Implementation sequence:** **7A → 7B → 7C → 7D → 7E → 7F**  
**Baseline:** The complete **STARFALL Update 7 — Vehicles & Rockets** source release, *not* an older 6J build.  
**Goal:** Turn the existing engineering, rocket, satellite, rover, truck, outpost, communications, laboratory, and discovery features into one physically coherent, enjoyable **offline science-and-engineering sandbox**.  
**How to use:** Provide the existing Update 7 ZIP to a coding agent. Paste **Contract 00** and **one update prompt** at a time. Finish and verify each stage before starting the next. A new stage must use the complete verified output of the preceding stage. **Do not submit all six as a single code-generation task.**

> **Scope policy:** No compulsory missions, technology unlocks, credits-based progression, XP, crafting grind, story campaign or multiplayer. Existing legacy systems must remain functional. The “mission” in this pack means an optional player-defined technical operation, not a quest.

---

## Baseline notes — what Update 7 actually implements

The following points are based on inspection of the provided Update 7 project source and `VEHICLES-AND-ROCKETS-7.md`; any later source changes must be rechecked rather than assumed:

- `src/physics/launch-systems.js`: `StarfallLaunch` currently supplies rocket sizing, staged ideal delta-v, initial thrust-to-weight ratio, guided/timed launch states, analytic circular satellite orbits, remote rover transport and a constrained rover command interpreter. **Guided ascent is not force-integrated flight.**
- `src/physics/launch-ui.js`: Rocket Lab / truck / satellite UI. `src/physics/launch.css`: associated styling.
- `src/physics/vehicles.js`, `power.js`, `rover-dynamics.js`, `robotics.js`, `outposts.js`, `science-field.js`, `foundation.js`, `orbit-bridge.js`, `integration.js`: relevant existing engineering, rover, outpost, science and orbital systems. **Inspect exact exports and call sites before editing.**
- `src/flight.js` and `src/engine.js`: high-risk shared gameplay and rendering integration paths.
- `src/starfall-core.js`: saving and core state; `src/galaxy.js`: seeded, lazy galaxy.
- The autonomous science rover is **not rideable**. The four-wheel expedition truck is rideable through **explicit `X` interaction**; it must not automatically reboard when the player walks away. Ship boarding still uses its established physical ramp mechanic.
- An existing outpost `Foundation` serves as a launch pad. Remote interstellar rover transit deliberately uses **fictional warp-carrier travel**, distinct from chemical rocket delta-v.
- Deployed satellites are tracked orbital entities, but science payloads do not yet deliver real orbital survey datasets. The remote rover command loop is simpler than the local terrain-aware autonomy model. Remote command and science transfer do not yet consistently respect radio availability.
- Existing release tests include `tests/launch7.test.cjs`, `tests/launch7-browser.py`, `tests/engineering.test.cjs`, `tests/update4.test.cjs`, `tests/update5.test.cjs`, `tests/standalone-parity.py` and the earlier tests. The complete baseline test set must be inventoried rather than selectively omitted.
- Real-device GPU visuals, sustained frame rates, and complete cross-session save reload have **not** been verified simply by previous mocked-WebGL browser tests.

### Highest-priority known gaps

1. Multiple systems carry overlapping or inconsistent representations of assets, energy, satellite states and communication relays.
2. The launch builder's global tank selection can yield unclear per-stage tank accounting; the UI must show exactly what the rocket actually contains.
3. A rocket can pass ideal budget checks without demonstrating a dynamically feasible launch trajectory.
4. Visible satellite orbits and communication calculations must not maintain divergent positions for the same asset.
5. Remote robotic probes should not bypass local rover terrain, energy, science, safety and communications rules.
6. Truck charging should use **actually connected, available energy**; rover retrieval should be a bounded mechanical operation, not an unexplained teleport.
7. Scientific satellites need meaningful observation, storage, transmission and analysis capabilities.
8. There must be a playability/performance gate before every major feature expansion.

---

# 00 — MASTER SAFETY, INTEGRATION AND VERIFICATION CONTRACT

**Paste this entire section before each numbered prompt.**

You are modifying **STARFALL**, an existing offline, dependency-free **WebGL2 browser game**, not rebuilding it. Use the **latest complete verified game source** from the user as the only authoritative baseline. First inspect the relevant source files, public APIs, state relationships, save format and existing tests. Never invent function names, data fields or engine architecture; if an assumed interface differs, adapt the implementation to the actual project and record the difference.

### Preserve these invariants

1. **Galaxy:** Seed 742's **2,368 real navigable stars**; the original 64 detailed systems and lazily generated remaining systems; stable star/system/body IDs; deterministic generation; at least 100 larger-star diameters' separation; 1–20 planets per star and 0–7 moons per planet. No decorative non-navigable stars as a replacement.
2. **Travel and terrain:** Existing ship, interstellar warp, continuous descent and landing, fixed planet-anchored terrain tiles, stable collision sampling, EVA sky-look and walking, physical ship-ramp boarding, 1×/10×/100× simulation time, day/night and eclipse rendering, local surface attachments, culling, LOD and bounded caches.
3. **Ground vehicles:** Non-rideable programmable six-wheel science rover; separately rideable four-wheel exploration truck. Truck entry is explicit; exit followed by movement never causes unwanted reboarding. Keep independently stored vehicle positions and states.
4. **Existing technology:** Engineering Workbench; batteries, solar power and thermal models; local rover waypoint/autonomy and scripting; scientific instruments and journals; outpost construction and wired electrical networks; line-of-sight radio and relays; laboratories; existing Rocket Lab and foundation launch pads.
5. **Existing exploration:** Biomes, ecology, archaeological ruins and interiors, expedition notebook, planetary map, planetary events, controls/remapping and Expedition Board.
6. **UI and packaging:** Retain the subdued dark/near-black HUD with gold accents, existing navigation flows and offline execution. Do not introduce unnecessary dependencies or a required server. Preserve source/standalone parity.
7. **Saves:** Existing Update 7 and older supported saves must be migrated or gracefully handled. Stable IDs and seeded worlds must not be unexpectedly regenerated or lost.
8. **Gameplay philosophy:** Engineering choices should have observable trade-offs, but Creative/Assisted mode remains approachable and unrestricted. No forced campaign, economy, XP, progression lock or survival grind.

### Implementation discipline

- Before editing, produce a short **impact map** covering touched modules, old/new API contracts, serialized fields, units, anticipated regressions and rollback plan. Back up the untouched source and playable HTML.
- Implement in dependency order: **data/schema → pure model → invariants/tests → save migration → runtime integration → UI → browser checks → standalone build**. Keep changes modular, small, reviewable and traceable.
- Define SI engineering units explicitly: **kg, m, s, N, Pa, J, W, K, rad**. Maintain tested conversions to planetary scene units; never silently assume **1 render unit = 1 metre**. Use double-precision JavaScript `Number` for orbital state where appropriate; renderer may use camera-relative coordinates.
- Distinguish, in code and UI: **physical law**, **simplified engineering approximation**, **procedural world model**, and **fictional warp/gameplay mechanism**. Do not falsely describe guided animation, scripted delivery or abstract sensor readings as high-fidelity physical simulations.
- Use fixed or bounded numerical timesteps. Handle 1×/10×/100×, long time skips, tab/background throttling, unloaded distant systems, very small bodies, extreme atmospheres and missing component data. The result must remain finite and deterministic; do not force a huge physics timestep.
- Maintain **one authoritative asset state** for each physical object, with controlled adapters for legacy interfaces. Do not update duplicate mutable copies in different modules. Preserve energy, mass, propellant, angular momentum (when represented) and data accounting to the fidelity claimed.
- Use bounded caches, LOD, incremental jobs, time slicing and event-driven UI updates. Do not recalculate every satellite, rover or outpost at full fidelity each frame. Avoid heavy DOM or mesh work in render loops.
- No arbitrary JavaScript execution in rover programs; preserve constrained validated command languages, bounded loops/steps, explicit safety states and an emergency stop.
- Every interaction must be possible through the **real game controls/UI**, not only a unit-test call or debug console. New complexity belongs in optional Advanced/Engineering panels; Assisted mode should remain intuitive.
- Failure or cancellation must not corrupt the simulation or saved assets. Validate before making state changes; apply operations atomically where feasible. Maintain a recoverable asset or an explicit safely failed state.
- Existing test assertions should not be weakened to get a green report. Adjust outdated assumptions only when intended behavior has demonstrably changed, documenting why.

### Mandatory acceptance gate for every release

- Verify all existing Node/math/serialization tests, then the newly added feature tests. Show each **command and actual exit result**.
- Run source-script **syntax checks**, standalone parity, and `file://` offline loading check when possible.
- Test integrated path: **star chart → warp → land → EVA → ship ramp**, plus truck **enter → exit → walk away**, science rover autonomy, field sampling, outpost/wiring, foundation launching, spacecraft and satellite persistence, ruins and map.
- Test **1×, 10× and 100×**. Landed objects and terrain remain anchored; no NaNs, corrupt geometry or teleportation.
- Verify older save migration, new save serialization, and **close/reopen/reload persistence in an actual browser** when possible. If the environment blocks reopening, mark it **NOT VERIFIED**, not passed.
- Check real WebGL2 rendering/visual appearance and frame-time benchmarks on representative hardware when possible. Mocked browser tests are not GPU proof. Clearly mark any missing real-hardware evidence.
- Provide before/after performance readings in identical scenarios **only if actually measured**. Test bounded object counts, long simulation time, cache eviction and remote-system revisits.
- If the new slice breaks required invariants, fix and rerun. If it cannot be fixed safely, **revert the slice** and deliver the last verified build plus a precise failure report.

### Mandatory deliverables for every release

1. A **complete editable project ZIP**, not patch fragments only.
2. A synchronized standalone **`PLAY-STARFALL.html`**, working offline where WebGL2 is supported.
3. The complete previous release preserved as a rollback backup.
4. `CHANGELOG.md`, updated technical/science notes, save-schema/migration notes and a **test report with PASS / FAIL / NOT RUN**, exact commands, environment and known limitations.
5. A concise map of changed files/APIs, new UI controls, test results and intentionally simplified physics.
6. No claim of a successful GPU test, rocket mission, browser reload, or full integration unless actually executed and confirmed.

---

# 7A — Unified Engineering Core & Asset Registry

**Prerequisites:** Verified Update 7 source and Contract 00. **Goal:** Make every engineered machine interoperable before adding harder physics.

## Copy-ready implementation prompt

**Apply Master Contract 00.** Inspect `src/physics/vehicles.js`, `power.js`, `outposts.js`, `launch-systems.js`, `robotics.js`, `science-field.js`, `orbit-bridge.js`, `integration.js`, `src/flight.js`, `src/starfall-core.js` and their actual consumers. Implement a **single, versioned Asset Registry** and shared interface contracts for all persistent engineered objects: spacecraft, truck, autonomous rover, rocket/stages, satellites, outpost structures, electric-grid devices, instruments and laboratories.

**Build the data foundation:**
- Each asset has a deterministic or saved unique ID, type, body/system ownership, parent/attachment, planet-fixed **or** orbital position representation, design/component references, health, status, mass, energy/fuel/inventory where applicable, and last simulation timestamp. Different location modes must be explicit; never represent orbital satellites as surface-fixed objects.
- Introduce reusable component schemas for batteries, solar arrays, generators, motors, engines, propellant tanks, attitude actuators, electronics, radiators, sensors, radio modules, structural mounts and payloads. Each schema declares compatible asset types, rated parameters, SI units, mass, electrical connectors and fault conditions.
- Add a **single authoritative state + adapter layer**, so current UI panels and saved configurations continue to work while legacy modules migrate. Do **not** rename or delete old save keys without a tested migration.
- Implement a conservative, deterministic **resource ledger** that records energy generation, battery storage, load consumption, losses and transfers; similarly track propellant/working mass, stored experiment records and component condition. No duplicate energy or instantly replenished fuel. All charging requires a valid power source, electrical link/port and available surplus.
- Have **one authoritative orbital position function** for both satellite renderer and radio graph. Make radio line-of-sight, signal delay and payload pointing consumers of that state; remove parallel mutable satellite coordinates.
- Let instruments report a typed `Observation` with source asset, source world/body, coordinate frame, timestamp, units, uncertainty, calibration and provenance. Preserve older journal/lab export formats through adapters.
- Add lifecycle events such as `ASSET_CREATED`, `DESIGN_APPLIED`, `POWER_CHANGED`, `LINK_LOST`, `OBSERVATION_RECORDED`, `ASSET_DEPLOYED`, `ASSET_FAILED`. Keep events bounded and avoid write-amplification in saves.
- Maintain the ship's existing flight handling and vehicle boarding behavior unchanged. Feature-flag the new shared adapters until regression-tested; make older saves load into valid default shared state.

**Real gameplay outcome:** A player can inspect the same battery or antenna model in the truck, rover, satellite and outpost; connecting a charger transfers actual energy; changing hardware changes mass, power, range and performance; satellite radio location agrees with its visual orbit.

**Acceptance tests (implement and run):**
1. Shared component definitions produce consistent mass/energy totals on at least three different asset types.
2. Energy and propellant conservation hold across simulated tick sequences and 1×/10×/100× operation; reject negative balances, overcharge and duplicate transfers.
3. Satellite positions match to tolerance in **render-position and radio-link consumers** at multiple timestamps, including eclipses and time skips.
4. Original saved ship, local rover, truck, outposts, launched satellites, deployed probes, observations and foundation pads migrate without losing IDs or inventing resources.
5. Disabled shared mode exactly preserves prior controls and normal playable behavior.
6. Constructing/destroying/reloading assets does not leak GPU objects, duplicate registry entries, or grow the cache unboundedly.
7. Truck charging fails when disconnected, unpowered or without surplus electricity and succeeds when power is actually delivered.

**Deliver:** Schema + adapters, migration tests, resource ledger, shared orbital-state contract, UI connection points, performance note, compatibility flag, full project ZIP, standalone HTML and report. **Do not** implement full rocket ascent, new satellite sensing or a research progression system in this release.

---

# 7B — Physical Rocket Flight, Modular Staging & Launch Simulator

**Prerequisites:** Verified 7A. **Goal:** Replace guided ascent animation with genuinely integrated rocket motion while preserving a simple Assisted mode.

## Copy-ready implementation prompt

**Apply Master Contract 00 on verified 7A.** Inspect the actual `StarfallLaunch` rocket builder/state and the shared physics and rendering layers. Create a real **stage-by-stage rocket assembly and flight model**, with **per-stage** fuel tanks, dry masses, engines, thrust curves/ratings, payload mass, decouplers, boosters and attachment constraints. Correct the current UI ambiguity in which a global tank count can translate into more physical tank modules than the user expects. Preview the actual component tree and mass rollup.

**Assembly and engineering:**
- Provide a reusable rocket-stage data model (independent tank counts, engine choices, fuel types if modeled, thrust, Isp, dry/wet mass, dimensions, payload/fairing, simple drag properties, symmetry constraints). Reject unsupported stack connections, invalid staging and over-mass designs with helpful messages.
- Calculate **stage-specific ideal delta-v** using `Δv = Isp·g0·ln(m0/m1)` and local liftoff thrust-to-weight ratio; show launch envelope warnings instead of guaranteeing success from thresholds.
- Add a **physically integrated** 3D/2D-attitude simplified trajectory governed by `d(mv)/dt` implemented correctly via variable-mass thrust dynamics, gravity, atmosphere-relative drag, propellant consumption and finite throttle/engine state. Use a bounded fixed-step integrator and explicitly separate inertial frames, planet rotation and camera/render coordinates. Model atmospheric density with the existing simplified atmosphere system where valid.
- Simulate real events: ignition, throttle, fuel depletion, staging, booster separation, engine flameout, loss of thrust, unstable ascent, impact or orbital insertion. If structural/thermal failure models are not yet accurate, report them as warnings or as clearly simplified limits; don't claim CFD or full 6DOF aerodynamics.
- Orbital HUD reports altitude, radial/total speed, apoapsis, periapsis, inclination (if modeled), remaining stage fuel, current acceleration, dynamic pressure and estimated delta-v. Do not conflate a suborbital trajectory with a stable orbit.
- Add **Assisted**: actual force-based autopilot, configurable target orbit, safe defaults; **Manual**: throttle, attitude, stage, cut-off, restart where engines allow; **Engineering**: trajectory preview and detailed telemetry. These all use the *same* flight solver, not different outcome scripts.
- Maintain a bounded substep budget for 1×/10×/100×. At extreme time warp, use an analytic coast for an unpowered orbit or safely restrict time acceleration during atmosphere/thrust, with a visible explanation.
- Make the existing `Foundation` operate as a real pad interface: site slope clearance, rocket placement, launch direction, physical ground attachment, power/fuel readiness where relevant, no unintended destruction of adjacent outpost elements.
- Keep the original fictional interstellar carrier separate from the chemical ascent and orbital manoeuvres; never imply ordinary rocket delta-v provides FTL travel.

**Real gameplay outcome:** A heavy or underpowered design can fail to lift off, a low-fuel rocket can miss orbit, an incorrectly staged rocket can lose thrust, and a well-designed rocket can achieve and maintain a measurable orbit under assisted or manual control.

**Acceptance tests:**
1. Vacuum vertical thrust/gravity cases match analytical expectations within a stated numerical tolerance.
2. No-thrust Kepler coast matches orbital energy/angular momentum invariants within documented bounded error.
3. Mass decreases only with measured propellant flow; fuel exhaustion stops thrust; stages release exactly once; discarded hardware mass is not retained on the active vehicle.
4. On a high-gravity planet, identical rocket design can fail where it succeeds on a low-gravity moon; physical drag changes trajectories on atmospheric planets.
5. Pad selection, rocket assembly, launch, throttle, staging, target orbit and payload deployment function through the visible UI.
6. Failed ascent leaves a deterministic, recoverable failed mission state without broken camera/ship controls or corrupt saves.
7. Both manual and assisted flight share the solver and produce trajectories, not predetermined altitude percentages.
8. 1×/10×/100× and save/resume do not introduce huge energy spikes or NaN orbital states.

**Deliver:** Per-stage editor, integrated flight solver, flight instruments, replayable trajectory fixtures, UI controls and reports; complete ZIP, standalone and rollback. No claim of full KSP-like 6DOF when only a reduced-order model is implemented.

---

# 7C — Working Satellites, Orbital Science & Radio Operations

**Prerequisites:** Verified 7A and 7B. **Goal:** Make satellites useful engineered assets, not only orbiting visual objects.

## Copy-ready implementation prompt

**Apply Master Contract 00 on verified 7B.** Extend the actual deployed-satellite architecture using 7A's Asset Registry, power ledger, authoritative ephemeris and unified radio service. Do **not** create a separate simulation that ignores launch hardware or existing communications. Add engineering-configurable satellites with a core bus, power system, battery, solar arrays, antenna, thermal model, attitude/pointing control, onboard data storage and optional sensor payloads.

**Functional payload types:**
- **Communications relay:** Antenna/radio power, frequency-band abstraction, link budget, body occlusion, range, propagation delay, command queuing and relay windows. The satellite must transmit only when in view and properly powered/aligned.
- **Orbital surveyor:** Camera and spectrometer/radiometer, defined field of view, pointing accuracy, spatial footprint, illumination limits and measurement uncertainty. Produce **actual data records derived from the existing seeded world** and integration with `Field Science`, not free perfect maps.
- **Atmospheric sensor:** Where physically meaningful, infer temperature, cloud/dust proxy or composition from existing world model, with instrument limitations and uncertainty.
- **Navigation beacon:** Timed navigation/position signal only while link geometry works; demonstrate a measurable improvement or diagnostic for rover positioning.
- **Scientific observatory:** Record time-stamped stellar/planetary observations with provenance and power/data limits.

**Orbit and spacecraft operations:**
- Represent the same orbital position/time/attitude in the renderer, radio links, mapping footprints and telemetry; include eclipse-aware solar input, battery drain, pointing power, heater/thermal approximations, and data-storage fullness.
- Provide orbit parameters and time-based **pass predictions**, coverage visualization, antenna link quality, data backlog and transmission latency; only claim accuracy consistent with the chosen propagation model.
- Integrate survey observations with the existing **Planetary Survey Map**, exploration notebook and outpost laboratory. Mark captured footprints/uncertainty rather than revealing a whole unknown world instantly.
- Use scheduled/time-sliced updates for distant satellites. Keep stable satellites persistent through galaxy cache eviction and old-save restoration without continuous rendering of unloaded systems.
- Design a compact **Satellite Operations** UI, reusing Rocket Lab / Observatory rather than introducing a second bloated navigation tree. Support satellite selection, targeting, enabling payloads, downlink, telemetry and safe/off modes.

**Real gameplay outcome:** Launching a mapping satellite can reveal useful terrain or mineral evidence, but only after it passes over a target, collects a bounded dataset, stores it and successfully downlinks through an available radio network.

**Acceptance tests:**
1. A satellite in shadow generates no solar energy; stored energy decreases with active loads and charges under illumination subject to capacity/loss constraints.
2. The same satellite position feeds visual transform, survey footprint and radio geometry at any simulation time.
3. Wrong pointing/occlusion/insufficient power/full storage prevents relevant sensing or downlink, with a clear reason.
4. A known orbit yields reproducible pass windows and finite link delays.
5. Scientific observations carry real seeded body properties, instrument uncertainty, time/location and asset IDs and are delivered exactly once to journal/lab.
6. Planetary map reveals only measured footprints when fog-of-war is enabled; existing map saves and waypoints survive.
7. Cache eviction, time warp and save/reload do not duplicate satellites or erase their pending datasets.
8. A satellite's components affect its engineering trade-offs (mass, power, data capacity and communication quality), not only its cosmetic model.

**Deliver:** Satellite subsystems, sensors/coverage, radio/downlink integration, UI, telemetry and observation fixtures, source/standalone ZIP and rollback. Do not claim accurate ground truth for speculative biosignatures or ancient civilization evidence from inadequate sensor resolution.

---

# 7D — Unified Rover Autonomy, Expedition Truck & Ground Operations

**Prerequisites:** Verified 7A–7C. **Goal:** Make local and remote rover missions obey the same physical and operational rules; give the truck a meaningful field-engineering role.

## Copy-ready implementation prompt

**Apply Master Contract 00 on verified 7C.** Audit the two existing rover paths: the **local six-wheel autonomous science rover** (`robotics.js`, `rover-dynamics.js`, Field Science) and the **remote rover capsule program** (`launch-systems.js`). Merge them at the simulation/service level using a single validated rover mission state and command interpreter, without changing the player's non-rideable rover / rideable truck distinction.

**Rover programming and simulation:**
- Keep the constrained, safe command subset (`DRIVE`, `TURN`, `SAMPLE`, `WAIT`, `STOP`) and evolve it via versioned aliases/adapters toward Update 4's `GOTO`, `SCAN`, `IF`, `RETURN`, `DOCK` where supported. No arbitrary JavaScript, unrestricted loops, unbounded execution or infinite distances.
- Reuse **fixed planet-anchored terrain height/material/normal sampling**, bounded path planning, traction/slip/slope checks, wheel contact approximation, motor torque/speed limits, battery consumption, instrument range/calibration, collisions/obstacle avoidance and fault states for both nearby and distant rovers.
- Remote unloaded systems must not become unbounded background simulations: use an explicitly documented **coarse deterministic segment simulation** that preserves terrain/safety constraints and outcome consistency within tolerance. Do not simply add a spherical displacement and call that physical driving.
- Route remote commands through the existing **satellite/outpost radio network**. Queue sends and acknowledgements, simulate latency; during blackout finish onboard-approved instructions, store measurements and wait for a pass. No instant manual steering through interstellar distances.
- Introduce mission states like `IDLE`, `AWAITING_LINK`, `PLANNING`, `DRIVING`, `SAMPLING`, `RETURNING`, `CHARGING`, `FAULT`, `SAFE_STOP`; transitions must be observable and persistent. Provide stop/cancel, bounded retries and battery-reserve behavior.
- Integrate science results into the **same observation ledger**, expedition notebook, map and lab receipt pipeline, with latency and provenance. Do not silently duplicate local and remote measurements.

**Expedition truck:**
- Preserve explicit **`X` to enter/exit** and the bug fix **exit → press `W` → remain in EVA**. Never make the science rover rideable or change physical ship-ramp boarding.
- Use 7A's shared electrical/vehicle components: configurable traction drive, battery/motor, headlamps, solar charging or external power port, cargo, optional mobile workstation/sensors and diagnostic instruments. Show realistic capabilities and power costs while retaining Assisted mode.
- Truck charging requires proximity **and a valid physical/electrical connection, suitable voltage and available source power**; battery cannot rise from an unconnected nearby array.
- Replace the current simple winch relocation with a bounded recovery process: cable length/attachment range, line-of-sight or obstacle check, load/traction force approximation, battery cost, progress and safe cancellation. Avoid teleporting a rover through hills or structures.
- Add terrain-aware drive feedback, wheel/ground clearance diagnostics, safe exit position and emergency stop. Avoid costly tire deformation simulations and high-frequency collision work on distant vehicles.

**Real gameplay outcome:** A player sends a rover program through an orbital relay, waits for a communications window, reviews terrain and instrument telemetry, drives the truck to recover a stuck rover, and recharges equipment using a wired outpost.

**Acceptance tests:**
1. Local and remote rovers given the same seed, terrain segment, hardware and command produce comparable energy use, path safety and instrument records within a stated tolerance.
2. Steep terrain, depleted battery, invalid commands and unavailable instruments reliably cause safe stop or fault, not teleportation or fabricated science.
3. Remote blackout prevents new commands; onboard tasks continue safely; logged observations downlink exactly once when connectivity resumes.
4. Old 7/4 rover scripts and saved mission states migrate without losing mission IDs or data; malformed script cannot hang the browser.
5. Truck enter/exit/W regression passes; ship ramp and ruin `X` interaction precedence remain correct.
6. Charging fails when disconnected/unpowered, winch fails outside cable/force limits, and both succeed when valid with measurable energy expenditure.
7. Terrain, trucks, rover, outposts and science records remain aligned after time warp, galaxy unload/revisit and save/reload.
8. 1×/10×/100× and long remote missions remain bounded in CPU/memory.

**Deliver:** Shared rover controller and compatibility adapters, command queue, communications integration, truck improvements, UI, reproducible terrain fixtures, full package and rollback.

---

# 7E — Engineering Research, Validation & Reusable Blueprints

**Prerequisites:** Verified 7A–7D. **Goal:** Turn science and engineering into experiments players can perform, rather than an arbitrary upgrade tree.

## Copy-ready implementation prompt

**Apply Master Contract 00 on verified 7D.** Add an **optional Engineering Research & Prototyping Workbench** to the existing Engineering Workbench and outpost laboratory. Do **not** add currency, XP, credits costs, randomized loot, progression locks, mandatory crafting or forced quests. In Creative/Assisted Sandbox mode, all supported components remain accessible.

**Research and engineering workflow:**
- Create versioned `ExperimentPlan`, `DesignRevision`, `TestRun`, `ObservationRef`, `Comparison` and `ValidatedBlueprint` records with stable IDs, source asset/design, world/environment, measured variables and uncertainty.
- Use existing science/telemetry sources: rover motor torque/power/traction; battery charge/discharge/temperature; solar output; antenna link quality; rocket ascent and fuel use; satellite pointing/payload performance; laboratory measurements.
- Provide meaningful experiments, such as comparing rover gearing across slopes, testing radiator size against thermal load, measuring antenna performance through a relay pass, or comparing rocket stage configurations against predicted delta-v and actual insertion results.
- Distinguish **predicted performance** from **observed in-game simulated performance**. Store test conditions (gravity, atmosphere, temperature, slope/material, energy/fuel, time acceleration), numerical units, calibration and uncertainty. Re-running the same deterministic conditions should produce matching outcomes within documented tolerances.
- Let players change bounded, meaningful design parameters (e.g., gear ratio, motor selection, wheel size, battery pack configuration, antenna size/power, tank/stage configuration, instrument calibration). Enforce compatibility, mass, center of mass, electrical connections and safety limits from the unified models.
- Use comparisons with charts/tables, differences and error bars where supported. A **validated blueprint** is simply a saved, repeatable configuration with recorded tests—not a magical increase in efficiency or a locked technology unlock.
- Connect the expedition notebook and archaeology journals as possible sources of **hypotheses** or design inspiration. Ancient technology remains speculative and cannot be converted into a fully functioning, physics-defying component merely by clicking a relic.
- Allow **sandbox challenges** as non-compulsory suggestions: reach a certain orbit with a mass limit, survey a difficult region efficiently, maintain a relay for one full orbit, or compare battery designs. Completion must depend on actual telemetry, not opening a menu.
- Add export/import of blueprint and experiment records as versioned JSON; validate schemas and reject malformed/excessively large imports.

**Real gameplay outcome:** The player sees a rover consume too much power, adjusts gear ratio or wheel size, runs a controlled terrain test, compares energy usage and travel time, saves the successful design as a named blueprint and deploys it again.

**Acceptance tests:**
1. Identical seeded experiment conditions generate repeatable model outcomes and reliable comparison metrics.
2. Changing engineering parameters actually alters energy, torque, performance, mass or thermal behavior in the shared model; purely cosmetic changes are labeled cosmetic.
3. No experiment can report success without a real logged test run and matching source asset/environment.
4. Blueprint import/export preserves unit types, compatibility, stable IDs and source provenance; malformed imports fail safely.
5. Laboratory power and instrument availability gate physical test execution only when relevant, without locking Creative Sandbox components.
6. Existing Engineering Workbench designs, expedition notebooks, observations and saves remain valid.
7. Experiment history and plots have bounded data sizes and do not allocate each frame.
8. No implicit currency or tier gate is introduced.

**Deliver:** Research data schema, experiments and comparison UI, blueprint library, provenance/audit report, tests, source/standalone releases and previous-build rollback.

---

# 7F — End-to-End Engineering Expedition, Real Browser QA & Release Hardening

**Prerequisites:** Verified 7A–7E. **Goal:** Validate that all systems operate together during sustained, realistic play; prioritize fixes over new content.

## Copy-ready implementation prompt

**Apply Master Contract 00 on verified 7E.** Perform a **full integration, gameplay and release-quality pass**. Do not implement a campaign or add another vehicle category. Inspect the asset registry, rocket flight, satellites, communication routing, rovers, truck, power, labs, research, ecology, ruins, survey map and saves for mismatched assumptions, duplicated state, UI conflicts and regressions. Fix the most impactful genuine issues before visual polish.

**Scenario A — Launch and observe:**
1. Load an old compatible save and confirm galaxy/vehicle/outpost preservation.
2. Land normally, build a `Foundation` and connect an operational electrical source.
3. Construct a rocket with independently configured stages and a mapping-satellite payload.
4. Use force-based launch (Assisted or Manual) to reach a real stable target orbit; if the design fails, the failure must be observable and safe.
5. Deploy the satellite; verify a single authoritative orbit, sunlight/eclipses, payload pointing, power drain/storage, survey footprints, data capacity and downlink windows.
6. Receive a time-stamped scientific record in the correct laboratory/notebook and show the new mapped region in the survey map.

**Scenario B — Remote rover expedition:**
1. Construct a payload launcher on an existing pad, target another known solid planet/system and use the **explicitly fictional interstellar carrier** for the interstellar leg.
2. Deliver a non-rideable programmable science rover; send a bounded command script subject to actual radio connectivity and delay.
3. Traverse stable terrain, avoid steep hazards, use the selected scientific instruments, manage battery reserve and store data during blackout.
4. Confirm subsequent downlink, evidence provenance and lab receipt with no duplicated science record.
5. Fly to the destination personally, land, walk, consult the map, and independently verify the rover's position, measurements and discoveries.

**Scenario C — Ground operations and engineering research:**
1. Enter the rideable expedition truck with `X`, drive across terrain and exit; walking away does not reboard.
2. Recover a stopped rover with a physically bounded winch, charge using an actually available power connection and confirm energy accounting.
3. Compare one experiment against predicted performance, save a validated blueprint and apply it safely without overwriting unrelated assets.
4. Survey an archaeological ruin, walk in and out, and verify that ruin/truck/ship `X` interaction priorities have not regressed.

**Performance, safety and compatibility gate:**
- Test real Chrome/Edge WebGL2 on at least one documented GPU/device if available. Capture actual frame-time percentiles, GPU errors and memory trends for: dense planetary surface, multiple rover/truck assets, several outpost structures, active launch and staging, a satellite pass, large galaxy search, ruin interiors, ecology and 100× time. Do not invent benchmarks.
- Check UI with mouse/keyboard and touch layout where practical; verify remapped/inverted controls, dialogs capturing input, emergency stops and escape/exit from every mode.
- Stress 20+ sequential launches, many orbital objects, long time skips, galaxy LRU eviction/revisit, telemetry backlogs and 100× operation. Use configurable safe asset caps without deleting important saved objects silently.
- Verify full standalone code parity with source and **offline `file://` run**. No hidden fetch requests, missing GLB files or runtime dependency downloads.
- Verify save migration from original Update 7 and available 6J, new-save JSON validation, backup/restore and actual browser close/reopen when possible. Broken or unsupported saves must fail safely with clear messages, not erase the user's file.
- Audit science models with a table of physical laws, simplified approximations, fictional mechanics, units, conditions, failure modes, test coverage and user-facing disclosures.
- Keep optional sandbox/Expedition Board guidance; it must not become a forced progression sequence.
- Consolidate confusing menus where it helps the player: **Build → Operate → Monitor → Research** should be discoverable without redundant modal controls. Maintain existing visual identity.

**Release criteria (must report actual status):**
1. All pre-existing required tests pass or failures are individually explained and fixed.
2. New 7A–7E tests pass; test scripts are repeatable and checked into the project.
3. The three end-to-end scenarios are demonstrably playable through the real UI, not only test doubles.
4. Offline standalone matches source; rollback ZIP and migrations are available.
5. Real-GPU visuals/FPS and real-browser reload are explicitly labeled **PASS / FAIL / NOT VERIFIED**, never assumed.
6. No outstanding blocker in boarding, time warp, launch/payload deployment, radio, save/load or terrain stability is hidden by feature flags.
7. Any unverified critical criterion results in a **release candidate**, not a claim of fully tested production readiness.

**Deliver:** Full verified project ZIP; offline HTML; migration checklist; screenshots/video only if actually captured; detailed `RELEASE-VERIFICATION-7F.md` with test evidence; performance report; known issues ranked by severity; regression test commands; rollback instructions; concise next-step recommendations. **Do not claim that every system is functional without the necessary real-browser evidence.**

---

# Suggested build order and release gates

| Release | Technical focus | Player-facing reason to build it | Cannot proceed until… |
|---|---|---|---|
| **7A** | Shared assets, resource accounting, save migration, unified orbital state | Every vehicle and machine follows compatible rules | No duplicate assets, free energy, broken saves or inconsistent satellite positions |
| **7B** | Real rocket staging, thrust and integrated ascent | Rocket designs succeed or fail for understandable physical reasons | Trajectory/orbit tests, actual play controls and safe failure pass |
| **7C** | Satellite sensing, power, communications and orbital passes | Satellites reveal data and enable distant missions | Survey/downlink only work under valid power, pointing and radio conditions |
| **7D** | Remote rover terrain autonomy and meaningful truck operations | Player-built vehicles solve exploration problems | Terrain, battery, radio, no-reboarding and safe-stop cases pass |
| **7E** | Engineering experiments, telemetry and tested blueprints | Players learn by testing and improving designs | Results require actual model runs, not arbitrary completion or bonuses |
| **7F** | Cross-system gameplay, reliability, performance and QA | The whole experience is cohesive and playable | End-to-end integration and real-browser limitations are honestly documented |

## Quick verification matrix

For **every** release, include tests for:

- **Galaxy & navigation:** Seed 742 plus at least two other seeds, stable IDs, real navigable stars, lazy systems, star chart, warp, landing.
- **Grounding:** Stable terrain coordinates and seams, EVA, sky-look, ship boarding, truck explicit entry/exit, science rover never rideable, terrain colliders, 100× time.
- **Engineering:** Mass, fuel, electrical power and energy conservation, motor/engine outputs, power wiring, solar eclipse and weather effects, thermal limits.
- **Orbital science:** Valid units, force-based ascent when applicable, staged flight, circular/elliptical orbit propagation, single satellite ephemeris, link/footprint parity.
- **Mission operations:** Remote command latency, blackout behavior, safe autopilot, science provenance, lab receipts, saved state across unloaded systems.
- **Exploration systems:** Ruins/interiors, ecology, events, topographic map, notes and Expedition Board not regressing.
- **Performance & compatibility:** Actual test measurements where possible, bounded caches, old saves, offline standalone and synchronized source, rollback file.

## Important design boundaries

- **Realism:** Use Newtonian mechanics and conservation laws where practical. Simplify wisely (reduced-order aerodynamics, wheel-ground approximation, coarse remote rover simulation). Never call simplified models full aerospace/robotics fidelity.
- **Fiction:** Interstellar warp and Dyson-scale ancient technology may exist for the game's setting. Mark them as speculative, with consistent internal rules; do not claim chemical rockets can perform interstellar transport.
- **Playability:** Assisted operations should make complex engineering understandable. Expert controls can expose deeper parameters without requiring manual management of every subsystem.
- **Integration:** Any new feature should connect with at least one existing feature and create a useful player decision. Avoid isolated dashboards that merely report numbers.
- **Safety & honesty:** Tests and documented limitations are release deliverables, not optional polish. An automated test pass is not proof of full in-game functionality.

---

## How to request each implementation

Copy **Contract 00** followed by the chosen prompt, or use this short request with the attached Markdown file:

> Implement **STARFALL Update 7A** exactly as specified in `STARFALL_UPDATE_7_ENGINEERING_ROADMAP_PROMPTS.md`, applying Contract 00. Use the complete Update 7 ZIP as the baseline, make actual code changes, run the specified regressions, and provide the full editable ZIP, standalone HTML, migration notes and honest verification report. Do not start 7B until 7A is verified.

After accepting 7A, substitute `7B` and use the verified 7A files as the next baseline; repeat through 7F.

**End of prompt pack.**
