# STARFALL Update 8I — original 48 V source-paid industrial solar and battery

**Status: tested installation slice on PR #134; NOT a complete 8A–8J or 8K acceptance.**

## Why this path exists

Fresh Industrial expeditions correctly prohibit free `outpost5.Store.add('solar')` and `Store.add('battery')`. In contrast, Update 5 legacy expeditions retain their original 4,000 W solar array and 72 MJ battery behavior. Update 8I adds a separate, physical, fully debited way to build **smaller manufactured** T02 devices from the original 8F factory instead of granting the whole older installation for free.

## Actual source contracts

The installation transaction is implemented by `src/physics/t02-paid-install8i.js`, with the original flight, outpost and power owners in `src/flight.js`, `src/physics/outposts.js`, and `src/physics/power-ledger-t02.js`.

- A **400 W solar module** needs exactly **8.8 kg of source-paid `solar_module`**, manufactured with the existing 8F module-laminator BOM. The panel area is 2.3 m², efficiency 24%, maximum rated generation 400 W; actual flux, night, weather, eclipses and condition still limit the T02 output. One completed installation pays **250 kJ** and **300 simulated seconds**.
- One **48 V battery pack** needs **15.6 kg (eight 1.95 kg `battery_cell` batches)** from the original 8F cell-assembly BOM. Capacity is **9.6 MJ**, maximum charge **1 kW**, maximum discharge **1.8 kW**. Initially it contains **0 J**, so it must subsequently charge from connected real T02 generation. Installation pays **450 kJ** and **600 simulated seconds**.
- Every source lot must belong to the original physical ship materials hold, have grade at least 0.98, and trace its `process:manufacture8f:<N>` provenance to exactly one committed `factory8f.receipts` and `transformations8e.operations` record for the correct recipe. The native material-ledger schema does **not** contain a `bodyId` on each lot, so world custody is derived from the real landed ship and existing factory receipt.
- Real 8A reservations, storage mass and volume, exact operation IDs, unique manufacturing receipts and ship energy balances are checked before mutation. Only the installed part mass leaves the ship lot; any unused mass and proportional volume stay in the hold. The native `outpost5` device then owns the transferred installed mass.
- An installation can be started but is not awarded until the original simulation clock has advanced for its required duration. Its single active job is saved. At completion, proximity, ship power, original parts, capacity, and finished time are rechecked, then 8A stock, original T02 outpost and ship battery are persisted in one save. Failure restores the previous runtime state.
- Reopening an Industrial save verifies the original committed 8A installation receipt against the native T02 device. A forged or unpaid solar/battery item is disabled and contributes no generation or stored energy. Old legacy devices keep their historical ratings.

## How to use it in the game

1. Create the necessary `solar_module` and/or `battery_cell` items in the **8F Material Fabrication** section; these need the existing actual raw-material inputs, station tools and paid production cycles.
2. Ensure the output lots are in the original ship materials hold. Land your powered ship. Exit on foot and walk around 40–65 surface units from the ship, at a terrain-clear site. Ship and EVA clearances are verified against real 8A structures and original Outposts modules.
3. Open **Mission → Build → Open All Build Tools**, then **8I · Build Source-Paid 48 V Solar / Battery**. Choose the part, check the eligible 8F material mass, and click **Start Paid T02 Installation**.
4. Remain on or return to the build world for commissioning. Waiting can use the original `T` time-scale control (**1× → 10× → 100×**); completion requires **300** or **600** genuine simulated seconds. The original ship must remain powered with at least the completion work in its battery.
5. Open **Mission → Build → Outposts → Power**, select the genuine new T02 solar and battery structures and the original commissioned T09 habitat, and connect them using the original wiring controls. T02 permits wires up to 80 surface units on the same body.
6. Use the existing Outposts power diagnostics to confirm the **680 W** habitat load is actually served and the battery gains charge only from surplus production. Two panels provide at most 800 W at full sun, before original module loads and line loss; adverse flux/night may require more panels and stored energy.

## Acceptance and strict limits

- Model: `node tests/t02-paid-install8i.test.cjs`. Includes actual 8F-format provenance, reservations, duplicate IDs, mass, zero initial charge and real simulated-time constraints.
- Original power solver: `node tests/t02-paid-grid8i.test.cjs`. Verifies two rated solar panels supply the 680 W T09 load in sufficient daylight, solar surplus charges real empty storage, storage discharges at night, forged Industrial equipment is rejected, and legacy nameplates are unchanged.
- Full source/browser test: `python tests/t02-paid-install8i-browser.py`. Uses real `file://` Chromium and the actual Mission controls, genuine flight `T` 100× clock, finite ship battery debit, durable offline reload and a single original truck.
- CI: https://github.com/hatutaletangeni/Space_starfall/actions/workflows/update-8i-paid-t02-browser.yml
- The browser test explicitly seeds **controlled fixture records in the actual 8F, 8E and 8A schemas** to isolate installation. It is **not** a claim that the full mining → refining → solar/cell production → shipping → habitat installation chain has been completed unassisted. Complete 8I ECLSS, all 8J atmosphere/climate interventions, old-save adoption and consumer GPU benchmarks remain separate release gates.
