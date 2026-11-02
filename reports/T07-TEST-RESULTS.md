# T07 satellite bus — verification results and honest acceptance boundaries

**Parent:** T06 final green commit `17328681a24f093a9a0b7a73198ad0f6ad68acc5`  
**Branch:** `feature/t07-operational-satellite-bus`  
**Status:** Candidate pending the final exact-head GitHub Actions result, **NOT a fully human-flown rocket → satellite → remote station end-to-end claim**.

## Completed green baseline

A complete integrated [GitHub Actions run 41485217885](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41485217885) passed **both offline-model and browser-smoke** on earlier T07 commit `4f4f67b88e3aebabeb13b35f617c02030d76f835`. Its actual Chromium log shows:

```text
PASS T01 browser: remote rover + satellite saved independent clocks
PASS T02 browser: solar→battery→antenna and persisted power bus
PASS T03 browser: real ship/rover powered link, packet blackout, exactly one ACK
PASS T04 browser: actual 2-hop powered antenna + orbit relay + packet custody
PASS T05 browser: actual distant WebGL photo from unloaded world, 7F archive and reload
PASS T06 browser: controlled rover capsule landing, physical radio, photo, 48V servicing, exact receipts
PASS T07 real file:// Chromium: actual 7B achieved eccentric Kepler ephemeris, SAFE rejects science
 and radio, finite NADIR slew, 2 timed 7C acquisitions, real 7F GPU photo,
 satellite radio outage blocks T03 bytes, powered LOS ACKs both numeric records
 exactly once, persisted 7C+T07+7F+T03 across reload
```

Source JavaScript syntax, all deterministic Node model/regression tests and the exact `PLAY-STARFALL.html` source/standalone parity passed in that run. **Later T07 fixes** added a durable 7C-to-7F photo provenance link, consistent 7C/T03 SAFE gate, correctly ACK-time-stamped survey-map footprints even if the remote world is unloaded, and bounded received records. These require the **final cleaned-branch run**, not just the baseline result.

## Model and browser gate coverage

| Engineering requirement | Source of evidence | Status |
|---|---|---|
| Real orbital elements from existing 7B `inertial2d` Kepler state | `T07.inspect` invokes **the same** `StarfallLaunch.orbit`; browser test uses eccentric achieved two-body orbit | **Automated proven** |
| Legacy 7C circular save preserved without fake new elliptical elements | Optional `ops7c.t07` lazy migration, original schemas kept, null eccentricity shown as unavailable | **Model proven** |
| Onboard joules not mirrored; Eclipse/solar/bus finite | Original 7C integrator + T07 actual slew/pointing joule debit in same `ops7c.energyJ` | **Model proven; full thermal/solar-panel mechanics approximate** |
| 3°/s attitude and SAFE radio shutdown | T07 commands + 7C radio and T03 routing agree | **Model/browser proven** |
| Installed observatory selectable camera/spectrometer/atmosphere; relay no camera | Original PAYLOADS + T07 schedule/preflight | **Model/browser proven** |
| Delayed science with sun/attitude/battery/storage/altitude | 12s camera / 16s spectrometer / 10s atmosphere; bounded queue and error status | **Model/browser proven** |
| Actual 7C numeric observation vs actual original 7F WebGL image | No base64 in 7C; 7F own job/image bytes, camera `t07JobId` links the real numeric record | **Model/browser baseline proven; linked ID added later** |
| Physical LOS radio, blackout, finite bytes, ACK before journal | T03 packet ledger, real onboard owner; no record deletion until ACK | **Browser proven** |
| Survey footprint on ACK (no premature mapping) | Correct original 7C observation `receivedAtS` passed to existing Survey Map, including T01 remote body snapshot | **New browser assertion added; final gate pending** |
| Actual pass, solar window and battery recovery prediction | Sample actual Kepler state + current physical powered receiver, bounded 480 samples | **Model verified; predictions conditional on current hardware** |
| Relay source buffer and actual antenna energy | Original T04 powered custody, no extra relay inventory | **Inherited browser regression** |
| Warp and unloaded world advance without GPU geometry | Original T01 five-second scheduler + source body snapshots; T07 loads no extra render systems | **Model and T01 browser regression** |
| Save/reload, exact once science and image metadata | Single original SF `launch7`, original T03 journal and original 7F IndexedDB | **Browser proven baseline** |
| No free orbital maneuver | UI explicitly labels maneuvers UNAVAILABLE | **Source verified** |
| Original EVA, truck, ship, flight and rocket controls intact | No source change to motion/rocket integration; regression tests | **Automated pass; manual GPU play not measured** |

## Key source changes

- `src/physics/orbital-bus-t07.js` — additive state controller. Computes orbital telemetry from exact `StarfallLaunch.orbit`, queues bounded timed science jobs, enforces safe pointing, same-owner energy and thermal, class/payload restrictions, real pass predictions and log/fault budgets.
- `src/physics/satellites7c.js` — tiny original-owner adapters: keep `ops7c.t07` on migration, invoke T07 on source clock, preserve old API signatures, use T03 for in-game per-byte downlink and ensure radio SAFE is enforced.
- `src/physics/satellites-ui7c.js` and `index.html` — real attitude selections, job schedule, achieved orbit/speed, eclipse, health, solar, memory, fault and receiver windows, no new satellite menu or orbital integrator.
- `src/physics/imaging7f.js` — validated `linkOrbitalJob` setter in original 7F Store. Original `.jobs` returns defensive copies, so T07 must never mutate the returned array and claim it persisted.
- `src/physics/imaging-ui7f.js` — 7F image gets `t07JobId` and the correct matching numeric `observationRefs`, from original onboard **or already-ACKed** 7C records.
- `src/physics/mission-comms-ui-t03.js` — on ACK supply same received-time record to journal and map; original 7C received history is capped to 180. No second radio engine or packet store.
- `src/navigation/survey-map-ui.js` — the original orbital map footprint accepts only ACKed real records, using original T01 source ephemeris when the user's local world differs from satellite body.
- `tests/orbital-bus-t07.test.cjs` — determinism, source Kepler telemetry, attitude, eclipse, battery, payloads, T03 custody and durable 7F identity.
- `tests/orbital-bus-t07-browser.py` — real `file://` Chromium software WebGL, controlled source-achieved eccentric Kepler record, 2 acquired numeric records, actual 7F image and thumbnail, real radio LOS and blackout, once-only science and map receipt, and original 7C/7F/T03 persisted reload.

## Limitations and dependencies

**T08 physical interplanetary radio is NOT available**. In-game routes are same-body, actual hardware must be powered and unobstructed. Do not describe a Planet A→B live radio/photo mission as complete. The browser inserts a controlled **post-orbit** spacecraft state; it does not certify the full 7B flight insertion of that exact craft from the player's launchpad or actual prolonged hardware-GPU play.

The T07 attitude slew/temperature/heater is an engineering approximation; not full rigid reaction-wheel/delta-v, nor FE thermal. No orbital maneuver thrusters or physical propellant have been installed, so free orbital adjustments are correctly impossible. Pass forecasts are conditional on currently powered radio assets and original source ephemeris; no fictitious future receiver. Original 7C camera numeric terrain record and 7F GPU photographic bytes remain separate. No fabricated astronomical photo or external network image API.

Actual end-to-end complete expedition, map swath stitching, remote station upgrades, manual GPU FPS and multi-day satellite constellation loading remain future T08/T14/T18 scope.

## Repro and rollback

```bash
node tests/orbital-bus-t07.test.cjs
for t in tests/*.test.cjs; do node "$t" || exit 1; done
python tests/standalone-parity.py
python tests/orbital-bus-t07-browser.py
python tests/antenna-hardware-t04-browser.py
python tests/remote-imaging-t05-browser.py
python tests/rover-lifecycle-t06-browser.py
```

The final exact-head `Starfall Engineering Regression` run must show **both** `offline-model` and `browser-smoke` green. Roll back with [verified T06](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t06-autonomous-rover-lifecycle) if any gate is red. Original saves and 7F IndexedDB photo formats unchanged; T07 optional nested `t07` state can be ignored by older code. Do not merge unstable candidates to main.
