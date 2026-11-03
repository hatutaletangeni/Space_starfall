# STARFALL Update 8D — Powered Mining and Physical Hauling

**Release state:** DRAFT; branch `feature/update-8d-mining-hauling` stacked on `feature/update-8e-modular-ship`, not `main`.

## Directly implemented

- **Geology authority:** `src/physics/planetary-resources8c.js` creates the canonical body-fixed ore deposit and records spectrometer evidence and finite depletion. No independent 8D geology generator was added. A bore only starts when an existing survey matches the *same* stable 8C site ID that is currently below the physical truck.
- **Truck mounted drill:** initial expedition truck is equipped with a serial-numbered physical bore kit, `drill-truck-001`. It becomes visible as a bolted external drill / loading frame on the **same original truck mesh** while working. The bore is a **24-second**, **2,400 W** timed cycle: `57.6 kJ` of truck battery to excavate **20 kg** of crude ore/ice-bearing feedstock. Tool wear, capacity, energy, location, operator presence and survey evidence gate the cycle. Progress pauses when the operator leaves or the truck moves. It does not operate in orbit or on gas giants.
- **Truck hopper:** authority `StarfallMaterials8A` owns a finite `8d:truck-expedition-001:hopper` container: at most **800 kg** or **1.2 m³**. It is never initialized with free ore. Each mined batch enters as a unique lot with `materialId`, modeled `grade`, physical hopper owner, mass/volume and original exact 8C deposit ID. The first truck remains single and its original legacy cargo state remains separate.
- **Finite geology depletion:** every committed bore is checked by speculative clones of **both** the physical stock ledger and the 8C resource ledger. If either container capacity or remaining resource mass is invalid, neither physical stock nor geological depletion is committed. Once validated, they are swapped together and written in the *same* `SF.save` call. Transaction IDs are monotonic, retained and replay-safe.
- **Physical haul truck → ship:** 8D uses the existing parked truck, the **same solid-body location as the landed ship**, a real EVA operator nearby and a maximum **65-scene-unit** truck-to-ship approach. A loader consumes **1,400 W × 16 seconds = 22.4 kJ** for at most **50 kg** of an already existing selected ore lot. It reserves and commits the specific lot to a finite ship-owned hold (`9,000 kg`, `16 m³`) using 8A transfer semantics; it never mints new stock. Truck battery is charged for loading energy; if it is unavailable or the truck is moved away, transfer pauses. The same extracted mass is conserved between containers.
- **Ship mass:** the actual 8D ship hold mass is now counted by Engineering Flight; ore inside the truck hopper is counted on the ship only when the single truck is physically secured aboard. The older power/physics modules remain authoritative for thrust, fuel and electricity.
- **UI:** `Operate → 8D Drilling & Physical Haulage` displays the physically present truck, body, actual battery, surveying status, bore wear, deposit mass, operator proximity, hopper/ship usage, active cycle and a selector for a specific physical lot. Buttons are disabled unless safe.

## Exact use sequence

1. Land on a solid world and walk out; leave the truck physically using its existing **8B** vehicle cargo ramp controls.
2. At a mineral region, walk on EVA and use **Explore → Geological Prospecting** to obtain a real **4A spectrometer** reading and save an 8C interpretation.
3. Drive the unique truck into that surveyed cell, park and either remain in the cab without using drive controls or stand within **22 scene units** of the truck.
4. Open **Operate → 8D Drilling & Physical Haulage**, press **START 20 KG BORE**. Let the work cycle finish with real available battery. A new lot enters the truck hopper; that exact deposit depletes 20 kg.
5. Drive the real truck to within **65 scene units** of the landed ship on the **same body**, park, exit and stand near the truck. Select an existing ore lot and **LOAD 50 KG INTO SHIP** (automatically reduced to its actual mass if below 50 kg). A 16 s loader cycle debits battery and moves that very lot into the ship's physical cargo hold.
6. Take off. The ship carries the material hold; it is now ready for subsequent 8F manufacturing and refining. No refining, tool repair or mass-to-parts transmutation occurs in 8D.
7. Save/reload, return to the same deposit and verify depletion, source ID and lot custody are retained. Drilling the same cell never resets the original deposit.

## What is still **not** finished

The visual bore unit is a rigid mesh attached to the truck while operating: **rotating drill bit, exposed deformable terrain, rock particles, collision/load-bearing outriggers, cable/hose physics and distinct loader attachment** are not simulated. There is no persistent free-standing excavator object or unattended autonomous rig. The model records actual time, energy and wear, but full contact mechanics, drill-specific rock hardness curves, temperature dynamics and machine service have not been calibrated. The surface grid is a procedural regional approximation, not meter-resolution geologic prospecting.

The existing 8E large vessel, 8B ramp/vehicle interaction and upstream browser tests are inherited; a complete human-operated landing → ramp unloading → survey → 24-second drill → 16-second haul → planetary travel scenario must still be played through in real WebGL hardware before claiming release readiness. The project-wide Rocket Lab smoke and 8E EVA ramp boarding browser integration were not fully passing on inherited branches; update 8D should **not** be merged merely because pure-model tests pass. The prototype's massive 8E hull is not yet certified for ascent with loaded cargo.

## Testing

- `node tests/mining-hauling8d.test.cjs`: battery use and timeout, pre-survey rejection, one truck hopper, finite depletion, loader transfer, mass conservation, transaction replay, save/reload and failed capacity commit rollback.
- `python tools/build-standalone.py`, `python tests/standalone-parity.py`: synchronized offline `PLAY-STARFALL.html`, always built from editable sources.
- `python tests/mining-hauling8d-browser.py`: real Chromium file:// browser smoke verifies Operate panel, empty material stock/no free ore, single original truck, disabled out-of-range mining controls, save/reload and no external requests; **not** a completed full mining playthrough.
- The stacked 8E ship browser tests still run in the same feature workflow.

**Rollback:** return to `feature/update-8e-modular-ship`; no change to `main`.
