# STARFALL T04 — Radio Hardware Verification and Release Handoff

**Date:** 2026-11-02. **Parent:** T03 `707a78fdfbef031ffd311d2c174d2029d0cfec8c`.  
**T04 feature:** `feature/t04-antenna-relay-engineering`.  
**Classification:** Release candidate. Real Chrome/SwiftShader and pure-model verification; no human full expedition or hardware GPU benchmark.

## Recorded test evidence

| Test / claim | Result | Proof / limitation |
|---|---|---|
| T02 wired 48 V array→battery→antenna supplies radio | **PASS** | `tests/antenna-hardware-t04.test.cjs`, T04 real Chromium game; radio is a source-owned Outpost asset with live cable constraints |
| Unplugged battery, radio-disabled or hardware disabled blocks path | **PASS** | Power-grid and live radio tests; explicitly switched RF standby 12 W |
| Fixed pointed antenna aimed away fails the link | **PASS** | Pure physical dot-product/link gain test and real UI click + true planetary LOS in Chromium |
| Tracking uses an actual target and DC energy | **PASS** | Real 165→200 W grid step and UI; **actuator slew dynamics not claimed** |
| Actual rover outside direct ship range obtains tower relay | **PASS** | Live Chromium; ship and rover actual positioned at distinct body-fixed sites and T04 router picks named 2-hop path |
| Real 7C satellite orbit relay with mutual LOS | **PASS** | Real offline Chromium: launch `StarfallLaunch.orbit` sampled over orbital phases; link requires actual geometry, 7C radio enabled and positive battery. 7C radio off removes the hop |
| Laboratory port physically wired to active tower | **PASS model / live end-to-end not separately tested** | Pure T04 adapter checks shared real T02 bus ID; no fake standalone lab transceiver |
| Tower receives actual rover science reference without ship | **PASS** | T04 Chromium: physically sampled instrument reading, radio power blackout, finite source-owned inbox; science journal stays empty until physical forward receipt |
| Ship contact restored and observation forwarded exactly once | **PASS** | Same browser: new physical packet from specific tower, receiver Joule debit, original rover measurement journal receipt and tower buffer release; 1 ACK |
| Save/reload preserves antenna + acknowledgement | **PASS** | T04 browser after T03 cursor skew fix; no future-cursor receipt dropping; old saves default to omni |
| Capacity finite and no silent overflow | **PASS model / full cap UI not tested** | 4 MiB tower and orbital intermediate reservation; T03 keeps global 12 MiB bounded packet ledger and refuses silent loss |
| Per-hop route quality, delay, throughput evidence | **PASS integration source / limited browser UI** | T04 physical hop reports in T03 packet `lastLink.hops`, original T03 byte clock and T01 5s scheduler |
| Unchanged 7E/7F, T01/T02/T03 browser tests | **PASS** | [Full successful run 41472032278](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41472032278) |
| Source/standalone exact parity, all Node models | **PASS** | Same successful run and repeatable temporary standalone rebuild; 56 source scripts + 14 stylesheets embedded, no external runtime imports |
| Performance-bound graph search | **IMPLEMENTED; final CI rerun pending** | 12 nearest intermediate assets, 400 DFS expansions maximum; no unbounded all-galaxy radio enumeration |

### Exact confirmed run

GitHub Actions [41472032278](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41472032278) completed both `offline-model` and `browser-smoke` with **SUCCESS** on the commit that added the actual Kepler satellite relay browser test. It includes all the pre-existing browser suites and new T04 browser scenario. Subsequent small performance work is checked by an additional final full CI run.

An intermediate CI source commit may show red solely because a standalone generation job was still racing the source push. The published feature branch is acceptable only when the **final** exact commit's reproducible offline parity and browser suite pass; see the final run link in handoff.

### Tests to reproduce

```bash
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tests/standalone-parity.py
python tests/research7e-browser.py
python tests/imaging7f-browser.py
python tests/expedition-hardening-browser.py
python tests/mission-operations-t01-browser.py
python tests/power-ledger-t02-browser.py
python tests/mission-transport-t03-browser.py
python tests/antenna-hardware-t04-browser.py
```

Chromium smoke uses true `file://` application and SwiftShader; its nearby structures/probe are **controlled equipment fixtures**, not a claim of manual on-foot construction. Real GPU FPS and complete two-star interplanetary radio are not verified.

## Exclusions and severity

- **P1 — T08 real interplanetary trunk not built.** Source and destination require the same body's actual comms infrastructure. T04 does not create a free Planet A→Planet B connection.
- **P1 — T05 distant 7F renderer not built.** Actual original on-world Camera 7F JPEG/WebP/IndexedDB is preserved, but cannot fabricate an unloaded remote planet image.
- **P1 — no per-hop independent airtime scheduling.** T03 aggregate multi-hop throughput uses minimum link rate, realistic total propagation and bounded relay storage, but not individual per-hop contention/custody receipts and RF backhaul resegmentation; T08/T16.
- **P1 — no actual dish slew controller.** 'Auto-track one target' means a conservative 35 W continuous actuator/control approximation and one explicitly selected endpoint; orientation gain/LOS calculations are real, not full angular rate/thermal actuator integration.
- **P2 — model-specific RF estimates.** Combined effective range uses geometric mean of endpoint range ratings; this is an approximation, not antenna gain in dBi, link noise temperature or atmospheric absorption spectrum.
- **P2 — tower nominal TX and RX draw.** Existing 165 W continuous T02 radio load includes baseline TX/RX budget. The additional variable duty-cycle amplifier, heat and fuse trips remain a future model, not a free new Joule source.
- **P2 — old standalone lab send handler.** T04 packet router requires a wired real lab port; earlier on-site lab shortcut is still maintained for compatibility pending T10 laboratory transport consolidation. Do not interpret legacy local field-radio UI as an interplanetary route.
- **NOT VERIFIED — manual playing with real player controller/GPU, actual 100× multi-day satellite network endurance, and human full expedition sequence.**

## Rollback and stability

T04 is isolated from [known-good T03](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t03-mission-comms-protocol). Original 7F assets and T00–T03 branches are untouched. The standalone `PLAY-STARFALL.html` is regenerated by the existing repository generator; do not manually edit generated bytes. Back up active saves before trying a new branch because `outpost5.items[].radioT04` and `commsT03` add optional versioned state.

**Release decision:** Mark as *release candidate* after final CI success; no automatic merge to main or 7F.
