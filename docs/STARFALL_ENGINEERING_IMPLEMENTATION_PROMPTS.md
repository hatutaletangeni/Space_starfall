# STARFALL — Science & Engineering Implementation Prompts

**Target baseline:** `STARFALL-NAVIGABLE-STARS.zip` (the current working game).  
**Scope:** Build science and engineering **systems first**, without campaigns, quests, progression, currencies, mission rewards, survival grind, or story modes.  
**Use:** Start a new development conversation with the baseline ZIP and paste **Prompt 00**, then **one** numbered prompt at a time. Run its acceptance tests before proceeding. Do not ask the coding assistant to execute the entire document in one pass.

---

## 00 — MASTER SAFETY CONTRACT (paste before EVERY implementation prompt)

You are modifying the existing STARFALL game, **not rebuilding it**. Treat the supplied working files as the single source of truth. Before coding, inspect the entire relevant code path and establish a baseline. Do not assume symbols, APIs, controls, or layouts exist without locating them in the actual files. This is a browser-based offline WebGL2 procedural galaxy game with no mandatory dependencies or network services.

**Current known files:** `index.html` (editable entry), `PLAY-STARFALL.html` (standalone bundled build), `src/starfall-core.js` (save state), `src/galaxy.js` (deterministic galaxy), `src/engine.js` (rendering/terrain/lighting), `src/flight.js` (flight/EVA/rover/control flow), `assets/explorer-lightweight.glb`, and `tests/galaxy.test.cjs`. Actual files prevail over this description.

**Preserve without regression:**
- 2,368 actual navigable stars in seed 742; sky twinkles correspond to real selectable systems, not decorative fake stars.
- Original 64 detailed systems plus lazily generated distant systems, stable IDs and seeds, star spacing >= 100 larger-star diameters, 1–20 planets per star, 0–7 moons per planet.
- Existing star chart, manual flight, warp, navigation, seamless atmospheric descent and touchdown, stable surface/terrain contact, 3D lightweight EVA avatar, walking, physical boarding via ramp, rover, mouse/keyboard controls, local lighting, star/moon illumination, eclipse/night rendering, coronal approach, time acceleration 1×/10×/100×, saves and previous discoveries.
- Camera-relative coordinates; planet-relative/local coordinates for surface attachments; culling, LOD, lazy generation, cache bounds and offline operation.
- UI language: restrained dark/near-black HUD with warm gold accents. No gratuitous panels, full-screen loading screens during landing, auto-teleports, new required libraries, or disruptive changes to controls.

**Hard rules:**
1. Create a restorable baseline backup before editing. Work on a new version folder/branch, never overwrite the user's only working build.
2. First give a concise dependency map and impact analysis: modules touched, old APIs, new APIs, serialization changes, math/units, performance risks and fallback plan.
3. One feature slice at a time: **data model → pure math/logic → automated tests → integration → renderer/UI → interaction tests → bundle**. Do not casually refactor unrelated code.
4. Prefer additive modules with namespaced exports and minimal guarded integration points. Avoid global namespace collisions; separate simulated physical parameters from gameplay scaling parameters. Define a documented unit convention (metres, seconds, kilograms, kelvin, newtons, joules, watts, etc.) and conversion layer between physics and existing render units. Never assume one render unit equals one metre unless proved.
5. Physics must use a fixed simulation timestep with capped substeps. Rendering must interpolate without changing simulation outcomes. Time acceleration must not destabilize collisions or land attachments; use analytic updates, substepping or safely reduced fidelity as appropriate. Never multiply an unstable integrator by 100.
6. Determinism: procedural data must derive from a stable galaxy/system/body seed and stable IDs, not current wall-clock time. Returning to a body must regenerate identical physical properties, deposits, probes and terrain (unless explicitly modified and saved).
7. Preserve existing saved games. Version new state with migrations, defaults, validation and safe fallback for malformed or older saves. All new objects must be serializable without circular references; do not save entire procedural meshes or runtime GL handles.
8. Keep the core flight loop playable with each new system **disabled** through a feature flag; new settings and toggles default to backward-compatible behavior unless we explicitly select otherwise. Gracefully handle no-atmosphere, zero-fuel, missing data, corrupted saves, unsupported WebGL and browser storage restrictions.
9. Avoid allocations, shader compilation, procedural world generation, `localStorage` writes, DOM rebuilds, or expensive `O(N)` scans inside every render frame. Use spatial indexes, typed arrays, pooled temporaries, throttled updates, sector queries, bounded caches, and GPU-friendly batching.
10. **Do not claim gameplay, visual or GPU tests passed unless actually run.** If no GPU browser is available, run syntax/unit/mocked integration tests and say clearly that final visual playtesting is outstanding.
11. Never delete or quietly simplify existing mechanisms to make tests pass. Never hide errors, disable validation, make failures pass by reducing assertions, or replace complex systems with fake progress bars.
12. For each update deliver: a ZIP with **all** source files; a standalone offline `PLAY-STARFALL.html` synchronized with source; a `CHANGELOG.md`; test files and exact run instructions; baseline backup; any required assets with usable licenses; a summary of files modified and test evidence. Provide clickable downloads for each actual generated file.

**Mandatory baseline and regression checklist (before AND after every change):**
- Open editable and standalone builds. No syntax/runtime/console errors. Works offline.
- For same seed, star/system/planet/moon IDs and attributes do not unexpectedly change; 1–20 planets, 0–7 moons, >=100 diameters spacing, and star selection all still work.
- Search chart, set a target, align, warp, stop warp, fly into atmosphere, make touchdown, walk, use rover, physically board ship and launch. No new enter/exit buttons.
- Day/night, moonlight, star illumination and eclipse remain plausible; nighttime surface is dark when it should be.
- At 1×, 10× and 100×, a landed ship/rover/character remains on the surface and cameras remain above terrain; no tunneling or camera clipping.
- Do not create infinite geometry caches, memory leaks, runaway GPU buffers, NaNs, broken shaders or unexplained CPU spikes; compare performance against baseline on a documented test device/seed and state actual numbers when measured.
- Old save loads successfully; save/reload preserves current location, current body, time and new supported state.
- Test desktop keyboard/mouse plus a touch interaction path where relevant; don't claim support that wasn't exercised.

**Failure handling:** If any mandatory test fails, stop, isolate the cause, repair without unrelated changes, rerun the full regression suite. If unrecoverable, revert the new slice and provide the last verified playable build. State what failed rather than representing an untested build as complete.

**Reply protocol:** State inspected files and change plan. Implement and TEST. At completion provide exact file list, new controls, formulas/assumptions, screenshots only if genuinely captured, acceptance checklist with pass/fail/not-tested, rollback route and download links. Do not stop at pseudocode or proposals: write the working files.

---

# UPDATE 2 — SPACE SCIENCE & PHYSICS

## 2A — Physical units, orbital state and deterministic time

**PROMPT:** Apply MASTER SAFETY CONTRACT 00. Create the minimal physics foundation, **without changing the current flight feel or visual orbits yet**. Inspect `galaxy.js`, `flight.js`, `engine.js`, and their assumptions. Add a clearly isolated `src/physics/` layer or equivalently small module that defines dimensional units, conversions between scene units and SI, celestial physical properties (mass, radius, gravitational parameter μ, rotation, orbit elements), and a shared deterministic simulation clock. Do not turn procedural artistic star/planet radius into realistic mass without an explicit model. Model density/mass with typed distributions and bounded, documented exceptions; include physically coherent gravity and orbital periods where physically consistent with world generation.

Use analytic two-body Kepler propagation for non-interacting star/planet/moon orbits (elliptical orbit, eccentricity, inclination, longitude of ascending node, argument of periapsis, mean anomaly at epoch). Where the existing procedural arrangement violates a physical requirement, use a compatibility mapping and report the deviation; do not silently scramble the galaxy or its IDs. Implement stable universal state-vector transforms in double precision, with handling for nearly circular/equatorial orbits. Maintain old seeded location consistency for existing saves where feasible. Keep the old orbital renderer behind a flag until parity tests pass.

**Acceptance:** deterministic state at a given time independently of frame rate; bounded energy/angular momentum error in the analytic two-body model; valid periods; finite values; same result after leave/revisit; long time-skips don't cause a landed camera to dive underground; every existing planet and moon remains selectable; baseline unchanged when flag off. Include tests for high eccentricity, zero inclination, giant stars, very small moons and extreme time warp.

## 2B — Orbital flight physics + flight computer

**PROMPT:** Apply 00 and build on a verified 2A. Implement optional Newtonian local-body flight dynamics with central gravity `a = -μ r / |r|³`, rigid-body thrust applied in the craft's orientation, mass changes due to fuel consumption, finite acceleration, safe numerical integration using a fixed timestep, and collision/landed constraints. Use approximate patched conics / sphere-of-influence transitions for travel between bodies as a deliberate optimization; avoid full N-body integration across 2,368 systems. Existing warp is a fictional travel mode and must remain explicitly separate from physical velocity, so it cannot inject impossible kinetic energies into local flight.

Add a compact flight computer showing ground-relative velocity, orbital speed, apoapsis, periapsis, inclination (if orbit bound), estimated delta-v and predicted local trajectory. Add inertial/planet-fixed flight readouts, SAS/stability assist and optional attitude hold; preserve the existing simple controls with an **Assisted / Engineering flight physics** toggle. Landing, automatic boarding, walker and rover must keep working. Never require orbital maneuvers for basic exploration until deliberately enabled by the user.

**Acceptance:** stable near-circular orbit over many periods; raising apoapsis using a prograde burn; retrograde burn lowers orbit; escape detected at nonnegative specific orbital energy; no instant velocity jump on scene changes; no NaN at r≈0 (guard collision); predicted path matches subsequent unpowered simulated motion within a documented tolerance; warp-to-local handoff remains stable; UI remains usable on mobile/small screens; performance budget not violated. Supply reproducible deterministic test scenarios and plots/logs of orbital invariants.

## 2C — Atmospheres, drag, lift and thermal entry

**PROMPT:** Apply 00 and build on 2A/2B. Add a per-body atmosphere profile for planets only where physically appropriate; vacuum moons must remain vacuum. Start with a documented approximation `ρ(h)=ρ₀ exp(-h/H)` with pressure and temperature profiles from coherent world data. Implement aerodynamic drag `F_D = 0.5 ρ v_rel² C_D A`, configurable orientation-dependent area and optional lift, rotating-atmosphere relative wind and reentry heating proxy correlated with density and speed; distinguish a gameplay approximation from high-fidelity CFD. Add heat capacity, heat flux, radiator/heat-shield effectiveness, thermal limits and a nonfatal default handling mode. Use realistic units internally and an altitude-dependent rendering effect; do not alter the existing landing camera, terrain mesh, or night lighting beyond required integration.

**Acceptance:** vacuum body yields zero atmospheric drag/heating; denser atmosphere means greater deceleration at equal speed; drag force opposes relative velocity; heating rises with speed/density; thermal systems cool when appropriate; safe descent still reaches solid contact with the same ground anchor; no sudden altitude jumps, terrain tunneling or loading screens. Test high time acceleration, near-grazing entry, retrograde rotation and very thin/dense atmosphere.

## 2D — Star/planet science profiles and a scientific observatory

**PROMPT:** Apply 00. Give each deterministic star/body a normalized physical-science profile: spectral class, approximate luminosity, effective temperature, albedo, semimajor axis, eccentricity, tilt, rotation period, atmospheric composition/pressure where relevant, surface gravity, bulk density and high-level resource/geology signatures. Distinguish measured, estimated, unknown and intentionally fictional values in the UI. Derive equilibrium temperature from star radiation and albedo under stated assumptions; greenhouse effects should be a separate explicit approximation. Day/night, eclipse and moon-reflected light must continue to derive from actual geometry. Do not fake inhabited worlds or biosignatures without a seeded model and detectable evidence.

Build an **Observatory** panel with star/planet selection, scientific readouts, optional orbit visualization and raw data export as JSON/CSV. Display sensible units and uncertainty ranges, not ungrounded precision. Lazy-generate planet detail on selection and release it using existing cache rules.

**Acceptance:** stable physical profile for identical seed/body; finite/valid physical ranges; increasing stellar distance lowers equilibrium temperature under otherwise equal settings; rotation and sun elevation agree with visual day/night; observable moon phases/eclipses agree with positions; UI does not populate or render all distant planets eagerly; baseline star clicks and chart are preserved.

---

# UPDATE 3 — ENGINEERING SYSTEMS

## 3A — Modular spacecraft and rover engineering data model

**PROMPT:** Apply 00 after verified Update 2. Introduce data-driven `VehicleDefinition` and `ComponentDefinition` schemas with stable IDs: chassis, mass, dimensions, attachment points, engine, propellant tank, battery, solar array, generator, radiator, wheels, suspension, avionics, science instruments and optional docking hardware. Include SI units, mass/inertia and power/capacity constraints; distinguish definition data, runtime state and rendering assets. The current ship and rover must load as default **presets with identical visible geometry and basic controls**. No new build UI yet, no mesh replacements unless essential. Provide validation errors for duplicate IDs, invalid units, missing connectors, impossible mass and incompatible components. Preserve old saves with a migration to default presets.

**Acceptance:** original ship and rover still fly/drive/board; vehicle mass equals dry structure + modules + current fuel; deterministic component order does not influence physics; a missing/broken module degrades safely; both online and offline builds share one vehicle specification; load and save vehicle definitions without losing current world/player state.

## 3B — Propulsion, propellant and the engineering flight readout

**PROMPT:** Apply 00 and build on 3A. Implement measured engine force, mass flow, throttle, specific impulse and fuel tanks, using `T = ṁ Isp g₀` and rocket equation `Δv = Isp g₀ ln(m₀/m_f)` as a performance estimate under stated conditions. Include propellant depletion, thrust alignment, electric-power requirements if relevant, engine thermal load and multiple engine presets. Keep a backward-compatible unlimited-fuel/assisted mode; **do not strand existing players** by turning fuel limits on automatically. Show a compact engineer's tab for thrust-to-weight ratio, mass, power, predicted burn duration and delta-v.

**Acceptance:** no thrust without available propellant except a documented alternative propulsion system; fuel never becomes negative; decreasing vehicle mass affects acceleration consistently; analytical delta-v agrees with simple ideal test within tolerance; rotation/orbit controls and warp remain functional; engine-off ship stays stable after landing; zero-fuel and malformed-save cases are safe.

## 3C — Power, batteries and thermal management

**PROMPT:** Apply 00 and build on 3A. Implement a unified, deterministic power bus with rated generation and draw in watts, energy storage in joules/Wh, charge/discharge efficiency, priority-based load shedding and a conservation check `E_next = clamp(E + (P_generation - P_load)Δt, 0, capacity)` with efficiency losses properly applied. Solar power must depend on actual star direction, flux, array orientation, eclipse and atmospheric transmission. Include battery capacity, rover traction motor draw, avionics, instrument draw, ship floodlights and radiator pump/thermal loads where applicable. Add a minimal systems display and a test bench where player may toggle subsystems. Keep existing controls functional when new power simulation flag is off.

**Acceptance:** battery never exceeds capacity or becomes negative; dark/eclipsed solar panels generate negligible energy; higher star flux yields more solar power within rated limits; turn off headlights to reduce power consumption; conservation error within documented numerical tolerance; temperature evolves without runaway; 100× simulation is consistent with equivalent elapsed time (subject to stated approximations); saved energy/temperature restore correctly.

## 3D — Vehicle design and repair workbench

**PROMPT:** Apply 00. Build an accessible **Engineering Workbench** UI that modifies the data model from 3A, not ad hoc scene meshes. Permit swapping a bounded list of compatible modules, inspecting masses, center of mass, power balance, fuel capacity, wheel torque, traction and thermal margins, then running safe preview calculations before applying changes. Do not add currency, tech unlocks, quests or crafting recipes yet. Include Save Design / Load Design / Reset to stock / Export JSON. Enforce safe engineering constraints and undo/redo or a simple rollback history. On apply, update the live vehicle only in a safe state (parked or paused) with an atomic transaction; if validation fails do not partially apply. Recompute render attachments only for changed components, and reuse meshes where possible.

**Acceptance:** swapping a battery updates energy capacity; a heavier module changes mass/handling if engineering physics enabled; invalid assembly cannot launch and shows a clear error; cancelling leaves original unchanged; multiple apply/revert cycles leak no WebGL resources; physical ship ramp, boarding, rover controls, time warp and saves remain intact.

---

# UPDATE 4 — ROBOTICS & SCIENTIFIC DISCOVERY

## 4A — Real scientific instrument readings and evidence

**PROMPT:** Apply 00. Replace the idea of instant 'scan complete' with an optional **instrument-based scientific survey**. Do not delete the existing three scan buttons or associated save rewards; preserve them as legacy/quick survey while adding an advanced science panel. Build deterministic underlying properties: mineral composition fractions, temperature/pressure, magnetism, subsurface structure, geological activity, ice/water potential and atmospheric gases, using coherent seeded distributions. Instruments must produce observations with realistic units and declared uncertainty/resolution, not random outputs disconnected from body properties. Add spectroscopy, thermometer/barometer, magnetometer, ground-penetrating radar and seismometer as separable instrument modules. Simulate sensor range, required contact/altitude, sample time, electrical power, noise and calibration (modelled, documented). Store concise observations and discovery evidence by stable body/location/instrument IDs.

**Acceptance:** same location + calibrated sensor + seed is statistically reproducible with controlled noise; different instrument types expose different parameters; no measurement can be taken outside valid operating bounds; raw data can be exported; time of day affects temperature plausibly; instruments consume power if 3C enabled; all saves and old scan actions survive; no whole-planet CPU scans per frame.

## 4B — Physical rover improvements, sensors and wheel-ground interaction

**PROMPT:** Apply 00. Add rover wheel/suspension physics appropriate for a browser game: articulated six-wheel contact approximations, rocker-bogie-inspired suspension, wheel radius, normal force, slope limit, torque, resistance, traction coefficient, slip and tip risk. Use sampled terrain heights and normals in a small bounded neighborhood, not globally simulated deformable soil. Start with a stable simplified traction model and show parameters in an optional diagnostics UI. The rover must still be boardable by physically walking to its seat; don't introduce enter/exit keys. Keep the baseline rover movement available via compatibility flag.

**Acceptance:** rover cannot drive through solid hills or below ground; wheels stay in contact across modest slopes; less gravity changes normal forces and traction; different seeded ground material alters grip; steep slope may cause slip/rollover but doesn't corrupt state; 100× time acceleration while parked does not make the rover fall through terrain; mesh/camera remain above ground; FPS benchmark and memory check supplied.

## 4C — Waypoints, autonomous rover navigation and safety

**PROMPT:** Apply 00 after 4B. Implement local terrain waypoint navigation, a bounded grid/navmesh or sampled-surface graph, slope/obstacle cost, path-following controller, obstacle replanning and energy reserve safety rules. Add autonomy states (IDLE → PLANNING → MOVING → SAMPLING → RETURNING → DOCKED / FAULT) with explicit transitions and timeouts. Plan path ahead in a time-sliced worker-like queue without assuming browser Workers are available from `file://`; provide main-thread incremental fallback. Simulate only active/local autonomous vehicles and use deterministic coarse progress or parking for distant/inactive robots. Provide stop/pause/resume and a clear emergency abort. Ensure remote control does not steal keyboard input from ship/character.

**Acceptance:** rover reaches a flat reachable waypoint, rejects unreachable steep slopes, avoids obstacle samples, reacts to depleted power, safely stops on planning failure, persists plan/state and can resume after reloading, never teleports through the terrain, and remains stable across 1×/10×/100×. Include a reproducible sample map and path-cost tests. Do not claim robust robotics autonomy when only an untested path visualizer has been implemented.

## 4D — Autonomous science scripts + scientific journal

**PROMPT:** Apply 00 after 4A–4C. Add a small visual command editor with a deliberately constrained, auditable command set: `GOTO`, `WAIT`, `SCAN`, `SAMPLE`, `IF` (sensor/property condition), `RETURN`, `DOCK`, `STOP`. Model commands as validated JSON AST; **do not eval arbitrary JavaScript, download runtime code, or permit unsafe loops**. Add execution step and travel/time budgets, pause/resume, condition evaluator, error messages, and deterministic log. A script can use only available sensors, power and rover hardware. Scientific journal records measurements, context, uncertainty, instrument, location and timestamp, and permits sorting, comparing bodies and exporting JSON/CSV. No quests, credits, story or NPCs.

**Acceptance:** invalid commands rejected with useful messages; scripts cannot hang the browser; missing sensor causes a safe fault; stopping cancels queued actions; saving/restoring state does not repeat a destructive sample action; journal entries deduplicate using IDs; compare measurements with units and uncertainty; rover and player control unaffected when editor closed.

---

# UPDATE 5 — OUTPOSTS & LONG-TERM EXPLORATION

## 5A — Persistent surface structures and placement

**PROMPT:** Apply 00 after 3C and 4A. Add a compact **outpost construction sandbox** without quests, resource grinding or unlocks. Let the player place prebuilt structures (foundation, hab/lab, battery, solar panel, storage, antenna, simple power connector) on solid accessible terrain with real ground normals and slope checks. Use a local body-fixed coordinate/rotation transform with stable planetary seed, preserve state over orbital movement/planet rotation, and only instantiate meshes near the player. Use a placement hologram or outline that indicates valid/invalid terrain and prevents collisions with rover/ship/hatch. Build/despawn objects through a bounded spatial index and incremental chunk loading.

**Acceptance:** structures do not float, sink, jitter or rotate apart from the body; placement works on both planet and moon; invalid steep/overlapping location is rejected; leave system, return and reload retains structures exactly; older save still loads; 100× rotation preserves geometry and camera safety; structures don't prevent existing ship physical boarding or rocket ascent; no global mesh generation for distant bases.

## 5B — Electrical distribution and solar outposts

**PROMPT:** Apply 00. Connect placed power components to a graph-based bus model with explicit nodes, wires, capacity, voltage approximation and loads. Simulate watt-hours/seconds consistently (with losses), priority shutdown and solar orientation. A station's actual solar panels must generate power only while illuminated by the parent system's star, considering occlusion/eclipses and weather approximations. Add a wiring view with measured voltage, current, power and battery charge; clearly state when using a simplified DC power-flow model rather than a full circuit simulator. No free unlimited power for connected devices unless compatibility mode deliberately enabled.

**Acceptance:** disconnected load draws no bus power; a connected battery powers a lab at night until depleted; incorrect wiring produces readable errors instead of NaNs; energy stays conserved within tolerance; excessive load trips protection safely; power behavior survives time acceleration, save and offscreen coarse update; no full map-wide graph traversal every frame.

## 5C — Communications and remote operations

**PROMPT:** Apply 00. Add antennas, line-of-sight radio links, communication range, receiver sensitivity, link budget approximations and optional propagation delay `t = distance/c` using converted SI distances. Use real planetary/moon/star occlusion and rotation. Introduce a simple relay node/satellite model with deterministic analytic orbit; do not run full collision physics for remote relays. Integrate remote rover commands with 4C autonomy: when communication is unavailable, the rover must continue its safe local programmed behavior instead of ignoring physics or teleporting. Provide simple signal-quality and link visualization. Keep the game entirely offline; these are simulated signals, not internet connections.

**Acceptance:** obstruction by planet breaks direct link; overhead relay can restore contact; link delay scales with distance; invalid zero/negative bandwidth is handled; no command loss is silently hidden; comms return after geometry improves; remote state persists; return to ship and save remain safe.

## 5D — Laboratories, data flow and planetary infrastructure

**PROMPT:** Apply 00. Integrate instruments, rovers, power and communications into a persistent lab that receives/stores real measurement objects, supports sample provenance, compares instrument data across locations, and exports structured records. Add a minimal inventory of samples/data capacity (not RPG loot), vehicle docking geometry and instrument maintenance state. Keep research as **scientific capability**, not an unlock tree or mission/reward system. Remote data can be summarized with explicit timestamps and quality/uncertainty. Distant outposts use coarse deterministic state updates; their existence must not keep thousands of full scenes active.

**Acceptance:** dataset survives save/load and system travel; the lab has no readings it never received; power and comms outages are represented truthfully; samples cannot be duplicated accidentally by reload; old baseline files still run; no outpost-related frame-rate collapse during interstellar flight.

---

# CROSS-CUTTING PERFORMANCE & QUALITY PROMPTS

## P1 — Performance profiler, budgets and adaptive fidelity (implement early, before 2B or 3A)

**PROMPT:** Apply 00. Add a toggleable developer profiler collecting render FPS/frame-time percentiles, update tick duration, physics step count, draw calls (instrumented safely), GPU resource/cache counts, generated star details, nearby system queries, terrain patch rebuild frequency, save sizes and JS heap estimate when supported. Avoid measuring with intrusive allocations every frame. Use deterministic stress scenarios: deep space, stellar corona, dense asteroid belt, heavily mooned system, low-altitude landing, EVA/rover, 100× time, star chart with search and a populated outpost. Capture before-and-after numbers on the same device; report where GPU/heap timing is not available. Implement bounded adaptive LOD/resolution and caps only after measuring bottlenecks; never turn visible celestial targets into fake unselectable stars as a shortcut.

**Performance gates (provisional, hardware-dependent):** no unbounded cache growth; no >50 ms recurring main-thread stalls on target midrange hardware; stable 30+ FPS at baseline quality on an identified laptop where baseline achieves it; 50% degradation vs baseline requires a clearly stated reason and user-selectable quality mode. Do not fabricate benchmark results.

## P2 — Persistent-save compatibility and automated end-to-end regression harness

**PROMPT:** Apply 00. Create a stable test fixture generator for seed 742 and two additional seeds; make an automated regression suite with Node for pure math/serialization and browser integration for controls/canvas whenever WebGL is available. Create recorded gameplay paths: orbit→warp→land→EVA→rover→hatch→takeoff, plus star-chart click, profile view, time acceleration, instrument reading, workbench design and outpost persistence as those features appear. Snapshot small, stable data structures and invariants—not pixel-perfect randomized scenes. Test migrated saves, malformed saves, lazy catalogs, star spacing and regeneration. Provide `npm test` only if a package definition truly exists or is added without mandatory dependencies; otherwise use exact `node` commands. Never silently skip a failing required test.

## P3 — Scientific correctness audit

**PROMPT:** Apply 00. Audit all implemented science/engineering calculations with a traceability table: property name, units, source equation, assumptions, fidelity class (`real law`, `simplified physical model`, `procedural approximation`, `fictional gameplay mechanic`), limits and tests. Verify dimensional consistency and compare against simple analytically solvable cases: circular orbit `v = sqrt(μ/r)`, Kepler period `T = 2π sqrt(a³/μ)`, rocket delta-v, drag force, equilibrium temperature, battery energy balance, rover power and signal propagation. Flag inconsistent star size vs generated orbital scales and explicitly decouple render scaling from physics rather than pretending they are physically exact. Add a readable `SCIENCE-MODELS.md`, not just code comments.

---

# FINAL INTEGRATION AND RELEASE PROMPT (ONLY after 2–5 have passed individually)

**PROMPT:** Apply MASTER SAFETY CONTRACT 00. Integrate the verified, separately delivered Starfall science/engineering modules. Do **not** add missions, objectives, economies, crafting gates, NPCs, procedural quests, story or progression. First inventory the files and interfaces from every update. Resolve conflicting state ownership, coordinate frames, clocks, keys and save schemas; choose a single authoritative simulation clock, body model, vehicle state and versioned persistence API. Preserve the playable Assisted profile as default and expose engineering physics/science systems as modular toggles. Verify all master regressions and cross-feature tests (power affects sensors; instruments produce evidence; rover automation obeys available power/comms; outpost solar power respects day/night; landed entities remain attached at 100×; time warp doesn't corrupt saved state; distant systems remain lazy). Run the same baseline performance scenarios. Provide a complete standalone offline HTML, editable multi-file project, all required models/assets, tests, documentation, backups and a truthful pass/fail report. If a subsystem fails, disable/revert that new subsystem without damaging the working galaxy, rendering, camera, EVA or flight systems. Stop before adding game progression. We will build gameplay once the technology stack is proven functional.

---

## Recommended execution order

1. **P2** — Testing and save safety harness.
2. **P1** — Profiling baseline and performance budgets.
3. **2A → 2B → 2C → 2D** — Scientific foundations and physics.
4. **3A → 3B → 3C → 3D** — Engineering vehicle systems.
5. **4A → 4B → 4C → 4D** — Instruments, rovers, autonomy and scientific journals.
6. **5A → 5B → 5C → 5D** — Outposts, electrical networks, communications and labs.
7. **P3**, then **Final Integration Prompt** — Scientific audit, regression and integrated release.

**Release policy:** No proceeding to the next prompt until the previous version is delivered, backed up, and its acceptance criteria have been checked. A failed integration means restore the last verified build and fix the narrow change; it never means starting a new Starfall from scratch.
