# T14 Test and Verification Report — 2026-11-02

## Source and integration baseline

- Based on **verified T13** `feature/t13-ship-service-docking`, SHA `189d3c6a84ea72e687f66af8b966c5a761332147`. T12, T13 and current T11 `main` remain unmodified.
- Feature branch `feature/t14-science-evidence-map` changes source adapters only for science metadata, the original Survey6G viewport, 7F capture metadata, numeric Science Journal and the observatory evidence state.
- No additional authoritative experimental record database, fake orbital images, duplicate science Joules or instant distant radio.

## Test matrix

- `node tests/science-evidence-t14.test.cjs`: all 8 existing rated sensors have positive finite SI limits, seeded source result unchanged, quality degradation grows with fault and temperature, malformed/double evidence rejected, source/fromLatLon identity with T06 rover, no map evidence from unreceived photos/unexamined ruins, known actual 7F downlink required, no false planet-wide coverage.
- `python tests/science-evidence-t14-browser.py`: real file:// Chromium/SwiftShader STARFALL boots to a controlled prior landed save. Actual rover instrument measurement enters the original Science Journal once, map filtered evidence uses the exact T06 latitude/longitude, an undownlinked photo is not fabricated, corrupt new-T14 observations are rejected and page reload preserves IDs/quality.
- Existing CI `tests/*.test.cjs`, all T00–T13 Chromium scripts, `tools/build-standalone.py` and strict `tests/standalone-parity.py` are mandatory. T14 standalone workflow regenerates source-backed `PLAY-STARFALL.html` deterministically.
- **Latest branch CI must be consulted before claiming full PASS.** Intermediate rapid source commits may cause transient strict parity failures while asynchronous bundle workflow catches up; those are not release verdicts. Direct success for an earlier SHA does not certify a newer SHA.

## Known gaps — no overclaim

- No separately certified physical calibration procedure or instrument mount inventory system was introduced. T14 labels the inherited calibration state **legacy baseline** and qualifies uncertainties, rather than inventing data accuracy.
- Existing T03/T06 and T05/T07 tests separately cover true remote rover transmission and actual camera/satellite photometry. **A continuous manual expedition proving two distinct remote waypoints + actual photographed ruin + actual orbital image + full receiving lab reference chain has not been completed**.
- Real GPU target hardware FPS, keyboard/mouse manual rover/ship/truck/EVA, physical ruin enter/exit and cross-planet travel are **not manually verified by this branch**.
- The existing Survey6G fog OFF mode is a **procedural seeded terrain preview**, not a claim of measured coverage or evidence. Evidence markers are receipt-gated independently of it.
- Catalogue observations remain fictional seed-derived science; confidence is relative model-data uncertainty, not probability of actual extraterrestrial life.

## Rollback

Revert to `feature/t13-ship-service-docking` (unchanged verified baseline). T14 must remain draft and not merge into T13 or `main` until complete latest full CI, actual manual acceptance and merge approval.
