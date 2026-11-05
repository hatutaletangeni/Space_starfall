# STARFALL Update 8 — Specification-to-source acceptance register

> **Status date:** 2026-11-05. The authoritative specification is
> `STARFALL_UPDATE_8_MANUFACTURING_TERRAFORMING_PROMPTS.md`
> (the user's supplied Update 8 specification, including the later "(2)" copy).
> **DO NOT** read this status as proof of a complete played expedition or GPU benchmark.
> Original issue #86 remains **OPEN**, and 8I is blocked pending full 8H acceptance.
> `main` after reviewed 8H gas-packet release: `acb02dcfe32847ee84bf78da0d7d9d5b290baf2a`.
> This document belongs to a **draft** material-flow diagnostic slice and does not
> mean the draft itself has merged.

## Status key

- **CODE-BACKED:** Identified implementation and individual regression coverage exists.
- **SLICE-CI VERIFIED:** Exact-head dedicated + original release checks reported GREEN;
  it says nothing about an uninterrupted human expedition.
- **PARTIAL:** A named required player behavior, integration or safety law is absent.
- **NOT VERIFIED:** We have no complete test evidence of the specified behavior.
- **NOT STARTED:** The requested Update 8 stage has deliberately not been initiated.

Do not mark an entire stage DONE based on a helper file, green isolated test,
a mocked scene, a synthetic source-lot fixture, a shipped UI label or an automatic
CI rebuild of `PLAY-STARFALL.html`.

## 8A–8K state, existing owners and blocking acceptance

| Stage | Source-backed current slices | Actual gate still blocking complete stage acceptance |
| --- | --- | --- |
| **8A** physical inventory / one-truck ownership | Original `src/physics/material-ledger8a.js`, `physical-inventory8a.js`, original ship/truck/rover IDs and physical 8A reservations. CODE-BACKED. | One fully played original truck loading/revisit/legacy-save expedition, no duplicate after 100×, true ship load mass/center-of-mass in actual flight and sustained browser tests: NOT VERIFIED. |
| **8B** physical cargo ramp | Original `cargo-bay8b.js`, `src/flight.js` cargo controls and truck/ship browser checks. CODE-BACKED. | Whole original truck X → visible drive-on → secure → physical ship boarding/takeoff → other world unload/drive away with no clipping and center-of-mass verification: NOT VERIFIED. |
| **8C** finite composition/deposits | Original `planetary-resources8c.js` and underlying deterministic geology. CODE-BACKED. | Original populated bodies surveyed/mined through full LRU eviction, unloaded system revisit, non-ore worlds, 100× and long-save depletion: NOT VERIFIED across end-to-end. |
| **8D** drill / original truck haul | Original `mining-hauling8d.js`; real 8A truck hopper; `miningStart8D`, `miningLoad8D`, `miningAdvance8D`. CODE-BACKED. | Complete player-driven route to actual nonadjacent depot and back to landed ship, with 1×/10×/100×, battery night and saved cancel/replay: NOT VERIFIED. |
| **8E** refinery, chemistry and sites | Original `industrial-site8e.js`, `industrial-plant8e.js`, `refinery8e.js`, `src/flight.js` energy/debit. CODE-BACKED. | Real multi-machine physically wired surface refinery accepting 8H depot stock without magical connection, full chemistry/stoichiometry/cooling/waste outputs and world revisit: PARTIAL. Ship workshop input still explicitly uses original `8d:ship-main:materials`. |
| **8F** fabrication / electronics | Original `kit-recipes8f.js`, `machine-install8f.js`, `factory8f.js`; genuine finished parts and installed tool requirement. CODE-BACKED. | Actual full ore→all intermediate parts→operational motor, solar/electronics/precision controllers, no magic advanced ICs, player-visible working upgrade: NOT VERIFIED as one continuous mission. |
| **8G** rockets, vehicle / habitat assembly | Original `vehicle-assembly-contract8g.js`, `rocket-assembly8g.js` or actual replacement names, `src/flight.js` assembly and original 7B solver. CODE-BACKED for installed slices. | Assemble all certified rocket parts and propellant in one expedition, visible physical staging, launch under the original actual solver, operate on other world, no free duplicate assets: NOT VERIFIED as whole path. |
| **8H** powered logistics / manually flown cargo | `logistics-durable8h.js`, `logistics-pickup8h.js`, `logistics-route8h.js`, `conveyor-power-port8h.js`, `conveyor-native-bridge8h.js`, `conveyor-packets8h.js`, `pressure-pipe-power-port8h.js`, `pressure-gas-packets8h.js`, `logistics-offworld-manifest8h.js`. PRs #110, #111, #112, #113: each merged only after their exact-head reported original regression gates GREEN. CODE-BACKED and SLICE-CI VERIFIED. | **ISSUE #86 OPEN.** Needs actual 8D deposit→driven truck→8E smelter→8F machine shop→part→8G rocket→real manually flown 8H offworld delivery via physically valid, durable original 8A custody; no graph teleport. Also powered remote/unloaded factory clock, 100× invariance, night, genuine 8A leak/vent/waste ledger, lossy recycling, player-used full route, old saves and actual hardware GPU FPS. NEW draft Engineer flow audit only reports authoritative paths; does NOT pretend to connect stock. |
| **8I** closed-loop local habitats | Prior T09 habitation code may exist, **but Update 8I as specified is NOT STARTED**. | Water reclamation, CO₂ scrubber, real greenhouse light/nutrients/plant growth, pressurized local airlock/gas/water balance, supply logistics, solar/outage, save/revisit, environmental evidence. Do not start until 8H acceptance. |
| **8J** planetary terraforming | **NOT STARTED.** | Actual enormous `4πR² ΔP/g` planetary gas mass budget, finite atmosphere reservoir and emissions, planet-scale energy/climate/escape losses, native-life protection, time-delay, no instant green planet, persistent composition/visual/sensor deltas. |
| **8K** full expedition and science integrity | **NOT STARTED.** | Actual complete uninterrupted no-cheat industrial + habitat + tiny terraforming intervention on two worlds, original single truck left-behind case, manufactured second truck, legacy saved game, real WebGL2 GPU and manual frame-time benchmarking. |

## Current real custody chain (NOT an automatic graph)

1. Survey a finite original 8C deposit; park and drill with ORIGINAL 8D truck. A real `mine:` lot appears only after energy/time and geology depletion.
2. Original truck is **physically driven** near a genuinely manufactured 8E depot. An 8H order may reserve, unload or pick up physical 8A lots, subject to genuine body-local proximity, battery, volume and manifest capacity.
3. A physically installed 180 kg 8E drive can have an original 250 W T02 load commissioned by EVA, then **wired** to an existing original 48 V source. 8H dry packets reserve/move lots through its own finite original dry tray at measured powered time.
4. A genuinely manufactured 320 kg, 8 MPa rated 8E pressure pipe has an EMPTY physical 80 L/25 kg hold-up, a real commissioned and **wired** original T02 420 W load; a matching-gas, real rated 8A vessel can supply one bounded genuine compressed gas packet. The original native T02 charge includes bounded approximate pressure compression work before the 8A pipe hop. No free gas, battery, motor or wire.
5. **CRITICAL PHYSICAL HANDOFF:** Surface depots/pipe tanks do NOT automatically inject the ship's smelter or factory. Walk to and pick up depot stock with the real original truck; **drive** to the landed ship; use the original `miningLoad8D` paid hoist to place source lots into `8d:ship-main:materials`, which 8E and 8F currently consume. Never invent an `depot → ship` edge.
6. Original 8E/8F transformations require actual available stock, installed machine/tooling, power and simulated time; parts need real 8G assembly receipts.
7. Original offworld 8H ship cargo uses reserved 8A hold lots; real manual departure, landing at another existing body, EVA near paid destination depot and finite energy for unload. An original ship, not a UI route animation, crosses the distance.

## Highest-priority work after current read-only Engineer flow audit

**8H-H1:** Prove an **uninterrupted real browser industrial user scenario** with original-source stock, true truck controls and physical loading into ship hold → 8E refinery → 8F factory → paid 8G rocket parts → actual manual ship voyage. No special fixture manufacturing gas by `importLot` counts as evidence of this full mission.

**8H-H2:** Connect certified 8E surface processing machines to **actual original 8A material input/output ports** with physical 8H transfer couplers, energy from original T02, thermal and waste (without bypassing the ship workshop as a fallback). This is currently the biggest *productive-industry* gap.

**8H-H3:** Generalize 8H real powered processing beyond local active-world ticks to unloaded distant systems with safe deterministic bounded event progress, original grid battery/night/eclipses and 1×/10×/100× parity. Current gas and dry models deliberately HOLD at long unobserved clock gaps; never misreport them as remote production.

**8H-H4:** Add finite **gas leakage, pressure damage, relief/vent receipts** with explicit original 8A lost/source atmospheric mass authority. Avoid deleting gas without a receipt or magically returning all waste at 100% recovery.

**8H-H5:** Lossy recycling from source-owned scrap/waste, manifest/accounting export, endurance tests and complete manual gameplay acceptance before closing issue #86 or starting 8I.

## Proof discipline / operator commands

A named test file is evidence only after its exact command and exit status are recorded against the actual commit. Current safety commands for work on 8H include:

```bash
node --test tests/industry-flow-inspector8h.test.cjs
node --test tests/conveyor-real-placement8h.test.cjs
node --test tests/pressure-gas-packets8h.test.cjs
node --test tests/logistics-offworld-manifest8h.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/industry-flow-inspector8h-browser.py
```

Browser `file://` and original WebGL2 smoke tests are automated with software
Chromium where available. They are **not** evidence of real consumer-GPU
performance, full industrial manual expedition or visual QA. Report actual
command/execution results and the immutable commit SHA in the PR and issue #86.

**Backup:** the last green merged main remains safe until each new feature
passes all exact-head original CI gates; draft branches are NEVER claimed to
be released. Existing old save records are not deleted or silently rewritten.
