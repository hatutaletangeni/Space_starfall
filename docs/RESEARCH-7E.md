# STARFALL — Update 7E: Engineering Research & Reusable Blueprints

**Branch:** \`feature/update-7e\`  
**Baseline / rollback:** \`release/update-7d\` (the same 7D source currently on \`main\` apart from updated parity testing).  
**Purpose:** Let an explorer run repeatable, scientifically labeled, optional engineering experiments, compare quantitative outcomes, and preserve validated designs. This is an *engineering sandbox*, not a new RPG progression system.

## Impact and interface map

| Source | Change | New contract |
|---|---|---|
| \`src/physics/research7e.js\` | New, additive isolated model | \`StarfallResearch7E.{normalize,runModel,restore,Store}\`; versioned records, bounded histories |
| \`src/physics/research-ui7e.js\` | New, optional browser UI | \`StarfallResearchUI7E.open()\`, backed by \`SF\` save and \`StarfallRuntime\` |
| \`src/physics/research7e.css\` | New scoped style | Black/gold responsive modal; no scene CSS changes |
| \`index.html\` | Add **RESEARCH BENCH** inside existing Vehicle Workbench | Additive section and ordered scripts |
| \`PLAY-STARFALL.html\` | Sync offline bundle | Same scripts/styles/content |
| \`tests/research7e.test.cjs\` | New regression model checks | Node 22, standard library only |
| \`tests/standalone-parity.py\` | Replaces obsolete hard-coded 38-file test | Exact source/standalone byte-content equality |

No changes to ship flight controls, physical boarding, rover/truck interactions, terrain, orbital propagation, 2,368-star galaxy, or legacy save fields. Old saves omit \`research7e\`, and restore to an empty research library. All UI interactions are explicit; normal physics is not changed by opening or closing Research.

## Gameplay workflow

1. Open **Engineering Workbench → RESEARCH BENCH**. The Workbench closes and the optional Research panel opens.
2. Choose **Rover traction**, **Battery / solar / loads**, or **Rocket ascent**. Select current installed rover or ship definition (where relevant), test environment and parameters.
3. Click **RUN CONTROLLED TEST**. A \`TestRun\` logs source design, body, system, simulation time, test conditions, predicted values, and numerical outcomes from the already installed engineering model.
4. Browse recent runs; **COMPARE RUNS** reports side-by-side differences in numeric simulated metrics, including distance, electrical energy, speed or altitude.
5. After an actual successful simulation, click **SAVE VALIDATED BLUEPRINT**. The blueprint cites the immutable source run and configuration. A failure or suborbital rocket trajectory cannot be marked as passed simply by clicking the button.
6. Export a versioned JSON blueprint for reuse, or import one. Imported evidence remains *unverified* and cannot be applied to live vehicles until revalidated locally.
7. **APPLY COMPATIBLE DESIGN** calls the pre-existing \`StarfallRuntime.configureVehicle\`, which enforces existing safe landed/reconfiguration restrictions. It never bypasses chassis or power validation. Bench-only gearing/wheel tuning and rocket simulations are not silently applied because live component interfaces have not implemented those parameters.

The optional experiments do **not** consume live fuel, drain live batteries, alter the surface or change discoveries. These are controlled bench simulations based on installed model parameters. The real measured data of a field laboratory remains separate; measurement references in a trial are provenance links, not automatic validation of the trial.

## Types, units and fidelity

- All engineering quantities use SI: kg, m, s, N, W, J, K, m/s, radians/degrees when explicitly labeled.
- **Rover traction:** Uses existing \`StarfallRoverDynamics.sixWheels\` on a bounded synthetic grade, and extrapolates safe motion/energy over the trial interval. Gear/wheel tuning changes the effective torque, radius and bounded speed on the *bench*, not the currently driven rover. No full rigid-body tyre or suspension solver is claimed.
- **Electrical:** Uses actual \`StarfallVehicles.evaluate\`, \`StarfallPower.generation\` and \`StarfallPower.step\` at bounded substeps to compute stored energy, load shedding, generation and thermal evolution. Predictions use a simple budget equation; differences reflect load-shedding, charge limits and efficiencies. Sunlight incidence is a user-selected condition; the model's installed generator can produce non-solar electricity at night.
- **Rocket:** Uses existing \`StarfallLaunch.build\` for *ideal* budget prediction and \`StarfallRocketFlight7B.advance\` for the simulated, variable-mass reduced-order force-integrated trajectory. Actual orbital success requires a stable bound orbit and phase \`orbit\`. No full six-degree-of-freedom aerodynamics or guaranteed orbit from a high ideal delta-v is claimed.
- Simulations carry modeled context, not direct, real-world laboratory calibration/error bars. Instrument uncertainty from pre-existing journal entries can be linked by ID, but this feature does not invent precision for bench extrapolations. The display distinguishes **PREDICTED** from **SIMULATED IN GAME MODEL**.

## Persistence and limits

Stored under \`SF.load().research7e\` schema 1, independent of existing \`engineeringVehicles\`, \`engineering7A\`, \`robotics4\`, \`launch7\`, and journal keys. \`Store.restore\` tolerates absent/unrecognized research schema and filters invalid or duplicate record IDs. Limits: 50 plans, 160 runs, 45 blueprints, 12 linked observation IDs per trial, 100 KB JSON import. Stored objects contain no runtime WebGL or circular references. Import validates model, metadata and compatible vehicle schema. History is bounded; old run IDs may no longer be available for comparing after eviction, while saved blueprint snapshots remain self-contained.

\`ValidatedBlueprint\` is an auditable saved design plus completed test evidence—not a technical improvement bonus, technology unlock, or proof of physical hardware testing. Any data sourced from an external imported blueprint is explicitly marked \`imported\` and is not trusted for direct assembly application.

## Verification procedure

From project root:

\`\`\`bash
node tests/research7e.test.cjs
python tests/standalone-parity.py
# Optional: run all existing tests; do not silently skip failures:
for f in tests/*.test.cjs; do node "$f"; done
# source/standalone check without modifying files:
python tools/build-standalone.py
python tests/standalone-parity.py
\`\`\`

The build script overwrites only the generated standalone, not the editable source. Real WebGL2 visuals, frame rates, actual \`file://\` use, and close/reopen persistence require manual Chrome/Edge QA and are **NOT VERIFIED** by source/model tests.

## Rollback

Restore the \`release/update-7d\` Git branch or checkout its exact last verified 7D source commit. Existing \`research7e\` save key is additive and ignored by 7D. Do not delete older save keys as part of rollback. The complete source is on GitHub; offline standalone \`PLAY-STARFALL.html\` is in both branches. The original 7D compressed package also remains in the project file library.

## Known limitations / next reliability gate

- Research workbench models are **bench-only**. Full field test telemetry integration and adjustable live rover gear definitions are future work.
- A successful bench run is not proof the chosen design survives a real in-game expedition, high-warp time skip or graphics stress.
- The existing remote rover autonomy is a reduced-order 7D terrain model; 7E does not claim to merge every local/remote autonomy command.
- Real Chrome/Edge WebGL2 rendering/FPS, cold-restart save-load, many-player-session records and touch interactions have not been verified.
- Treat this branch as a **7E release candidate** pending automated workflow and actual graphics/gameplay smoke testing. Do not label it production-ready solely on mocked graphics/model tests.
