# STARFALL Update 7F — Engineering & Imaging Verification

**Date:** 2026-11-02  
**Branch:** `feature/update-7f-imaging` · **Status:** All checked-in CI gates **PASS**; real-device GPU gameplay and full operational satellite radio windows **NOT VERIFIED**.  
**Rollback:** `feature/update-7e`; 7D stable remains on `main`.

## Verified CI run

[Full GitHub Actions result](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41446328565) — **offline-model: PASS**, **browser-smoke: PASS**. Node 22, Python 3.13, headless Chromium 141 with SwiftShader software WebGL2; test-only Playwright.

| Test | Status | Grounded evidence |
|---|---|---|
| All JavaScript syntax | PASS | Every `src/**/*.js` passed `node --check` |
| Existing galaxy determinism | PASS | 2,368 actual navigable systems, including 2,304 streamed systems |
| 7B force-integrated launch regression | PASS | Real stage/orbit model constraints, no instantaneous fake deployment |
| 7E research regression | PASS | Rover/power/rocket models, blueprint provenance, save migration |
| 7F pure image-state regression | PASS | Schema validation, queued capture, blackout pause, bandwidth, received-after-delay, quota and migration |
| Source/offline bundle parity | PASS | 50 JS sources and 14 stylesheet sources match packed HTML exactly; rebuilding leaves a clean Git diff |
| 7E real browser UI smoke | PASS | Workbench, rover and rocket trials, research blueprints |
| 7F offscreen framebuffer image | PASS | Actual 256×256 WebP rendered from Starfall's scene: 2,856 compressed bytes; 195 distinct sampled RGB values; no UI screenshot |
| 7F rover photo capture | PASS | Camera from seeded body and rover position, real scene readback; actual image and generated thumbnail stored in IndexedDB |
| 7F radio transfer and receipt | PASS with fixture | Progressive downlink simulated via radio link test fixture; photo remained inaccessible until received; no manual fake image bytes |
| 7F browser reload persistence | PASS | Same file URL/browser profile reopened; downlinked rover photo metadata and bytes available |
| Orbital camera render using authoritative ephemeris | PASS | `StarfallLaunch.orbit` derived position and actual offscreen world image, 14,856-byte WebP; computed period 2,985.6 seconds |
| Human 7D full expedition controls regression | NOT VERIFIED | Separate original extended 7D browser battery was archived outside current GitHub repo |
| Real hardware GPU FPS and memory | NOT VERIFIED | CI uses software WebGL2; cannot claim physical GPU performance |
| Full operational satellite capture → real relay pass → downlink across orbit | NOT VERIFIED | Orbital camera frame rendered from actual orbit; operational solar/pointing/radio code is present but not end-to-end manually exercised |
| Interplanetary image transmission | NOT AVAILABLE | Deliberate constraint: no fictional instant interstellar relay; local same-body receivers required |

### Important test boundary

The end-to-end rover camera browser scenario injects a **test rover fixture at a real planet-fixed location**, and **stubs the radio link's availability only** to exercise capture, storage, transmission, receipt, and reload deterministically. The actual camera image is always rendered by the production WebGL2 renderer and read back from an offscreen framebuffer, never supplied by the test. Separate model tests cover blackout queue semantics and byte-limited progressive transport. This does **not** independently establish operational relay visibility and antenna power with arbitrary real gameplay assets.

The orbital photo scenario uses the actual `StarfallLaunch.orbit` ephemeris to position the offscreen camera and renders a real view. The sensor-level pointing/eclipses/ground receiver workflow remains a real manual test obligation.

## Verified implementation contracts

- Existing ship ramp boarding, explicit X truck interaction, nonrideable science rover, classic save fields and launch/physics code were not rewritten to implement imaging.
- Additive versioned `imaging7f` metadata is persisted through existing SF save, image payloads live in IndexedDB, and older save keys remain intact.
- Radio-queued commands and photo data observe current modeled source location, source power and same-body radio paths.
- Photo data has independent upper bounds: 20 per rover, 40 per science satellite, 120 total, 24 MiB total compressed payload, 2.5 MiB per image, 16 queued camera commands.
- Images must be successfully stored before energy is charged or success is recorded. A failed capture does not create a fabricated image record.
- Research references to received photo IDs are additive and are not scientific certification.

## Remaining release gates (manual)

1. Land and move EVA through the ship ramp; exit truck with X, walk away, confirm no auto-reboarding. Review rover movement, sampling, power wiring and ordinary Rocket Lab launch.
2. With a real deployed rover and outpost radio link, capture forward and panorama, disconnect/reconnect radio, inspect the retained onboard photo and downlink.
3. With a real launched observatory, verify orbital position, sunlight, nadir pointing, camera installed, eclipse rejection, ground-station pass visibility, battery drain, storage consumption and completed photo delivery.
4. Validate saved games from 7D and 7E across full browser close/restart, using the same offline HTML pathname.
5. Test on hardware Chrome/Edge WebGL2 at 256/512/1024 and panorama resolutions, measure render time/FPS and look at actual terrain/objects in photos. No GPU frame-time numbers were fabricated.

**Release policy:** keep this PR a draft until the real-device/cross-feature checks are performed. Source branch is playable as an offline release candidate; the 7E and 7D rollback points remain untouched.
