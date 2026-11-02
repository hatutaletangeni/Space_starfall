# T09 — Real Habitat Operations & Life Support

**Baseline:** `main` updated by verified T08 [PR #5](https://github.com/hatutaletangeni/Space_starfall/pull/5), commit `a6456b792e4b037b9d092409b4ad7785040ab862`.  
**T09 branch:** `feature/t09-habitat-environment-operations`.

## Building and using your habitat

Use the existing **Surface Outposts** feature to build `hab`. Its original appearance, body-fixed physical location, and **680 W nominal operating load** are preserved. Build an actual **battery** and **solar array** near it and wire together using the existing T02 cabling system (maximum 80 scene units per cable). Standalone unpowered habitats and legacy saved habitats start in **informational STANDBY** and do not impose survival penalties.

Open **Surface Outposts → 05 / HABITAT**. Select the physical habitat. The panel reports its source ID, 48 V energized condition, cabin pressure, oxygen and CO₂ partial pressures, cabin temperature, seal integrity, gas cylinders, consumable scrubber, water inventory, airlock and current alarms. Explicit field commands are only available **within 24 scene units, in EVA, on the correct world**; the system never hijacks ship ramp, truck X, EVA, ruins or game camera. The habitat door is **NOT WALKABLE in T09**—the existing physical geometry has no new interior collision. The exterior remains navigable.

Use **ENABLE LIFE SUPPORT** to activate the installed atmospheric equipment. The original T02 `680 W` rating is the **entire** powered HVAC/ventilation/regulation budget; the controller does not double draw that electricity or invent a second battery. If the real connected grid is shed, the habitat's HVAC/regulators/scrubber/airlock actuators stop. The cabin is still a physically simulated sealed volume: leaks and thermal exchange do not stop when the power stops.

Use **SAFE STANDBY** for an unoccupied habitat when environmental regulation is not needed. Set up to four *explicitly simulated occupants* for instrument/consumable planning; occupancy is **not silently inferred from the player** and does not create health, damage, hunger, oxygen death, oxygen HUD or gameplay locks. Occupants consume finite O₂ and water and emit finite CO₂. A finite scrubber removes CO₂ only with supplied electrical power; an empty canister triggers alarms and cannot create fresh air.

Use **CYCLE AIRLOCK OUT** and **CYCLE AIRLOCK IN** after verifying habitat conditions. Actuators require a powered 48 V module and a safe cabin state; both transitions take **15 simulated seconds**. No control can label a leaking, oxygen-starved or depressurized cabin PRESSURIZED or SAFE. The airlock states are CLOSED, CYCLING_OUT, OPEN_OUT and CYCLING_IN. OPEN_OUT increases cabin pressure loss conservatively; it never teleports the player into a new room, nor changes physical movement/boarding bindings.

**REPAIR SEALS** restores seal integrity **only when physically near the module and its airlock is CLOSED**. It does not create cabin gas, compressed oxygen, water, scrubber capacity or electrical energy. With power and finite cylinder inventory, a repaired cabin gradually returns to nominal pressure/oxygen; depleted supplies remain a fault. New cylinders cannot be conjured by reloading, repairing or disabling the module—actual delivery/resupply inventory integration remains a follow-up. **Never leave a leak unattended.** Habitat pressure and thermal state continue to trend, but there are no player survival penalties.

If an already-deployed rover is within 24 scene units, a safe powered habitat with a **real attached charged battery** exposes **SERVICE ROVER FROM WIRED BATTERY**. The original T02 immutable `transfer()` debit/credit is applied to the original battery and rover records, capped at **2.5 kW, 90% efficiency**, with cooldown. An uncharged, unwired or isolated source refuses the transfer. This is a simple physical service socket, **not** an invented robotic arm or remote teleport charging.

## Physics and honest approximations

| Quantity | Model / boundary |
|---|---|
| Atmosphere | Simplified **ideal gas**: `p = nRT/V`, `R = 8.314462618 J/(mol·K)`, initial cabin 80 m³, nominal 101.325 kPa, O₂ 21 kPa, 293.15 K |
| Gas inventory | Original habitat structure owns initial stored gas, one set of finite O₂/inert reserve cylinders (1,050/3,500 mol), CO₂ cartridge 350 mol, and water 200 L. These are installed construction supplies, **not** regenerated air |
| Leakage | Finite exponential loss from seal integrity plus opening airlock. O₂, inert and CO₂ species each lose a bounded fraction per interval, independently of the current player planet |
| Oxygen/CO₂ | Explicit crew metabolic mol/s, bounded O₂ regulator (up to 0.75 mol/s subject to finite cylinder), inert top-up (2.7 mol/s), powered CO₂ scrub (0.003 mol/s) and finite scrubber capacity |
| Pressure safety | Design range 70–120 kPa, O₂ 16–27 kPa, CO₂ alarm above 0.8 kPa. LEAK / OXYGEN_UNSAFE / PRESSURE_UNSAFE / CO2_HIGH are separate alarms |
| Temperature | Single well-mixed lumped heat capacity **250 kJ/K**; exterior thermal leak **5 W/K**, 380 W heating or 280 W cooling within the existing 680 W electrical equipment; no finite-element structure/radiation |
| Exterior | Numeric world `surfacePressureKPa` or `pressureKPa` used if present, otherwise **conservative vacuum assumption**. Numeric temperature when provided, otherwise **230 K estimated**. This is **not** a detailed planet-specific weather or gas composition model |
| Electrical power | Actual original T02 48 V/500 A source/wires/groups, actual original 680 W hab load and 24h bounded T01 remote source update; backup reserve defaults **zero** (no hidden battery) |
| Persistence | Optional `outpost5.items[].habT09` version 1, original `outpost5` top-level schema 1; old hab saves migrate lazily to informational STANDBY. All source oxygen/water/J records and alarms persist, capped histories |
| Time warp | Deterministic analytical gas-leak/thermal integration, finite consumables, no negative inventories; >24h individual jump marked `AWAITING_REVIEW` instead of pretending an unmodeled stable environment |
| User safety | **No new health/survival system.** Cabin unsafe warnings do not impact already existing ship, rover, EVA or other player gameplay |

## Source ownership

- `src/physics/habitat-t09.js`: pure `StarfallHabitatT09.ensure / step / inspect / command / serviceRover`, no independent station store.
- `src/physics/outposts.js`: preserves optional versioned `habT09` during original source-owned `Store.cleanItem` save/load and initializes only new real `hab`.
- `src/physics/outposts-ui.js`: advances each physical cabin on the original sampled remote T02 power ticks, displays read-only status on existing Outpost HABITAT tab, applies explicit local commands, uses the original rover/store battery transfer.
- `index.html`: new Outpost habitat tab and environment diagnostics only; no changes to scene/engine/flight/ruins or input keybindings.
- `tests/habitat-t09.test.cjs`: conservation and safety: finite gas, leaks/brownouts, HVAC, water/CO₂, unsafe airlock/repair, exact-once clock, old save, finite rover energy transfer.
- `tests/habitat-t09-browser.py`: real `file://` Chromium using actual Outpost module and wire graph, powered 680 W, time advanced with T01 remote body resolver, disconnected cable + leak, unsafe airlock refusal, repair and saved/reloaded environment state and original controls.
- `.github/workflows/engineering-ci.yml`: all previous T01–T08 model and browser suites still required, plus T09.

## Limits and next development

**Walkable interior: NOT IMPLEMENTED**. Adding a fully collision-tested physical doorway/room now risks stealing the ship/ruin interaction priority; the environment controller is independent and the existing exterior shape remains unchanged. **No actual player presence/damage** is inferred. Service bench and rover socket are physically gated operations, not rendered high-fidelity props or a new crafting UI. No full gas circulation pipes, atmospheric gas chemistry, detailed multiphase water or thermal FE model, or actual oxygen deliveries. The finite initial gas cylinder and 80 m³ volumes are **engineering scenario assumptions**, not observational verified exoplanet specifications. Manual hardware-GPU exploration is **NOT VERIFIED**, and browser programmatically prepared the existing real equipment instead of proving an entire player-built expedition.

## Verification / rollback

```bash
for t in tests/*.test.cjs; do node "$t" || exit 1; done
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/habitat-t09-browser.py
# Existing T01–T08 browser suites all run in the final regression workflow.
```

Every new feature is on its own `feature/t09-habitat-environment-operations` branch, **not merged to main until verified**. The previous [verified T08 release on main](https://github.com/hatutaletangeni/Space_starfall/tree/main) is the rollback baseline. Export a current game save and portable photo archive before switching. The nested T09 schema can be ignored by prior builds without changing their original hab visual geometry or `outpost5` inventory.
