# STARFALL Update 8A — Physical custody (release candidate)

## Source impact
- `src/physics/physical-inventory8a.js`: stable ship/truck/science-rover identity and a unique-ID, idempotent surface transfer ledger.
- `src/flight.js`: old landing behavior spawned the truck whenever a different body was visited. It now consults custody before initial surface placement. Vehicle coordinates are saved in `physical8a`, not inferred from the current planet.
- `index.html` and `src/physics/physical-inventory-ui8a.js`: Engineer → Cargo & Inventory inspector.
- `tests/update8a.test.cjs`: invariant tests.

## Compatibility
Existing `flightGalaxy.truckPose` and `flightGalaxy.roverPose` migrate to initial location records if `physical8a` is missing. Old keys are kept for legacy consumers. No existing planetary IDs are changed. The migration currently tracks the single built-in truck and one local rover; existing separately deployed remote rovers, satellite assets and outposts retain their legacy owning stores and are **not yet** imported into the 8A inventory. Additional grandfathered vehicles are therefore not represented by the new inspector yet.

## Scientific and design limitations
This is a *first vertical slice*, not the full Update 8A implementation: MaterialLot, physically validated cargo dimensions, automatic cross-world salvage, spare inventory, complete asset registry reconciliation, staged reserve/commit/cancel transfers and physical loading of the truck are not yet implemented. Surface deployment from the starting ship is a temporary one-time compatibility bootstrap; Update 8B must replace it with a true ramp/hold transfer. Displayed truck mass/volume are provisional model assumptions, not geometry-audited specifications. The ship's physical mass model does not yet include loaded cargo. No production machine, ore or terraform behavior is added.

## Verification
Run `node tests/update8a.test.cjs`, existing Node suites, `python tools/build-standalone.py`, `python tests/standalone-parity.py` (if supported by the repository), then a real WebGL2 Chrome/Edge offline flight sequence. This branch has not yet passed those build and GPU gates. Do not merge as a complete 8A release until the missing requirements and regression checks are implemented and verified.

## Critical manual scenario
New save: ship + 1 truck + 1 science rover. Land A; verify truck. Drive and leave truck on A; fly to B; verify no truck/rover appears from nothing. Return A; verify original truck at saved location. Reload the page and repeat. Test old save import, 100×, truck enter → exit → walk away, ship ramp and offline standalone.

Rollback: use `main` at the branch point (prior to feature/update-8a-physical-inventory); no production save migrations are deployed by this candidate branch.


## 2026-11-03 integration follow-up

Added `src/physics/material-ledger8a.js` — explicit `MaterialLot` and finite `InventoryContainer` models, reservation/commit/cancel operations, capacity and stock validation, and stored transaction IDs. It deliberately starts with **zero freely generated resource stock**. `src/flight.js` stores it under `materials8a`, and Engineer → Cargo & Inventory displays physical vehicles, lot provenance and container usage. Vehicle saved heading is maintained across body revisits. Ship-held vehicle dry mass is included in `shipConfiguredState()` when engineering flight physics is active.

`tests/material-ledger8a.test.cjs` exercises capacity limits, idempotent commit, cancellation, stock conservation and snapshots. The dedicated GitHub workflow `Update 8A inventory, standalone and compatibility` passed on commit `5789c4d2` (run 41629618534), including both 8A Node tests, syntax checks, source/standalone compilation and strict parity. It produced a synchronized `PLAY-STARFALL.html` on this feature branch. Older general CI checks from **pre-rebuild commits** reported expected parity failures because the standalone file had not yet been regenerated; do not confuse those with successful post-build parity.

**Still NOT VERIFIED:** full legacy asset reconciliation; actual GPU planet-A→planet-B→planet-A truck state, actual browser reload; 100× multi-body traversal; physical ramps/winch loading, geometry/cargo volume, starter manifest tooling, fully staged transfer reservations for all vehicle assets. The material ledger is not yet connected to the refinery, machine shop or planet geology. Keep PR #32 in DRAFT and leave `main` unchanged.
