# STARFALL T03 — Test Results, Risks and Release Handoff

**Date:** 2026-11-02  
**Parent:** T02 fully passing commit `ed3d53a29849d2e9fb9c8f7f7640483a9f9008fa`  
**Branch:** `feature/t03-mission-comms-protocol`  
**Milestone:** A real local packet transport **foundation**, not the complete off-world Planet A→B photo mission.

## Confirmed green CI evidence

[GitHub Actions 41468182200](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41468182200) completed **SUCCESS** at source commit `85d3bc4d8e8670688c26779daf08ef7625d02d35`. This run included:

| Test | Outcome | Scope / caveat |
|---|---|---|
| Entire Node source syntax and prior model regressions | PASS | Unmodified launch/orbit/ship, catalog, field science and T00–T02 tests |
| New shared packet transport pure model | PASS | Priority STOP > 1 MiB photo bulk, 1 KiB/1 MiB duration differences, bounded shared bitrate, partial upload survives blackout, reload equivalence, exactly-once ACK, seed isolation, no image data URL in save, finite charge |
| Exact standalone rebuild/parity | PASS | **55** editable source scripts + **14** external stylesheets, all embedded in `PLAY-STARFALL.html`; no remote runtime imports |
| Existing 7E research and onboard flight UX | PASS | Real Chromium with WebGL software renderer |
| Existing Camera 7F real image and IndexedDB thumbnail | PASS | Captured true WebGL scene pixels, stored original/thumbnail, original legacy mocked-link test isolated from T03 |
| 7F expedition hardening | PASS | 7 dialogs, safe save import/reload, no HTTP requests and diagnostic capture |
| T01 off-world rover and satellite | PASS | Real browser controlled fixtures, safe save/reload |
| T02 48 V outpost source and switching | PASS | Real browser controlled fixtures |
| T03 **no-stub** ship/rover communications | PASS | Real physically landed ship, actual on-world rover coordinates, same authoritative `StarfallOutposts.radioLink`, ship battery debit, real power blackout, reload, eventual one ACK |

The T03 real-browser test constructs a **controlled rover state fixture**, not a fully launched player expedition. Its connectivity **is not mocked**: it verifies actual ship power, planetary LOS and the same runtime radio owner as the game. The historical 7F browser test deliberately uses an isolated mocked-link fixture to test offscreen rendering and existing IndexedDB bytes; do not mistake that camera test for proof of T03.

**Additional subsequent change:** `src/physics/mission-comms-ui-t03.js` adds a defensive duplicate-receipt energy guard. The final checked GitHub Actions run for the latest release commit must also pass before treating the branch as verified.

## Functional truth table

| Function | Current claim |
|---|---|
| Real same-world ship→rover uplink & emergency stop with finite time/power | **Implemented and automated verified** |
| Signal/receiver power blackout, finite bandwidth, persistent bytes & ACK | **Implemented and automated verified** |
| Deployed rover numeric science enters shared ledger, requires physical receipt | **Implemented; source integration not separately manual-verified** |
| 7C numeric satellite observation uses shared queue and source-owned 7C storage | **Implemented; full orbital pass + power + downlink manual scenario not verified** |
| Actual Camera 7F bytes remain in IndexedDB, metadata uses shared reference packet, gallery delayed until ACK | **Implemented; full complete T03 actual photo radio pass not separately browser-verified** |
| T03 protocol records for SCIENCE_NOTE, TELEMETRY, LAB_ACK | **Schema supported, destination workflows intentionally pending** |
| Real powered 7C relay via original ephemeris | **LOS route candidate supported; actual multi-hop custody/power tests pending T04** |
| Interplanetary/other-system commands from Planet A to Planet B | **NOT IMPLEMENTED until T08** |
| Real off-world 7F WebGL image while destination unloaded | **NOT IMPLEMENTED until T05** |
| Complete hand-played expedition, real GPU FPS and 100× multi-star packet proof | **NOT VERIFIED** |

## Acceptance and safeguards

- The data plane remains in source owners: `launch7`, `engineeringVehicles`, `imaging7f` metadata, and 7F IndexedDB binary archive. `commsT03` is the sole transport owner with small immutable payload references.
- The 7D and 7C previous method signatures remain; T03 adapters prevent independent early downlink once the T03 service is available.
- Sender + receiver finite battery Joules are debited for actual radio activity; T02-powered antennas use their already modeled 165 W nominal draw. A future T04 amplifier model must add live load variations rather than duplicate that base draw.
- The receiver refuses a packet when the ship is unpowered or no actual on-body LOS exists. The T01 clock advances radio in bounded 5-second steps and does not grant offscreen interstellar instant transfer.
- T03 persists packet ACK and source state in one `SF.save` update, guards duplicate evidence and does not copy binary image data into localStorage.
- Full packet transfer is not interchangeable with photo creation; unloading the real world defers Camera 7F rendering until a genuine T05 remote scene context exists.

## Reproduce locally

```bash
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tests/standalone-parity.py
python tests/mission-transport-t03-browser.py
python tests/imaging7f-browser.py
python tests/mission-operations-t01-browser.py
python tests/power-ledger-t02-browser.py
```

Browser tests require Playwright and a compatible Chromium software WebGL runtime. They do **not** measure physical graphics-hardware FPS.

## Regression/rollback

All T03 work remains isolated on [this feature branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t03-mission-comms-protocol). T02, T01 and the user's 7F original remain untouched, with T02 as the exact parent rollback. Save exports before switching the playable standalone between versions.

**Release decision:** T03 **release candidate** only after the final source commit passes the full CI. Any unimplemented paths above remain explicitly open. Next hardware dependency: T04 antenna/relay engineering, then T05 genuine off-world camera and T08 remote interplanetary communication.
