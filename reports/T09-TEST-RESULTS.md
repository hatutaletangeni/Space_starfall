# T09 Habitat Engineering — Actual Regression Report

**Parent baseline:** Updated `main` commit `a6456b792e4b037b9d092409b4ad7785040ab862` ([T08 release PR #5](https://github.com/hatutaletangeni/Space_starfall/pull/5)).  
**T09 feature:** `feature/t09-habitat-environment-operations` (additive; stable main intentionally untouched while testing).

## Green integrated evidence

[GitHub Actions **41493312001**](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41493312001) returned **both** `offline-model: SUCCESS` and `browser-smoke: SUCCESS` after source-integrated changes. The actual Chromium log:

```text
PASS T01 browser: remote rover WAIT/STOP + battery and satellite saved independently
PASS T02 Chromium: real daylight 48V grid, wire switching and reload
PASS T03 browser: powered ship rover radio, blackout, persisted ACK
PASS T04 browser: real powered T04 antenna, 2-hop radio, tower custody, reload
PASS T05 browser: actual offworld WebGL image, no fake photo or teleport
PASS T06 browser: controlled capsule, rover Camera 7F and source-debited battery servicing
PASS T07 browser: Kepler attitude/observations, real image, T03 ACK and original map receipt
PASS T08 browser: Planet A ship→powered antenna A→powered antenna B→Planet B rover, real return photo and packet ACK
PASS T09 real file:// Chromium: real Outpost hab and wired 48V 680 W battery/solar,
 finite gas/HVAC, unplug+leak pressure fault, unsafe airlock blocked,
 physical reconnect+repair, real saved gas inventory and cables reload,
 original EVA/ship controls retained
```

All deterministic Node model suites—including `tests/habitat-t09.test.cjs`—source JavaScript syntax checks, exact source/compiled `PLAY-STARFALL.html` byte parity, and the listed browser tests passed in that run. **A later documentation/cleanup commit requires one more final exact-SHA CI run**; previous source success is not enough to certify untested changes.

## T09 acceptance evidence

| Contract | Automated result / explicit limitation |
|---|---|
| Existing `hab` appearance/position, original 680 W load | **PASS** original Outpost Store and T02 existing power device, no altered scene mesh |
| Multiple structures and independent habitat state | **PASS model** per-item nested `habT09.schema=1`, each body/device ID in original store |
| Real solar+battery wires power environment | **PASS browser** genuine connected Outpost items and T02 `byId[hab].power`, `servedW=680` |
| Pressure/O₂/CO₂/temperature/water/air-filter inventory | **PASS model** ideal gas, positive finite gas species, cylinder and scrubber debit, lumped thermal exchange |
| Damaged seal plus disconnected wire pressure decay | **PASS browser** true removal of physical power cable and deterministic leak, unsafe alarms, no fake stored Joules |
| Unsafe atmosphere prevents airlock | **PASS browser** T09 explicit CLOSED pressure safety guard denies open/cycling |
| User-initiated repair and re-pressurization | **PASS browser** repair consumes no fake gas; original finite stored cylinders replenish actual pressure over time when DC power returns |
| 15-second airlock movement and brownout lockout | **PASS Node model** finite time cycle OUT/IN, no spontaneous outside transition or powered actuators without DC |
| Old saved `hab` migration | **PASS Node model** STANDBY without oxygen health penalties, original `outpost5` top-level schema retained |
| Idempotent time step and bounded backlog | **PASS Node model** repeated tick unchanged, >24h marks awaiting review and no invented gas |
| Physical charging service | **PASS Node model** 24 scene-unit range, actual connected T02 battery, finite 2.5 kW and 90% efficiency, invariant `source debit = rover credit + loss`, cooldown |
| Keep X truck, EVA, ship ramp and ruins | **Source unchanged and original browser regressions PASS**; full manual human interact test NOT VERIFIED |
| Actual browser reload preserving status and original wire graph | **PASS Chromium**, source-owned hab nested inventory and pressure data and two cables confirmed in raw `localStorage` and after reload |
| Fully walkable habitat interior | **NOT IMPLEMENTED by design**; adding a room could compromise original boarding/ruin priority, so T09 is a safe, explicit systems UI release |
| Real GPU/physical 100× human play | **NOT VERIFIED**; Chromium uses software SwiftShader and a controlled existing-asset fixture |

## Source map

`src/physics/habitat-t09.js`: real model functions `ensure`, `external`, `step`, `inspect`, `command`, `serviceRover`, source-owned cabin species, thermal mass, finite cylinder consumables and repair safety.  
`src/physics/outposts.js`: original `Store.add/restore/serialize` migrates and preserves nested optional state, no new identity or power battery.  
`src/physics/outposts-ui.js`: applies life-support gas/thermal integration during existing sampled T01/T02 outpost power advance on each body, displays numerical diagnostics/alarms, local explicit commands and original T02 credit/debit service.  
`index.html`: one additional Outpost tab, no new modal/gameplay movement keys.  
`tests/habitat-t09.test.cjs`: modeled physical finite conservation and safety.  
`tests/habitat-t09-browser.py`: actual `file://` game, real T02 source, leak/repair, saved gas and cabin, browser reload.  
`.github/workflows/engineering-ci.yml`: all T01–T08 untouched regression paths plus T09 true-browser pass.

## Severity and known limitations

- **P1 realism:** The initial habitat construction installs a finite assumed inventory of compressed O₂/inert gas, one finite scrubber, and water; the game does not yet require an industrial transport chain for delivering refill cylinders. They are *not* replenished when repairing. Full T10–T13 logistics/inventory will be needed.
- **P1 walkability:** Cabin remains non-walkable. It is a real source-owned climate model presented on the existing Outpost screen, not a collision-enabled 3D interior. This avoids introducing a ship-ramp/ruins/truck X interaction conflict. **No on-foot enter/exit interaction** is claimed.
- **P1 airlocks:** Cycling is timed and safe cabin state is checked; the model does not explicitly simulate an independent pressurized two-chamber vestibule or suit/crew pressure equalization, nor player pressure injuries.
- **P2 thermal science:** Cabin is well mixed and the thermal plant is lumped, no convection/radiation airflow field, no physical refrigeration loop COP, no heat-loss radiation to space, and exterior defaults to conservative estimated vacuum/230 K when planetary atmosphere numbers are unavailable.
- **P2 power:** 680 W unchanged existing nominal includes pressure control, scrubber and HVAC. Peak gas cylinder regulator flow uses finite **pre-filled gas cylinder inventory**, not separately modeled mechanical energy for pressure bottle delivery; no free gas. A charged wired 72 MJ source is still required for electrical actuators.
- **P2 emergency battery:** No fictional local backup source is installed; `backupReserveJ=0`, even if a UI inspector reads this; real solar/wired batteries provide existing backup.
- **P2 refill:** Actual water, oxygen, inert gas and scrubber cartridge refills are unavailable without physical inventory logistics. Once exhausted the habitat goes unsafe instead of silently conjuring supplies.
- **P2 performance:** One 80 m³ cabin, analytical finite-step integration, time bounded by original T01's operations scheduler and capped original outpost source steps; real GPU/expedition/user-hand operation not measured.
- **P2 crew:** Occupancy only explicit scenario modeling; **no player oxygen, health, hunger, sleep, death or other forced survival requirements**.

## Reproduction, release, rollback

```bash
for t in tests/*.test.cjs; do node "$t" || exit 1; done
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/habitat-t09-browser.py
# CI also executes every T01–T08 real browser case and source JS syntax.
```

Do not merge T09 to stable/main until final exact-SHA regression is green. Prior stable/rollback: [main](https://github.com/hatutaletangeni/Space_starfall/tree/main), updated to fully tested T08 via PR #5. The optional `habT09` nested item record is backwards compatible, but always export SF save and 7F portable photo archive before reverting binaries.
