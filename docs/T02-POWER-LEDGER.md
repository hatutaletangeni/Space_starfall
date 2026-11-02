# STARFALL T02 — Functional Electrical Power, Wiring and Energy Ledger

**Base:** verified T01 `64fe244b74bdca91636242cb76f7b5cf923fccbb`  
**Feature branch:** `feature/t02-unified-electrical-power`  
**Status:** Engineering release candidate pending final CI and manual hardware gameplay.

## Code map and ownership

| Source | Authoritative energy state | T02 policy |
|---|---|---|
| `src/physics/outposts.js` / `outpost5.items[]` | Solar, battery, antenna, lab, habitat, sample storage and connector records | **Only writable outpost store.** `Store.power` calls `StarfallPowerLedgerT02.grid` when present. The old unmodified grid fallback remains for tests/legacy entrypoints. |
| `src/physics/power-ledger-t02.js` | **None** (pure solver/transfer/report) | Reads/writes actual items passed by the outpost store; produces derived reports, never a second battery inventory. |
| `src/physics/outposts-ui.js` | Reads `outpost5` only | Adds per-equipment diagnostics, source watt metering, a switch, and immediate recomputation. Its `powerReports` map is a transient diagnostic, not a saved energy balance. |
| `src/physics/mission-operations-ui.js` | Saved T01 cursor and events only | Continues calling **exactly the same T02 grid** through `StarfallOutpostUI.advancePowerTo` while world not visible. |
| `src/physics/vehicles.js`, `power.js` | Ship/local science rover battery states in `engineeringVehicles` | Existing per-vehicle model preserved. Generator `fuelIndependent` explicitly described as *fictional compact energy source*; finite power, existing heat simulation, no credible fuel consumption. |
| `src/physics/satellites7c.js` | Satellite `ops7c.energyJ` inside `launch7` | Original 7C solar, eclipse, bus and temperature dynamics preserved; read-only inspector maps owner data, not a second account. |
| `src/flight.js` / `flightGalaxy.truckPose` | Truck's battery Joules | Old free-energy proximity credit deleted even when shared asset registry is disabled. Draw 100% from a real connected outpost battery; 90% goes to the truck, 10% is lost. A saved 60-s simulated charge dwell limits charging-rate abuse. |
| `src/physics/assets7a.js` | Read-only asset registry projection | Existing `recordTransfer` remains an **audit entry**, not a power source or destination. |

## Bus transition contract

1. Enabled solar arrays face the correct body-fixed direction as the world rotates. Compute positive stellar incidence, inverse-square flux, weather factor, occlusion, nameplate limit and physical condition. Zero W at night or if disabled/broken.
2. **Wiring only, not proximity:** Determine groups from actual `outpost5.wires` endpoints, enforcing existing same-body and maximum 80-scene-unit cable restrictions. A disabled/failed junction is electrically open and splits the network. Ordinary switched-off loads stay connected but draw zero.
3. Each 48 V group has a **500 A aggregate protection rating** and **1.5% lumped wired load loss**, not detailed per-wire circuit impedances. Report the modeled bus current, loss and source IDs. At insufficient power, preserve original priority ordering (foundation/battery/solar first, then lab, antenna/storage). Flag shed equipment with a specific NO_SUPPLY or BROWNOUT reason.
4. Solar goes to served electric loads first. Remaining solar charges only actual connected batteries at each rated charge W and 92% efficiency, clipped to capacity. If generation is short, connected batteries discharge, clipped by available Joules, rated discharge W and 93% efficiency. No free battery gain, negative charge or simultaneous power donation from a disconnected asset.
5. **Every powered device report** includes stable equipment ID, body, bus ID, enabled flag, nameplate load/source W, real generated and served W, shed W, contributing source IDs and estimated source-to-load watts, battery J/capacity/limits, 48 V bus/current, temperature/condition, fault, simulated timestamp. These reports are derived on demand from original states.
6. Truck charging requires actual parked/unoccupied truck, a selected real battery on the *same body*, physically within the pre-existing **50 scene-unit socket range**, wired to an enabled solar array, positive available stored charge, sufficient destination capacity and a complete 60 simulated-second charge dwell. Source draw is capped at 450,000 J per session and **7.5 kW**; 90% arrives at truck battery. Both actual state owners update synchronously, with existing save and asset transfer audit. Already-charged batteries may supply night charge without new sunshine; no magical immediate sun credit.
7. Aircraft flight/boarding and local rover controls are intentionally unchanged; new power management cannot brick the physical ship.

## UI workflow

1. In the existing Outpost construction panel, place a solar array, battery, junction/connector and desired load using physical surface placement, avoiding protected vehicle/ruins areas.
2. Go to the **Power** tab. Choose Module A and Module B, then **Connect Cable**. Every segment must be on the same planet and within 80 scene units.
3. Choose a load as Module A. The new T02 inspector shows **the exact producing solar/battery IDs and their estimated share of served watts**, real charge, W, bus current/voltage, switch state, and last simulated timestamp. The existing group summary and equipment list remain.
4. Use **ENABLE / DISABLE SELECTED MODULE** to turn a device off or on; disabled connectors cut power paths. Disconnecting a wire recalculates the live report immediately.
5. Use the truck's **Wired battery / truck charge port** in Rocket Lab. Park within range, disembark, select battery, connect; observe the battery lose more J than the truck receives. To charge again, pass at least 60 seconds of *in-game simulated time*.
6. In the existing Workbench > Vehicle Systems panel, the generator's **fictional** status is explicitly shown; don't infer unlimited real fuel.
7. For other devices, in developer tools: `StarfallPowerInspectorT02.getAssetStatus('device-ID')`; `StarfallPowerInspectorT02.getBusStatus('body-ID')`. Both return defensive copies with **no writes**.

## Save migration / safety

- The top-level save version stays unchanged; existing `outpost5.items[].energyJ`, `engineeringVehicles.states[].energyJ`, `launch7.satellites[].ops7c.energyJ` and truck `batteryJ` remain authoritative, in their original fields.
- New optional `flightGalaxy.truckPose.chargeReadyAtS` is a finite simulation timestamp; absent on old saves means no in-progress charge session, *not* free charge.
- Switching uses the existing saved `outpost5.items[].enabled` flag; original T01 body snapshots and last-power timestamps remain supported.
- The saved T01 clock continues to own off-world advancement. If a distant system or host ephemeris is unavailable, it should not invent sunlight, position or energy.
- The power reporter never increments or duplicates a Joule account. `StarfallEngineering7A.Registry` remains a read-only projection of source owners.

## Verification contracts

- **Pure source model:** `tests/power-ledger-t02.test.cjs` checks daylight generation/charging, night depletion, connected antenna status, source contributions, live junction isolation and reconnection, empty-battery blackout, same-body cable guard, battery capacity, serialized reload equivalence, charge conservation, 7.5 kW session and explicit fictional generator labeling.
- **Actual Chromium file://:** `tests/power-ledger-t02-browser.py` constructs physically spaced source fixtures in the real Outpost store, checks live power source inspector and source IDs, clicks the real switch twice, and verifies unchanged wiring and status through browser reload. A fixture is **not** a manually executed player expedition.
- **Regressions:** existing all-Node suites, source JS syntax, strict generated standalone parity, pre-existing 7E/7F/T01 software-WebGL browser smoke.
- **NOT VERIFIED:** full EVA-built long-running base on a human GPU, all satellite+ship+truck power under a continuous full expedition, and 100× multi-day exact thermal solar convergence. Do **not** claim these from model/browser fixture tests.

## Boundaries to preserve for future work

- No full SPICE or equipment-level voltage drop across each cable; individual cable resistances/fuse temperature are **not implemented**. The shared group limit and lumped loss are documented approximations.
- No real consumable reservoir for existing fuel-independent vehicle generators. They **remain explicitly fictional**; their nameplate W, radiator heat and electrical loads are finite.
- The **local ship and local science rover power** continue their existing independent onboard DC power models with consistent energy units and priority semantics; they are not physically docked to surface battery buses. Add actual docking sockets/hardware checks in later T06/T09, not magic remote credits. The remote rover and 7C satellite are not connected to a surface battery merely because their icons appear nearby.
- No new launch-pad power gating was introduced: original rocket controls remain compatible. T09 can commission real pad equipment with a separately verified migration.
- Night and occlusion are geometric/atmospheric approximations, without per-tile mountain shadow casting. Condition is bounded but solar degradation/maintenance is not yet an actively draining repair cycle.
- Preserve 7F real photo bytes in IndexedDB; T02 does not affect camera data or graphics.

## Rollback

This code exists **only on its feature branch**. The known-good T01 state is [`feature/t01-offworld-operations-clock`](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t01-offworld-operations-clock); original graphics/gameplay baseline remains [7F hardening](https://github.com/hatutaletangeni/Space_starfall/tree/feature/update-7f-expedition-hardening). Switch back without migrating the active save, or back up your save using the existing integration export before testing new power state.

## Engineering release decision

**Release candidate, not stable merge** until the full final CI suite is green and physical player testing is performed. Limitations above remain explicitly open.
