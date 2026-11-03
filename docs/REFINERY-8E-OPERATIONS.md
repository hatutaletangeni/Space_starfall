# STARFALL 8E — Ship workshop refinery (Engineering release candidate)

**Branch:** `feature/update-8e-refinery-operational`
**Ancestor:** `feature/update-8e-8k-industry-models-help`; not merged to `main`.
**Status:** Live editable-source feature, not complete 8E manufacturing/chemical industry release.

## Where and how to play
1. Land the existing expedition spacecraft on a solid body. Mine a finite 8C deposit using the already available truck, then physically haul lots to the ship with 8D. There is NO starting source of unlimited ore.
2. Exit the truck and approach the parked spacecraft with your EVA explorer, or walk into the existing ship fabrication workshop.
3. Go to **Engineer → REFINERY · SHIP FABRICATION**. Select one of four physically limited operations. The console checks the currently existing `8d:ship-main:materials` hold and displays ore assay grade, recovered product, tailings, machine power and time.
4. Click **START PROCESSING**. The factory consumes finite ship battery joules incrementally, tracks elapsed simulation seconds, and persists progress using `SF.save`. It pauses if the ship is unpowered, departs the target body, or the workshop becomes unavailable. Cancel does not refund consumed electricity. Completion consumes actual input material, creates separate output and residue lots, and writes an idempotent receipt.
5. Inspect real lots under **Engineer → Cargo & Inventory**. Product batches belong to the same physical ship hold; no remote transfer or second inventory database exists.

The initial processing skid is an *existing compact unit included in the previously installed ship fabrication module's modeled structural mass*, not an additional free truck or outpost. It provides mechanical concentration and heated water recovery only. No new structure is teleported onto the surface.

## Actual operational recipes (1 batch)
| Process | Source | Target concentrate grade | Recovery of target constituent | Work |
| --- | --- | --- | --- | --- |
| Iron separation | 20 kg `iron_ore` | 60% | 80% | 1.8 kW × 100 s = 180 kJ |
| Copper separation | 20 kg `copper_ore` | 25% | 70% | 2.2 kW × 160 s = 352 kJ |
| Silica separation | 20 kg `silica` | 95% | 82% | 1.5 kW × 130 s = 195 kJ |
| Heated ice recovery | 10 kg `water_ice` | 100% recovered water | 80% | 3.5 kW × 240 s = 840 kJ |

For a source assay grade `g`, target product grade `G` and recovery `η`:
`product_kg = batch_kg × g × η / G`; `residue_kg = batch_kg - product_kg`.
Output residue grade = (input target mass − product target mass)/residue mass. The sum of product and residue masses equals input mass to floating-point tolerance. Grades are inherited from 8C deposit-lot provenance and cannot be fabricated with empty or unassayed stocks. These are **educational separation/thermal extraction approximations**, not a mineral processing flowsheet or externally validated kinetics. Station capacity, lifetime, thermal state and reagent mass need further work.

## Interfaces and saved records
- `src/physics/refinery8e.js`: pure `StarfallRefinery8E.create/quote/start/step/commit/cancel`.
- `src/physics/transformation8e.js`: commit on cloned 8A snapshots; supports pinned source `lotId` and product grades, same-bin post-debit capacity.
- `src/flight.js`: authoritative `materials8a` and ship `vehicleStore` energy owner; `refinery8e` and `transformations8e` schema-1 records preserved in a single `saveFlight` call.
- `src/physics/refinery-ui8e.js`: UI21 Engineer panel using the actual runtime, plus unmodified existing inventory and Field Manual.
- `src/physics/integration.js`: validates backup/import field shapes, does not silently clear invalid data.

## Remaining REQUIRED work for complete Update 8E
- Physical surface processing stations and commissioned crusher, furnace/smelter, casting machine, electrolyzer, gas separation and compressors, chemical reactor, pressure/temperature-rated tanks and fluid pipes.
- Actual balanced chemical reaction paths for iron oxides + reductants, bauxite/alumina electrolysis, CO₂ methanation, water splitting and semiconductor-grade silicon; real reagent availability and effluent composition. The older `transformation8e.js` illustrative generic recipes are NOT validated stoichiometric models and are not exposed in this console.
- Real device-level electrical bus prioritization, thermal/maintenance failures, finite port connection, vessel pressure hazard checks, independent off-world process clock and full physical machine rendering.
- End-to-end GPU/browser test, old save import, unattended 1×/10×/100× reload, synchronized standalone build and full no-cheat 8K expedition.

## Verification
- Executed JavaScript syntax construction for editable flight, refinery model, conversion model, UI, save validator.
- Executed isolated full material-ledger transaction for iron: 20 kg feed → 9.3333333333 kg 60%-grade concentrate and 10.6666666667 kg tailings; 180,000 J charged; 20 kg outputs; same receipt replay not duplicated.
- Executed all four process recipes with full mass/grade/energy/receipt checks and cancellation/resume guards using V8 model test harness; see `tests/refinery8e.test.cjs`.
- **NOT VERIFIED**: unmodified full Chromium/WebGL2 gameplay, production/surface meshes, source vs standalone HTML, GPU FPS, complete save reload under browser and existing all-suite regression.

Do not merge as complete 8E until those gates pass. Run `node tests/refinery8e.test.cjs`, `node tests/industry-models.test.cjs`, existing `node tests/*.test.cjs` individually, `python tools/build-standalone.py`, and `python tests/standalone-parity.py` before considering acceptance.
