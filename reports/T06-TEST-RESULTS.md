# T06 — Engineering Test Evidence, Known Issues and Release Handoff

**Date:** 2026-11-02  
**Parent:** Verified T05 `6d06acaa4832c293e5907ea9afeabee7a0eb1c9a`.  
**Feature:** `feature/t06-autonomous-rover-lifecycle`.  
**Release assessment:** Automated **release candidate**, **not** proof of an interplanetary or manual fully flown human expedition.

## Reliable green integrated proof

[GitHub Actions 41480585424](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41480585424) completed **both offline-model and browser-smoke jobs successfully** on code commit `8a5e5d582dc00e8bd0128d923a46c505f724f872`. The run's actual browser log recorded:

```
PASS T01 browser: remote rover WAIT/STOP + battery and 7C satellite saved/reloaded
PASS T02 Chromium: real 48V source→battery→antenna switching and saved wire graph
PASS T03 real browser: powered ship→rover, blackout, persisted packet resume, one ACK
PASS T04 real browser: wired powered antenna 2-hop LOS, auto-track, tower custody, once-only forward
PASS T05 true remote WebGL: catalog-0-p0 unloaded, 2,376 bytes/202 colours, actual IndexedDB photo
PASS T06 real file:// Chromium: controlled capsule ENTRY→DESCENT→landed, real ship radio ACK,
  two onboard readings during ship blackout, actual Camera 7F image, source-debited 48 V battery
  service and two exact receipts retained after reload
```

The run also passed JavaScript source syntax, every deterministic Node model suite and exact standalone source/compiled byte parity. A subsequent small T06 safety change ensures instrument/opcode and low-power faults report consistently to the original 7D event log and the new hardware lifecycle; **check the final exact-branch run before release**.

## Acceptance contract matrix

| Requested path | Status | Evidence and caveat |
|---|---|---|
| 7B launched rover stays in original `launch7` owner | **Implemented** | Additive `landingTargetLocal`, `roverT06` schema 1; existing 7B ascent, rocket engine and control files not rewritten |
| Real destination touchdown different from launch pad | **Model and controlled-browser verified** | Destination body-fixed site, original seeded terrain nine-point footprint; browser uses controlled capsule insertion, not complete launched rocket flight |
| Rover entry, descent and fault instead of automatic surface teleport | **Automated verified** | Mission clock phases ENTRY 12s, DESCENT 26s, site/slope/fuel impact gates; vertical entry remains simplified envelope, not six-DOF |
| Same-system delivery without fictional warp | **Implemented** | 7B actual orbital insertion then capsule descent; carrier used only when source/destination system IDs differ |
| DRIVE/TURN/WAIT/SAMPLE/STOP unchanged | **Regression passed** | Legacy 7B / 7D model and file:// browser suites |
| GO_TO geographic waypoint and RETURN | **Model verified** | 7D six-wheel real terrain step, heading based on body-fixed geodesic; no global route planner or mapped obstruction avoidance |
| DOCK and actual service | **Automated verified** | Same-world existing 48 V energized battery required, original 36 scene-unit service radius, 6kW cap, 90% transfer efficiency, 40s cooldown; finite rover capacity |
| CAPTURE actual source-owned image after onboard authorized command | **Automated verified** | Original 7F camera job + real WebGL image; no new image owner or fake radio receipt |
| Two numeric rover observations and blacked-out radio | **Browser verified** | 7D onboard original sample IDs held while receiver battery is zero; later T03 ACKed real packet and journal contains exactly two records |
| Emergency STOP preempts image, power/LOS outages block radio | **Inherited from verified T03** | No new radio engine, no capsule radio before deployed |
| Save/reload mission + rover energy, site, science, photo and packet once | **Browser verified** | Original 7B launch schema, T01 clock, 7F archive and T03 ledger survive `file://` reload |
| Original player ship/EVA controls, X truck key, non-rideability | **Source untouched, prior smoke green** | No new keyboard/controller path or player teleportation |
| Explicit user-visible power/terrain/radio/entry fault metrics | **Implemented** | Original Rocket Lab controls and diagnostics, no new full-screen controller |
| Full Planet A→Planet B camera command and downlink | **NOT IMPLEMENTED** | T08 cross-world physical station still required |
| Completely flown orbit insertion→destination landing in human gameplay | **NOT VERIFIED** | Actual 7B force-integrated flight preserved; browser T06 uses a controlled post-orbit payload mission |
| Active guided terrain-map planner / conditional branches / high-rate FPS benchmark | **NOT IMPLEMENTED OR NOT VERIFIED** | T14 / T16 / T18 follow-up |

## Source and test changes

- `src/physics/rover-lifecycle-t06.js`: bounded autonomous command parser, body-fixed latitude/longitude, terrain footprint, site selection, conservative capsule descent energy, hardware fault/migration, geodesic target/return, real 48V servicing through T02.
- `src/physics/launch-systems.js`: existing rocket Store owns payload lifecycle, explicit real destination site, entry/descent readiness, crash and mission save; original satellites and trajectories unchanged.
- `src/physics/ground-operations7d.js`: extends original six-contact terrain solver rather than duplicating movement, same source energyJ and science records, camera jobs through 7F only, status/fault events.
- `src/physics/mission-comms-ui-t03.js`: capsules in ENTRY/DESCENT/FAULT do not appear as a powered rover radio.
- `src/physics/launch-ui.js`, `index.html`: Rover Mission Control controls, terrain preview, destination coordinates, radio diagnostics and explicit battery charging. No EVA/flight movement keys modified.
- `tests/rover-lifecycle-t06.test.cjs`: valid/invalid capsule landing, 24-opcode rules, real terrain/energy, waypoint+two readings+authorized photo, persistent rover ID and exact source/target transfer.
- `tests/rover-lifecycle-t06-browser.py`: original standalone `file://` application, genuine 7B Store mission and original T03 live radio geometry, source-owned 7D/7F payloads, blackout and once-only journal, real outpost battery service, reload.
- Original T03 and T04 browser fixtures carry **diagnostic-only** messages if saved packet/antenna records fail to restore, to expose regressions rather than mask them.

## Reproduction

```bash
for t in tests/*.test.cjs; do node "$t" || exit 1; done
python tests/standalone-parity.py
python tests/mission-operations-t01-browser.py
python tests/power-ledger-t02-browser.py
python tests/mission-transport-t03-browser.py
python tests/antenna-hardware-t04-browser.py
python tests/remote-imaging-t05-browser.py
python tests/rover-lifecycle-t06-browser.py
```

Actual `file://` browser tests use Playwright Chromium SwiftShader (software WebGL). They **do not measure FPS on a real user GPU** or prove manual traversability. All accepted source + single-file standalone bytes must match the original `tools/build-standalone.py` output.

## Known limitations / severity

- **P0 dependency — T08.** Physical interplanetary radio remains unavailable; never claim a complete Planet A/B round-trip radio or camera. T06 commands only execute if T03 has actually delivered them, or are legitimately already onboard.
- **P1 — Capsule descent dynamics:** the transition uses elapsed time plus a physically conservative site/energy envelope (mass, gravity, relief and approximate aerodynamic assist) but **not** an integrating six-degree-of-freedom aeroshell, heat shield or terminal thruster trajectory. Unsafe landings fail and remain explicitly recorded.
- **P1 — Full launch-to-rover visual expedition:** the new browser scenario begins from a controlled post-orbital payload record; no human physical rocket launch and rover on-foot visit is certified. T18 integration.
- **P1 — Navigation planning:** local six-wheel slope/traction collision is used, but GO_TO headings are simple great-circle vectors with no precomputed global obstacle avoidance, and `RETURN` uses the real landing vector. An unsafe segment intentionally stops and requires an approved reroute.
- **P2 — Docking:** physical port uses gameplay-scaled 36 scene units, an energized battery under existing T02/Outpost wiring, capped energy and service cooldown, not a fully animated robotic docking arm. T12 adds actual truck/manual service rigging.
- **P2 — Real hardware thermal model:** computer standby and bounded thermal relaxation added; full thermal FEA/radiator and actual rover solar rig are absent. No invented energy generation is claimed.
- **P2 — Survey map and conditionals:** no imported survey waypoint object or branching language yet; numeric latitude/longitude GO_TO and valid science opcodes work. T14/T16.
- **NOT VERIFIED:** real GPU performance, 100× many-day on-world reliability and human-driven full expedition.

## Recovery / rollback

Keep the original verified [T05 branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t05-remote-world-imaging) unchanged. This T06 work is a separate branch and is **not merged to main**. Export your Starfall save and 7F portable image archive before switching branches. Existing T01–T05 schemas and all original 7F IndexedDB images are retained. If final exact-SHA CI is red, mark T06 incomplete and use T05.
