# STARFALL Update 8E — Integrated Modular Expedition Vessel

**Status:** DRAFT candidate, based on Update 8C branch. **Never merge directly into main.**

## Design intent / visual audit

The previous small ship had a six-unit crew ramp and an obviously detached starboard box for a truck roughly eleven scene units wide. The 8E renderer replaces the single ship mesh with one much larger continuous modular-vessel silhouette, including an integrated starboard hangar (using **exactly the 8B ramp coordinates and original vehicle IDs**), armored central pressure spine, connected science/crew and engineering pods, forward navigation bridge, dorsal docking hub, twin propulsion blocks, eight structural foot assemblies, radiator fins, and large deployable solar-panel wings. It uses one merged WebGL mesh, not repeated submeshes rebuilt each frame. There is no new ship object, world, asset spawn, or separate scene.

**Compatibility:** `StarfallCargo8B.BAY` stays centered at x=16.5, its floor stays at y=-1.2 and ramp end stays z=39. The narrow original crew ramp is preserved as a separate boarding path. The truck, science rover, planet IDs, orbital physics, galaxy and CW01/CW03 geology authority are unchanged. The ship rendering scale is a prototype, not a certified length/mass design; supporting power, thermal, thrust-to-weight, landing pad footprint and flight dynamics must be recertified before realistic industrial mode.

## Real first-deck walking

`src/physics/ship-walk8e.js` contains a continuous, bounded local-coordinate walkmesh, not a teleport menu. `src/engine.js` renders a real deck mesh with corridor, accessible module floors, bridge, cargo lane, industrial benches and ceiling when the character is inside. Walking is attached to the existing ship transform, with the original avatar and camera. Existing world rendering stays active.

- On foot, physically board through the existing crew ramp as before. The avatar appears on the internal main deck and can **WASD** along the pressure corridor, or use Shift to walk faster.
- On a **landed** ship, press **I** from the cockpit to walk inside. **I** only returns to pilot mode when the avatar is physically in the bridge; **X** in the bridge takes pilot control.
- **X** at science, workshop, cargo, power, life-support and habitation rooms opens the nearest existing genuine system interface where available. It does not grant free sample evidence, manufactured products or upgrades.
- Walk through the aft hatch to disembark using the existing physical ramp.
- **V** changes first-person/over-shoulder view. Interiors currently represent the main service deck only: multi-deck elevators, pressure-door actuation, fire containment and microgravity movement are not implemented.
- Interior coordinates are serialized with the original `flightGalaxy` state; they do not overwrite planetary surface pose.

## Source-linked upgrade architecture

`src/physics/modular-ship8e.js` creates versioned levels for bridge, cargo, life support, solar arrays, radiators, lab, fabrication, habitat, power bus and docking. The readable registry in **Engineer → Expedition Vessel · Modules** reports the **actual existing** T15 installed components where available, existing ship electricity/solar area, 8A physical cargo, 8C survey counts and existing finite material lots.

A module upgrade requires a unique committed manufacturing input receipt matching the cost and previous level. It cannot be silently purchased/installed from a UI button. No 8D extraction or 8F factory bridge exists yet; upgrade material costs and module mass estimates are provisional. **The new structural mass is reported as an estimate, NOT silently added to the old underpowered launch physics**; it needs propulsion recertification and T15 upgrade planning first. The original active vehicle design still owns flight forces, fuel and thermal behavior.

## First actual life-support process

`src/physics/life-support8e.js` tracks one-crew oxygen, water, CO₂ production and finite scrubber capacity. Starting tank stock is a finite existing-expedition manifest, never credited by planetary scans. With realistic electrical power enabled, life support is an additional **450 W** priority load in the existing `StarfallPower.step` bus, using real generation and battery joules; loss of electric power disables scrubbing, but metabolism continues. When the older engineering electrical simulator is explicitly disabled, life support runs in **assisted-mode nominal power** for compatibility and is labelled as such. This is not a full pressure/thermal/humidity/nutrient, wastewater or greenhouse model.

## Regression and QA

- `tests/modular-ship8e.test.cjs`: one registry, no receipt-free upgrade, save/reload, stable cargo coordinates, physically reachable room intervals and collision denial.
- `tests/life-support8e.test.cjs`: finite daily metabolism, CO₂ scrubbing, no scrubber operation during power loss, snapshot validation, power-bus energy debit and shed behavior.
- Source/standalone strict build parity through `tools/build-standalone.py`.
- `tests/modular-ship8e-browser.py`: real offline Chromium/SwiftShader render, source module panel and reload, screenshot.
- `tests/modular-ship8e-walk-browser.py`: landed save, actual keyboard EVA ramp reboarding, interior walking and single-truck persistence. The software browser is **not** proof of actual player GPU FPS/comfort or complete module fabrication.

## Outstanding hard gates before merging

1. Browser EVA → crew ramp → internal deck must pass on latest commit; terrain contact at the large hangar must also be manually tested on multiple biomes.
2. Crew boarding direction, cockpit pilot handoff, camera wall collision and foot height must remain consistent on real hardware.
3. Heavy hull thrust-to-weight, center of mass/inertia, fuel requirements, landing leg stability and structural dry mass need scientific tuning before being applied to the flight model. There is no claim that the large ship is capable of Earth-gravity lift-off on its old single-engine configuration.
4. Additional physical decks, pressure bulkheads, airlocks, solar deployment animation, radiator articulation and severe damage are not yet simulated.
5. 8D ore extraction, 8F industrial refining/stock transfer, fabrication recipes and 8E factory receipts must be integrated as one atomic material ledger. The UI deliberately refuses to create components for free.
6. General inherited Engineering browser regression has had Rocket Lab dialog failures and source-vs-standalone parity race failures on pre-rebuild commits. Check the final head SHA explicitly, not earlier failing snapshots.

**Rollback:** switch to `feature/update-8c-finite-geology`. `main` stays unchanged.
