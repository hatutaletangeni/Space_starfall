# STARFALL T18 — Performance and Visual Evidence

## Measurement protocol

A T18 dedicated GitHub Action runs **genuine headless Chromium using SwiftShader** (software WebGL2) on GitHub-hosted Ubuntu. It loads the **actual** `file://` `PLAY-STARFALL.html`, not a mocked renderer or screenshot overlay.

The T18 test records 190 browser `requestAnimationFrame` intervals without interfering with the existing STARFALL animation loop. It writes:

- 50th, 95th and 99th percentile **wall-clock frame spacing** in milliseconds, minimum and maximum, measured runtime duration.
- Initial and subsequent `performance.memory.usedJSHeapSize` observations when Chromium exposes the API. A missing value is `null`, **not** zero bytes.
- WebGL2 error code read after the sample, plus canvas render-surface pixel dimensions.
- All browser-page exceptions, HTTP(S) requests and actual source-store states from the same test.
- Three **real** screenshots, only captured on actual browser execution. They illustrate the pristine flight interface, original UI-built powered Outpost, and reloaded expedition. They do not certify a human completed the underlying game.

Look for the **GitHub Actions artifact `t18-real-ui-software-webgl-evidence`** attached to the completed T18 End-to-End Release Journey workflow, with:

`artifacts/t18-release/release-software-webgl.json`

`artifacts/t18-release/01-unmodified-spaceflight.png`

`artifacts/t18-release/02-connected-original-outpost.png`

`artifacts/t18-release/03-restored-expedition.png`

These files exist **only if the test genuinely reached those stages**. A missing or failed artifact must be reported as no evidence.

## Reproducibility and interpretation

The frame interval `p95MS` is not GPU render time, draw-call CPU time, or a standalone benchmark. It includes browser thread scheduling, test runner CPU contention and software shader emulation. The `p99MS` can spike due to GitHub machine pressure; compare runs of the **same viewport, browser version and CI software setup** before interpreting performance.

The test validates that percentiles are numerically finite and ordered. It **does not apply an arbitrary FPS PASS threshold** based on a nonrepresentative GitHub virtual CPU. A physical GPU benchmark and stable frame pacing on the player's device are separate release gates.

Capture/release target cleanup: Existing 7F tests render genuine offscreen WebGL2 images and check pixel variation and IndexedDB thumbnails. This T18 journey primarily checks UI actions and continuous camera render timing. Exact GPU texture allocation/free counts, VRAM usage and sustained remote-capture backlog cannot be measured with this test alone and are **NOT VERIFIED**.

## Required user-machine benchmark — NOT VERIFIED

Run the release candidate in current Chrome or Edge with WebGL2 hardware acceleration enabled:

1. Confirm the browser lists a hardware GPU rather than SwiftShader in its WebGL diagnostics. Record GPU name/driver, RAM, OS, resolution, browser version and whether plugged in.
2. Leave STARFALL idle in orbit for at least 2 minutes, land, EVA, drive a truck, open the map, then perform 7F genuine capture from a rover and from an orbital imager. Never allow the UI's 7F progress indicator to stand in for photo data.
3. Record actual RAF p50/p95/p99 frame intervals during flight, entry, on-foot walking, map view and camera capture. Record actual player FPS, resident memory or JS heap trend over at least 30 minutes and any WebGL context losses.
4. Repeat on the last verified T17 ZIP with identical browser settings and seeded world to check for meaningful regressions. Save screenshots and exact test times.
5. Check power source drain, sunlight changes, receiver ACK, real image bytes and data custody after restart. These are gameplay gates and cannot be certified from shader-only CI.

**Numerical GPU metrics for a user machine are deliberately NOT PROVIDED** until genuinely measured. Do not infer, estimate or fabricate GPU timing or memory trend from CI.
