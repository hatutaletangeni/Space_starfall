# STARFALL 8E-R playable preview checklist (S0–S3)

**Development branch only:** `feature/ship-interior-performance-refactor`. These are not the released `main` standalones.

## Download the correct pair
The latest successfully built release must include **both** `PLAY-STARFALL.html` and `PLAY-STARFALL-MOBILE.html` in the *same* source revision. Download from the branch after `build(8E-R): synchronized desktop + mobile test editions [8er-preview]` appears in its history; otherwise use the `starfall-8er-standalone-desktop-and-mobile` GitHub Actions artifact from the latest successful `8er-preview` run.

- Desktop: `https://github.com/hatutaletangeni/Space_starfall/blob/feature/ship-interior-performance-refactor/PLAY-STARFALL.html`
- Mobile (landscape): `https://github.com/hatutaletangeni/Space_starfall/blob/feature/ship-interior-performance-refactor/PLAY-STARFALL-MOBILE.html`
- Builds: `https://github.com/hatutaletangeni/Space_starfall/actions/workflows/8er-preview.yml`

Never use an older downloaded HTML and assume it contains new source commits. Keep an offline backup of the former game save/export before the New Galaxy test.

## Test 1 — Brand new expedition custody (desktop AND mobile)
1. Save/export an existing expedition first if there is anything you want to keep.
2. Open the new preview in a browser that supports persistent localStorage, select **New Galaxy** and accept the warning.
3. Confirm that the one starter truck is in the ship's **starboard-hangar** physical inventory; no stray truck should appear on the previous save's planet.
4. Land on flat terrain, enter the ship interior using **I / BRIDGE**, walk aft along the pressurized central spine, then enter the **V01 vehicle bay** on the right.
5. Approach the original truck and press **X**. This is the same physical asset, not a duplicate.
6. Hold reverse to drive down the wide starboard ramp; exit via dedicated vehicle HUD only after fully clearing the ramp.
7. Reload and verify custody, remaining battery and hopper stock do not reset.

**Legacy preservation:** opening an existing save without selecting New Galaxy must leave that saved truck on its actual world. A denied localStorage permission must block destructive reset.

## Test 2 — Crew hatch physical entry and exit (desktop AND mobile)
1. Land, enter interior from the pilot station, walk aft to the central crew hatch near **U01**.
2. Walk out across the crew ramp. It must not eject the truck or use the vehicle ramp.
3. Walk away at least 3 game scene units while respecting the cooldown, then return on foot to the central crew ramp.
4. Move into the hatch or press **I / BRIDGE** at the correct physical ramp entrance. A transition should begin.
5. Do not try to trigger a second entry during the transition. The player becomes an interior walker only at animation completion.
6. In the interior, return to **B01 Command Bridge** and press X to pilot; interacting in a distant room must not remotely pilot.
7. Test attempted hatch entry while swimming, on an active ramp transition, far from the ship, and while in truck: expect descriptive rejection, never silent teleport.

## Test 3 — First static interior graphics pass
Move through **U01**, **B01**, **S01**, **H01**, **E01**, **F01**, **L01**, **V01**. Expect simple industrial arches, cable/floor markings, and constrained-colored room status plates with live HUD room identification. These are a first working geometry slice, not the completed high-fidelity modular interior. **C01 separate material hold and A01 physical airlock are NOT YET BUILT.**

## Test 4 — Truck actions in both editions
In truck mode, ship/EVA overlays should disappear; inspect the dedicated battery, hopper, camera and drill readouts. MAP, LIGHTS, VIEW, DRILL, LOAD and EXIT interact with original authoritative APIs. Unsurveyed/undrilled/underpowered operation must be disabled; never mint ore through the interface.

## QA gates and limitations
- Source syntax and six pure logic invariants passed in the development session; this is not a browser playthrough.
- Browser build and full test suite must complete through the CI jobs; check conclusion instead of assuming success.
- The airlock pressure/door mechanism, full modules/receipt manufacturing, dedicated C01 materials store, physical V01 docking and identical-hardware FPS measurements are not complete.
- If the build run is queued or has failed, these links may still serve old HTML. **Do not label it test-ready until the compiled pair is synchronized.**
