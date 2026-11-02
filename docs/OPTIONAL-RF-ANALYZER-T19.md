# STARFALL T19A — Optional RF Link-Budget and Commissioning History

**Experimental P3 enhancement**, derived from `feature/t18-end-to-end-release-verification` at `df709d46f52384c2209100670feaeb8522819889`, where all T18 tests completed green. T19 on the master roadmap is **explicitly optional and conditioned on the essential network being fully proven**. The full Planet A-to-B UI-built radio/photo/science mission is still NOT VERIFIED, so this branch is a **separate preview**, **not** an essential system milestone or upgrade to the full-release rating.

## User workflow

1. Physically land and EVA, open **OUTPOSTS / ENGINEERING** → **03 / RADIO**. Build and wire a real solar, battery and antenna first; the existing DC bus must supply the antenna.
2. Select one original installed antenna and an actual receiver (ship, local rover, original deployed rover/satellite, another powered ground antenna).
3. Use **INSPECT LIVE RF ROUTE** to see the currently available T03 physical route. The source owner's actual T02 served watts/volts, T03 hop IDs, simulated one-way delay, normalized model quality and bitrate are displayed. Offline shows an actual original source/route reason rather than fictitious RTT.
4. **RECORD CURRENT MODEL READING** captures an optional source-owned `radioT04.budgetT19` record. It does not send a synthetic test packet. The existing T04 165 W radio load (plus 35 W tracking when selected) remains supplied by the original T02 grid; there is **zero new commanded transmission and no additional energy debit** for reading available state. To send an actual radio packet, use original Mission Control or scientific controls.
5. Choose a receiver to view a compact history graph of route-quality observations and offline periods. Export JSON before clearing. At **48 records**, new recordings refuse visibly (no silent eviction); **CLEAR HISTORY** needs explicit confirmation. Only optional diagnostic history is cleared: the physical radio configuration, source energy, T03 ACK, already measured observations and camera pixels are retained.

## Interpretation and physics

- **Authoritative physical/circuit operations:** `StarfallOutpostUI.store.items[*].radioT04` and its original body-fixed pose, T02 `powerReports`, T04 `station`, T03 `routeFor` with actual T08 commissioned remote station rules. This module does **not** rewrite `routeFor`, `gain`, mission transport, source batteries, mission clocks, rover docking, orbital physics or ship/astronaut controls.
- **Real model outputs:** normalized route quality (0–1), actual T03 source hop IDs, propagated delay seconds, effective bitrate bit/s, existing served watts W, DC volts V, last original ACK ID and timestamp only if an already-existing T03 packet has `state==='ACKED'`.
- **Quality margin dB proxy:** `20·log10(Q / 0.08)` relative to the existing T04 quality acceptance threshold of 0.08. This is a visualization of the game model's dimensionless quality, **not** an antenna gain, field-strength or physically calibrated SNR measurement.
- **Illustrative noise floor:** `−173.83 dBm + 10·log10(B/Hz) + 10·log10(T/290 K) + NF`. For display, temperature is ASSUMED 290 K, noise figure ASSUMED 6 dB, and bandwidth in Hz ASSUMED equal to reported bit/s. The game does not provide measured receiver power, calibrated spectral bandwidth or actual RF noise temperature. **Physical SNR = NOT MODELLED**. The illustrative formula neither gates transmissions nor pretends to be a certified link budget. T08 fictional interstellar carrier remains explicitly fictional.
- **No scan packet/ACK creation:** Pressing INSPECT or RECORD does not create, send, acknowledge, deliver, store or destroy a T03 packet. A fresh pre-transmission game must show **NO REAL ACK**.
- **Failure behaviour:** disabled/disconnected/out-of-power antenna records an offline state and actionable reason, and the selected receiver's original T03 packet state remains unchanged. Switching power back on through the existing Outpost breaker can restore a real route. New sample attempts over-capacity, bad identity, invalid body, time rewind and corrupted owner structure are refused.
- **Save compatibility:** no new top-level save schema. The only optional nested field is `outpost5.items[].radioT04.budgetT19 = {schema:19,samples:[...]}`. Original T04 `repair/configure` now preserves this field. Older T18 saves simply restore with empty optional history. T17 full expedition backup already carries all Outpost owner JSON and media unchanged. Copying the HTML file alone does not carry browser storage; export T17 FULL MEDIA before changing versions.
- **Performance:** DOM chart redraws only on selection/refresh/record/clear, **not per frame**. 48 sample max, 6 hop IDs max, no high-cost orbit/geometry query every tick, no additional large full-screen UI or new vehicles/progression.

## Original UI and regression safety

The existing Outpost module remains the sole authority for radio mode, fixed dish aim, tracking power, deep-space T08 commissioning, wire connections and switching. The new panel is appended below the original Outpost Radio diagnostics and reuses the original selected antenna. No existing button IDs, ship physical hatch, truck X, autonomous rover, science, ruins, solar/battery, T03 packet IDs, 7F image bytes, or offworld receiver state are replaced.

Automated evidence:
- `tests/rf-analyzer-t19.test.cjs`: two real original T04 station nodes and original radio LOS, nominal DC supply, no fictitious packet receipt, trace restore after original mode changes, 48 sample guard, invalid identity/time rejection, manual clear without touching the original radio, relative dB/noise disclosure.
- `tests/rf-analyzer-t19-browser.py`: actual `file://` Chromium/SwiftShader; seeded **starting landed world only**, original Outpost UI construction of solar/battery/antenna, real wire actions, original T02 powered hardware and T03 source route, zero new T03 packets, T19 record and physical breaker outage/recovery, T04 tracking edit, original browser download and save/reload of source-owned trace.
- `.github/workflows/engineering-ci.yml` retains the T00–T18 tests and adds T19 browser, `t19-rf-browser.yml` independently tests the new UI, `build-t19-standalone.yml` retains byte-parity.
- **Do not claim full QA on a particular commit until all three exact SHA workflows pass**. Real user-GPU measurements and full T18 mission 1–4 still NOT VERIFIED; model diagnostic does not change those findings.

Rollback: verified T18 branch `feature/t18-end-to-end-release-verification` (no modifications), plus external T17 FULL MEDIA archive. No automatic merge.
