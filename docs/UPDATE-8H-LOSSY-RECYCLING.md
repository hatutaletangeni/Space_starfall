# STARFALL Update 8H — Real, lossy iron/copper tailings recovery

**Scope:** This is **one vertical slice** of Update 8H's requirement that
waste recycling must be useful but always lossy. It extends the **original
paid 8E ship refinery**, **original 8A mass ledger** and its **already installed**
low-throughput mechanical sorter; it does not create new equipment, a duplicate
resource store, a new ship, a recycler cheat, a new offworld clock or a
planetary chemistry model. The complete 8H mission is still NOT VERIFIED.

## Materials and physics

Secondary reprocessing is only available when an earlier **original 8E
`iron_sort` / `copper_sort` receipt** matches the original saved lot's exact
`process:refine8e:...` provenance and its typed material. A string beginning
with `process:` does **not** suffice; a committed source receipt must also
exist in the same original refinery owner.

Actual input comes from the **ship's original `8d:ship-main:materials`**. It
must have arrived through physical original 8D truck/ship loading or existing
legitimate migrated custody, not from clicking a recycling button.

The two fully accounted secondary operations are:

| Job ID | Input from original 8E | Mass per cycle | Product (target purity) | Fraction of residual metal recovered | Spent residue | Rate and electrical work |
| --- | --- | ---: | --- | ---: | --- | --- |
| `iron_tailings_reclaim` | 2 kg of actual `iron_tailings`, with matching original `iron_sort` receipt | 2 kg | `iron_concentrate` (modeled 60% iron-element assay) | 35% | `spent_iron_tailings` | 4,800 W × 300 s = **1.44 MJ** |
| `copper_tailings_reclaim` | 5 kg of actual `copper_tailings`, with matching original `copper_sort` receipt | 5 kg | `copper_concentrate` (modeled 25% copper-element assay) | 18% | `spent_copper_tailings` | 5,200 W × 450 s = **2.34 MJ** |

These low separation efficiencies are **deliberate reduced-order engineering
assumptions**, not mineralogical lab measurements or claims of industrial
metallurgical accuracy. No chemical reduction or fresh metal is created. Both
products and unrecovered residue are real, capacity-limited original 8A lots
with their own provenance, mass and residual ore grade. Spent residues do not
appear as a fresh recipe input, preventing silent 100% recursive recycling.

For source mass `M`, assayed recoverable target-metal mass fraction `g`,
separation recovery `f` and modeled product concentrate fraction `p`:

```
recovered_target_element_kg = M * g * f
concentrate_kg             = M * g * f / p
spent_tailings_kg          = M - concentrate_kg
remaining_element_kg       = M * g - concentrate_kg * p
spent_tailings_grade       = remaining_element_kg / spent_tailings_kg
concentrate_kg + spent_tailings_kg = M
```

All calculations require finite valid grade and existing mass. The target
element remains accounted for between concentrate and spent residue within
rounding tolerance. Original 8A output capacity is checked before consumption.
The original 8E refinery stepper draws actual battery energy incrementally
(up to 10 simulation seconds at a time) and retains paid energy after
cancellation. No operation completes without the original elapsed time and
power. Saved progress survives actual serialization and reloading in the same
original refiner state.

## Player workflow

1. Survey and actually mine 8C rock with the original truck. Physically load
   the ore into the original ship material hold using the 8D loader.
2. Land and power the ship, access **Engineer → Refinery** near the original
   fabrication module, select original `Iron ore concentration` or
   `Copper ore concentration` and complete the powered separation.
3. The source-owned 8A ledger now contains a genuine 8E
   `iron_tailings` or `copper_tailings` lot and the matching durable
   original `refine8e` receipt.
4. Select the new **8H RECYCLE** iron/copper option in the SAME original
   Engineer refinery console. The panel displays the exact input mass, actual
   projected concentrate kg, spent residue kg, joules, seconds and faults.
5. Run the real original ship workshop. Expect lower-grade spent tailings,
   not full recovery. Inspect actual original inventory and engineering receipt.

**Intentionally not claimed:** a completed no-debug multiworld expedition,
physical GPU performance data, continuous unloaded-world waste recycling,
planetary material transport without the real truck or vessel, new refinery
geometry, or 8I/8J/8K. Do not treat a synthetic source-lot in isolated Node
fixtures as proof that a player mined it.

## Verification and rollback

```bash
node --test tests/refinery8e.test.cjs
node --test tests/lossy-tailings-recycling8h.test.cjs
node --test tests/industry-crosschain8e-8f.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/lossy-tailings-recycling8h-browser.py
```

Exact commands, results and commit SHA must be recorded after Actions actually
runs. The browser is headless software WebGL2; manual hardware GPU FPS remains
**NOT VERIFIED**. This work is on a stacked **draft PR**, backed by the
previous released `main` plus the still-pending read-only Industry flow
inspector PR #114. Original previous commit is retained in Git as a rollback.
The main 8H acceptance issue #86 stays open. Do not advance to 8I.
