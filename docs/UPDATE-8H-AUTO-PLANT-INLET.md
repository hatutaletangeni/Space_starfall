# Update 8H — native 250 W conveyor direct to installed 8E chemical feed hopper

Status: **draft release candidate**. This is a real source-code continuation on top of merged PR #121 (main `1c36daf`), not completion of Update 8H.

## Real material and power path

Original manufactured cargo depot (8A 1,200 kg container) → physically installed certified conveyor drive (8A 40 kg/.05 m³ real tray) → **original manufactured 8E chemical station's own 120 kg/.20 m³ empty dry feed hopper**. The existing 250 W native T02 load and actual wired 48 V power report are reused: every hop happens only after a native grid tick, using the existing `StarfallConveyorNativeBridge8H.observe` and `StarfallConveyorPackets8H` state machine. The packet's exact original 8A reserve/commit receipt follows it into the machine container; no ship-held ore, phantom link, new energy source, separate stock ledger, or EVA last-metre transfer is needed for this route.

The original depot→depot route and manual EVA loading are retained. The new destination only accepts a real installed 8E reduction furnace/glass furnace/high-temp cell/electrolyzer/catalytic reactor that already possesses a paid `plantfeed8h:<stationId>` 8A container of exactly 120 kg and 0.20 m³. Other asset types, uninstalled machines, disconnected motor, wrong world, excessive gaps (>12 scene distance per segment), missing power, full hopper, fluid and gas lots remain rejected. Existing chemical source selector must be set to **surface hopper** to consume received stock.

Changed integrations: `src/physics/logistics-powered-network8h.js`, `conveyor-packets8h.js`, `conveyor-native-bridge8h.js`, `src/flight.js`, `src/physics/logistics-conveyor-live-ui8h.js`, `tests/conveyor-packets8h.test.cjs`. No save-schema redesign; existing packet `targetId` can now name a paid chemical station.

## Mandatory verification before release

Run `node --test tests/conveyor-packets8h.test.cjs tests/logistics-powered-network8h.test.cjs tests/industrial-dry-feed8h.test.cjs` plus the entire existing Engineering and Update 8 release matrix. Then regenerate `PLAY-STARFALL.html` via `python3 tools/build-standalone.py`, run `python3 tests/standalone-parity.py`, and execute native `file://` WebGL2 Engineer conveyor UI, chemical reaction, 1×/10×/100×, power interruption, full hopper, save/reload and old-save cases.

**NOT YET VERIFIED**: release CI on this exact head, full player-driven end-to-end ore→offworld chain, output-depot integration, unattended remote industry, consumer GPU FPS. Do not merge or close #86 until these gates pass; 8I remains blocked.
