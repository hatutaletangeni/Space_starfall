# STARFALL UI20 — Contextual cockpit / hierarchy verification

## Exact implementation and intent
- Draft PR #17 targets experimental T19, not main. Original T19/T18 branches are untouched.
- Scope: presentational hierarchy, actual V truck first-person camera, first-person exterior self-mesh culling; no change to gravity/rocket/vehicle energy/radio/saves/navigation actions or physics source ownership.
- The three user-supplied reference images inform cockpit framing, minimal environmental HUD, and spacious window-first field-of-view. No screenshot assets were copied into the game. The original SVG windshield is NOT a full physical cockpit.
- User thesis `UIGAMEDESIGN.pdf` pages 14 and 32, Apple HIG Designing for Games/Design Principles and the linked curated UI/UX library inform the usability principles. Specific rationale in `docs/UI20-CONTEXTUAL-COCKPIT.md`.

## Exact automated evidence (dedicated real browser)
[UI20 real Chromium run 41538094143](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41538094143) **PASS** on UI code commit `5a574b1ac6e803fee10eb6cf11e940ba3993fb8a`; offline source compiler and strict byte-parity checked in job.

The test ran all of the following in actual `file://` Chromium and captured the original renderer, not a fabricated screenshot:
1. Normal spacecraft chase, active game canvas, readable compact HUD, actual original Launcher entry point.
2. V ship cockpit frame and first-person real camera, no external self-mesh obscuring the planet.
3. Existing remapped control instructions via `?`, Escape closes; navigation tabs access original Systems; original Launch dialog opens and closes.
4. A seeded starting landed world only (not a simulated distant achievement); existing EVA approach to real truck and original X physical boarding. It does not teleport by pressing a new truck UI button.
5. Original truck chase, then V truck cab with actual `truckWorldState` camera and dashboard, correct real mode, real truck battery state.
6. Original X physical truck exit and real EVA, no external traffic and no browser JavaScript exceptions.

Original WebGL screenshots are saved as an Actions artifact: `ui20-ship-truck-screenshots`, four files: `01-flight-chase.png`, `02-ship-cockpit.png`, `03-truck-chase.png`, `04-truck-first-person-cab.png`.

**Issues discovered and genuinely repaired before PASS:** pagehide save fixture used original T19 import guard; UI HUD publishes at a bounded 6 Hz (test must await state); critical V logic wrongly gated while truck retained `eva=true` (fixed only for physically occupied truck); actual preview revealed exterior player ship mesh blocking viewport, fixed with state-only self-mesh culling inside cockpit (source offscreen science camera forced to retain all exterior meshes).

## Inherited regression
- `Starfall Engineering Regression` offline model and browser runs ALL T00–T19 original tests plus the UI20 browser. One early UI20 commit failed a `tests/standalone-parity.py` gate because automated standalone commit had not yet finished synchronizing; the [UI20 standalone synchronization run 41538094142](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41538094142) subsequently completed successfully and wrote `PLAY-STARFALL.html` to the same branch.
- Earlier browser runs exhibited inherited T03 and T13 save/reload race failures already seen during T19, with no physics/save-owner changes from UI20. The **final full inherited CI is a separate gate**, and must not be marked PASS without its own exact-commit green job evidence.
- Manual 30-minute GPU test, full Planet A→B continuous mission, exact hardware/frames and player usability remain **NOT VERIFIED**. No attempt to fake telemetry, force unlocks, or disable regressions.

## Rollback and play
- Play `PLAY-STARFALL.html` in Chrome/Edge with hardware acceleration; offline bundle only, no server required.
- V ship/truck camera toggle, X near truck to board/exit, rear ramp physical ship boarding unchanged. `?` help, upper **Navigate**, **Mission console** right-side workflow, and labeled **Tools** on narrow screens.
- Export an existing T17 FULL MEDIA backup before replacing local browser origins; reverting branch is a code rollback, not a save replacement.
