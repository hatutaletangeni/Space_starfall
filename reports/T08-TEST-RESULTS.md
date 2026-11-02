# T08 — Interplanetary Communications Engineering Verification

**Project:** STARFALL / T08
**Started from:** last fully green T07 commit `2213d180806cdc60e81080521697b222fea88fbf`  
**Branch:** `feature/t08-interplanetary-comms`  
**Verification scope:** Real original `file://` Chromium browser and source-owned components, plus original T00–T07 regressions. Human field excursion/physical GPU remains unverified.

## Flagship integration proof

[Focused real offline browser GitHub Actions run **41489073992**](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41489073992) completed **SUCCESS** on T08 source revision `2bc9d33f473c45faea734b079823022f64a7d261`. It generated `PLAY-STARFALL.html` from original editable source, passed strict byte-for-byte standalone parity and `node tests/interplanetary-t08.test.cjs`, installed real Playwright Chromium, then executed `python tests/interplanetary-t08-browser.py`. Exact final QA console line:

```text
PASS T08 real file:// Chromium FLAGSHIP controlled assets:
 from Planet A real powered 4-hop link to Planet B rover,
 blackout blocks/holds command, actual T03 ACK,
 offworld T05 WebGL rover photograph,
 physical B→A bytes+latency,
 exactly-one science receipt and Gallery ACK across reload;
 no route stubs or teleport
```

**The browser built real stations in the existing `Outpost.Store`**, linked solar + battery + antenna across original T02 source-owned wire graph, commissioned the two original T04 surface antennas with a separate electrical high-gain module, and required *both* original T02 reports to be powered. It deliberately disabled the destination station before commanding the remote rover; the original T03 packet retained zero transmitted bytes, and the rover did not receive the command. After repowering, it used an actual four-node route:

```
Player physically on Planet A
  landed ship radio (Starfall vehicle Store)
    ↕ real same-world T04 hop
  Planet A commissioned high-gain antenna (outpost5/T02)
    ↕ actual deep RF hop with moving-body LOS and c delay
  Planet B commissioned high-gain antenna (outpost5/T02)
    ↕ real same-world T04 hop
  Planet B predeployed science rover (launch7/7D)
```

The particular first accepted command route reported a **nonzero ~0.018s** one-way delay at **~47.75 kbit/s** bottleneck. This is **the game's compressed orbital scene distance**, *not* a realistic Earth–Mars separation or communication time. The original camera request was executed only after real T03 command receipt. The original **T05 remote WebGL2 renderer generated actual Planet B image bytes**, original 7F IndexedDB kept image/thumbnail, and the photo could appear in the existing gallery **only** after the original B→A IMAGE_REF packet was `ACKED`. The original rover numeric observation reached the original science journal once, and station/photo/receipt states survived an actual `file://` browser reload. No fake camera draw, stubbed `remoteLink`, or teleport.

## Model contract results

The same successful run printed:

```text
PASS T08: commissioned 48V RF dual antenna; source/peer power +
 pointing, LOS occultation, finite A ship→A dish→B dish→B rover route,
 T03 byte+ACK, fictional opt-in and honest interstellar RF delay
```

Model coverage: cross-body A/B geometric LOS with actual body spheres; missing peer and wrong pointing; battery outage; T04 165W baseline + T08 1100W real additional draw through the existing power ledger; no direct rover-to-interplanetary mast; deterministic path hop list and bounded source bytes; existing T03 ACK/custody/serial migration; real star-system differentiation and FICTIONAL explicit interstellar option. New transport scheduling groups commands and photographs that share a high-gain dish pair into **one half-duplex bandwidth budget**, with original STOP and control priority.

## Source map and changes

| Authoritative owner | Modification | What was preserved |
|---|---|---|
| `src/physics/interplanetary-t08.js` | New pure narrow deep link planner, existing antenna upgrade/peer config, per-hop actual local/T04 vs deep T08 radio, shared physical LOS/latency, realistic same-system vs fictional cross-system semantics | No new asset/energy/packet/terrain inventory |
| `src/physics/antenna-hardware-t04.js` | Preserve optional `radioT04.deepT08`; add its actual rated W to original loadW/T02. Expose T08 status in T04 diagnostics | Original local omni/fixed/tracked radio and 7C relay |
| `src/physics/mission-comms-ui-t03.js` | Dispatch **only real cross-body endpoints** to T08 route planner, keep T03 receive/custody and same-body route unchanged; remote mission TTL; use correct source body's powered antenna | Original T03 packet IDs, byte store, ACK, gallery/science |
| `src/physics/mission-transport-t03.js` | Physically shared T08 station pair half-duplex channel (rather than unlimited parallel packet paths), original priority shares | Existing local links and maximum 12MB 240 packets |
| `src/physics/outposts-ui.js`, `index.html` | Add commissioning/target/status UI to existing RADIO tab; recompute original T02 real powered load on configuration | No extra menu, XP, vehicles, camera, EVA keys |
| `tests/interplanetary-t08.test.cjs` | Deep station/pointing/power, occlusion, formal link, packet conservation, fictional versus real | Pure Node, offline |
| `tests/interplanetary-t08-browser.py` | Real flagship original game, controlled physical infrastructure, 4-hop A→B command and B→A photo, radio blackout, reload | No mocked radio links, image or T03 transport |
| `.github/workflows/engineering-ci.yml` | T08 real browser appended to **all** existing T00–T07 regressions | Both Node and real browser mandatory |

## Full regression status

The full `Starfall Engineering Regression` workflow runs **every earlier T01–T07 real Chromium scenario, all deterministic Node suites, source JS syntax and strict standalone parity**, then the new T08 full flagship. The **final exact-commit** status must be verified after temporary T08 builder/focused workflows are removed. An earlier successful focused T08 run does **not** by itself certify the entire historical suite or a subsequent commit. If a prior T03/T04 save/reload smoke sporadically fails, do **not** silence its assertions; investigate and rerun final exact commit until the full gate is green.

## Known limitations and honest engineering interpretation

1. **Source-owned packet semantics:** This is a genuine physically gated **end-to-end four-hop packet route**, but the existing T03 ledger stores one end-to-end `sendBytes` / `recvBytes` / `custody` state, not a separately acknowledged persistent byte window at every intermediate tower. A full in-flight dropout may cause a conservative resend; exact per-hop physical custody in a disconnected relay network is still a future improvement. Outages before completion preserve unsent progress and 7F science/photo source records.
2. **Full universe radio:** Cross-body same-star high-gain is operational in the simulator. Distances are the game's generated **scene** coordinates, not measured physical astronomical AU. Ordinary cross-star RF is blocked rather than falsely granting instant delivery. FICTIONAL mode requires two existing separate star-system antenna upgrades and is explicitly an accelerated game mechanism, not general relativity/speed of light physics. Real interstellar years-long transmission would need actual physical star position scaling and long-duration clocks.
3. **Station deployment:** The browser test programmatically built pre-commissioned real surface hardware on both worlds and inserted a previously deployed B rover into the original 7B store; there are no mocked route or WebGL functions. The test does **not** prove that a human has performed the entire rocket delivery/landing/build sequence physically within the game.
4. **Relay on another planet:** Existing powered T07 7C satellites can participate in the local hops they actually support, but a free local satellite is **not** a high-gain interplanetary repeater. High-gain hardware is currently only installed on existing wired surface antennas. Orbiting deep-space relay electronics require a separate powered installation contract.
5. **No atmospheric RF turbulence or full pointing jitter/noise thermal FE:** LOS, the antenna's saved target, electrical power and finite distance-dependent margin are enforced. Remote stations do not require the player to be present and are advanced by the T01 scheduler. A modeled 1100 W high-gain amplifier load is a conservative device rating, not independently measured radio hardware.
6. **Performance:** 100× operational clock is bounded; no new always-rendered offworld terrain. Full-game GPU load on a particular physical Windows laptop, many simultaneous interplanetary missions and human-played EVA/boarding/truck X are not verified in this T08 scenario. Earlier T01–T07 browser tests protect original functionality.
7. **Browser image portability:** 7F actual photo bytes remain in original IndexedDB, not in ordinary SF JSON. Use the already implemented **portable camera archive** for browser/device transfer.

## Commands

```bash
node tests/interplanetary-t08.test.cjs
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/interplanetary-t08-browser.py
# CI additionally tests every original T00–T07 model + Chromium browser suite.
```

**Rollback:** [verified T07 branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t07-operational-satellite-bus). T08 was created from exact verified T07 commit and does not alter stable/main. Backup your current save and portable camera archive before switching.
