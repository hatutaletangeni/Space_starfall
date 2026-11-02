# STARFALL — Update 7F: Real Rover & Satellite Camera Telemetry

**Release candidate branch:** `feature/update-7f-imaging` · **Parent:** `feature/update-7e` · **Rollback:** 7E or preserved 7D main.

New: **Mission Photos / Cameras** is a first-class option on the operations panel; it also opens from Field Laboratory, Rover Mission Control, Satellite Operations, Science Journal and 7E Research Bench.

- **Physical scene photographs:** the existing WebGL2 Starfall renderer is called from an offscreen framebuffer at the actual rover or satellite camera pose; this is not a screenshot of the HUD, a stock photograph or generated fake terrain.
- **Surface views:** rover forward, left, right, near-ruin target and stitched three-shot panorama. **Orbit views:** nadir, oblique horizon and wide context from the authoritative satellite ephemeris.
- **Downlink:** 256/512/1024 px images have explicit capture power cost, local storage limits, actual rover/satellite radio-path checks, finite modeled bandwidth and propagation delay. Radio blackout pauses queues/transmissions; only received images open in the Gallery.
- **NASA-inspired science presentation:** mission caption, scene-accurate image, thumbnail, body/asset/time/pose, notes, export; no NASA logos or false real-world attribution.
- **Persistence:** small versioned photo metadata stored in existing SF save; image bytes/thumbnails in local IndexedDB (device-specific, export your photos). Receipts link to Field Journal and optional 7E research/blueprint evidence IDs.
- **No gameplay lockouts or modifications** to ship boarding/ramp, truck X enter/exit, nonrideable rover, launch physics, ancient ruins, galaxy terrain or old save keys.

Open **[IMAGING-7F.md](docs/IMAGING-7F.md)** for exact fidelity, storage/data contract, rollback and limitations. **[Offline game](PLAY-STARFALL.html)** can be opened directly after downloading the complete repo ZIP; **[editable project](index.html)** uses `src/` and `python tools/build-standalone.py`.

**Automated verification:** `node tests/imaging7f.test.cjs`, `python tests/standalone-parity.py` and headless Chromium `python tests/imaging7f-browser.py`. Headless software WebGL verifies actual capture, but does not prove real-device GPU FPS, full 7D regression breadth or every prolonged playthrough.

---

# STARFALL — Update 7E Engineering Research (Release Candidate)

STARFALL is a **fully offline browser WebGL2 space exploration, science, and engineering sandbox**. Update 7E builds on the existing verified 7D ground-operations release and adds optional controlled engineering experiments and repeatable design blueprints.

## Play it

1. Download this repository's ZIP or clone it.
2. Open **PLAY-STARFALL.html** directly in Chrome/Edge with WebGL2 and hardware acceleration. This is the standalone offline game; it embeds all required code. (No install, CDN or server needed.)
3. For editable development, keep **index.html** beside the complete **src/** tree. Rebuild the standalone with `python tools/build-standalone.py`.

**Rollback:** `release/update-7d` retains the previous version. `main` is the current 7D stable source; `feature/update-7e` is the separate research-development branch.

## New in 7E

Open **Vehicle Workbench → RESEARCH BENCH** after entering the game. This lets you:

- Run **rover terrain/gear/wheel-size trials** using the installed six-contact traction model.
- Run **battery, solar, load and thermal trials** through the installed engineering power solver.
- Test **rocket stages under physically integrated 7B rocket flight**, and distinguish ideal predicted delta-v from a real simulated orbit or failure.
- Compare numeric experimental outcomes with source designs, recorded conditions, model notes and scientific journal IDs.
- Save successful runs as **validated blueprints** (meaning repeatable in-game model tests, not real-world certification), export/import versioned JSON, and apply a compatible existing vehicle configuration through the game's safety gate.

Experiments do not drain the player's real batteries or fuel, and do not change global galaxy, terrain, rover, launch, mission, or save behavior. Complex gear/rocket choices are **bench-only** until live component interfaces support them. Imported blueprints cannot be applied directly without revalidation.

Older Update 7D functionality remains, including 2,368 navigable stars, continuous flight and landing, EVA walking/ship ramp, the rideable truck with explicit `X` interaction, the nonrideable scientific rover, outposts and power wiring, real 7B force-integrated rocket launch, satellite sensing, radio link behavior, surface ecology/ruins, and optional expedition guidance.

## Engineering fidelity

- Rocket flight: simplified planar Newtonian model with finite thrust, fuel and atmosphere, not a full aerospace CFD/6DOF simulation.
- Rover physics: bounded terrain/six-contact approximation, not full tyre/suspension simulation.
- Power: simplified deterministic battery bus with actual installed component ratings and thermal approximation.
- Warp travel: **fictional**, explicitly separate from the chemical rocket solver.
- Research record provenance: predicted vs **simulated model outcome** is explicit. An observation ID link does not imply a real laboratory experiment.

## Verify

```bash
node tests/research7e.test.cjs
node tests/galaxy.test.cjs
node tests/launch7.test.cjs
node tests/science.test.cjs
python tests/standalone-parity.py
python tools/build-standalone.py
python tests/standalone-parity.py
```

GitHub Actions automatically runs all checked-in Node tests and strict bundle reproducibility. See [7E test report](reports/UPDATE-7E-TEST-RESULTS.md), [research models and controls](docs/RESEARCH-7E.md), and [full roadmap](docs/STARFALL_UPDATE_7_ENGINEERING_ROADMAP_PROMPTS.md).

**Verification boundary:** Source syntax, native model suites and strict offline build parity have passed in CI. Actual GPU visuals/performance and browser cold-restart persistence remain to be verified. Any successful headless browser smoke is still not proof of real-device GPU performance.

## Developer file map

- `src/physics/research7e.js` — optional model/data/blueprints, bounded deterministic records
- `src/physics/research-ui7e.js` — research UI, records, comparisons, save/export
- `src/physics/research7e.css` — responsive dark/gold styles
- `tests/research7e.test.cjs` — pure-model Node regression
- `tests/research7e-browser.py` — offline Chromium UI smoke (requires test-only Playwright + browser)
- `tools/build-standalone.py` — stdlib offline bundle builder
- `PLAY-STARFALL.html` — ready-to-open single-file offline game

No compulsory missions, progression levels, credits economy or technology unlock gates are introduced by Update 7E.
