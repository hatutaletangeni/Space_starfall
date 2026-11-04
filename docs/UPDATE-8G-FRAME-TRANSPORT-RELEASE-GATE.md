# Update 8G: manufactured-frame transport acceptance

## Real functional path

1. Refine mined resources into certified finished material lots using the existing 8E chain, including manufactured rails, wheel hardware, brake and steering prototypes.
2. Fabricate the 760 kg assembly-pad kit, physically erect it, and walk EVA beside the installed pad.
3. Under **Engineer → 8G Vehicle Assembly**, consume the full finite bill of parts and 200 kJ of the ship electrical battery. A new unique physical `vehicle_frame` is placed at a surface location that clears the factory, ship and owned equipment.
4. Under **Engineer → 8G Manufactured Frame Cargo Gantry**, load the nearby frame into the dedicated `engineering-frame-cradle` with EVA supervision, a landed powered ship and a 30 kJ ship-battery debit.
5. Launch and land the existing spacecraft normally. The frame is attached to authoritative 8A ship custody (`parentId=ship-main`) and therefore enters the established ship dry cargo mass calculation.
6. Land on another world, leave the ship on EVA, and unload into an obstruction-free surface footprint. This is a 30 kJ powered gantry transfer; the original 8B expedition truck ramp remains independent.
7. Reload and check the same physical frame ID, original truck ID, consumed-material receipt, ship battery charge and transfer receipts. No free stock or duplicate vehicle is created.

## Deliberate limitations

The gantry is modeled as a finite-distance, finite-energy custody transaction **rather than a detailed crane/ramp animation**. A `vehicle_frame` is **not drivable or roadworthy**. The prototype brake rotors, caliper housings, steering rack/knuckles and motor controller still require real system integration, control authority and validated safety/physics before vehicle commissioning. The 8G rocket-stage and habitat pressure-shell build pipeline is also pending. It would be misleading to call 8G complete or to launch 8H production logistics based solely on physical frame transport.

## Verification

- `node tests/frame-cargo8g.test.cjs`: finite cargo envelope, EVA supervision, energy receipts, conservation, idempotence, original truck unchanged.
- `python3 tools/build-standalone.py` and `python3 tests/standalone-parity.py`: editable source and offline deliverable parity.
- `python3 tests/assembly-live8g-browser.py`: real headless Chromium interaction from material fabrication/vehicle frame staging through load, reload and unload.
- Existing broad engineering regression, Rocket Lab secured-truck and Update 8 release gates must all pass before release merge.

No production stock is seeded by the tests; the browser test constructs a controlled fixture with distinguishable `TEST_FIXTURE_ONLY` provenance and only modifies that isolated test profile.
