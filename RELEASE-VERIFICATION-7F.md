# STARFALL — RELEASE-VERIFICATION-7F

**Build:** Combined Camera 7F + Original 7F Expedition/Release Hardening  
**Date:** 2026-11-02  
**Branch:** `feature/update-7f-expedition-hardening`  
**Base and camera rollback:** `feature/update-7f-imaging`; older engineering `feature/update-7e`; original stable `release/update-7d` / `main`.  
**Release designation:** **RELEASE CANDIDATE** — model, browser-smoke, offline build checks pass, but critical full manual expedition and real GPU checks are **NOT VERIFIED**.

The complete **Camera 7F** subsystem is preserved, including world-rendered rover/satellite images, 7C/7D radio integration, IndexedDB photo files, gallery, notes, field/research evidence and browser downlink/reload tests. This hardening update did **not** replace it.

## A. Actual defects fixed

| Issue | Before | Fix | Evidence |
|---|---|---|---|
| **P1** silent launch-history truncation | `Store.restore` discarded the oldest 7 launch records after 45, satellites after 70, remote rovers after 36 | All *valid* older items are retained, with explicit limits on **new creation**: 240 launches, 160 satellites, 100 rovers. No automatic `.shift()` on new launches | `tests/expedition-hardening.test.cjs` **PASS**: 54 launches, 81 satellites and 48 rovers round-trip without deletion |
| **P1** phantom deployment event | A missing destination could set `phase='failed'`, yet caller still emitted `kind:'deployed'` | Deployment now returns an explicit boolean; callers only emit deployed on actual success, and create a failed event otherwise. Reject duplicate payload for the same launch | Deterministic missing-destination and duplicate tests **PASS** |
| **P1** import could silently accept damaged cross-system saves | Save validation checked older fields but did not validate newer `launch7`, research or imaging schemas/seed | Validate launch seed, schema, inventory list shapes, linked research/photo collection types before replacing the stored save | Actual headless browser validator rejected 5 damaged/wrong-seed fixtures, accepted compatible older structure **PASS** |
| **P2** 20+ launch audit absent | Single launch tests did not cover repeated persistent payloads | Added a 26-rocket batch of *force-integrated* launches, stage events, 26 unique satellite payloads, re-update and seed isolation | New model test **PASS** |
| **P2** release evidence scattered | 7E and Camera 7F had separate model reports | Added release verification, migration checklist, physics audit and measured CI performance report, plus screenshot/performance artifact upload | Documents linked below; actual screenshot captured in CI |

No boarding, player input, EVA, ship ramp, truck X interaction, terrain topology, galaxy generation or actual 7F camera capture implementation was rewritten by these fixes. No campaign, currency/XP or new vehicle category has been introduced.

## B. Test matrix — precise scope and release gate

| Release criterion | Status | Actual evidence |
|---|---|---|
| Pre-existing checked-in Node tests pass | **PASS** | `tests/galaxy.test.cjs`, `launch7.test.cjs`, `science.test.cjs`, `research7e.test.cjs`, `imaging7f.test.cjs` |
| New combined hardening test passes | **PASS** | `tests/expedition-hardening.test.cjs`: 26 force-based rocket insertions, unique payloads, save retention, explicit cap, failed deploy, satellite/model energy, rover blackout, photo downlink |
| Actual offscreen camera still renders | **PASS — software WebGL** | `tests/imaging7f-browser.py`: real rover view/image, IndexedDB thumbnail, downlink, reload and real orbit-derived separate scene view |
| 7E Research Workbench actual browser smoke | **PASS** | `tests/research7e-browser.py`: model trials, comparisons, stored blueprint and modal |
| Seven actual operation UI panels open/close | **PASS — browser smoke** | `tests/expedition-hardening-browser.py` uses original event handlers, not a fake interface state |
| Save compatibility and validation in actual file:// browser | **PARTIAL PASS** | V1/V2-shaped sample accepted, 5 bad cases rejected and unrelated field persisted through reload; authentic original Update 7/6J save file **NOT VERIFIED** |
| Offline standalone matches source | **PASS** | Strict full-content parity: 50 JS scripts and 14 stylesheets, clean rebuild with no diff |
| No network downloads in CI play session | **PASS** | Playwright recorded zero HTTP(S) requests; files loaded via `file://` |
| Browser screenshot was actually captured | **PASS — CI software render** | `starfall-7f-software-webgl-qa` GitHub Actions artifact includes `offline-game-chromium.png` and JSON results; no video was recorded |
| Real GPU visual quality/performance | **NOT VERIFIED** | SwiftShader software WebGL, not a real GPU device |
| Real-GPU memory trend / GPU errors | **NOT VERIFIED** | Single Chromium heap sample, no sustained physical GPU profiling |
| Full original 7F Scenario A physically played through UI | **NOT VERIFIED** | Actual player landing → wired pad → rocket → real deployed observatory → real orbital science downlink and map update not executed as a complete uninterrupted player run |
| Full original 7F Scenario B physically played through UI | **NOT VERIFIED** | Interstellar rover carrier → remote script/blackout/sampling/downlink → independent player visit/map cross-check not executed end-to-end |
| Full original 7F Scenario C physically played through UI | **NOT VERIFIED** | Player truck X → drive → walk away → winch recovery → actual powered charging → applied blueprint → ruin interior priority not executed end-to-end |
| 20+ launches in model/serialized state | **PASS** | 26 actual integrated flight-model insertions and payloads; 20+ in-game UI/graphics FPS **NOT VERIFIED** |
| Galaxy LRU/revisit and extreme time warp | **PASS — prior model suites** | `galaxy.test.cjs` and `science.test.cjs` test deterministic LRU/orbital extremes; long 100× visual play **NOT VERIFIED** |
| Compatibility with actual original Update 7 / 6J save files | **NOT VERIFIED** | Authentic save fixtures not present; must be supplied or captured from old releases |
| No critical gameplay blocker hidden | **NOT VERIFIED** | Model and browser smoke pass, but missing full real-player scenarios and real-GPU stress mean no production-readiness claim is justified |

## C. Scenarios A–C: actual steps versus test approximations

### Scenario A — launch and observe
Confirmed via tests: force-integrated 26-pad rocket insertion, non-faked staging, orbital period and battery bounds, field-science source code, satellite sensor model, and camera imagery from a real orbit-derived camera pose. **Not confirmed through one full UI mission:** a manually wired powered foundation, actual payload pointing/eclipses, ground radio passes, map footprint and notebook receipt all together. **Scenario A end-to-end: NOT VERIFIED.**

### Scenario B — remote rover expedition
Confirmed via model: remote rover bounded `DRIVE/SAMPLE/STOP` interpreter; blackout-queued commands; real rendered rover camera with radio availability fixture and IndexedDB persistence; payload carrier uses explicitly fictional warp for interstellar leg *only after physically achieved orbit*. **Not confirmed through one full UI mission:** successful interstellar rover landing, real outpost relay chain, actual remote field readings downlink, flying/walking to verify location. **Scenario B end-to-end: NOT VERIFIED.**

### Scenario C — ground operations/research
Confirmed via browser: 7E bench opens, runs model trials and saves blueprint; seven UI panels open/close. Confirmed via source: truck X boarding/exit and no auto-board safeguards, bounded winch/cable/energy checks, ruin interior and electricity APIs. **Not confirmed through one uninterrupted real-player UI mission:** truck entry/drive/exit, winch, powered charging, blueprint application, ruin priority and return to ship. **Scenario C end-to-end: NOT VERIFIED.**

## D. Performance — observations, not invented estimates

[Software WebGL CI performance report](reports/PERFORMANCE-7F.md) records actual **19-frame sample** in Chromium SwiftShader: p50 **200.00 ms**, p95 **424.93 ms**, p99 **484.91 ms**, one JS heap measurement **28,059,883 bytes**. This is **NOT** a named real GPU, representative sustained workload, or a memory trend. Evidence artifact was genuinely captured in CI; do not infer real hardware FPS from these numbers.

## E. Known issues and unresolved verification, ranked

| Severity | Issue / uncertainty | Player effect / mitigation |
|---|---|---|
| **P0 release gate** | A, B, C full multi-step physical UI expeditions absent | Keep as **release candidate**; must test in a real browser and fix any newly discovered defects before stable merge |
| **P1 performance** | Real Chrome/Edge physical GPU FPS, GL error trend, heavy-asset 100× memory profiling absent | Perform side-by-side original Camera 7F vs combined hardening on named GPU; preserve lower render scale if necessary |
| **P1 compatibility** | Actual original 6J and Update 7 browser save fixtures not supplied | Preserve backup, test each authentic save in an isolated browser profile before stable overwrite |
| **P1 integration** | A real observatory full eclipse → orbital observation → ground pass → map receipt route not captured | Validate same ephemeris/radio position and power/storage across the UI |
| **P1 integration** | Full remote rover interstellar carrier and ground validation not captured | Do not advertise full working long-range mission until real carrier, terrain/receiver and player travel checks pass |
| **P2 browser storage** | Image bytes reside in browser-local IndexedDB, not in portable JSON; different `file://` paths may split archives | Export received photos separately and use consistent origin / browser profile |
| **P2 visual quality** | Real camera photos reflect existing low-poly Starfall world rather than NASA hardware photorealism | Retain faithful image data; consider optional graphics work only after gameplay stability |
| **P2 performance** | Software rasterizer showed 200 ms p50; 100× + many entities unmeasured | Prioritize real GPU benchmarks; do not claim optimized throughput from model-only tests |

The resolved silent-truncation and false-deployment defects have committed source fixes and regression tests. All unverified points above are intentionally visible; no feature flag is used to hide them.

## F. Release/rollback and deliverables

**Full combined 7F project ZIP:** https://github.com/hatutaletangeni/Space_starfall/archive/refs/heads/feature/update-7f-expedition-hardening.zip

**Offline standalone:** `PLAY-STARFALL.html` is contained in that ZIP. Open directly in Chrome/Edge after extraction; no CDN or network dependency is needed.

**Camera rollback ZIP:** https://github.com/hatutaletangeni/Space_starfall/archive/refs/heads/feature/update-7f-imaging.zip

**Other rollback:** `feature/update-7e` for research, `release/update-7d` or `main` for older ground-operations baseline.

**Checks / instructions:** [migration checklist](docs/MIGRATION-CHECKLIST-7F.md), [scientific fidelity audit](docs/PHYSICS-AUDIT-7F.md), [performance report](reports/PERFORMANCE-7F.md), `tests/expedition-hardening.test.cjs` and `tests/expedition-hardening-browser.py`.

**GitHub Actions:** https://github.com/hatutaletangeni/Space_starfall/actions/runs/41447681662 (successful Node, exact rebuild and headless-browser jobs). Captured PNG and performance JSON are in the attached `starfall-7f-software-webgl-qa` artifact. No video was captured.

## G. Repeatable test commands

```bash
for test in tests/*.test.cjs; do node "$test"; done
python tests/standalone-parity.py
python tools/build-standalone.py
python tests/standalone-parity.py
git diff --exit-code -- PLAY-STARFALL.html
# Python Playwright + Chromium test-only dependencies:
python tests/research7e-browser.py
python tests/imaging7f-browser.py
python tests/expedition-hardening-browser.py
```

## Next decisions

1. **Critical:** complete the three real-device scenarios A/B/C end to end while recording failures, not just manually clicking dialogs.
2. **Critical:** validate actual historical 6J/7 saves and browser-close/reopen on a stable `file://` path.
3. **Critical:** measure sustained p50/p95/p99 and memory under representative loads on a documented actual GPU, and fix proven bottlenecks.
4. After clearing these gates, review and merge this hardening branch into the Camera 7F branch, then evaluate whether to release the combined candidate. **Do not promote as verified production today.**
