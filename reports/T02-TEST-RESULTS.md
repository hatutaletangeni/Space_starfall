# STARFALL T02 — Electrical Verification Report

**Date:** 2026-11-02  
**Base:** T01 at `64fe244b74bdca91636242cb76f7b5cf923fccbb`.  
**Branch:** `feature/t02-unified-electrical-power`.  
**Release decision:** **RELEASE CANDIDATE**. Automated evidence below; human end-to-end expedition and real GPU metrics are still NOT VERIFIED.

## Verified gates and evidence

| Contract / gate | Status | Evidence and qualification |
|---|---|---|
| Wired solar array powers battery and antenna in daylight | **PASS** | T02 pure model test; 4,000 W rated solar with proper illumination, real charged battery Joules and live antenna source IDs |
| Nighttime solar zero, charged battery powers antenna | **PASS** | T02 model; actual real battery Joule draw and `sourceWatts` provenance |
| Radio outage when source depleted | **PASS** | T02 model; `NO_SUPPLY` + antenna load-shedding, no negative Joules |
| Connector opens circuit, reconnection restores | **PASS** | T02 model; distinct bus IDs and real source isolation; existing cross-body wire validation remains |
| Transfer preserves `drawnJ = deliveredJ + lossJ` | **PASS** | T02 model; 450 kJ source draw -> 405 kJ truck battery gain -> 45 kJ modeled loss |
| Save/restore preserves battery, circuit and replay | **PASS** | T02 pure model and live browser fixture; no second source balance |
| Finite generator labeled fictional | **PASS** | `power.js` returns explicit generatorModel and workbench systems UI displays fictional warning |
| Existing 7C/7D/7F, asset and flight regressions | **PASS on earlier CI snapshots; final HEAD rerun required** | Existing engineering-ci offline-model + browser-smoke suites |
| Real Outpost Power tab shows source IDs, W, 48V | **PASS** | `tests/power-ledger-t02-browser.py`, real file:// Chromium software-WebGL |
| Click switch -> outage -> reconnect + save/reload | **PASS** | Same real Chromium test, using actual enabled flag, original `outpost5` store and UI controls |
| Remote T01 power source is same grid model | **PASS (code path)** | `StarfallOutpostUI.advancePowerTo` calls original `Store.power` and T02 adapter; tests of individual long dynamic occlusions NOT VERIFIED |
| Strict offline source/standalone parity | **PASS in automatic standalone rebuild job; final HEAD rerun required** | `tools/build-standalone.py` and `tests/standalone-parity.py` |

**CI run references:** [full T02 regression success on earlier source snapshot](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41461159610); [latest T02 full regression series](https://github.com/hatutaletangeni/Space_starfall/actions/workflows/engineering-ci.yml).

## Tests to reproduce

```bash
node tests/power-ledger-t02.test.cjs
node tests/mission-operations-t01.test.cjs
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tests/standalone-parity.py
python tests/power-ledger-t02-browser.py
python tests/mission-operations-t01-browser.py
python tests/expedition-hardening-browser.py
```

Chromium test uses a **controlled installed-outpost fixture** inside the real offline WebGL application, not a claim of real human hands building an entire base or a complete planetary expedition. No network browser dependency is introduced in the playable game.

## Known open issues and severity

- **P1 — physical sockets:** No genuine outpost-docking energy port for spacecraft, local autonomous science rover or deployed 7D rover. Their original battery owners remain independent; using power inspector does not grant remote recharging. T06/T09 to add real spatial ports, rate caps and atomic charge transactions.
- **P1 — solar and cable fidelity:** No terrain mountain-shadow ray casts or nodal copper-wire thermal/resistance solver. Uses sun geometry, eclipse, atmosphere/weather, rated watts, condition and 1.5% network loss / 500 A group fuse approximation. A detailed wire-fuse/panel-maintenance model is a later enhancement.
- **P1 — generator fuel:** Vehicle generators intentionally retain their original `fuelIndependent` behavior and thermal/power models. They are **fictional** and do not claim a real zero-consumable power plant.
- **P1 — complete base simulation:** Continuous 100× multi-day solar/thermal accuracy not experimentally validated beyond the bounded T01 operational stepping, source model tests and real UI fixture.
- **P1 — pad/satellite systems:** Launch pad commissioning and surface transfer into free-flying satellites remain distinct systems. T02 makes no fake cable across space; these require dedicated hardware and test cases.
- **P2 — charging UX:** Truck socket rates are 7.5 kW * 60 simulated seconds per charge session. 60 seconds is a discrete bounded model, not a high-fidelity electrical transient simulation.
- **NOT VERIFIED:** Real GPU FPS, human manually played full power outage/recovery from actual EVA, multi-day real outpost fleet endurance.

## Rollback

Revert to [T01 hardening](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t01-offworld-operations-clock). The T02 feature branch is independent; no changes merged into T01, 7F or default stable. Keep a save export before testing changes because restoring an earlier engine can otherwise discard new status/metadata.
