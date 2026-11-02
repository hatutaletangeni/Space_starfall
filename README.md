# STARFALL — Update 7: Vehicles, Rockets & Satellites

STARFALL is an offline browser-based WebGL2 procedural space exploration and engineering sandbox.

**Current GitHub baseline: Update 7 — Vehicles, Rockets & Satellites.**

## Play
Open [PLAY-STARFALL.html](PLAY-STARFALL.html) in a WebGL2-capable browser (Chrome or Edge). The playable HTML is standalone, with no CDN or npm dependencies. For editable development, use `index.html` and the ordered modules in `src/`. Run `python tools/build-standalone.py` to rebuild the standalone file after editing.

## Update 7
- Separate vehicles: a programmable, non-rideable six-wheel science rover and an explicitly boardable four-wheel exploration truck.
- Resolved inadvertent truck reboarding after EVA exit; `X` is used to board/exit near the truck. Existing examined-ruin interaction takes precedence.
- Foundation structures can serve as launch pads.
- Rocket Lab supports staged engine/tank/booster/payload configuration with mass, thrust-to-weight, Isp and delta-v estimates.
- Rockets deploy circular-orbit satellite payloads integrated with the existing communications relay network.
- Rover payloads may be transported to another star system through the game's *fictional* interstellar transfer and execute bounded rover scripts.
- Preserves previously implemented planetary terrain, environments, exploration notebook, ruins and interiors, ecology, events, outposts, controls, and the 2,368-star galaxy.

## Tests
- `node tests/launch7.test.cjs` — Update 7 launch and mission model checks.
- `python tests/standalone-parity.py` — verifies 38 source modules match the packaged playable HTML.
- Other tests in `tests/` cover earlier implementation phases; the original full Update 7 packaged archive contains the complete historical regression suite.

## Known limitations
The Rocket Lab's guided ascent is an engineering-budget-based *approximation*, not a fully integrated 6DOF atmospheric launch. Satellites use circular analytic orbits. The interstellar carrier is fictional. Rover/truck mechanical simulation is simplified. Mocked-WebGL tests are not proof of actual GPU rendering or sustained FPS. Save persistence after a fresh browser restart remains to be tested on the user's device.

See [Update 7 verification](docs/UPDATE-7-VERIFICATION.md) and [7A–7F roadmap prompts](docs/STARFALL_UPDATE_7_ENGINEERING_ROADMAP_PROMPTS.md) before beginning the next implementation phase.
