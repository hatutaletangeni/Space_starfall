# STARFALL

**An offline WebGL2 space-exploration, science and engineering sandbox.** Explore a deterministic galaxy, fly and land spacecraft, walk on worlds, operate the original truck and scientific rover, investigate geology and wildlife, and experiment with finite materials, power, industry and habitats. The game is free of runtime CDNs and does not require a server.

## Play or develop

| Edition | Entry point | How to use it |
| --- | --- | --- |
| Desktop, single file | [PLAY-STARFALL.html](PLAY-STARFALL.html) | Download the repository ZIP, extract it and open this file in a WebGL2-capable browser |
| Mobile, single file | [PLAY-STARFALL-MOBILE.html](PLAY-STARFALL-MOBILE.html) | Open locally on a WebGL2-capable phone browser; landscape works best |
| Editable source | [index.html](index.html) and [src/](src/) | Keep their folder structure together; open index.html in a browser |

The two PLAY files are **generated outputs**, not the source of truth. Do not edit them directly. After editing the source, rebuild and verify:

~~~bash
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
~~~

The in-game **Mission** workspace exposes Navigate, Explore, Build, Operate and Records. Open the **? Field Manual** for current controls and system-specific instructions; keyboard, ship/truck and mobile controls vary by context. Mobile browser storage and GPU support vary, so export a save before moving devices.

## Systems and status

| System | Source / guide |
| --- | --- |
| Procedural stars, worlds, flight and WebGL2 graphics | [galaxy.js](src/galaxy.js), [engine.js](src/engine.js), [flight.js](src/flight.js) |
| Physical ships, cargo, mining and geology | [8A–8D implementation](docs/UPDATE8A-PHYSICAL-INVENTORY.md), [8D guide](docs/UPDATE8D-MINING-HAULING.md) |
| Rocket operations, satellites, radio, rover and cameras | [Update 7 verification](docs/UPDATE-7-VERIFICATION.md), [Camera 7F](docs/IMAGING-7F.md) |
| Manufacturing, electricity, conveyors and gas systems | [8E–8K status](docs/INDUSTRY-8E-8K-STATUS.md), [8K acceptance](docs/STARFALL_8K_RELEASE_ACCEPTANCE.md) |
| Habitats, ecology, climate and asteroid worlds | [Living ecosystems](docs/LIVING-ECOSYSTEMS-9D.md), [asteroids](docs/ASTEROID-WORLDS-LW07.md) |
| Engineering models and learning material | [Engineering encyclopedia](docs/STARFALL_ENGINEERING_ENCYCLOPEDIA.md), [status matrix](docs/TECH-STATUS-MATRIX.md) |

Feature source and model tests are **not** proof that every extended gameplay path is complete. STARFALL deliberately distinguishes deterministic model tests, browser smoke tests, full gameplay acceptance and measurements on a physical GPU. See the [release acceptance register](docs/UPDATE-8-ACCEPTANCE-REGISTER.md) and the [November 17 repository audit](docs/REPOSITORY-AUDIT-2026-11-17.md) before making release claims.

## Quality checks

~~~bash
for test in tests/*.test.cjs; do node "$test" || exit 1; done
python tests/prune_safe_merged_branches.test.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
~~~

The [engineering CI workflow](.github/workflows/engineering-ci.yml) also checks JavaScript syntax, rebuild reproducibility and all checked-in browser suites in six Chromium shards. Browser tests require Playwright and its compatible Chromium; source-model test success does not substitute for a playable UI check.

## Repository layout

- [src/](src/) — editable runtime, graphics, UI and physics.
- [tests/](tests/) — model, source-contract, parity and browser regressions.
- [tools/](tools/) — offline bundling and guarded maintenance tools.
- [docs/](docs/) — feature contracts, engineering encyclopedia and caveats.
- [reports/](reports/) — dated verification evidence and measured results.
- [.github/workflows/](.github/workflows/) — CI and targeted release gates.

**Important:** Branches and PRs can contain experimental work that differs from main. Backup and release refs are deliberately retained. Never treat an unmerged feature branch or a promising label as evidence of a shipped capability.

---

## Archived 7E / 7F release notes

The following historical notes are preserved for context. References below to old release-candidate branches or to an earlier 7D-era main were accurate only at the time they were written; use the current guide above and the Git history for today's source state.

## Combined 7F — Expedition QA & Release Hardening (release candidate)

Camera 7F is **still fully present**: real rover and satellite scene imaging, onboard photos, radio queuing, downlink, received-only gallery, IndexedDB archives and research evidence.

This optional hardening pass fixes silent historical launch/satellite/rover truncation, makes deployment failures honest and strengthens save import validation. It adds a **Build → Operate → Monitor → Research** workflow hint without new compulsory modes, and repeatable 26-launch physics and actual offline browser regression tests.

**Status:** tests for source, standalone, physics models, camera capture, offline browser dialogs and save reload pass. **Full scenarios A/B/C and physical-GPU performance are NOT VERIFIED**; see [release gate matrix](RELEASE-VERIFICATION-7F.md), [measured software-WebGL results](reports/PERFORMANCE-7F.md), [migration checklist](docs/MIGRATION-CHECKLIST-7F.md) and [physics audit](docs/PHYSICS-AUDIT-7F.md).

**Camera 7F rollback:** `feature/update-7f-imaging` / its GitHub ZIP. This hardening candidate is `feature/update-7f-expedition-hardening`.

---

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


## LW07 — Landable asteroid worlds, mining and impacts

The LW07 feature branch promotes a deterministic subset of existing asteroid-belt rocks into small surface worlds. It does not add stars or regenerate the galaxy.

- **Major asteroids:** 7.5% of existing belt rocks are seeded as major, landable bodies with stable belt/index IDs, slow rotation, low gravity and vacuum surfaces. Smaller rocks and ring particles remain collision hazards.
- **Surface resources:** Major asteroids use the existing CW01 composition, CW03 geology and 8C finite-deposit authority.
- **EVA extraction:** Prospect with the EVA spectrometer, then extract a 2 kg core over 12 simulated seconds at 800 W (9.6 kJ). Material enters a 20 kg / 0.012 m³ EVA sample pouch. Walk back to the landed ship and transfer it into the existing 8A ship hold; no free inventory or remote transfer.
- **Impacts:** Belt-bearing systems generate seeded historic crater fields and rare simulation-time asteroid impacts. A collision creates a transient 3D meteor trail and a permanent saved crater depression with a raised rim. Systems without belts do not receive asteroid-impact craters.
- **Weather visuals:** Meteor, dust, volcanic, auroral, electrical and other planetary events receive 3D particle volumes/trails. Flat repeated-line CSS overlays are replaced by soft haze.
- **Shattered bodies:** Planets and moons retain closed spherical geometry with fractured, cratered surfaces and debris; surface triangles are not removed to fake a broken world.

The implementation adds asteroid-mining, asteroid-impact and renderer regression tests plus a standalone Chromium smoke test. The LW07 workflow checks all editable JavaScript, runs the Node suites, rebuilds both offline standalones and exercises the standalone in Chromium.

**Verification status:** PASS — GitHub Actions completed JavaScript syntax checks, all Node regression/model suites, desktop and mobile standalone parity, and the Chromium software-WebGL browser smoke. Real-device GPU visual quality and frame-time performance remain NOT VERIFIED.
