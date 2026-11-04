# STARFALL Update 8G — live physical frame assembly release gate

## Implemented in current release candidate
- 760 kg / 2.8 m³ assembly-pad kit is fabricated from finite finished stock and installed into the conserved physical asset ledger.
- Engineer 8G BOM reports actual certified grade, shortages, reservations, power and pad identity.
- Added rails, axle shafts, leaf springs and finite low-speed wheels to rover and truck frame bills; no unsupported claim of roadworthy wheel braking or steering.
- Live EVA-only build action requires operator within 35 scene units of the installed pad, landed powered ship within 80 units, full certified physical BOM and an actual 200,000 J ship-battery debit.
- One transaction converts 8A lots into an exact-mass persistent `vehicle_frame` and unique receipt. The original truck ID remains untouched. A second frame requires another complete BOM.
- New frames use a shared visible open-chassis 3D mesh, not a magical fully assembled truck.
- Saved `vehicleAssembly8g` snapshot survives reload; old saves with no field restore to an empty 8G receipt ledger.
- Experimental longitudinal vehicle dynamics module implements gravity, traction, battery energy and braking behind mandatory certification flags. It does not activate a runtime vehicle.

## Not yet accepted as complete 8G
- No certified roadworthy wheel bearings, brakes, steering, drive controller, battery management or crash collision integration.
- A manufactured frame is **not drivable**, remotely commandable, boardable or loadable in 8B cargo. It cannot be called a commissioned truck.
- No materially complete Rocket Lab stage/engine/tank assembly or habitat pressure-shell construction, final 8G tasks.
- Broad Chromium gameplay regression, offline source parity and verified real GPU performance require green evidence after final build.
- UI button does not grant a vehicle, materials or energy; if assembly prerequisites are missing, it fails with actionable status.
- Do **not** start 8H as a production dependency until at least one newly manufactured vehicle can be commissioned, driven, loaded, transported and saved without a free copy.

## Reproduction commands
```sh
node tests/vehicle-assembly-pad8g.test.cjs
node tests/assembly-inspector8g.test.cjs
node tests/vehicle-assembly-contract8g.test.cjs
node tests/vehicle-assembly-runtime8g.test.cjs
node tests/vehicle-drive8g.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
```

Engineering model caveat: manufactured prototype components are simplified; proof of a material debit does not certify mechanical safety or electrical energy storage performance.
