# STARFALL Update 7E — Verification Report

**Status:** RELEASE CANDIDATE (automated source/model checks PASS; actual GPU gameplay and cold-restart persistence NOT VERIFIED)  
**Date:** 2026-11-02  
**Target:** `feature/update-7e` on GitHub  
**Rollback:** `release/update-7d`

## Verified CI run

GitHub Actions: https://github.com/hatutaletangeni/Space_starfall/actions/runs/41441439763  
Commit: `111c1770d80947827bb0fd062893ea814db4c68b`  
Environment: Ubuntu GitHub-hosted runner, Node.js 22, Python 3.13, no runtime dependencies installed.

| Check | Result | Exact command |
|---|---|---|
| Source scripts syntax | **PASS** | `find src -type f -name '*.js' -print0 | while IFS= read -r -d '' file; do node --check "$file"; done` |
| Original deterministic galaxy catalog | **PASS** | `node tests/galaxy.test.cjs` |
| Launch/ramp-compatible simulated launch + staged orbit, legacy rover + serialization | **PASS** | `node tests/launch7.test.cjs` |
| New repeatable 7E rover, power, rocket, provenance and blueprint tests | **PASS** | `node tests/research7e.test.cjs` |
| Existing science/physics suite | **PASS** | `node tests/science.test.cjs` |
| Strict source-to-bundle equality | **PASS** | `python tests/standalone-parity.py` |
| Standalone rebuild with clean Git diff | **PASS** | `python tools/build-standalone.py && python tests/standalone-parity.py && git diff --exit-code -- PLAY-STARFALL.html` |

CI confirms **48 JavaScript modules** and **13 external stylesheets** embed exactly in `PLAY-STARFALL.html`, with no remote runtime imports. The clean rebuild generated a 707,266-byte offline HTML in the CI environment. All steps above returned **exit code 0**.

Separate V8 in-memory checks of 7E's actual model source also passed: deterministic rover observations, changing gear effects, steep-slope rejection, battery bounds, finite rocket solver output, zero fake orbit success, blueprint provenance/import validation, persistence, comparison and malformed-design rejection. These are **not** substitutes for UI or GPU tests.

## Not verified / remaining gates

| Gate | Status | Reason |
|---|---|---|
| Actual 7E button/dialog interactions in Chrome/Edge with real gameplay | **NOT VERIFIED** | No complete browser interaction run recorded for this branch |
| Real hardware GPU rendering and sustained frame-time benchmark | **NOT VERIFIED** | Node tests do not run a GPU game session |
| Play full star chart → flight → landing → EVA → truck → science rover → research UI | **NOT VERIFIED** | Must be exercised as a full real-device path |
| Full browser close/reopen with previously saved 7D data and new 7E trials | **NOT VERIFIED** | Models and serialization tested, but not browser restart |
| All archived 7D tests (23 model suites + extensive Playwright tests) | **NOT RE-RUN** | 7D ZIP was archived in the project file library; its raw bytes were unavailable during GitHub recovery; only tests checked into this GitHub branch ran |
| Touch layout / performance and long-session heap | **NOT VERIFIED** | Real browser/device required |

The inherited baseline `tests/launch7.test.cjs` still expected a scripted rocket ascent, now incompatible with force-based 7B flight. It initially failed CI due to missing 7B loading, then was updated to require actual integrated ascent, observable stage separation, a stable orbit before deployment and retained rover/serialization assertions. No assertions were disabled to hide a failure. The latest CI run is green.

## Model limitations

- Rover trial samples a bounded synthetic grade with the existing six-contact rover solver. Speed and energy are extrapolated as a reduced-order bench estimate. Gear/wheel changes are **not applied to live vehicle controller**.
- Electrical trials use the installed power bus. A generator can produce electricity even at zero solar incidence; darkness does not imply total generation is zero.
- Rocket trials use the real installed 7B planar force-integrated solver and correctly label coast, failure or orbit; this is not six-DOF aerospace fidelity.
- Saved blueprints are configurations with provenance and recorded **model tests**, not real-world engineering certifications. Imported blueprints are marked externally sourced and cannot directly change live assets.
- No game progression, XP, economy or required quests.

## Next release checks

Before claiming Update 7E a verified full gameplay release, use real Chrome/Edge to open both `index.html` (with `src/` beside it) and `PLAY-STARFALL.html` offline; land and open **Engineering Workbench → RESEARCH BENCH**; run rover/power/rocket trials, compare their records, export/import a blueprint and apply a compatible validated design only while parked; then reload to check persistence. Test flight, truck exit/W, science rover, launch, satellite observations, radio outages, outposts and normal legacy controls. Record GPU FPS and browser console output. A failure should revert to `release/update-7d` rather than rewrite the underlying flight code.
