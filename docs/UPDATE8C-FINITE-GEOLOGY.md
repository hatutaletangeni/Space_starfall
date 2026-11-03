# STARFALL 8C — Composition-backed finite resources and geological prospecting

**Release state:** draft integration candidate. **Branch:** `feature/update-8c-finite-geology`, stacked on 8B, not on `main`.

## Source integration and data authority

- `src/physics/planetary-resources8c.js` uses existing `StarfallCompositionCW01.bodyFor` for the modeled bulk parent inventory, existing `StarfallGeologyCW03.lithology` for regional host rock, and the existing `body.id`, galaxy seed and planet-fixed local radial direction. It does not regenerate the galaxy, replace terrain collision, edit body types, or change existing CW01/CW03 caches.
- The geologic sampling grid has 48 latitude × 96 longitude cells per solid landable body. Sites are generated lazily and deterministically per on-demand cell using body ID, galaxy seed, coordinates and explicit model version 1. No world-wide arrays or expensive upfront scans.
- Potential host materials: iron-bearing ore, aluminosilicate ore, copper sulfides, titanium minerals, silica, regolith, conditional carbonaceous/sulfur feedstock, water ice/hydrated material, and trace accessory minerals. Composition gating excludes implausible classes where canonical bulk fraction is too low. A landable surface is a prerequisite: gas giants never yield a solid mineral site.
- Each site stores ID, local center, parent body, type, host lithology, modeled grade, bounded depth/radius and a finite modeled accessible gross excavation mass. These are **procedural priors**, not confirmed observed geological deposits, measured reserves, or fully validated thermodynamic phase predictions. The water-bearing class explicitly notes phase uncertainty. The modeled excavation stock is only a tiny prospectable site, not the entire planet's bulk inventory.
- `resources8c` is a distinct, small, versioned delta of survey records, extraction receipt IDs and depleted mass. It stores no copies of initial generated world resources. Model version changes must be migrated explicitly before production.

## Player UX and scientific evidence

Explore → **Geological Prospecting** is available after UI21 initializes. The player must land, exit the ship/truck and perform an EVA field spectrometer reading through the existing `StarfallRuntime.acquireFieldReading('spectrometer')` path. The 8C interpretation gives material type, grade band, high uncertainty, depth prior, model evidence and approximate size category, but **not** a magically exact reserve from one scan. It saves the interpreted survey under `resources8c`. Rescans of the same sector/instrument do not duplicate evidence.

Surveying is observational: no material stock is credited, no mines are constructed, no terrain height is modified, and no deposits are depleted by 8C UI commands. A finite `extract` API exists for future 8D integration, but it refuses calls without a committed receipt and stable destination container ID, and guards zero/negative/overdraw and transaction replay. **Full atomic coupling to an actual 8A material inventory transfer and powered 8D machine is NOT yet implemented.** Do not expose the low-level API as an industrial-mode mining command until 8D.

## Verification

Dedicated 8C GitHub workflow runs:
- Node syntax checks of original and new modules.
- `tests/update8a.test.cjs`, `tests/material-ledger8a.test.cjs`, `tests/cargo-bay8b.test.cjs`, `tests/planetary-resources8c.test.cjs`.
- `python tools/build-standalone.py` and strict `python tests/standalone-parity.py`.
- Offline build artifact export.

The dedicated test/build run 41633266698 completed **SUCCESS**, including deterministic sites/planet phase prerequisites, modeled grade, idempotent surveys, negative depletion guards, original-site stability, save/reload and transaction replay. The general Engineering CI includes extensive unrelated WebGL browser flows and may still fail on a preexisting Rocket Lab dialog assertion; this must be investigated before merge. No evidence yet of an actual keyboard-driven EVA → field scan → planet revisit → UI readback sequence or user-GPU performance.

## Acceptance scenario to manually verify

1. Seed 742, land a solid world, leave ship on foot, open Explore → Geological Prospecting, survey and note body/sector, uncertainty and grade.
2. Re-scan same spot: one evidence record, no new mined material, no replacement vehicle.
3. Exit planet, warp to another existing real system, land, survey; original world's site ID and survey must remain.
4. Return to original coordinates, reload offline standalone in Chrome/Edge, verify same site interpretation and persisted evidence with the same body ID.
5. Verify airless moon has no atmospheric feedstock, gas giant has no solid deposit, Ice body may have water-bearing deposits and hot worlds do not silently promise frozen water.
6. Test existing rover, X truck boarding, B cargo tie-downs and original crew walk-on ramp; verify 1×/10×/100× and no resource creation by scan.
7. Do not merge until 8A and 8B are independently safe and general CI gates are resolved.

**Rollback:** use `feature/update-8b-physical-cargo`. `main` is not changed.
