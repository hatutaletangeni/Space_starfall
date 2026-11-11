# Update 8K progression repairs — 2026-11-11

This repair removes reproducible progression and evidence defects. It does not
certify the complete no-debug two-world expedition or real hardware performance.

## Fixed blockers

- **First furnace deadlock:** the prior fresh manifest shipped no smelter, but
  making a smelter required hundreds of kilograms of metal that only a smelter
  could refine. Manifest version 2 ships one sealed reduction furnace, empty CO
  vessel, pressure pipeline, CNC, PCB etcher and solder station. Each is a real 8A kit, uninstalled until
  its original paid installer consumes it. No operating plant, power port,
  refined local ore, replacement truck or manufacturing receipt is granted.
  The two electronics-tool BOMs also require control boards; shipping their first
  uninstalled kits breaks that second circular dependency.
- **Finite specialty supply shortfall:** the game currently has no local polymer,
  refractory-brick, laminate or chip production chain. New expeditions carry
  explicitly finite prelaunch stock for the downstream plant BOMs. Four PV modules
  and forty finite cells cover the habitat shell, native T02 grid, replacement
  vehicle and additional structural work;
  no free solar installation or charged battery is added. The version-3 manifest
  is **5,461.65 kg / 12.3785 m³**, within the original 9,000 kg / 16 m³ hold.
- **Permanent drill exhaustion:** previously the drill crossed its 10% limit
  after about 188 bores (3.76 tonnes) and requested nonexistent service. A 60 s,
  120 kJ service operation now exchanges a ship-held certified 2 kg head for the
  original truck's worn 2 kg head as physical scrap. Two finite prelaunch spares
  are included. Further heads require 2.2 kg steel, the installed CNC, 408 kJ and
  240 s; 0.2 kg machining scrap is tracked separately. Service is available in
  Mission → Operate and the shared desktop/mobile truck cockpit. It pauses when
  the truck moves or the operator/ship leaves range. No full-condition service,
  reserved part consumption, remote repair, cancelled-job energy refund or free
  condition restoration is allowed.
- **Mining clock mismatch:** drilling/hauling used wall-clock dt even when the
  native clock and power ran at 10×/100×. The runtime now consumes full native
  elapsed time in at most two bounded 2 s steps per render frame. Energy and
  wear depend on the same simulated seconds. Completion holds for a durable
  retry if saving fails; stock/depletion/condition roll back together.
- **Mobile time control:** the on-foot and ship-interior touch layouts hid
  TIME even while the player needed it for industrial jobs. TIME is now visible
  in those contexts, and the truck cockpit has the same native 1×/10×/100× action.
  The mobile browser test taps actual TIME and MISSION buttons without a keyboard.
- **Missing real mining evidence:** the 8K report expected `status=COMMITTED` in
  8C extraction records, whose actual persisted format has no status field.
  The report now joins the actual extraction ID, site, mass and hopper to a paid
  committed 8D drill and matching persistent depletion. Unmatched or unpaid
  records do not count.

- **Replacement vehicle blocked by unavailable bearing alloy:** version 3 ships
  32 kg of finite qualified bearing steel. The game has no local bearing-alloy
  qualification process; generic steel cannot silently replace it. Real bearings
  still require the installed grinder, work time, input debit and scrap.
- **Whole-expedition dependency closure:** the actual integer-batch 8F recipes,
  installed tool requirements and full 8G bills now reconcile for a rover,
  pressure habitat, dry rocket structure, two depots, conveyor, required chemical
  plants, vessels and native T02 power. This requires 340 real populated-board
  batches and substantial local Fe/Cu/Al/carbon/silica processing. Shipped specialty
  inputs are sufficient, not unlimited. Planning is not a completed playthrough.
- **Manufactured vehicle evidence:** the report now accepts the native commissioned
  `vehicle_frame`, full consumed mechanical bill and actual 2.5 MJ activation.
  It preserves evidence when the built vehicle travels to another world or ship
  cargo. An unrelated generic vehicle receipt is insufficient.
- **Metal evidence:** sorted ore concentrate no longer counts as refined copper
  or iron. Both must appear as actual paid chemical outputs, alongside recovered
  water.
- **Free legacy rocket bypass:** Industrial expeditions cannot ignite the older
  launcher that synthesizes stage fuel and a payload from a design. The original
  force-integrated launcher remains available in genuine legacy saves. Industrial
  Rocket Lab explicitly shows DESIGN PREVIEW; manufactured 8G dry stages remain
  unqualified, unfueled structural prototypes. No positive manufactured rocket
  launch is claimed.

## Compatibility

Existing manifest receipts, including those without a version field, remain
one-time receipts. Reloading, moving between worlds or updating the build never
replenishes their goods. Expanded prelaunch cargo applies only to a **new
Industrial expedition**. Keep an old expedition's saved backup before starting a
new one. Legacy saves and original truck IDs are retained.

## Reproducible verification

- `node tests/update8k-fresh-progression.test.cjs`: starts from the actual shipped
  manifest, installs the genuine source-owned equipment with the native ship
  vehicle energy store, mines/hauls 100 kg from original seed-742 geology,
  refines hematite, produces iron/steel with the actual chemistry, fabricates and
  installs a hand winder, manufactures a real populated control board, motor
  and CNC replacement head, then
  services the existing drill. All material, truck/ship energy, scrap and original
  truck identity reconcile. No test-owned material lots or installed fixtures.
  This source test does **not** exercise native gas-pump ticks or real flight.
- `node tests/mining-service8d.test.cjs`: consumes real shipped parts; checks
  reservations, missing parts, power, operator/ship range, cancellation,
  capacity failure, reload/replay and exact runtime Flight.js functions at
  1×/10×/100×, including failed durable start/completion and actual 8C audit data.
- `python tests/update8k-readiness-browser.py`: real offline Chromium desktop and
  mobile viewport, real new-game manifest, visible service controls, KeyT 100×,
  source head debit, scrap, actual truck battery and reload. Navigation and drill
  wear are explicitly controlled fixtures. No stock or energy is injected.
  Screenshots are CI artifacts; software WebGL is not real phone/GPU evidence.
- `node tests/update8k-expedition-bom-closure.test.cjs`: whole-plan finite
  stock/tool dependency closure with real integer recipe batches; catches the
  prior PV/electrode/bearing shortages without inventing new cleanroom inputs.
- `node tests/industrial-launch-no-free-rocket8k.test.cjs`: rejects the old free
  launcher on Industrial saves before owner mutation; retains legacy ascent.
- `python tests/update8k-historical-saves-browser.py`: boots authentic historical
  standalone git blobs (9536bc4, f6fa832, 1d2b9a4), obtains their own lifecycle
  saves and imports through the current archive UI. It checks retained cargo,
  discoveries, credits and original truck through reload. These are actual old
  game versions, not copies of a user's private save.
- `python tests/update8k-continuous-flight-browser.py`: plots an ordinary surface
  waypoint and pilots with G/W/Shift through the actual Flight.js loop to another
  world. No saved-position injection, teleport or simulated-time setter. Records
  continuous positions, source cargo identity and actual landing/reload. This
  proves native flight separately from industrial source integration.
- Required 8K CI includes these checks and the original fresh-manifest browser
  regression. Desktop/mobile standalones are rebuilt from the same source.

Browser regression hardening also observes the 8I water debit synchronously at
the actual transaction boundary (ordinary ship charging remains active), and
restores T03 radio/rover snapshots in one tab without replaying older fixtures.
No energy tolerance or persistence assertion is weakened.

The remaining release acceptance requirements are tracked in
`STARFALL_8K_RELEASE_ACCEPTANCE.md`; source and controlled browser checks do not
replace uninterrupted player flight, historical-save imports, physical phone
controls or consumer GPU measurements.
