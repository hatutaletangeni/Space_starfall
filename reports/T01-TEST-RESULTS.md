# STARFALL T01 — Verification, Known Issues and Release Decision

**Date:** 2026-11-02  
**Parent:** T00 passing commit `50086f3bd3d1fb8a42d0b018a6d7a90c350e1f5f`  
**Feature branch:** `feature/t01-offworld-operations-clock`  
**Latest checked complete CI:** [GitHub Actions run 41458809273](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41458809273) (all jobs **success** at commit `8b1c41273b523f7d1605b9594ab75bdbaadc53c1`).

## Evidence

| Gate | Result | Evidence |
|---|---|---|
| JavaScript syntax of all editable modules | PASS | CI offline-model job |
| All checked-in Node models and T00 catalog/contract test | PASS | CI offline-model job |
| New T01 deterministic replay 1,000 × tiny advance versus bounded 100× catch-up | PASS | `tests/mission-operations-t01.test.cjs` in CI |
| Midpoint save/reload and leave/revisit equivalent outcomes | PASS (model-level) | `tests/mission-operations-t01.test.cjs` |
| Rover onboard program continues while simulated radio link is down | PASS (model-level) | `tests/mission-operations-t01.test.cjs` |
| Satellite energy/thermal state and remote probe WAIT/STOP through real offline browser, plus reload | PASS (headless software WebGL fixture) | `tests/mission-operations-t01-browser.py`, browser-smoke job |
| Existing 7E/7F dialogs, camera and 7F hardening regression | PASS (headless Chromium) | browser-smoke job |
| Standalone source parity and reproducible offline rebuild | PASS | CI offline-model job and temporary builder job |
| Authentic full player-launched expedition on real GPU and historic saves beyond LRU cap | NOT VERIFIED | Requires manual test / T18 |
| New A-to-B communication, full remote 7F photo, T02 power ledger | NOT IMPLEMENTED | T03/T05/T08 dependencies |

### Honest scope of tests

The T01 browser test uses the real **`file://` offline standalone**, authentic JavaScript gameplay modules and the existing 7D/7C model; it installs **controlled test fixtures** for a remote rover and satellite instead of pretending to have executed a complete manual mission. It verifies browser state advances off-world and reloads but does not constitute a successful launch/landing/true interplanetary communication gameplay test. Software-WebGL timing is **not real GPU FPS**.

## Player safety

- Original ship controls, EVA physical ramp, truck boarding, 7B rocket force solver, terrain model, and 7F camera pixel pipeline are intentionally unmodified.
- The remote clock does not create a second rover/satellite, engine fuel, science value or energy account.
- Long (>24h) jumps remain `AWAITING_REVIEW`, not magic completion. A missing legacy ephemeris remains frozen and reports a fault, not a fabricated orbit.
- A saved duplicate event receipt is rejected. New record creation at capacity requires explicit archival rather than silent deletion.
- Clock and source owners save under existing `SF.save`; `missionOps.schema=1` is additive and optional.
- Old saves without `missionOps` initialize the clock from the saved flight simulation timestamp; a mismatched seed will not import unrelated mission jobs.

## Outstanding issues and severity

- **P0, scheduled T03/T08:** no real cross-planet powered routed radio yet. Existing control has local same-world requirements, so **new** Planet A→Planet B programs remain blocked. Pre-delivered onboard scripts advance.
- **P0, scheduled T05:** actual Camera 7F cannot capture an unloaded world's scene. The T01 event clock queues metadata without inventing image pixels.
- **P1, scheduled T17:** older far-away saved assets lacking orbital host snapshots need a best-effort future migration or a fresh visit for ephemeris. Never silently drop old objects.
- **P1, future verification:** remote 7C data transport/ACK and physical labs still use their existing limited mechanisms until T03/T10.
- **P1, limits:** large nonlinear gaps deliberately require manual review; no forced end-of-game time jump, CPU unbounded catch-up or invisible wall-clock time.
- **P2, fidelity:** 5s operations ticks and 48V lumped DC are engineering approximations; ship flight remains at existing higher-frequency integration.

## Files changed

**Added:** `src/physics/mission-operations.js`, `src/physics/mission-operations-ui.js`, `tests/mission-operations-t01.test.cjs`, `tests/mission-operations-t01-browser.py`, `docs/T01-OPERATIONS.md`, `reports/T01-TEST-RESULTS.md`.

**Surgically updated:** `src/flight.js` (single clock hook), `index.html` (2 scripts), `src/physics/launch-ui.js` and `satellites-ui7c.js` (single owner tick handoff), `src/physics/outposts.js` and `outposts-ui.js` (saved body snapshot + original remote power solver), `src/physics/launch-systems.js` (satellite body snapshot), `.github/workflows/engineering-ci.yml` (new browser test), and rebuilt `PLAY-STARFALL.html`.

**Rollback:** checkout the green [T00 branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t00-technology-contract-audit); for the latest pre-T00 runnable game use [7F hardening](https://github.com/hatutaletangeni/Space_starfall/tree/feature/update-7f-expedition-hardening).

**Decision:** **T01 RELEASE CANDIDATE**. All available automated gates passed on the cited commit, but manual real hardware, old remote LRU fixtures and complete remote expedition are not verified; do not merge into stable without those checks.
