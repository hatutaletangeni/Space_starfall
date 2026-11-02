# T05 — Genuine Remote Imaging: Engineering QA Report

**Parent:** T04 final verified SHA `86409eb2bf2ceac8b6a972510ec27d657a13e57b`  
**T05 branch:** `feature/t05-remote-world-imaging`  
**Date:** 2026-11-02  
**Status:** Isolated release candidate, subject to green final exact-commit GitHub Actions run and manual laptop GPU smoke.

## Primary proof: actual unloaded world, not a mock photo

Earlier real browser run on [GitHub Actions 41474664995](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41474664995) completed its Chromium job successfully, including **T05 true remote WebGL**, while the source-parity model job was red only because the standalone generator was still catching up with that earlier source commit. The T05 output stated: `catalog-0-p0` was not in the live main galaxy cache, 2,376 encoded photo bytes, 202 independent sampled real colours, original 7F image and thumbnail survive reload, no fake interplanetary ACK, no player teleport, and no HTTP requests.

Subsequent T05 runs include a stronger same-world near-versus-isolated image comparison, real separate-world ecology/archaeology and an archive export/delete/restore test. **Use the final successful GitHub run** to verify those features; do not infer success from an older commit before the tests ran.

## Verification matrix

| Feature | Basis | Scope / status |
|---|---|---|
| Target world is absent from `RT.galaxy.byId` | Separate deterministic clone of user's own actual seeded `catalog-0` star system; live galaxy untouched | **Real browser proven** |
| Same Starfall planet height/biome meshes and shaders | Reuses `Starfall3D.Renderer.captureScience` in a second, genuine WebGL2 context, with original noise-based terrain | **Real browser proven** |
| Actual WebP/JPEG data, image thumbnails | `readPixels`, original encoder, 7F IndexedDB, original 7F thumbnail generation | **Real browser proven** |
| No player teleport or active cache activation | Snapshot main body, target, position, byId.size before and after; verify absent distant world | **Real browser proven** |
| Same-world near vs isolated render agreement | Compare output from original near capture and detached renderer at identical body-fixed eye, forward, up, timestamp | **Automated test added; final run verifies** |
| Real off-world camera after onboard command receipt | Controlled original 7F `Store.markDelivered` fixture represents **previously accepted onboard task** and calls the actual `imaging-ui7f.tick`; **not** a fake interplanetary route | **Real browser proven; cross-body command delivery unverified until T08** |
| Resumable `AWAITING_RENDER` | Real 7F Store job state persists, refuses fake photo, preserved after reload and retry | **Pure model proven; full GPU-loss/retry human sequence unverified** |
| No photo visible before actual radio ACK | Original T03 queue and original 7F `status !== downlinked` block gallery image and download | **Real browser proven** |
| Portable archive restore | Explicit original image/thumbnail bytes, validated 7F metadata, same galaxy seed, file-based import; never stored in normal SF JSON | **Browser archive test added; final run verifies** |
| Same-world local 7F images unaffected | Original `imaging7f-browser.py` and earlier seven dialog/survey tests | **Automated regression** |
| Original T01–T04 physics/radio/asset owners unaffected | Full Node suites + real Chromium expedition/communications/outpost tests | **Automated regression** |
| Strict `PLAY-STARFALL.html` source/compiled parity | `tools/build-standalone.py` + `tests/standalone-parity.py` | **CI gate on final commit** |

## Source files and ownership

- `src/physics/remote-imaging-t05.js` — new *stateless, on-demand* render coordinator. It constructs no new asset inventory. It copies actual source-owned remote body ephemeris and star system from T01 and the Galaxy seed; displays the same Starfall terrain and shaders inside an isolated WebGL2 renderer. No fake photos or internet image lookups.
- `src/physics/imaging-ui7f.js` — existing original Camera 7F UI, IndexedDB archive, thumbnail, battery debit, camera model, on-board packet queue, and rendering. The new remote option is a narrow adapter; original local path preserved. Refuses fake success on missing target/GL and produces durable render faults.
- `src/physics/imaging7f.js` — optional durable camera job state and validated archive restore hook; same 7F schema/ID owner.
- `src/physics/mission-operations-ui.js` — original snapshot field whitelist includes real sky/site/ring parameters for future off-world recreation; new imaging doesn't call `RT.galaxy.activate` nor change ship integrator.
- `index.html` — opt-in archive UI and one additional source script in the original 7F script order.
- `tests/remote-imaging-t05.test.cjs` — pure GPU-context/planet facade contract; no mutation or fake receipt, idle failures and safe import.
- `tests/remote-imaging-t05-browser.py` — real software-WebGL screenshot/artifact QA, IndexedDB binary persistence, near-vs-isolated image comparison, archive restoration.
- `.github/workflows/engineering-ci.yml` — T05 added to *all* existing regression suites and uploads actual generated WebGL images to `starfall-t05-remote-camera-actual-webgl` downloadable GitHub Actions artifact.

## Remaining work (do not claim completed)

1. **T08 real A→B and B→A comms:** no source-valid interplanetary station path exists yet. A rover on Planet B can finish an already accepted camera job while the player is on Planet A, but sending a *new* camera request or downlinking that photo across planets requires T08.
2. **T06 rover and T07 observatory full lifecycle:** remote camera source geometry and existing satellite nadir pointing are honored, but a physically rocket-delivered far-world rover and complete orbital instrument operations are not independently end-to-end verified here.
3. **Full off-world weather time-series:** original terrain, sky/planet solar angle, ruins and ecology are seeded; unsaved transient storms near another planet may not replay exactly. Never describe them as permanently measured weather.
4. **Bounded remote resolution:** only 256px/512px (remote 1024 rejected as AWAITING_RENDER). High-resolution 3× panorama requires three real captures and remains more expensive. The separate WebGL context has real GPU creation cost; actual hardware GPU FPS and multiple long-running camera missions are unverified.
5. **No full physical radiometric/noise-limited DSLR model.** Exposure is the original Starfall shader-light/camera brightness; no invented flash or daylight stock imagery. Solar night captures are genuinely dark unless the renderer's existing lighting supplies illumination.

## Evidence and reproducibility

```bash
node tests/remote-imaging-t05.test.cjs
python tests/remote-imaging-t05-browser.py
python tests/imaging7f-browser.py
python tests/mission-transport-t03-browser.py
python tests/antenna-hardware-t04-browser.py
python tests/standalone-parity.py
```

All real-browser tests use `file://` Chromium SwiftShader; no external API, fake internet image or HTTP requests. The test places a controlled pre-existing rover *record* and reconstructs the actual off-world terrain; that is not proof of physically landing a rover at that site in live gameplay.

**Rollback:** [fully green T04](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t04-antenna-relay-engineering) and previous T01–T03 branches remain unchanged. Existing 7F image archive IndexedDB schema is unchanged. Export your camera archive before switching browser device or clearing data. Stable/main is not modified by this candidate.
