# STARFALL T13 — Operational spacecraft electrical service and docking

**Branch:** `feature/t13-ship-service-docking`, based on the verified T12 candidate `feature/t12-truck-field-service`, **not** on `main`. No automatic merging.

## Design constraints and authoritative state

- No ship physics, fuel, hull, camera, controls or ramp changes. The user still exits and boards via the physical rear ramp and drives/leaves the **truck** with **X**. The science rover remains autonomous, not an occupied vehicle.
- `StarfallVehicles.createStore()` remains the sole installed spacecraft assembly and ship/locally configured rover battery, thermal, fuel and health owner. `StarfallLaunchUI.store.rovers` remains the owner of deployed rover charge and science readings. `StarfallOutpostUI.store.items` owns external battery energy. `StarfallPowerLedgerT02.transfer` computes all external/vehicle electrical energy transfers. `StarfallScienceUI.journal` owns numeric observation records and rejects duplicates.
- `flightGalaxy.shipDockT13` stores only a latch, connector temperature/cooldown, a monotonic sensor serial, docking event history and science **reference** receipts. It is **not** a second spaceship, battery, cargo database or replicated Journal.
- Old saves without T13 fields restore in `UNDOCKED` condition with no phantom extra energy, samples or history. The connector history has a finite **300-event** write gate and science references have a finite **500-entry** write gate; existing overlimit records are preserved on restore rather than silently truncated.

## Operational flight engineering

The existing Engineering Systems panel now shows installed avionics, radiator, generator, solar, science suite and docking part IDs, real battery/fuel charge, T02-served loads, electric generation, hull temperature, modeled radiator output, health and charging connector temperature. The installed generator is explicitly **fictional** and fuel-independent, as it was before T13; no hidden fuel consumption or mandatory survival mechanics are introduced.

A landed ship is a 45-scene-unit, 128-kbit/s same-world radio node only when its installed avionics are enabled, hull health is above threshold and battery holds at least 0.5 MJ. With **realistic power enabled** its avionics must have received a non-shed bus allocation in `StarfallPower.step`; a brownout or disabled avionics stops transmit/receive. Older saves with `powerEnabled=false` retain their existing **emergency DC radio**, which is explicitly battery-debited by T03 and also obeys actual battery reserve and health checks. This is not an unpowered or interstellar ground tower: T03 still validates line of sight, finite byte rate, radio radius, physical destination endpoint and packet energy.

## Physical dock and charging

1. Land and park the original ship on a solid planet. Enable Engineering Systems → ship realistic electrical power, avionics and installed docking port. Ensure the ground rover is **not moving** (or a wired Outpost battery is live).
2. Select an existing local rover, a real same-world deployed rover, or a live 48 V Outpost battery from the panel. **LATCH PORT** requires same-body coordinates, separation no more than **38 scene units**, relative velocity no more than **0.4 m/s**, installed compatible hardware and healthy ship. The latch costs **1,200 J** from the actual ship battery. No vehicle or avatar gets relocated.
3. When latched, launching/taking off with Space and applying a ship Workbench reconfiguration are blocked until explicit **UNDOCK**. The existing physical walk-on ramp and truck X actions remain exactly as they were. If the service cable would stretch, a charge/reading action fails; no teleport occurs.
4. **METERED DC TRANSFER** uses T02 with **90% round-trip session efficiency** and ≤**6 kW for 40 simulated seconds** (up to 0.18 MJ delivered per rover session). Ship→rover transfers retain an actual **2 MJ ship battery reserve**; source debited, target credited and difference recorded as Joule loss. Rover charge goes to its real `StarfallVehicles` or launch-owned battery. The connected Outpost battery→ship recharge debits the original live, enabled and wired solar+battery 48 V source and credits the original ship battery, never an imaginary generator. There is connector cooldown and heat gating.
5. **DEAD-SHIP SHORE START:** If the ship's battery is completely depleted, use **EVA** to reach both the actual ship port and live Outpost battery within 18 scene units, enable the existing engineering electrical mode, and latch a **grid-battery** connector manually. A 1,200 J actuator cost is debited from the real Outpost source rather than the dead ship pack. Subsequent live 48 V shore transfer bypasses ship radio readiness only while charging the dead ship; it can bring the original ship battery above the avionics reserve. Rover docking/data transfer still requires powered ship avionics. A broken, unpowered or unwired station never provides phantom electricity.
6. **UNDOCK** clears the latch but preserves readings/receipts/history and current vehicle charge.

This is a conservative parked service **umbilical** model, not a dynamic spacecraft 6-DOF docking port. Source and rover are not moved. Space-to-space vehicle rendezvous is not modeled; attempts require landing.

## Measured data, science custody and radio

- New **SHIP THERMAL OBSERVATION** uses a real ship-mounted thermometer/instrument + avionics enabled in realistic mode. It samples the existing `StarfallVehicles` hull thermal state, rounds to 0.5 K, labels the record **modeled hull temperature, not planetary surface temperature**, debits `20 W × 2 s = 40 J` from the actual ship battery, and inserts one instrument/provenance/time/body-location-bearing observation into the existing `StarfallScienceUI` Journal. It never claims a separate environment measurement that would be physically out of altitude range.
- A rover on this world can physically **RECEIVE RECORD ONCE** through a latched connector. The source reading must have the actual selected rover ID (`sourceAssetId` or `probeId`), a valid body-fixed location, acquisition time and value. This costs **400 J** of ship avionics/data transfer energy; only a reference receipt is appended to the flight save. A second attempt is idempotent and free.
- Deployed-rover readings are journal-ingested only from real source-owned stored records after actual physical docking. Normal remote rover readings still require the existing T03 packet ACK/route; T13 does not silently create a remote ACK, fabricated image or cross-world receive path.
- Future local-rover measurements now stamp the installed rover asset ID so they are genuinely attributable in the same Journal. Anonymous legacy EVA measurements are not falsely reclassified as rover data.
- Shared data persist when the ship changes star systems because the original Science Journal and T13 reference receipts are independent of renderer activation; no remote radio is conjured through that persistence.

## Automated verification and explicit limits

- `node tests/ship-service-t13.test.cjs`: radio battery/avionics checks, brownout denial, legacy emergency source, part compatibility, range/relative speed/motion/planet interlocks, latch restore, original T02 electricity conservation, 40 s recharge cooldown, science reference IDs and idempotency, and explicit undocking.
- `python tests/ship-service-t13-browser.py`: **real file:// Chromium software-WebGL** boot into a controlled previously saved landed ship, ship bus activation, same-world local rover docking with no vehicle relocation, source-ID rover thermometer observation, ship thermal record in canonical Journal, transfer of the one rover reference only once, measured electrical charge debit/credit, actual localStorage reload and undock without motion.
- All inherited Node + browser regressions, standalone-parity generator and previous T12 standalone must still pass.
- **Not verified by software-WebGL:** physical keyboard-driven ship landing; manual ramp traversals with complex terrain, GPU frame rate on user hardware, real interplanetary communication, actual docking dynamics under thrust, high-fidelity contact mechanics or generalized survival.
- **Rollback:** switch to the unchanged `feature/t12-truck-field-service` for T12 or `main` for T11. The pull request stays draft until current branch CI green and real-user hardware smoke is evaluated.
