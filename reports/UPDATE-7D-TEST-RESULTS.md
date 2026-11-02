# STARFALL 7D — Test Results

**Environment:** Node 22, CPython, Playwright + headless `/usr/bin/chromium` with **mocked WebGL2**. Tests were executed in the supplied container on 2026-11-02; no real GPU benchmark or user-browser cold start was performed.

| Gate | Status | Evidence |
|---|---|---|
| 23 Node model/unit suites | **PASS (23/23)** | `node tests/*.test.cjs` individually, exit 0 (see `UPDATE-7D-MODEL-RESULTS.txt`) |
| New 7D terrain, queued radio, blackout, sample single-downlink, reserve, winch model | **PASS** | `node tests/ground7d.test.cjs`, exit 0 |
| 7D real UI remote script, science, blackout, truck driving/boarding, winch progress + cancellation | **PASS** | `python tests/ground7d-browser.py`, exit 0 |
| Inherited Update 7 rocket/rover/truck gameplay test (updated for deliberately non-instant radio) | **PASS** | `python tests/launch7-browser.py`, exit 0 |
| 7B physical rocket browser test | **PASS** | `python tests/rocket7b-browser.py`, exit 0 |
| 7C satellite browser test | **PASS** | `python tests/satellite7c-browser.py`, exit 0 |
| 7B.1 hierarchical asset browser test | **PASS** | `python tests/asset-hierarchy7b1-browser.py`, exit 0 |
| 7A charger/solar wiring browser test | **PASS** | `python tests/assets7a-browser.py`, exit 0 |
| 7A.1 asset clickable inspection browser test | **PASS** | `python tests/asset-ui7a1-browser.py`, exit 0 |
| 6E controls browser test | **PASS** | `python tests/controls-browser.py`, exit 0 |
| 46 source modules `node --check` | **PASS** | All 46 syntax checks return exit 0 |
| Source-to-offline standalone code parity | **PASS** | `python tests/standalone-parity.py`, exit 0 |
| Outpost/laboratory older browser scenario | **INCOMPLETE** | Standalone run stalled in the earlier combined browser batch; 7A power and Update 5 model suites passed |
| Real WebGL2 visuals and FPS | **NOT VERIFIED** | Browser tests inject a mock WebGL context |
| Browser closed and reopened save persistence | **NOT VERIFIED** | Additive serialization, migration, save-state in-session tests pass, but actual browser restart not checked |

Note: An older `launch7-browser.py` assumed that sending any rover script immediately replaced its onboard commands. Update 7D intentionally makes this physically conditional. The assertion was replaced by a connected/disconnected program check, and new `ground7d-browser.py` confirms both the positive connected path and the blackout queue. No engineering assertions were disabled.

**Remaining limitations:** Distant-star interstellar uplink is not available without a player-controlled same-body receiver; remote drive is not the full local A* planner; the winch uses scene-scale range approximation; additional real-browser QA is needed before calling this production-ready.