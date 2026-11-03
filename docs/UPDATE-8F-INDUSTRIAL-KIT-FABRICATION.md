# STARFALL Update 8F — manufacture actual installation kits

**Status: 8F progression extension / feature branch, not a finished no-cheat industrial economy.**

The pre-existing ship fabrication workshop now offers a *kit fixture*: this tool assembles finite **certified, already manufactured parts** into a packaged industrial installation kit. It is not a free high-temperature smelter, source of silicon chips, or refinery.

## Actual gameplay
1. Mine and haul stock in the 8C/8D system; refine and source additional chemically identified metals and advanced parts as the production chain permits.
2. Land the ship; open **Engineer → Material Fabrication & Machine Tools**.
3. Select a recipe beginning `machine_kit_`, `plant_kit_`, or `vessel_kit_` in the existing parts selector. 22 designs have mass-conserving, version-1 bills of materials, output package dimensions, fixed power/time budgets, and precise requirements for steel, copper, aluminum, glass, refractory components, insulation, motors and control boards.
4. Start a job only when *each* actual certified part lot is present in the ship's authoritative 8A inventory, unreserved. The live ship battery supplies joules over simulation time. Missing inputs cause a hard failure, not a credit deduction or instant purchase.
5. The completed lot has the required kit `materialId`, exact installed asset mass, specified physical package `volumeM3`, a manufacturing receipt, and appropriate provenance. Capacity is checked after source stock is debited; the end-to-end material/asset mass remains conserved.
6. Use **Engineer → Physical Machine Installation** or **Physical Refinery Placement** to turn the kit into exactly one persistent installed 8A asset. Installation consumes the kit and **additional power**. Duplicate installation receipts cannot award a second machine or tank.

## Verification evidence
- `tests/industrial-kit-factory8f.test.cjs` verifies all 22 kit specifications match the target assets; six finite certified components produce one properly sized 160 kg oxygen-vessel kit; it can then be installed exactly once without mass gain; production and installation debits, output volume, storage overflow, and missing inputs are checked.
- Existing 8E/8F tests and bundle builder remain CI gates. Offline browser and GPU/performance tests still require an actual player test.
- For standalone, the CI workflow builds and publishes `PLAY-STARFALL.html` from editable source with all new scripts embedded.

## Unfinished progression
There is **no assertion** that the player can obtain every certified component from generic raw ore yet. Some metal chemistry, carbon recovery, precision motor/electronic/semiconductor production, realistic high-temperature energy, and industrial thermal/safety equipment remain gated. The 8F build fixture supplies strictly **finite and explicitly test-only** fabricated components to exercise assembly; normal game stock is never modified by the test fixture.

The next major milestone is geological mineral identification and actual reagent production from surveyed ore, followed by complete tested component→kit→machine→vehicle/habitat installation, rather than pretending all materials already exist.
