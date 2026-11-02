# T06 — Deployed autonomous rover: delivery, terrain, science, image and service

**Base:** verified T05 `6d06acaa4832c293e5907ea9afeabee7a0eb1c9a`  
**Branch:** `feature/t06-autonomous-rover-lifecycle`.  
**Status:** release candidate, subject to final CI and manual GPU/EVA checks. **No T08 interplanetary radio is invented here.**

## What has been wired into existing technology

| Source owner | Integration |
|---|---|
| `StarfallLaunch.Store` (`launch7`) | Original force-integrated 7B launch still required. On physical orbit insertion or explicitly fictional **cross-system** carrier arrival, an actual rover capsule goes `ENTRY` (12 simulated seconds) → `DESCENT` (26 seconds) → `READY` or `FAULT`. It cannot transmit, traverse or produce science before touchdown. Mission launchId and original physical site IDs remain authoritative. Original 7B trajectory equations are untouched. |
| `StarfallRoverT06` | New pure bounded site, entry-energy, rover state migration, autonomous navigation, and DC service logic **adapts the original** 7B/7D records; no new rover database. `roverT06.schema=1` is an optional field on original `launch7.rovers[]`. |
| `StarfallGroundOps7D.tick` | Original six-contact slope/friction/traction solver still advances **real planetary body-fixed local vectors** in bounded metres. Add GO_TO, RETURN, DOCK, STATUS and autonomous CAPTURE commands while preserving DRIVE, TURN, WAIT, SAMPLE, STOP. Temperature and onboard controller standby draw finite Joules; a physical reserve or hazard puts the rover in a recoverable safe stop. |
| `StarfallCommsT03` | New rover commands still traverse the one finite packet ledger, with emergency STOP priority, signal power, LOS, delay, ACK and stored evidence. A capsule in ENTRY/DESCENT/FAULT explicitly has no operating radio endpoint. No operation assumes player landed at the destination. |
| `StarfallImagingUI7F` / T05 | CAPTURE requested **inside an accepted onboard script** creates a true original 7F job with accepted-onboard authorization. The actual WebGL camera later acquires the photo, consumes source rover energy and stores bytes in original IndexedDB; no fake image/thumbnail, no pre-ACK gallery unlock. |
| `StarfallScienceUI` and T03 | Each original seeded sensor returns actual named numeric data with observation ID and real source rover coordinates; source-owner records remain onboard through radio blackout. T03 receives each journal observation once after real packet ACK. |
| `StarfallOutpostUI.store.items` and T02 | A manually connected real rover next to a **powered same-body outpost battery** can charge through the original T02 Joule transfer: at most 6 kW × 40 seconds, 90% transfer efficiency, source debit, battery cap, rate-limit/cooldown, 36 scene-unit proximity and original body/bus checks. No solar charging appears on a rover without solar hardware; no remote wireless energy. |
| Existing Rocket Lab / Rover Mission Control | Select rover ID, inspect operating state, real latitude/longitude, terrain relief/grade, heading, charge and reserve, radio packet path/delay, current waypoint ETA, saved readings and image jobs, recent faults; choose exact lat/lon or automatic safe landing location; send RETURN/STATUS and physical local SERVICE. Rover remains **non-rideable**. Player X/truck, EVA, landing and ship controls unchanged. |

## Landing contract and what it does *not* claim

The departure foundation is not copied onto the destination as a landing site. The operator can enter target latitude and longitude or let the model deterministically sample 32 candidate footprints derived from actual destination body seed, ID and launch mission ID. Terrain is sampled from the same `Starfall3D.groundHeight` used by player collision and rover traction; footprint uses nine samples over 14 m and rejects modeled slope greater than 16° or relief greater than 4.5 m. If no safe candidate, a capsule fails; no healthy landed rover teleports onto a hazard.

The capsule descent uses an **explicitly fictional simplified propulsive envelope** (1,680 kg, nominal 110 MJ stored descent budget, entry speed capped at 5.5 km/s, body gravity, partial atmospheric assist, predicted touchdown speed). Entry/landing are distinct **persisted simulator phases**, but **the vertical spacecraft trajectory is not a 6DOF continuous atmospheric solution**. The powered upper-stage orbital insertion still runs original 7B real integrated physics. Cross-system transfer is still the explicitly fictional carrier; *same-system* rover delivery does not require warp.

Detailed `roverT06` lifecycle:
```
IN_PAYLOAD → ORBIT / optional TRANSFER → ENTRY → DESCENT → READY
READY → TRAVERSING → SCIENCE / READY
READY / TRAVERSING → SAFE_STOP (power/terrain/thermal/storage) → READY after verified service
ENTRY / DESCENT → FAULT (unsafe terrain or descent budget, capsule remains a recorded casualty)
TRAVERSING → RECOVERY on reaching a real powered base port / human service
```

Old `launch7.schema=1` saves restore as before; missing `roverT06` is interpreted as a legacy already-deployed rover with a persisted home local vector equal to its existing current site. T06 does not rewrite the original schema nor invent a replayed entry sequence for a previously landed robot.

## Operator command syntax — one command per line, 24 lines maximum

```text
DRIVE 15
TURN 45
WAIT 10
SAMPLE thermometer
GO_TO -22.68 17.12
CAPTURE forward 256
STATUS
RETURN
DOCK
STOP
```

- `DRIVE` 0–300 **metres**, `TURN` −180–180 degrees, `WAIT` 0–120 simulated seconds, valid named `SAMPLE` sensors from existing field science, `STOP` emergency hold. These exact old signatures continue working.
- `GO_TO lat lon` and synonym `TARGET lat lon` use **body-fixed geographic degrees**, geodesic distance and actual terrain-stepped robot wheels, not an instant point teleport. A safer planned direction comes from the same `7D.direction` local tangent convention. `RETURN` goes to the rover's original **landing** site (not Planet A's launch pad).
- `DOCK` moves to a same-body outpost battery record and then stops within reach of a manual **powered wired** service action; there is no magical background charging or free energy. If no battery exists, it safely stops and reports the missing dock.
- `CAPTURE forward|left|right|panorama|target 256|512` queues a genuine 7F camera job **only after the program itself has been received**. A successful capture is onboard, not instantly downlinked. This command is constrained by the same total photo archive/job limits and stored energy as other 7F captures.
- `STATUS` records a finite computer-powered original 7D event; uplink and readout still need the original radio path. Worklist loops/conditional branching and true survey-map waypoint import remain intentionally unsupported (do not type unimplemented opcodes).

### Real operator workflow

1. Land and build a real launch foundation. In Rocket Lab choose the **Rover capsule** payload, destination star system/body and inspect the T06 target footprint.
2. Enter an actual destination latitude and longitude or keep **Auto site survey**. Review modeled slope, relief and propellant requirement. Ignite through original 7B controls; after **real orbital insertion**, wait for finite ENTRY/DESCENT steps and `READY`.
3. Use **Rover Mission Control** to send a bounded script through the single T03 radio transport. Monitor packet progress/ACK, rover condition and actual wheel-traction positions. A planet/horizon blackout holds commands; the robot continues previously received safe onboard work independently via T01.
4. Capture with a mission script or 7F camera console; each source 7F image uses actual renderer bytes and stays onboard until a real T03 image packet receives a final ACK. Numeric observations also remain onboard pending transport.
5. On arrival at the rover's same-world physical base, select a **powered, connected** outpost battery. Press **Docked Rover Charge**; the source battery loses the exact 180kJ/0.9-equivalent draw, finite charge and thermal reserve limits apply. Unpowered or distant batteries cannot service it. A safe-stop can clear when the rover has 100 kJ above its original safety reserve.
6. Keep ordinary 7F portable photo archive exports and original save backups. Changing branches never alters main without an explicit merge.

## Engineering limits and unverified acceptance

- **T08 cross-body radio still missing.** Rover can simulate an onboard approved program and take an actual remote T05 image, but Planet A → Planet B → Planet A command+photo roundtrip is **NOT verified** and must not be claimed complete.
- The current vertical entry/descent is phase + physics-backed conservative site/energy check, **not** a real aerodynamic/RK4 6DOF heat shield model. The interstellar carrier remains a fiction disclosure. Real end-to-end rocket launch all the way to offworld touchdown awaits T18 manual/system test.
- Six-wheel motion remains the **existing contact-gradient/traction approximation**, not full rigid wheel collision. No LiDAR global path planner, obstacle map memory, adaptive route planner, repair consumables or periodic conditional branches; `GO_TO` uses a direct geodesic heading and the original near-step terrain hazard stop. Risky terrain requires a new authorized reroute program.
- Nominal rover power and performance are simulated. 36 scene-unit servicing is a gameplay-scaled proximity with an explicit scene-to-SI conversion; exact connector mechanical alignment is not modeled. T12 will extend recovery/service sockets.
- No field-lab sample-container chain (T10), no T07 satellite upgrade, and no new rover ride controls. Off-world survey-map tracking/waypoint georegistration, full human walked inspection and 100× real-GPU endurance are **NOT verified**.
- The 7F camera job is created only after onboard acceptance; the original UI photo capture runs on a bounded GPU idle slice. Browser close **before** a synchronous metadata save can leave a resumable job, never an invented image.
- Deterministic mission clock uses T01 five-second slices. A single 7D tick advances at most 15 simulated seconds and 48 terrain contact-probes; an extreme warp skip beyond the clock's bounded advance is **AWAITING_REVIEW**, not instant traversal.

## Verification and rollback

```bash
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tests/standalone-parity.py
python tests/mission-transport-t03-browser.py
python tests/antenna-hardware-t04-browser.py
python tests/remote-imaging-t05-browser.py
python tests/rover-lifecycle-t06-browser.py
```

`tests/rover-lifecycle-t06.test.cjs`: real source terrain footprint sampling and unsafe slope/capsule fuel, separate entry/descent/deployed state, no copy of departure site, 24-command parser, wheel steered motion, two readings and onboard authorized image job, save/reload identity, original T02 debit/credit, blackout service rejection, battery reserve shutdown, and no re-landing duplicates.

`tests/rover-lifecycle-t06-browser.py`: fully running `file://` game in genuine Chromium WebGL2, controlled **capsule mission insertion** (not a fully flown rocket), actual destination terrain, original T03 powered ship radio route and byte ACK, source-owned 7D records while radio is blacked out, real 7F WebGL image, later exact-once journal receipt, real T02 outpost battery service, reload. A controlled capsule insertion is not a manual complete rocket expedition. No mocking radio connectivity or replacing terrain samples with fake values.

The standalone is generated from `index.html` + editable modules by `python tools/build-standalone.py`, with exact parity checked. CI includes all previous T00–T05 model and real browser tests. A green CI is required on final cleanup SHA before release candidate. T05 branch is the unmodified rollback source; **do not merge to main** while any browser or Node gate is red.
