# STARFALL Combined 7F — Performance & GPU Verification Report

**Evidence:** [passing GitHub Actions run 41447681662](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41447681662), jobs `offline-model` and `browser-smoke`. CI artifacts: `starfall-7f-software-webgl-qa`, containing an **actual** `offline-game-chromium.png` screenshot and `software-webgl-performance.json`. The screenshot and JSON were recorded by headless Chromium; no promotional or synthetic screenshots have been substituted.

## Environment and actual measurements

| Test property | Observed value / status |
|---|---|
| Runner | GitHub-hosted Ubuntu 24.04, Node 22, Python 3.13 |
| Browser | Chromium 141 under Playwright 1.56 with ANGLE SwiftShader software WebGL2 |
| Scene | Offline `file://` single-file `PLAY-STARFALL.html`, 1,280×800 browser viewport |
| Rendering backend | **Software WebGL** (not a physical GPU benchmark) |
| Sample size | 19 collected frame timings during ~4 seconds profiling |
| Measured frame p50 | **200.00 ms** |
| Measured frame p95 | **424.93 ms** |
| Measured frame p99 | **484.91 ms** |
| Derived p50 equivalent | about 5 fps, **software-rendered CI only** |
| One sampled JS heap | **28,059,883 bytes** (about 26.8 MiB) |
| Memory trend / heap slope | **NOT VERIFIED**, only one heap sample |
| WebGL error history | **NOT VERIFIED** (test verifies real offscreen render and JS console, not continuous GL error counters) |
| Real Chrome/Edge on a named desktop GPU | **NOT VERIFIED** — no physical device run |
| Camera sensor frames | **PASS in SwiftShader**: real rover/camera WebP rendered and decoded, pixel-diversity checked |
| Idle panel switching / offline requests | **PASS** in CI: seven dialog paths, no external HTTP(S) requests |
| Dense ecology, large outpost, launch, many satellites, 100× load FPS | **NOT VERIFIED** as a combined full-play 3D stress route |

These software metrics must **not** be interpreted as actual GPU FPS. The 200 ms median is a performance concern on CI's CPU rasterizer; whether the game meets its player-facing frame budget on real GPU hardware is unknown.

## Measurement procedure for a real device (next release gate)

Record real Chrome or Edge version, OS, CPU, discrete/integrated GPU model, driver, viewport, actual canvas resolution, graphics power settings, render scaling and `performance.memory` availability. Open Diagnostics → enable frame-time profiler, record at least 240 frames per workload and export JSON. Use Chrome DevTools Performance/Memory/WebGL if available. Never present fake percentile numbers.

Repeat for each: (1) dense surface, (2) >1 rover/truck, (3) wired outpost cluster, (4) force-based rocket ascent/staging, (5) satellite pass and imagery, (6) 2,368-system search, (7) archaeological interior, (8) ecology, (9) 100× operation and long time warp, (10) 20+ sequential launches with persisted orbital assets, (11) mission image downlink backlog, (12) browser close/reopen. Compare baseline Camera 7F and combined 7F at identical seed, camera position and browser settings.

For each workload capture average FPS, p50/p95/p99 frame intervals in ms, stalls >50 ms, draw calls, world/mesh/terrain cache counts, JS heap start/end and GPU warnings. Claim **PASS** only when observed on the actual device.

## Priority-ranked performance risks

- **P1, unresolved performance gate** — software renderer produced 200/425/485 ms (p50/p95/p99), requiring a hardware GPU test before any production performance claim.
- **P1, unmeasured memory trend** — photo capturing 1024 px and panorama can allocate large transient arrays and IndexedDB data; one 26.8 MiB heap sample cannot prove no leak.
- **P2, workload not exercised** — multi-asset 100× play can increase solver/backlog cost; see 26-launch deterministic model tests, but there is no sustained real-browser FPS record for that workload.

## Captured artifacts

Open the linked GitHub Actions run, find the **Artifacts** section and download `starfall-7f-software-webgl-qa` (artifact ID `13143630304` for the successful run). The PNG is a factual headless screenshot; it is **not** a screenshot of a real physical GPU session or evidence of completed expedition scenarios.
