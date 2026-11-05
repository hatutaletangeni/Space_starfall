# STARFALL Update 8H — Real paid physical chemical gas flanges

**Release status:** Stacked draft PR. Part of Update 8H only, not verified
as a full no-cheat mission. Issue #86 must remain OPEN.

## Fixed physical shortcut

Before this slice, original `src/flight.js` chemical process equipment
looked up the first matching original 8E gas vessel within **75 scene
units** of a surface plant. It could then run an original 8A batch job
without physically connecting that pressure vessel to the chemical plant.
The source was finite and energy was real, but the gas connection was
imaginary. It was not compliant with the requested industrial logistics.

Now all **gaseous input AND output** ports must be connected through
**the original paid, manufactured and installed 320 kg / 8 MPa pressure
line**. A qualifying route is:

```
ACTUAL 8E CHEMICAL STATION
  ← ≤12 scene units, geometrically checked →
ACTUAL 8F-MADE + 8E-PAID PRESSURE PIPE, 320 kg, 8 MPa, 80 L / 25 kg
  ← ≤12 scene units, geometrically checked →
ACTUAL CERTIFIED 8E GAS VESSEL (proper species, ≥5 MPa)
```

The original physical 8A installation receipts must prove manufacture and
kit consumption for **all three** pieces, on the **same actual surface**.
Every pipe must have its original `pressure_pipeline_pump` 420 W port,
not just a visual icon. Real T02 must have a fresh source-owned report
(max 10 simulated seconds old), served ≥420 W to that specific port and
confirmed a real original 48 V battery/solar/generator source reachable
through a **physically saved original wire**. No second power ledger exists.

At 100×, an already running certified gas reaction uses the native
Update 8H bounded **≤10 s** source-paid T02 pulses. An idle plant starting
at 100× can also use an existing original T02 baseline midpoint report only
when its **original stored end-of-interval power clock** equals the real
world clock and the last billed interval is ≤120 simulated seconds. Removing
that clock, making the report stale, disconnecting the battery, or making
the original pump unserved all fail closed. This reuses previously charged
original source Joules, not a second free power supply.

One gas stream uses a distinct installed pipe, preventing two chemical
species from magically sharing a pump channel. An operator must place and
wire a separate physical path for each gas feed and product. Solid material
still enters/leaves via the original ship cargo hold.

## Save and interruption

- When a real chemical batch starts, pin the gas vessel ID, pipe ID and
  native 420 W load ID in its already existing `industrialJob8e.active`
  original durable save record.
- Before **every original chemical electric work step**, repeat the
  original installed-kit, same-world, two-flange, current T02 and wire
  checks, and compare to the pinned live route. If a pipeline is cut,
  damaged, disabled, depowered, moved to another world or swapped,
  **the batch HOLDS**: it cannot spend further chemical work or consume
  gas behind the broken connection.
- Legacy chemical jobs without source-pinned routes fail closed for
  gaseous reactions until repaired/restarted, not silently remapped.
- Uses existing original ship power for chemical reaction energy;
  the T02 420 W source is separately debited by the existing original
  outpost grid. This module itself does not debit twice or grant gas.

## Boundary and honest unimplemented behavior

The original 8E atom-balanced batch owner still creates and consumes its
product/reactant lots in **original 8A vessel containers** only on
completed, source-owned, paid chemistry cycles. This slice proves that the
station-to-pipe-to-vessel geometry and original native electric supply
exist and stay intact during those cycles. **It does not yet simulate
transient gas mass within the pump line for these specific chemical batches,
or pressure-driven throughput.** Separate original 8H vessel-to-vessel
pressure gas packets already use actual 80 L pipe holdup and timed movement.
Port these staged hops into 8E station chemistry before full 8H
industrial-fluid acceptance. The original plant still depends on physical
ship-held solid feedstock; remote depots do not magically feed the smelter.

No synthetic browser fixtures, no new starter equipment, no extra truck,
no invented tank, no bypass to 8I, no 8K completion claim.

## Tests

```bash
node --test tests/industrial-gas-manifold8h.test.cjs
node --test tests/industrial-chemistry8e.test.cjs
node --test tests/pressure-gas-packets8h.test.cjs
node --test tests/active-native-substeps8h.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/industrial-gas-manifold8h-browser.py
```

Record actual exit results for exact HEAD and all existing engineering,
Chromium browser, truck/ship, save and gas tests in PR Actions. Headless
software WebGL2 does not prove real GPU FPS or a complete human expedition.
Keep original rollback commit; do not merge stacked draft before its parent
PR passes full exact-head release gates.
