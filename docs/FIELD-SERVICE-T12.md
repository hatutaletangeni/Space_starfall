# STARFALL T12 — Expedition Truck / Field Service

**Release status:** Feature-branch engineering candidate. T11 on `main` is the immutable fallback; do not mistake model and software-WebGL tests for measured user-hardware performance.

## Architecture and physical contracts

T12 is additive. `src/flight.js` remains the sole authority for truck pose and its 44 MJ pack, and for the local six-wheel rover's pose. `StarfallVehicles` still owns local rover definitions and charge. `StarfallLaunch.Store.rovers` owns actual deployed rover assets and fault/charge. `StarfallOutpostUI.store.items` owns DC battery joules. `StarfallPowerLedgerT02.transfer` owns source-to-sink transfer arithmetic. T12 state records only service history, cooldown and connector condition; **never** a second energy inventory.

The original **X** to enter/exit the four-wheel expedition truck, its leave-truck cooldown and separation animation, non-rideable six-wheel science rover, EVA, cockpit and walk-through rear ship ramp are not changed. Truck boarding is refused while a connected winch is pulling so an occupied driver cannot secretly drag an unbounded cable.

## Winch engineering

- Connect via Rocket Lab → Truck equipment → WINCH while landed, on EVA, outside the truck and neither boarding nor using the ramp.
- Real truck and local rover endpoints must share the same world; 55 scene-unit cable limit; terrain cable LOS sampled at ≤2.5 scene-unit intervals with 1.5 scene-unit ridge clearance and 16° grade limit; recovery anchor must be 4–20 scene units from parked truck.
- Prediction uses 1,200 kg nominal load, body surface gravity, bounded rolling resistance/grade allowance, and 82% winch efficiency. The game does not claim a full friction/contact/structural cable finite-element analysis.
- Each physics tick advances the rover **at most 0.8 scene units**, or slower than 1.8 scene units per simulated second; the next cable segment and fixed truck anchor are checked again before position or joules change. Each portion of completed pull irreversibly debits the truck's authoritative battery, retaining a 30 kJ reserve. Sensor output includes cable length, consumed work, remaining predicted work and blocked/low-power reasons.
- CANCEL disconnects immediately without refund. The actual mid-pull rover location, connected cable state and energy remain on save/restore. Invalid/off-world recovery is not resumed.

## Metered 48 V charging

- Truck charge and local science rover charge require a genuine *same-planet* enabled Outpost battery, powered on its original 48 V bus, an electrically connected enabled solar array, and a short physical lead.
- Truck connector range ≤50 scene units; local six-wheel rover ≤36 scene units from source and ≤24 scene units from service truck. Stationary truck/EVA is mandatory; no menu-based offworld charging.
- T12 applies `StarfallPowerLedgerT02.transfer` at **88% efficiency**, ≤6 kW for 40 simulation seconds and ≤220 kJ debited per session, with actual source-state debit; destination credit is always less than draw. Session cooldown and passive thermal dissipation prevent unlimited instantaneous transfers.
- Existing T06 charge for *deployed* probes remains a separate T06 flow, but the Rocket Lab UI additionally requires player EVA beside an actual same-planet truck/rover (≤18 scene units), on top of T06's enabled powered Outpost battery port within 36 units.
- Battery sockets cannot create energy and cannot transport it between worlds. An unpowered/browned-out bus, disconnected solar group, depleted source or overheated port blocks charge with an explicit diagnostic.

## Maintenance

Rocket Lab → **T12 Field service** exposes `local` versus selected *deployed* rover, diagnoses **wheels, motor, camera/instruments, radio/avionics and battery**, and lists service records. The selected slot must correspond to a real installed component ID and family in the existing Workbench definition; this is a **re-seat/field repair of the installed part**, not a fabricated shop inventory or a new vehicle class. Robot records name actual asset ID, old installed ID, installed ID, time, duration, consumed truck joules and health before/after.

Service is permitted only while the support truck is parked and the astronaut has exited with X, and the actual local/deployed rover is within 18 scene units. A 90 kJ work-tool debit, 30-second service cooldown, finite restoration of part condition and fail-safe suppression of failed-landing repair are mandatory. A deployed rover in entry, descent or a running program is never serviced through a remote menu. Repairs preserve original telemetry and specimen/photo records. Old saves migrate with healthy unmodified part conditions, not imaginary faults.

Note: camera/radio/wheel fault classes remain **diagnostic approximations**. STARFALL still has no physical carried spare inventory, measured traction dynamometer, line elasticity or dynamic truck thermal-connector graphics. This work does not claim an automated real-human keyboard traversal/ramps mission or GPU performance verification.

## Verification and rollback

- `node tests/field-service-t12.test.cjs`: incrementally recover, blocked ridge/cable, consumed energy after restart, brownout and separate-world safeguards, energy conservation, installed part repair, recorded part identity, failed landing denial and old save defaults.
- `python tests/field-service-t12-browser.py`: real offline Chromium boot/UI and remote/EVA denial; **not** a full physical driving demonstration.
- Existing engineering suites run from `.github/workflows/engineering-ci.yml`. Offline parity: `python tools/build-standalone.py && python tests/standalone-parity.py`. T12 branch workflow commits the deterministic `PLAY-STARFALL.html` after source updates.
- **Rollback:** `main` at `5a5502589e520583679b7f48e7e72ff937519b43`, untouched by this T12 branch. To revert T12, check out `main` and do not merge T12 PR.

## Operational procedure

1. Land, deploy the truck and six-wheel science rover, exit truck with **X** near rover; do not drive into the mission rover.
2. Open Rocket Lab and inspect T12 panel. Confirm physical same-body range; choose local or deployed rover, and inspect parts.
3. To recover, stop the rover and connect the winch. Monitor live cable span and actual consumed energy, optionally CANCEL mid-pull and restore save.
4. To charge, park the vehicle near an explicitly wired solar+battery Outpost grid, verify the live port, charge from the source and observe its physical energy decrease.
5. To repair a real fault, select its installed assembly, execute one 90 kJ work session, verify a persisted service record and observe 30 s interlock. Damage due to failed atmospheric landing is not silently reanimated.

**Do not call complete until human-controlled X enter/exit, rover tow, wired charging, post-repair camera capture and multiple-save endurance have been manually validated on the target browser/GPU.**
