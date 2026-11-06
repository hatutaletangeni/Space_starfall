# 8E-R S0 Audit and release baseline (2026-11-06)

**Branch:** `feature/ship-interior-performance-refactor`. **Immutable base ref:** main commit `4edc5775b623c8bfcdea2a5899ceddd26688a195`. **Release:** development only; main untouched by this branch. Note that other independent automations may change main while this branch is in progress.

## Source-of-truth ownership
| State | Owner / persisted field | Observed risk |
|---|---|---|
| Ship position / flight / landed state | `src/flight.js`, `flightGalaxy` | World/ship basis changed across modes; arrival and walk-in transitions lack explicit state machine |
| Truck identity / custody / battery | `physical-inventory8a.js` `physical8a`, mirrored runtime `truckBatteryJ` & `flightGalaxy.truckPose` | Saved truck pose may represent previous galaxy, while “new galaxy” changes the seed without resetting saved inventory |
| Truck tie-downs / ramp | `cargo-bay8b.js`, `truck-custody8b.js`, `flightGalaxy.shipCargo8b` | `secured` mode may accompany a legacy truck on another world; state reconciled rather than duplicated |
| Ore, hopper, ship hold | `material-ledger8a.js` `materials8a` | Must never credit material from UI |
| Deposits / depletion | `planetary-resources8c.js`, `resources8c` | Source site ID must match physical truck position |
| Mining power / cycles | `mining-hauling8d.js`, `mining8d`, electrical truck battery | Timed cycle requires on-world parked driver, survey evidence and energy |
| Interior walk/colliders | `ship-walk8e.js`, `flightGalaxy.shipWalk8e` | One coarse deck; not yet full doorway, hatch/portal collision graph |
| Ship modules | `modular-ship8e.js`, `modularShip8e` | Level and room geometry have incompatible deck-height assumptions; receipt validation needs source-ledger verification |
| Power/thermal | `vehicles.js`, `power.js`, vehicle states & equipment T15 | Never copy ship battery to new module store |
| ECLSS | `life-support8e.js`, `lifeSupport8e` | Simplified model, not full cabin environmental system |
| Rendering | `engine.js` static ship and interior meshes | Whole-interior merged mesh lacks portal culling, per-room visibility data |
| Desktop/mobile UI | `index.html`, `src/mobile/landscape.*`, `truck-cockpit.*` | Mobile and desktop standalone need separate reproducible bundle parity |

## Source branch review (GitHub PR status at audit)
- PR #32 (`feature/update-8a-physical-inventory`): merged.
- PR #33 (`feature/update-8b-physical-cargo`): open, not merged.
- PR #34 (`feature/update-8c-finite-geology`): open, not merged.
- PR #35 (`feature/update-8e-modular-ship`): open, not merged.
- PR #36 (`feature/update-8d-mining-hauling`): open, not merged.
- The baseline `main` source nevertheless contains 8A/8B/8C/8D/8E module files. Code presence is not proof that these draft PR acceptance gates passed; do not auto-merge the stacked branches.

## Verified from source, NOT runtime validated
- `StarfallPhysical8A.create(null)` initializes the single original truck aboard the ship. The starter slot is not canonically named `starboard-hangar` yet.
- `StarfallCargo8B.snapshot(null)` starts `secured`.
- `#new-galaxy` previously only updated the URL seed; `SF.load()` still read prior `starfall_save` and therefore prior-world truck custody.
- Legacy cargo saves and existing mining / logistical contracts must be preserved. Do not automatically rescue stranded assets on desktop load.

## Requested S1 dependency map
| File | Planned change | Migration | Check |
|---|---|---|---|
| `src/starfall-core.js` | Atomic backup-first fresh-expedition API | New games only; no existing save mutation until confirmed | Node localStorage fixture |
| `src/flight.js` | Connect “new galaxy” button to confirmed fresh-expedition flow | Existing loads unchanged | Source and browser state test |
| `src/physics/physical-inventory8a.js` | Canonical starter hangar slot | New saves only | 8A/cargo unit tests |
| `tests/new-expedition8er.test.cjs` | New game, backup, denied storage, legacy preservation | None | Node |
| `PLAY-STARFALL*.html` | Rebuild after tests | None | Standalone parity |

## S0 performance baseline
CPU/GPU hardware profiling and before screenshots are **NOT VERIFIED** in this connector environment. No FPS, p95/p99, draw call, memory or visual quality claims are made. Full S0 baseline profiling remains open before performance/graphics refactoring.

## Source fidelity and release gates
- Engineering dimensions in cargo bay are gameplay scene units, not certified SI truck/ramp geometry.
- No full manual planet A → depot → planet B or full room navigation acceptance yet.
- Existing tests must remain intact. See user-supplied `STARFALL_MODULAR_INTERIOR_PERFORMANCE_MASTER_PROMPT.md` for S0–S9 acceptance order.
- S1 release decision remains **REPAIR / not merge** until source, offline parity and browser tests pass.
