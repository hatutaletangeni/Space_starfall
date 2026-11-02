# STARFALL — Update 7F: Rover & Satellite Imaging / Radio Downlink

**Branch:** `feature/update-7f-imaging` — based on verified 7E development branch.  
**Rollback:** `feature/update-7e`; Update 7D remains on `main` and `release/update-7d`.  
**Model scope:** Real in-game scene photography, not internet assets and not photographs from NASA.

## What is implemented

- **Rover mast / local six-wheel rover / deployed robotic rover:** forward, left, right, nearby-ruin target, and three-frame panoramic real scene capture.
- **Observatory satellite:** nadir, oblique and wide-angle orbital context photos, using `StarfallLaunch.orbit` through the 7C satellite geometry API. The camera requires a powered, sunlit, nadir-pointed observatory with the existing camera sensor; communication-only relay buses do not silently gain cameras.
- **WebGL2 offscreen framebuffer:** the original `Starfall3D.Renderer.render` runs with a dedicated RGBA8 color texture/depth attachment and a physical camera pose. `gl.readPixels` transfers the GPU scene, vertically flips it into an offscreen 2D canvas, then compresses to WebP or JPEG. It **never captures the HUD**, fabricates imagery or fetches remote assets. Resolution: 256, 512 or 1024 pixels per rendered frame. Three physically rendered views are stitched for rover panoramas.
- **Mission captions** use STARFALL's own brand; no NASA logos or false attribution.
- **Versioned photo metadata and source identification** in the existing `SF.load().imaging7f` additive save key: type, source asset, body/system, simulation time, mode, resolution, image size, camera pose, position, altitude, linked scientific observation IDs, linked 7E research run IDs and optional field note.
- **Actual image bytes/thumbnail cache in IndexedDB**, not in the global JSON save object. One compressed thumbnail per stored image, shown only after the image is downlinked. User may export downlinked full-sized image and delete archived records.
- **Onboard camera command queue, solar/power/pointing checks, finite energy cost and delayed communications:** 7D `StarfallLaunchUI.remoteLink` gates rover commands and transfers; 7C `StarfallSatelliteOps7C.radio` + `StarfallSatelliteOpsUI.groundStation` gates orbital operations. During radio blackout the command or transmission remains queued; onboard-delivered commands may execute when uplink disappears.
- **Progressive downlink, not instant reception:** modeled source rates (48 kbit/s rover, 160 kbit/s satellite) are adjusted by existing radio quality; transmitter drains onboard energy and pauses if the radio is unavailable or battery reserve exhausted. Photos become visible in the gallery only after simulated byte transfer and propagation delay.
- **UI integration:** the main operations panel, local Field Science and Rocket Lab remote rover/satellite panels open the same Mission Camera & Photo Downlink gallery. Science Journal and 7E Research Bench both link to photo evidence; 7E experiment plans, runs and blueprints may preserve up to 12 received photo IDs. No alteration to the legacy instrument journal schema.
- **No changes to** EVA/walking, ship ramp, explicit X truck boarding, nonrideable rover, orbital physics, 7D control grammar, economy, or existing save keys.

## Realistic boundaries

The camera faithfully records **Starfall's current engine geometry and lighting**. This is NASA-*inspired presentation*, not a promise of NASA photographic realism or accuracy beyond the current low-poly/procedural world. Exact scene contents depend on the game's existing culling, terrain, weather, ecology and object-visibility budgets.

There is **no fake instant interstellar photo link**. An off-world capture requires a loaded physical world and an actionable communication path. Photo commands can be queued while unavailable; camera acquisition is deferred rather than simulating hidden GPU photographs without a world scene. Existing 7D remote links need a same-body ground endpoint. Satellite terrain imaging requires valid payload, power, attitude, loaded ephemeris and sunlight.

Captured image bytes are stored **per-browser/per-file origin** using IndexedDB. Browsers can purge site data or deny IndexedDB; capture fails visibly without consuming power or recording a phantom image if the archive write fails. Export received images you wish to keep permanently. Model metadata alone cannot reconstruct lost image bytes from a different computer. Unlike tiny journal values, photographs are not embedded in portable JSON saves.

Limits: 20 photos per rover, 40 per satellite, 120 global records, 24 MiB total compressed payload, 2.5 MiB maximum per single photo, and 16 queued camera commands. A full or unavailable archive returns an explicit error. The capture has an intentionally bounded, player-commanded CPU/GPU cost and is **never polled every frame**.

## Critical flow and file map

- `src/engine.js`: `Renderer.captureScience` offscreen framebuffer and shared renderer scene.
- `src/flight.js`: exposes `StarfallRuntime.captureScienceImage`; invokes lightweight radio/photo tick after normal frame.
- `src/physics/imaging7f.js`: pure model; bounded photos, queued captures and bitrate-capped downlink.
- `src/physics/imaging-ui7f.js`: actual rover/satellite position camera rigs, power/radio gates, IndexedDB, thumbnails, filtering, mission notes and image export.
- `src/physics/imaging7f.css`: scoped gallery styles.
- `src/physics/research7e.js`, `research-ui7e.js`: additive `photoRefs` evidence.
- `index.html`: editable UI and ordered modules; `PLAY-STARFALL.html`: identical offline bundle.
- `tests/imaging7f.test.cjs`, `tests/imaging7f-browser.py`: source-model and real WebGL2 headless browser checks.

## Testing

```bash
node tests/imaging7f.test.cjs
python tests/standalone-parity.py
# Test-only Chromium + Playwright required for:
python tests/imaging7f-browser.py
```

The GitHub Actions `engineering-ci.yml` also runs earlier deterministic galaxy, integrated rocket, science and 7E regressions. Headless Chromium uses **software WebGL**: positive actual image-readback demonstrates a real scene capture, **not real-device GPU FPS**. The previous extended archived 7D browser battery and physical-player gameplay still need separate verification before merging to stable.

## Field checklist

1. Start standalone and verify galaxy/ship/EVA/truck controls still work.
2. Land near the science rover, queue a forward photo, and confirm physical terrain/ship view after a successful link.
3. Queue during blackout; observe that the image remains aboard / transfer pauses, then verify reception once radio returns.
4. Deploy an observatory, select camera + nadir, confirm sunlight and an authentic orbit-derived terrain view; try safe mode and eclipse to verify rejection.
5. Open Field Science → Journal → Mission Photos, inspect evidence IDs, save a field note and export the image.
6. Open Research Bench, verify downlinked image IDs are attached as **evidence references**, not proof of engineering certification.
7. Reload the same browser/file path and verify metadata **and image bytes** still exist; export image before clearing browser data.
8. Profile screenshot capture and idle FPS on a real GPU, and check localStorage/IndexedDB quotas.
