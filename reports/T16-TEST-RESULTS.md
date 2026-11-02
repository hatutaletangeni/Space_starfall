# STARFALL T16 Engineering Checks — 2026-11-02

## Source and scope

- Baseline `feature/t15-asset-manager-real-configs` commit `a09be277975a68cecf9669e7241342c8484d0d39`, independently verified all green before branching.
- This T16 source never changes ship/ramp/truck X, 7B rocket physics, T07 satellite power, T03 packet delivery/ACK, T06 rover path, T12 service or T13 source battery ownership. State cards are read-only adapters and have **no new save schema**. `SF.operationsT16` intentionally does not exist.

## Tests and evidence

1. `tests/operations-t16.test.cjs`: all four states, actual T03 ACK vs T03 RECEIVED, noninvented delay and signal quality, actual 7F downlink timestamp requirement, source-owned Joules and storage/power faults, readable recovery actions, event/mission/asset filters and source immutability.
2. `tests/operations-t16-browser.py`: software WebGL real `file://` build, controlled landed save, no phantom deployed rover/satellite, original queued T03 packet remains pending before ACK, main selector log filter, original Workbench click, immediate selected vehicle card, modal Tab focus, actual Rocket Lab + nested 7C cards, original STOP button, Mission Photos panel, save/reload with no duplicate controls.
3. Original `.github/workflows/engineering-ci.yml` runs all T00–T15 Node and browser cases plus T16 actual Chromium script. Dedicated `.github/workflows/t16-targeted-browser.yml` rebuilds the exact standalone on its runner and checks original source status truth. `.github/workflows/build-t16-standalone.yml` updates `PLAY-STARFALL.html` on the branch after source changes, strict parity required.
4. **Release criterion:** inspect latest branch SHA and all corresponding GitHub Actions to confirm completed PASS. Intermediate rapid source commits can yield transient parity mismatches or a cancelled/rebased standalone bot; cancelled/queued runs do NOT count as passing tests. The current final run status must be checked before claiming a full PASS.
5. Manually controlled ramp walking, physical X truck entry/exit, full Planet A → Planet B T03 remote imaging, keyboard-controlled emergency stop and original hardware GPU FPS are **NOT VERIFIED** in this stage. A controlled saved-landed Chromium fixture verifies source API and UI integration, **not** hand-flown descent/landing or user hardware performance.

## Recovery

- Use unchanged verified `feature/t15-asset-manager-real-configs` as direct regression rollback.
- T14, T13, T12 branches remain independently available, and current `main` is still T11.
- T16 PR must remain draft; do not merge automatically or represent the whole game as full release tested without T18 full-mission evidence.
