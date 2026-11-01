# STARFALL — Science & Engineering Implementation Prompt Pack

**Purpose:** Make Starfall a robust science/engineering simulator *before* adding missions, objectives, currencies, rewards, or progression. These prompts are designed to be executed **one at a time** against the latest working project, with a testable, reversible change after each stage.

**Reference baseline:** `STARFALL-NAVIGABLE-STARS`, the most recent supplied project reviewed for this pack. Do not base changes on older `COSMIC-EVOLUTION`, `PHYSICAL-LIGHTING`, or `EXPLORER-3D` releases.

## How to use

1. Keep a copy of the last known-good `STARFALL-NAVIGABLE-STARS.zip` outside your development directory. Do not overwrite it.
2. Start with **Prompt 00**. It creates a repeatable test/build/rollback foundation, not a gameplay system.
3. For each later prompt, paste **GLOBAL CONTRACT** below followed by **only one numbered prompt**. Supply the entire current project, including the latest output from the previous prompt. Never send an obsolete ZIP.
4. Proceed to the next prompt **only after** the current one meets every acceptance gate. If a gate fails, use the **Repair Prompt** at the end with test evidence.
5. At each stage request the complete updated project ZIP **and** a standalone `PLAY-STARFALL.html`. Running a partial HTML fragment or a collection of patches is not an acceptable deliverable.
6. The final **Prompt 16** is the production-readiness audit. It is not a mission or game-progression update.

### Current architecture (verified in the supplied project)

| File | Existing responsibility | Integration rule |
|---|---|---|
| `src/galaxy.js` | Deterministic catalog, star/planet/moon generation, orbital positions, spatial queries and lazy hydration | Extend fields compatibly; do not rewrite IDs, star positions or generation order without migration |
| `src/engine.js` | WebGL 2 rendering, procedural terrain, star/sky light, spacecraft, rover and compact 3D avatar | Render-only where possible; scientific equations belong in simulation modules |
| `src/flight.js` | Player state, input, flight physics, walking, physical boarding, rover controls, camera and HUD | Thin integration around the existing state machine; protect landing/boarding |
| `src/starfall-core.js` | `SF.load()`, `SF.save()`, surveys, discoveries, credits and saved flight state | Preserve existing `starfall_save` and `flightGalaxy`; add versioned optional namespaces |
| `index.html` | Editable game entry with local `src/` files | Keep relative URLs valid; no mandatory network calls |
| `PLAY-STARFALL.html` | Offline single-HTML build | Must be rebuilt from the same code as `index.html`, never hand-maintained separately |
| `tests/galaxy.test.cjs` | Current deterministic galaxy regression suite | Must pass at every stage |
| `assets/explorer-lightweight.glb` | Reusable lightweight avatar export | Preserve its scale, silhouette and the in-game animated avatar |

Current invariant: **2,368 real navigable stars**, 64 original systems + 2,304 lazy systems; minimum star-center spacing **100 diameters of the larger star**; 1–20 planets per system and 0–7 moons per planet; all visible star points correspond to real systems; orbital revolution and axial spin; continuous flight and touchdown; no separate scene on landing; walking and physical boarding without enter/exit buttons.

---

## GLOBAL CONTRACT — Paste above every numbered prompt

> You are the lead simulation engineer, graphics engineer, physics reviewer, and release engineer for STARFALL. You are working on an **existing, functioning offline WebGL 2 browser game**, not a greenfield remake. Inspect the **actual supplied source** before coding; do not invent APIs or rely on snippets from other versions. Your task is to implement exactly the single requested subsystem below while preserving the rest of the game.
>
> **Nonnegotiable preservation:** No loss of the 2,368 seeded navigable stars, deterministic lazy systems, original orbital star/planet/moon generation rules, star-chart search and selection, interstellar travel, coronal access, atmosphere and natural star/moon illumination, seamless landing, grounded camera, compact 3D explorer, physical ramp boarding, rover operation, or saved progress. Do not replace the render engine, introduce loading-screen teleports, resurrect decorative fake star points, add boarding buttons, or remove existing functionality. Existing UI aesthetic: dark/navy, restrained amber accents, readable telemetry, responsive desktop/mobile.
>
> **Absolutely no game progression yet:** Do not implement missions, quests, objectives, XP, upgrade currencies, loot, research unlock gates, economies, monetization, or reward balancing. Existing legacy systems may remain unchanged for compatibility. Build measurable, inspectable, usable engineering *tools* and scientific systems, not game loops.
>
> **Simulation integrity:** Before making scientific claims, define units and reference frames. Keep astronomical coordinates in double-precision JavaScript numbers and render positions camera-relative on the GPU. Distinguish physical metres/seconds/kilograms from legacy game world units; do not silently assume their equivalence. Preserve numerical stability at 1×, 10× and 100× simulation time. Keep deterministic celestial positions and surface-local anchors. Physics must use bounded fixed substeps or analytic propagation, not one giant time-warp Euler step. Do not simulate detailed N-body dynamics for 2,368 systems per frame.
>
> **Implementation discipline:** (1) Make a restorable baseline snapshot and inventory public interfaces; (2) write specific tests that fail before the change; (3) implement one bounded vertical slice, using new `src/` modules when appropriate; (4) add minimal, accessible UI instrumentation to expose the result; (5) run unit, integration, save/load, performance, and gameplay smoke tests; (6) rebuild standalone output; (7) report the exact tests and their results. Avoid giant rewrites, external dependencies, public CDNs, unsafe dynamic code execution, or hidden global state. Feature flags should default to legacy behavior until the new feature is validated; switch to the feature after passing tests, retaining a fallback.
>
> **Backward compatibility:** Preserve old saves and stable object IDs. Use a versioned optional data section such as `scienceEngineering.v1` rather than overwriting old `flightGalaxy`, `surveys`, `awards`, or `discoveries`. Validate loaded state and handle missing/corrupt fields with deterministic defaults. Save after safe checkpoints, not in the animation loop on every frame.
>
> **Stop conditions:** Never claim a test passed without running it. Do not silence exceptions, delete failing tests, disable physics to get screenshots, or substitute mocked WebGL for a real GPU playtest. If no real WebGL browser is available, perform as many executable checks as possible, report visual/GPU verification as **NOT VERIFIED**, and include a reproducible manual test script. If regression occurs, restore the last working build before changing anything else.
>
> **Outputs required now:** Complete modified files (not diffs, ellipses or placeholder functions), all new tests, a current `README.md`, `CHANGELOG.md`, run instructions, a working `index.html`, rebuilt `PLAY-STARFALL.html`, and a downloadable source ZIP. Include a concise changed-files manifest, verification table (PASS/FAIL/NOT RUN), known limitations, performance deltas against baseline, and exact rollback instructions. Do not move to another subsystem in the same turn.

---

## PROMPT 00 — Freeze baseline, add reliable build and regression harness

**Run before all others. Dependency: none.**

> **Objective:** Turn the current STARFALL-NAVIGABLE-STARS project into a safely editable baseline without adding gameplay or changing the visible experience.
>
> Inspect `index.html`, `PLAY-STARFALL.html`, `src/galaxy.js`, `src/engine.js`, `src/flight.js`, `src/starfall-core.js`, `tests/galaxy.test.cjs`, and the asset folder. Record script load order, globals, save keys, rendering entry points, frame update order, camera state, ship/EVA/rover states, and procedural generation invariants.
>
> Implement:
> - A dependency-free `tools/build-standalone.cjs` that recreates `PLAY-STARFALL.html` from `index.html` and the current local CSS/JS/assets. Preserve script execution order, escaping of `</script>` and inline assets as needed. Generated output and editable build must be behaviorally equivalent. No network required. Ensure the single HTML file opens offline.
> - `tests/smoke.test.cjs` with reproducible automated assertions for startup prerequisites, star picking, target plotting, movement, free flight, 1×/10×/100× time, touchdown, ground clearance, EVA walking, physical boarding via ramp, rover boarding/dismount, nighttime illumination inputs, save restoration, and no JS exceptions. Use legitimate simulation test seams rather than invasive production backdoors.
> - `tests/science-math.test.cjs` placeholder *test harness only* with test utilities for deterministic PRNG, floating-point tolerance, dimensional checks, and fixed-seed fixtures; no fabricated science implementation.
> - `tools/verify.cjs` to run the existing galaxy tests, syntax checks, unit tests, integration smoke checks, then build and validate standalone output. Add a `VERIFICATION.md` that distinguishes mock rendering from full GPU tests.
> - `BACKUP-BASELINE/` or a labelled rollback release archive, plus a baseline manifest with checksums for all files and save schema.
>
> **Acceptance:** Existing `node tests/galaxy.test.cjs` passes unchanged. Game starts offline; chart lists exactly 2,368 catalog stars; choosing a star selects a real destination; land/walk/ramp/rover/takeoff flows still work; save survives reload; editable and standalone builds have equivalent controls and rendering code; old save keys are not cleared. Inspect for 0 runtime JS exceptions. Include a reproducible browser checklist for controls and camera if no GPU browser is available. Keep baseline measured frame times for future relative comparisons.
>
> **Explicitly excluded:** No new realism, missions, UI redesign, changed galaxy seed, physics retuning, or extra game content. If any existing interaction fails, report it as a baseline defect, do not quietly redefine behavior.

## PROMPT 01 — Scientific units, reference frames, and deterministic simulation clock

**Depends on 00.**

> **Objective:** Establish a scientifically trustworthy numerical foundation without altering flight feel, appearance, or the 2,368-system galaxy.
>
> Implement `src/science/units.js`, `src/science/frames.js`, and `src/science/clock.js` (or a similarly small, cohesive set). Provide explicit SI quantities and conversion APIs: metres ↔ game units, seconds, kilograms, newtons, joules, watts, pascals, kelvin, radians; assert dimensionally valid inputs. Maintain legacy unit conversion through ONE documented configurable scale adapter: **do not retroactively multiply existing celestial coordinates**. Support system inertial frame, body-centred inertial frame, rotating planet-fixed frame, and surface east/north/up tangent frame. Provide deterministic bidirectional transforms including translation and body spin.
>
> Implement simulation-clock state: simulation epoch, time-scale control 1/10/100, deterministic pause/resume, fixed-step accumulation for active local dynamics, analytic time jumps for celestial ephemerides, delta clamping for background tabs. Preserve `galaxy.update(simTime)` as the current source of celestial positions, with a compatibility adapter rather than a full rewrite. Keep origin-rebasing/camera-relative rendering as already implemented.
>
> Add a developer-readable diagnostics panel (collapsible) listing frame names, units, active body, sim time, time scale, physical delta, and legacy scale assumptions. Do not modify the existing HUD hierarchy except for a quiet entry point.
>
> **Acceptance:** Roundtrip frame transforms have bounded error at home planet, a rotating moon and a far catalog system; transform remains stable at 100×; landed ship/astronaut/rover keep their local coordinates across 1,000 accelerated frames; no NaNs or under-terrain camera; pause/resume produces same deterministic state as uninterrupted simulation for equivalent simulated time; existing flight and procedural tests pass; no changes to star positions, names, or moon counts.
>
> **Do not:** Claim that current fantastical star spacing or star-size ratios are real physical astronomy. The conversion adapter must make the distinction explicit. Do not make all controls subject to SI accelerations yet—that belongs to later prompts.

## PROMPT 02 — Deterministic stellar and planetary physical properties

**Depends on 01.**

> **Objective:** Give existing generated stars, planets and moons coherent underlying science properties that future subsystems can consume; do not change their visible world types or orbital locations.
>
> Extend bodies through a pure deterministic `derivePhysicalProperties(body, systemSeed)` function. Avoid advancing the existing generator's shared RNG stream; seed a *separate named substream* from stable IDs so all previous names/positions/counts remain identical. Derive/store `physicalRadiusM`, `massKg`, `densityKgM3`, `muM3S2`, `surfaceGravityMS2`, `albedo`, `rotationPeriodS`, `axialTiltRad`, `atmosphericComposition`, `surfacePressurePa`, `surfaceTemperatureK`, `waterFraction`, and optional `luminosityW`, `effectiveTemperatureK`, `spectralClass` for stars. Use physically plausible ranges by rocky/ice/gas body type and state where procedural approximation departs from realistic astrophysics.
>
> Use actual physics relationships where applicable: gravitational parameter `mu = G M`, surface gravity `g = mu/R²`, density `rho = M/(4πR³/3)`, inverse-square stellar flux, simple radiative equilibrium temperature with albedo. Never silently substitute the legacy UI field `gravity` or giant star size for an SI parameter. Classify impossible combinations (e.g., gas giant with terrestrial crust, hard vacuum with thick clouds) and correct newly derived values **without changing existing generated identity/appearance**. Provide measured source values versus inferred/generated values in the instrument API.
>
> Add a compact inspector showing a body's properties and their units. Make the data accessible even when a distant system is lazily hydrated, but don't materialize detailed terrain or geometry to inspect an object. Cache compact metadata by stable ID; evict full meshes independently.
>
> **Acceptance:** Same seed → identical property records after reload, hydration, eviction and rehydration; values finite and nonnegative where appropriate; mass/radius/gravity are consistent; no existing star or planet moves; 1–20/0–7 bounds unchanged; baseline navigation, surface and save tests pass. Include tests for vacuum moon, icy world, dense-atmosphere planet, ocean world, gas giant and star class extremes.
>
> **Do not:** Rebuild the galaxy, create new celestial objects, force Earth-like habitability, invent precise observational certainty, or simulate every body's thermodynamics every frame.

## PROMPT 03 — Real orbital flight, maneuver prediction and navigation instruments

**Depends on 02.**

> **Objective:** Add a switchable physical flight model and an honest orbital flight computer, while preserving the original intuitive flight mode as a fallback.
>
> Implement analytic Keplerian orbit propagation for passive bodies from the existing deterministic orbital data where it can be mapped consistently. For the active spacecraft, use local central-body gravity with `a = -mu*r/|r|³`, relative body velocity, a stable integrator (velocity Verlet, leapfrog or equivalent) at bounded steps, and an explicit sphere-of-influence / dominant-attractor transition policy. Use patched conics for local navigation, not expensive full-galaxy N-body integration. Preserve legacy galaxy star spacing and rendering scales via the documented unit adapter. Handle moving, spinning target bodies without teleporting the ship.
>
> Create a minimal orbital display: current central body, altitude, inertial speed vs surface-relative speed, inclination, apoapsis, periapsis, eccentricity, estimated orbital period, burn vector, estimated `Δv`, next encounter and projected track. Clearly label escape/hyperbolic trajectories and degenerate ground cases. Allow player to turn **Physical Flight ON/OFF**, with original controls still operational when off. When switching midflight, preserve position and display a clear state conversion; never arbitrarily reset to orbit. Retain G alignment and interstellar warp with a handoff boundary separate from local physical dynamics.
>
> **Acceptance:** A circular orbit stays within a specified small relative altitude tolerance over 10 orbital periods; an elliptical orbit conserves specific orbital energy approximately with engines off; a retrograde tangential burn lowers periapsis; prograde raises it in the relevant test case; 1×/10×/100× are stable; transition from warp to local space has no NaN or huge acceleration; landable terrain collision and camera stay intact; old flight mode still passes all baseline tests.
>
> **Be precise:** State which results are exact two-body and which are game approximations. No fake gauges or decorative trajectory lines. No mission objectives or orbital-transfer reward mechanics.

## PROMPT 04 — Propulsion, propellant, thrust vector and attitude-control engineering

**Depends on 03.**

> **Objective:** Turn the spacecraft into a measurable propulsion system without making existing players unable to fly.
>
> Add a propulsion model with dry mass, tank capacity, propellant mass, maximum thrust, throttle, specific impulse `Isp`, mass flow `mdot = T/(Isp*g0)`, thrust-vector orientation, attitude torque, reaction-control fuel consumption, and engine enable/disable state. Update spacecraft mass during burns; compute available ideal `Δv = Isp*g0*ln(m0/mf)` and thrust-to-weight ratio using the active body's gravity. Distinguish main-engine thrust, RCS translation, and rotation commands. Prevent negative fuel, divide-by-zero and nonphysical instant velocity changes. Use a simple RCS approximation that exposes torque/rate limits; do not invent free infinite reaction-wheel authority.
>
> Add an engineering tab with **live throttle**, propellant %, dry/wet mass, thrust, TWR, predicted burn duration and available `Δv`. Implement a safe default preset plus one alternate engine and tank configuration for comparison, selectable freely without progression or prices. Preserve default arcade propulsion as a toggle until the physical option passes testing; never stealth-nerf the existing flying demo. Interstellar warp remains its own documented speculative system and must not consume chemical propellant unless explicitly designed later.
>
> **Acceptance:** Rocket-equation numerical fixtures, burn-time/propellant conservation, no thrust at empty tank, engine-off zero thrust, RCS fuel reduction, appropriate acceleration when mass decreases, fuel state preserved through landing/reload, and physical/arcade mode changes with no teleport. Test near vacuum, thick atmosphere, touchdown, EVA and reboarding. Existing spaceflight, star selection, coronal entry and starfield remain intact.
>
> **Do not:** Add crafting recipes, economy, currency, upgrades locked behind discoveries, or engine sound/UI polish in place of working mass-flow physics.

## PROMPT 05 — Atmosphere, aerodynamic drag, entry heating and thermal protection

**Depends on 02, 03 and 04.**

> **Objective:** Replace generalized atmospheric deceleration with an actual approximated atmospheric model in **Physical Flight** mode while retaining the working seamless landing.
>
> For bodies with gas, define altitude-dependent density with a documented piecewise/exponential atmosphere model (`rho(h) = rho0 exp(-h/H)` as the starting approximation), scale height, gravity, temperature and pressure. In vacuum, density/pressure/drag must be exactly zero. Compute dynamic pressure `q = 0.5*rho*v_rel²`, drag magnitude `D = q*Cd*A`, direction opposite **air-relative** velocity, Mach estimate when sound-speed data supports it, and a clearly labelled approximate convective-heating proxy (never mislabel an arbitrary visual orange glow as actual thermal flux). Add heat-shield capacity, temperature proxy, radiator/cooling and overheat state, with actual consequences such as degraded control or protective shutdown only in the new physics mode.
>
> Visual effects should be derived from computed q/heating and real star illumination rather than altitude alone. Maintain day/night, star eclipses, reflected moonlight, coronal warning and spacecraft lights. Handle slow descent, parachute-like low-speed cases if applicable, thick gas planets (not landable), airless moons and very high-speed entry. Prevent tunnelling through terrain via swept or bounded collision and near-surface substeps. Use the existing `groundHeight()`/`surfaceData()` collision source; never derive another conflicting ground height.
>
> **Acceptance:** In vacuum, drag/heating both zero; doubling air-relative speed roughly quadruples drag at fixed density; increasing altitude reduces density monotonically; heat responds to trajectory and drag conditions; an entry path can decelerate and land in a continuous scene; 100× time does not cause underground terrain or instant thermal explosions; oxygen-rich vs CO2 atmospheres differ in generated parameters; no change to original arcade landing tests.
>
> **Do not:** Automatically eject the ship from a stellar corona; don't break the existing actual-surface hazard handling. Avoid visually gorgeous plasma overlays that aren't driven by simulation values.

## PROMPT 06 — Better ground, planetary geology, weather and safe surface traversal

**Depends on 02 and 05.**

> **Objective:** Improve scientifically varied planetary surfaces while making terrain collision mathematically identical to terrain rendering. Correct previously observed ground flicker and underground camera risks before adding expensive visual detail.
>
> Refactor terrain access to ONE pure deterministic sampler `sampleSurface(body, bodyFixedDirection)` returning ground altitude, water level, normal approximation, roughness, material ID and biome/geology parameters. Use that same sampler for collision, camera clearance, rover wheel contacts, vegetation placement, sample instruments and rendering. Preserve previous seeds by a compatibility layer, not a world-shape reset. Fix patch overlap and stitching, LOD seam cracks, near-ground depth fighting, floating-point origin jitter and patch rebuild thrashing; add bounds-aware collision for EVA/rover/ship.
>
> Add a limited geology model: rock/ice/sediment/volcanic materials, cratered regions, plausible height-scale and slopes, bounded erosion proxy, water/ice presence, weather variables on atmospheric worlds. Use seeded fields and physically motivated correlations, not unrelated random colors each frame. Permit optional caves only if a stable collision representation can be implemented; otherwise explicitly defer caves rather than fake holes into the surface. Provide a geology debug overlay and a terrain consistency test suite.
>
> **Acceptance:** 1,000 deterministic surface samples return identical heights before/after LOD transitions and reload; rendered surface and collider agree within documented tolerance; no ground flicker or camera penetration on landing/walking/rover at 1×/100×; ocean levels do not create a walkable invisible solid ceiling; crater/slope geometry is stable after rehydration; peak geometry memory and terrain rebuild count remain bounded. Record comparative frame times on the same browser/hardware; degrade detail automatically if necessary.
>
> **Do not:** Change all terrain types at once without a feature flag. Do not render full-planet displacement meshes at maximum ground detail or store entire planetary heightmaps in memory.

## PROMPT 07 — Real scientific sensors and measurement uncertainty

**Depends on 02 and 06.**

> **Objective:** Replace purely symbolic scans with *working instruments* that read the generated physical world. Keep the original Hydrology / Biosignatures / Geology scan interface for backward compatibility, but add honest data behind it.
>
> Implement four usable instruments in the first vertical slice: (1) orbital spectrometer / reflectance proxy; (2) ground temperature, pressure and composition probe; (3) local magnetometer; (4) seismometer or ground-penetrating sensor with a simplified declared generative model. For every instrument define input ground truth, measurement units, calibration, range, sample cadence, spatial position, systematic/noise components, detection limit, confidence/uncertainty and errors (e.g. no atmosphere, out of range, low power). Seed instrument noise by body ID + instrument + sample index, not `Math.random` every render frame. Never return precise data for properties the instrument cannot actually detect.
>
> Build a small instrument console showing one live instrument, a graph/table of recent samples, confidence/uncertainty, and a raw downloadable CSV/JSON dataset. A sample must come from an instrument measurement function, not be conjured by clicking a scan completion button. Let player deploy instruments on foot or on the rover where physically accessible. Keep legacy scans and their save state unchanged.
>
> **Acceptance:** Repeated same-seed measurement sequences reproduce exactly; moving between terrain materials produces correlated readings; night/day changes temperature/solar readings where relevant; a vacuum moon gives near-zero atmospheric pressure; incorrect instrument placement returns a clear error instead of invented data; data exports match samples; low power affects sampling once the power subsystem exists; performance remains bounded at fixed sample cadence. No progression or reward systems.

## PROMPT 08 — Rover wheel dynamics, terrain grip and suspension

**Depends on 01, 06 and 07; physical environmental data required.**

> **Objective:** Make the existing six-wheel rover drive like a rover, without requiring a full commercial physics engine or replacing its current mesh/physical seat entry.
>
> Model rigid body mass, yaw inertia, center of gravity, individual wheel contact heights, normal loads, rolling resistance, surface friction by material, slope gravity, acceleration/deceleration, steering and wheel slip. Use simplified spring-damper rocker-bogie behaviour where achievable; if true rocker-bogie articulation is not modelled, explicitly label the suspension approximation. Compute contact using `sampleSurface` so geometry and physics agree. Implement a bounded maximum traversable slope, risk of loss of traction and a reversible rollover/recovery mechanism. Keep the rover grounded to the rotating/translated parent body at 100× and maintain rover position through save/load.
>
> Add concise telemetry for speed, slope degrees, wheel slip %, battery/energy use when available, roll/pitch, and traction warning. Give the player predictable W/S/A/D response with speed caps based on gravity/slope. Return to the previous kinematic drive model via a debug/assist toggle if the simulation is unstable.
>
> **Acceptance:** Idle rover does not slide indefinitely on flat high-friction ground; steep slope causes different forces than flat ground; ice yields less grip than rough rock; reverse works; wheel and body remain above ground; rover entry/dismount remains entirely physical; no instant teleports or stuck rover; 1×/10×/100× rotation stability; collision and GPU LOD remain bounded. Tests cover zero-speed turns, fast steer, terrain seams and world origin shift.
>
> **Do not:** Modify the spacecraft flight state machine or make the rover depend on missions/resources. No fake wheel RPM values unrelated to actual rover movement.

## PROMPT 09 — Electrical power, batteries, solar panels and thermal engineering

**Depends on 02, 05 and 07; integrates rover 08.**

> **Objective:** Build an actual electrical and thermal system for ship, rover, deployed probes and later outposts.
>
> Implement a small explicit DC power bus with loads in watts, generated solar power, battery energy in joules or Wh, usable capacity, state of charge, charge/discharge power limits, conversion efficiency, and prioritizable loads. Solar production must depend on star luminosity/irradiance, panel area, efficiency, angle of incidence, atmospheric losses and eclipses/occlusion. At night, solar generation should fall to zero except for physically explained alternatives. Battery charge balance must obey `E(t+dt)=clamp(E+ (Pgen-Pload)*dt,0,Emax)` with correct efficiency handling. Power shortage leads to defined brownout behavior (instrument sampling slows/stops, optional lights turn off), not silent negative energy.
>
> Add a minimal thermal network with lumped heat capacities, conductive links, radiative loss approximation, solar heating, device waste heat and radiator orientation. Make vacuum vs atmosphere different through convective cooling; avoid claiming Stefan–Boltzmann accuracy if using an approximation. Respect the fixed-step simulation clock and dormant-asset analytic updates; do not update thousands of distant batteries every frame.
>
> Add a power console with source/load breakdown, live watts, remaining battery, predicted runtime, temperatures, thermal alarms and a clean power diagram. Make safe default components available immediately—no crafting/economy yet.
>
> **Acceptance:** Energy conservation within model tolerance; battery never exceeds capacity or drops below zero; occluded solar panels generate zero solar output; exposed panels respond to orientation and star irradiance; toggling instruments changes load measurably; night lasts long enough to drain a battery under load; heat increases with power dissipation, and radiator/cooling decreases heat under suitable conditions; 100× and save/load reproduce state to tolerance. No regression to lighting or EVA.

## PROMPT 10 — Mechanical/electrical design workbench (sandbox, no economy)

**Depends on 04, 08 and 09.**

> **Objective:** Let users reconfigure the ship and rover from a parts catalog and immediately see physically meaningful consequences. This is an **engineering sandbox**, not an inventory, crafting or upgrade game.
>
> Create a data-driven component schema: stable `partId`, category, mass, bounding volume, dimensions, mount constraints, power connections, energy capacity, thrust/torque/heat/specs where relevant, and optional 3D visual representation. Implement a non-destructive workbench UI with two test vehicles and a constrained part list: engine, tank, battery, solar panel, wheel/motor, radiator, sensor, avionics, structural frame. The workbench must calculate dry/wet mass, center of mass, motor torque requirement, power balance, estimated range, thrust-to-weight, delta-v and thermal margin from actual installed parts. Provide invalid-design warnings with an explanation; don't silently clamp broken designs into fake success.
>
> Players can duplicate presets, add/remove/swap available parts, undo/redo edits, save configurations, load configurations and reset to working defaults. Apply assembled configurations to the ship/rover simulation only at an explicit safe boundary (e.g. parked/landed or simulation paused) and only after validation. No physical collision/visual change should happen until configuration passes. Keep visual mesh fallback for parts that lack geometric assets.
>
> **Acceptance:** Removing a battery reduces energy capacity; a larger tank increases wet mass and ideal delta-v subject to dry mass; heavier payload lowers TWR and changes rover acceleration; poor solar sizing causes a measured power deficit; invalid mounts are rejected; undo/redo perfectly restores component state; save/load preserves validated configurations; default ship and rover still perform all baseline interactions; editable and standalone builds match.
>
> **Do not:** Introduce prices, XP, item rarity, resource gathering, upgrade unlocks, or a massive unrestricted voxel editor in one pass. Keep the original vehicle visuals available as a fallback.

## PROMPT 11 — Flight assistance, PID controllers and engineering telemetry

**Depends on 03, 04 and 09.**

> **Objective:** Implement real control systems that make a physics-rich spacecraft manageable to fly, without taking control away from the player.
>
> Build standalone tested PID/PD controllers with explicit measured variable, setpoint, P/I/D terms, integration step, actuator saturation, anti-windup, derivative filtering, and bumpless manual-to-auto transfer. The first enabled modes should be: hold heading, hold attitude, limit descent rate, and altitude hold where valid. Add pitch/yaw/roll rate limiting, reaction-wheel/RCS torque limits, and controls that automatically disengage when impossible (e.g. no thrust, no attitude authority, zero power or unsafe saturation). Autopilot errors and commanded forces must drive the exact physical model, not move spacecraft transforms directly.
>
> Add a panel displaying setpoints, measured values, errors, thrust/RCS control signals and saturation warnings. Offer a controller-tuning view with editable P/I/D gains and response plots. Provide safe defaults and the ability to restore them. Keep manual flight, G alignment, warp transition, landing and camera working. Never call the controller at 100× with one single large step; either substep or switch to bounded analytic/hold behavior.
>
> **Acceptance:** Step response converges in a deterministic test; controller settles without unbounded integral windup; it rejects sustained disturbance reasonably; saturating thrusters do not produce infinities; manual override disengages immediately; changing setpoint does not teleport vessel; autopilot handles a moving planet's rotating frame; power loss produces an explicit fail-safe; baseline manual controls still work and remain default until validation.
>
> **Do not:** Fake autopilot by assigning position or orientation each frame without force/torque model. Do not implement a game mission planner yet.

## PROMPT 12 — Autonomous rover and drone navigation

**Depends on 06, 07, 08, 09 and 11.**

> **Objective:** Enable genuine autonomous exploration algorithms through an optional engineering console without making the astronaut/rover unusable.
>
> Add a small drone model that can take off, hover and land in supported environments using a declared propulsion/airframe model (atmospheric rotors only in dense enough air; RCS thrusters for vacuum if explicitly supported). Build reusable `src/robotics/` modules: waypoint planner (A* or equivalent on a bounded local cost grid), terrain obstacle sampling, hazard/slope cost, line-of-sight/visibility approximation, movement controller, job state machine and sensor dispatcher. Implement only three procedures at first: move to waypoint; scan a selected local area; return to origin/base. The rover uses wheel/traction dynamics, not position teleportation. The drone respects mass, power and thrust limits.
>
> Expose simple controls as a compact sequence of commands (MOVE, SCAN, WAIT, RETURN) and a live route/telemetry map. Make this a **safe sandbox language**, not arbitrary eval or JavaScript execution. Allow cancel/resume and manual takeover at any time; auto-commands have bounded iteration counts, timeouts and error states. Avoid path calculations across the full globe; generate only local regions and update the route when terrain changes. Persist command queues in a versioned format.
>
> **Acceptance:** Rover avoids a hazardous steep slope, follows a reachable path and stops at a goal; unreachable terrain returns a clear error; depleted battery pauses robot safely; exiting autopilot returns direct W/S/A/D control; 100× time doesn't teleport robots through rocks; loading a save preserves robot state and avoids duplicating completed actions; drones never hover in hard vacuum on rotor-only power. Limit CPU and memory for planner grids.
>
> **Do not:** Create mission NPCs, reward systems, an AI chatbot, cloud services, or uncontrolled background simulations of all distant robots.

## PROMPT 13 — Sampling, field lab and reproducible scientific archive

**Depends on 06, 07 and 12.**

> **Objective:** Give scientific observations persistence, provenance and repeatability without turning discoveries into progression/quests.
>
> Implement sample interaction based on actual location and reachable ground/rocks: inspect rock, take a bounded core sample, and use a rover or handheld analyser. Derive sample composition from the same deterministic geology/material field used by terrain. Store records by stable galaxy/body IDs, coordinate frame, simulated timestamp, instrument ID, calibration state, measurements, uncertainty, units, and source method. Add a field lab view that can compare samples and charts across worlds, filters by mineral/measurement, exports a CSV and JSON evidence bundle, and identifies duplicate or conflicting readings instead of silently overwriting them.
>
> Show uncertainty and detection limits; keep generated *ground truth* separate from player-measured values. If an instrument cannot identify an isotope/mineral from its simulated method, do not claim it has. Avoid exaggerated scientific accuracy: document which results are simplified simulations. Limit archive memory growth with bounded sample sizes and explicit user export; store compact measurements, not thousands of raw frame snapshots.
>
> **Acceptance:** A sample's composition remains identical after unload/reload or revisiting a distant system; two nearby rock types have different measured signatures; sampling from behind an obstruction/too far away is rejected; repeated trials vary within declared noise; CSV and JSON match displayed units/data; no reward/unlock triggers occur; old survey/discovery log remains readable; restoring a corrupted record does not crash the game.

## PROMPT 14 — Modular research outposts, structural checks and construction tools

**Depends on 06, 09, 10 and 13.**

> **Objective:** Build a small, functional, simulation-aware outpost system—not an enormous base-building game or decorative prop placement.
>
> Implement bounded modular placement on solid terrain: landing pad, foundation, solar array, battery cabinet, laboratory, thermal radiator and communication mast. Use a deterministic local frame tied to the rotating planet, slope checks, terrain collision/clearance checks, non-overlap volumes, connection sockets, and a lightweight structural/load model. Expose a construction ghost preview with valid/invalid placement reasons; build freely using a parts palette (no resources or progression). Snap structures to terrain-normal up with reasonable slope limits; persist body-fixed orientation and location so structures do not drift or float when the planet spins, or after time acceleration and save reload.
>
> Physically connect outpost modules to the `09` electrical bus; show power flow, maximum loads, battery duration, heat and inactive-device state. Lab module must only operate when powered. Include dismantle/move operations with undo and data integrity. Render nearby outposts in LOD; unload distant geometry but preserve compact data. Fixed bounding boxes and small build limits are acceptable for first release if documented.
>
> **Acceptance:** Foundation cannot be placed inside terrain, in water without appropriate platform or on an unsafe slope; solar array power depends on day/night/eclipses; lab draws measurable watts; modules follow rotating worlds through 100×; no structure floats after reload; dismantling one panel updates power appropriately; outposts on separate worlds never cross-contaminate save IDs; no FPS cliff at 20–50 nearby modules; can exit to space and return to same outpost.
>
> **Do not:** Introduce construction costs, inventory, resource mining, survival hunger, missions, or procedural cities. Keep it a standalone engineering sandbox.

## PROMPT 15 — Communication satellites, signal coverage and scientific data links

**Depends on 03, 09, 11 and 14.**

> **Objective:** Implement communications as an engineering network rather than an arbitrary instant interface.
>
> Provide orbiting relay satellites using the orbital propagator and a simple radio link-budget model: transmitter power, antenna gain, receiver sensitivity, operating frequency, slant range, free-space path loss, body obstruction, eclipse-related power limits, and declared noise assumptions. A real line-of-sight check must use actual geometry. Add a simple ground station/outpost antenna; only physically connected stations with power can transmit or receive. Define and display link states (connected / weak / blocked / unpowered), estimated data rate, end-to-end latency (distance/c where appropriate), and data-buffer capacity. Do not simulate every packet over every distant system; use event-driven summaries for dormant networks.
>
> Add a communication coverage map for the active world showing satellite orbit, ground track and rough visibility footprint. Let users place one or two sample relays through a non-game construction/simulation UI; validate their orbit; allow free design changes with no cost. Instrument data from `07`/`13` should buffer when disconnected and sync when the link is restored; no data should disappear or duplicate from switching systems.
>
> **Acceptance:** Link is blocked by an intervening planet, restored when satellite clears the horizon, weaker with increasing range, and unavailable at zero receiver/transmitter power; correct latency order-of-magnitude from propagation distance; 100× retains deterministic satellite orbit and coverage; buffers flush exactly once; saving/reloading while disconnected preserves pending data; chart/flight and standard star illumination are unaffected.
>
> **Do not:** Create multiplayer, social features, paid satellites, missions, instant FTL scientific radio links, or pretend that a blocked line of sight still has full transmission.

## PROMPT 16 — Final engineering integration, performance, packaging and scientific audit

**Depends on 00–15; run only when the individual features pass.**

> **Objective:** Validate that all implemented science/engineering subsystems coexist and that the original Starfall demo remains playable. This is a quality release, not a gameplay update.
>
> Produce a feature dependency map and interface contract table. Check scientific unit consistency, body-local/inertial frame conversions, stellar illumination, temporal determinism, save migration, and resource conservation. Identify every place that incorrectly treats visual world units as SI. Review network-free/offline behavior, browser compatibility, keyboard/pointer/mobile input, error handling and startup. Audit any feature flags: keep the safe fallback, expose a simple diagnostics toggle, and remove dead/duplicate paths only after proving they are unnecessary.
>
> Run complete tests at deterministic seeds 742 plus at least three additional seeds, multiple world types, 1/10/100×, repeated lazy hydration/eviction, 64 initial plus 2,304 catalog systems, save/load after orbit, landing, EVA, rover use, power loss, outpost building and disconnected comms. Validate the 100 larger-star-diameter minimum, body counts, real navigable star points, stable planetary rotation/day-night, moonlight and terrain collision. Run real GPU performance tests if possible; if not, clearly mark that subset NOT VERIFIED and give reproducible browser steps. Collect frame-time p50/p95, memory and mesh counts for flight/orbit/surface/outpost. Compare against Prompt 00 baseline; optimize the worst measured bottleneck rather than blindly shrinking draw distance or deleting features.
>
> Confirm no science/engineering feature created missions, XP, currencies, progression locks or quest UI. Preserve the old 3D explorer, physical ramp and rover seat interactions. Rebuild `PLAY-STARFALL.html` from source, check byte-level validation of inlined assets, and deliver a full source ZIP with docs/tests and rollback build. Fix and rerun every regression rather than simply listing the error. Produce `SCIENCE-MODEL.md` listing every equation, physical constant, simplification, model limitation and reference.
>
> **Acceptance:** All unit/integration/smoke tests PASS; no blocker/critical defects; no console errors on verified paths; offline startup works; all four major user journeys (spaceflight, landing+EVA, rover+instrument, outpost+satellite) demonstrably run; reliable save restore; no physics-related ground penetration, starfield fake points or startup failures. Explicitly separate automated results, visual review and anything still unverified.

---

## REPAIR PROMPT — Use if any stage breaks Starfall

> **Only repair the immediately preceding change.** Do not continue feature development. Starting from the last known-good version and the failed modified version, reproduce the regression with the supplied actions/console logs/test output. Make the smallest root-cause fix; explain why the fault occurred, which invariant was violated and which files change. Add a failing automated regression test before the fix, then rerun the entire existing suite plus the new test and rebuilt standalone HTML. Do not remove the feature, weaken a test, alter unrelated controls, change saved IDs or claim visual success from mock WebGL. If a correct repair is impossible within the current codebase, restore last known-good behavior behind a feature flag and clearly report what remains incomplete. Return complete replacement files, source ZIP, changed-files manifest, PASS/FAIL/NOT RUN report, and rollback instructions.

## RE-BASE PROMPT — Use before the next stage if prior updates changed APIs

> The attached project is now the newest valid Starfall baseline. Inspect actual files and update the implementation contract before applying the next numbered feature prompt. Map API changes against the original `galaxy.update`, `Starfall3D`, `flightGalaxy`, `SF.save/load`, `surfaceData`, `groundHeight`, renderer, and physical boarding semantics. Do not assume names/paths from the old prompt pack still exist. Identify compatibility risks and choose the smallest integration adapter. If a conflict would force a rewrite, stop implementing and propose a safer two-step migration. Re-run the latest project test suite and regenerate a clean baseline manifest first. Do not change gameplay or science behavior in this re-base step.

---

## Scientific references to consult during implementation

These are **background references for validating equations**, not permission to copy a full physical model without calibration. Starfall's fictional scale and simplified models must always be labeled.

- NASA Glenn Research Center — Ideal Rocket Equation: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/
- NASA Glenn Research Center — Specific Impulse: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/
- NASA Glenn Research Center — Drag Equation: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/
- JPL Solar System Dynamics — Planetary Orbits & Ephemerides: https://ssd.jpl.nasa.gov/planets/orbits.html
- NASA NAIF — SPICE and reference frames: https://naif.jpl.nasa.gov/naif/index.html

### What comes **after** this pack

Only after the engineering sandbox is stable should you write a separate **game design** prompt for missions, exploration objectives, research rewards, progression and narrative. That stage is intentionally excluded from all numbered prompts here.
