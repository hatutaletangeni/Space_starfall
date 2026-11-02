# T05 — Genuine Remote Starfall WebGL2 Photography

Parent: **T04** final green SHA `86409eb2bf2ceac8b6a972510ec27d657a13e57b`  
Branch: [`feature/t05-remote-world-imaging`](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t05-remote-world-imaging)  
Scope: camera acquisition and storage. **T08 still owns Planet A→Planet B interplanetary RF routing.**

## The solved problem

Original `src/physics/imaging-ui7f.js::poseFor` checked only `RT.galaxy.byId` and refused a rover on a planet absent from the current render/cache, even if that probe was legitimately commanded earlier. Original `Renderer.captureScience` likewise required `body.id` in its own galaxy's `byId`. Simply switching `RT.nearest`, calling `RT.galaxy.activate` or pretending to have a photo would break flight state and physics.

**T05 never invokes those operations.** It runs the **same** `Starfall3D.Renderer` on a separate WebGL2 context and a narrow read-only reconstructed galaxy facade. The facade uses the original authoritative T01 `StarfallMissionOperationsUI.resolveBody(asset,t)`, actual system star location/type, original body seed/type/radius/spin, and the original seeded terrain `Starfall3D.groundHeight`. Its world geometry and shaders are **not a substitute image or procedural canvas painting**; final pixel bytes come from the original offscreen `Renderer.captureScience` framebuffer, WebGL2 `gl.readPixels`, and the original WebP/JPEG encoder.

- New `src/physics/remote-imaging-t05.js`: `worldFor(asset,t)` clones the actual body and makes an isolated, single-system render facade. `capture({...})` constructs a **distinct real Starfall Renderer and GPU context**, captures, returns byte-backed provenance and disposes everything in a `finally`. No state writes, no active-galaxy mutation, no network imports. The facade draws the appropriate original seeded terrain, body/sun angle, atmosphere, fixed body ruins, original archaeology 6C hypotheses, ecology 6H models, nearby source-owned outpost meshes and deployed rover meshes. No copy of the current world is used.
- Existing `src/physics/imaging-ui7f.js` keeps the ordinary 7F path when `RT.nearest.id === camera body.id`; otherwise the newly isolated capture runs. Original camera mast/orbital attitude, sunlight, storage and source battery checks remain. `forward`, `left`, `right`, `panorama` (three real shots), `target` (only actual recorded local archaeology), and satellite `nadir/oblique/wide` remain the original camera modes. When viewing a world other than the current player world, visual details use the body snapshot instead of the player's current ruins view.
- Existing `StarfallImaging7F.Store` still owns jobs and photo metadata. Added only `renderPending`, `markRendering`, and `importPhoto` adapters; no second photo or camera inventory. `photo.schema=1` remains valid, with optional `sceneSnapshotVersion:1`, `renderSource:ISOLATED_STARFALL_WEBGL2`, and `cameraJobId` on new remote photos.
- **No fake command receipt:** A camera cannot be captured before its original `markDelivered(job.id,time)` from a genuine T03 radio command (unless a previously accepted onboard command is being resumed). T05 never calls `markDelivered` and never inserts an interplanetary route. T03 still requires powered, same-world endpoints. The photo is placed in original 7F IndexedDB with one thumbnail and remains onboard; it does not appear in Gallery as a received image until T03 packet's original byte+ACK rules succeed.
- An unavailable offscreen WebGL2 context, unresolved body snapshot, low camera energy, insufficient onboard capacity or oversize remote request leave a **durable `AWAITING_RENDER`** job with a visible reason. It resumes on a later retry; no artificial photo, evidence, battery debit or false downlink is recorded.
- **Source preservation:** Enhanced T01 snapshot's existing field whitelist with actual sky, sites/rings/axial tilt; older snapshots missing sky reuse *exactly* the source Galaxy type's default sky palette, not the current world's colour.
- Remote size is capped to **256 or 512 px per frame** (one 512px panorama involves three bounded frames, not one 1536×1536 target). 1024px remains permitted in the existing local renderer, but remote jobs exceeding the cap wait for a lower-resolution command rather than overwhelming GPU memory. Remote capture is on demand; the main flight render loop never creates off-world geometry every tick.
- **Portable original photo bytes:** The existing gallery adds EXPORTED PORTABLE CAMERA ARCHIVE and RESTORE CAMERA ARCHIVE actions. Explicit user export includes versioned metadata, original IndexedDB WebP/JPEG bytes and the existing thumbnail, inside one portable JSON file. Restore verifies source galaxy seed, image size, decoded geometry, 24 MiB photo cap and duplicate IDs, then writes actual image bytes back to IndexedDB and metadata only to SF. It never stores image data URLs in `localStorage`; it does not manufacture a new radio acknowledgement.

## Repro: actual unloaded world

1. Begin from a known-working T04 save. A rover previously delivered/accepted an onboard camera command while the player was present on its planet. Save, leave the planet or system and let T01 advance the rover.
2. After command acceptance, 7F processes the source-owned queued job, calls T05 if the destination is not the player's active body, and renders the real target world's seeded terrain. The player remains at their existing coordinates, ship, target, galaxy LRU and controls unchanged.
3. Successful image is marked **ONBOARD / QUEUED** with source body ID, position, time, camera pose, seed snapshot version and actual photo bytes. The 7F gallery cannot display the photo until the original T03 downlink is ACKED through a valid powered link. When a legitimate receiver appears, the T03 packet can resume partial transfer.
4. For a recoverable renderer problem, see **AWAITING_RENDER** and the reason in 7F's pending job panel. Repair WebGL, camera setup or storage and retry. There is no fallback to planetary stock imagery, UI screenshot or Planet A's frame.
5. To preserve camera bytes across browsers, click **EXPORT PORTABLE CAMERA ARCHIVE** and save the file. Restore the archive later using **RESTORE CAMERA ARCHIVE**. Save export from Integration remains metadata-only by design.

**Important:** From Planet A **you still cannot send a new radio camera command to a rover on Planet B** unless an actual T08 ground-station/interplanetary path exists. T05 only finishes the genuinely difficult remote-render side; T08 finishes the communications side. Do not claim the full flagship A→B→A photo mission yet.

## Verification

`node tests/remote-imaging-t05.test.cjs`: isolated shader facade contract, proper star/world IDs, no galaxy activation, output metadata, limits, GPU context disposal even on failures and original job restoration.

`python tests/remote-imaging-t05-browser.py`: actual offline `file://` game in Chromium WebGL2 SwiftShader. Construct a **separate** seeded StarfallGalaxy only in the test to fetch a real dormant catalog-0 planet; live game's `galaxy.byId` remains without the planet. Capture actual off-world pixels (not generated test data), compare pixels with the near-camera pathway on the **same** world, create a previously accepted Camera 7F onboard job, verify actual IndexedDB image+thumbnail, no gallery/photo ACK, reload without teleport or loaded-cache mutation, export/restore a binary camera archive without duplicating evidence, and save the actual generated image files as CI artifacts.

Original `tests/imaging7f-browser.py`, source/standalone strict equality, T01–T04 model and real Chromium browser suites remain regression gates. A controlled asset fixture is **not a human-travelled expedition**; do not infer manual playability or hardware FPS.

## Remaining honest limits

- T08 interplanetary transmitter/receiver commissioning, antenna gain, true multi-system light-time and packet-hop custody still **not implemented**.
- T06 complete rover delivery and T07 complete satellite payload bus/camera integration are pending. A test fixture with pre-accepted command does not certify a real remote command route from Planet A.
- Remote rendering is separate WebGL2 (same shader code) and bounded but context creation carries GPU cost. It does **not** continuously simulate or draw unloaded planets in gameplay. Multi-remote-job FPS on physical laptop GPUs is **not verified**.
- Surface environmental weather in remote render uses deterministic planet/star physics but does not yet replay every unsaved transient storm; remote weather-dependent visibility may differ from the saved on-foot transient storm. T14 can extend this contract.
- Complete hard proof of world-image georegistration to survey landmarks and full round trip across another star awaits later end-to-end T18 tests.
- No network images, remote skyboxes, UI snapshots, or fake receipts. No changes to ship boarding, EVA, physical landing or galaxy activation source.

## Rollback

T05 lives on a new reversible branch starting from exact T04 final commit `86409eb2bf2ceac8b6a972510ec27d657a13e57b`. The 7F IndexedDB schema is **unchanged**; normal 7F photos remain readable in T04. Back up saves and export camera archive before changing branches. This is a release candidate only after all final GitHub Actions regressions succeed.
