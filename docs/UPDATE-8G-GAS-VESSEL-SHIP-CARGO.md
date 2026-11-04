# STARFALL 8G — rated gas-vessel cargo transport

## Implemented gameplay
- A manufactured, installed `industrial_vessel` of type **oxygen** or **nitrogen**, with condition >=80% and a rating of at least 5 MPa, can be loaded with the actual 8A pressure-safe material inventory in its own vessel-owned container. It is moved as **one physical asset**: its ID, container ID, gas lot IDs, gas masses and gas provenance never change.
- Ship-gantry operation costs **120 kJ of the real engineering battery per load or unload**. Only a powered landed ship, correctly positioned EVA astronaut, a unit-length body-fixed surface location and valid existing physical vessel can operate it. A sealed cargo cradle, `engineering-gas-cradle`, is separate from the expedition truck and from 8G's vehicle-frame cradle.
- Capacity: **one rated O₂/N₂ vessel** in the cradle; **1,300 kg including all contained gas**, maximum **8 m³ outer vessel envelope**. It also shares the broader **3,500 kg / 155 m³ ship physical cargo rating**, accounting for existing truck, rover, manufactured frames, other stowed assets and other gas-vessel contents.
- The **vessel mass plus its contents** is now included in `shipCargoMass8A()` and therefore in the physical flight dynamics via `shipConfiguredState()`. The old frame cradle has also been corrected to include already loaded gas contents when checking its own capacity. There is no free, massless propellant or reaction-mass cargo.
- On arrival at another landable world, the same filled vessel can be unloaded within winch and EVA range to collision-free terrain. Its gas remains in the exact same pressure container. The original expedition truck and science rover never disappear or get cloned.
- Exact 8A custody receipts: `gasCargo8g:N` with source/destination asset location, source power, 120 kJ electricity, physical vessel ID, gas container ID, material ID, gas lot IDs and shell+gas mass. Both material and physical 8A validators are checked before committing save changes.
- Engineer interface provides explicit **WINCH PRESSURE VESSEL INTO SHIP** and **UNLOAD PRESSURE VESSEL TO CLEAR SURFACE** actions, displaying container mass and cargo restrictions. Only the real existing pressure vessel can be selected; it cannot be replaced by a fictitious gas inventory slot.

## Explicit scientific/engineering limitations
- This is a **gameplay mass-conserving pressure-container transport model**, not real-world certification of pressure bottle restraint, vibro-acoustics, thermal safety, valve protection, emergency venting or collision-rated landing.
- The gas is still **inside the original stationary vessel's 8A container** after unloading; it does **not** teleport to the unpressurized ship raw-material hold. A physical gas hose/valve/pump delivery stage is still required before `habitat-charge8g.js` can use a surface vessel as a nitrogen or oxygen source. Oxygen may be sourced using 8E electrolysis, nitrogen using 8G modeled-atmosphere fractionation.
- Physical gas vessels are protected from transport when their material lots have pending 8A reservations; the gas must be a single compatible material grade >=.98. The extra pressure rating is checked, but full real-time tank pressure, temperature, material fatigue and certified pressure-relief simulation are **not** yet implemented.
- Only O₂ and N₂ are permitted in this first bounded crew-gas cradle. H₂/CH₄/LOX, other combustible or cryogenic rocket propellants are **not** enabled. Rocket-stage flight and life-support occupancy remain blocked.

## Acceptance tests
- `node tests/gas-vessel-cargo8g.test.cjs` checks dry+gas mass, ship capacity, real O₂/N₂ ownership, lost/mixed/low-grade stock, reserved contents, pressure ratings, power, physical winch range, one-vehicle originality, finite receipts and rollback.
- `node tests/frame-cargo8g.test.cjs` checks the previous frame cradle cannot ignore already loaded gas mass.
- `python3 tools/build-standalone.py && python3 tests/standalone-parity.py && python3 tests/air-fractionation8g-browser.py` exercises actual 20 kg atmospheric N₂ batch production, second distinct batch after reload, then real UI vessel loading, real ship inertial mass, cargo ownership save/reload and physical surface unloading.
- All existing ship, original truck, Rocket Lab, T06 autonomous rover, factory and UI integration regressions must pass before merging to `main`.

**Next 8G slice:** finite physical gas transfer from a rated vessel on the same surface (or inside an actually connected ship gas manifold) to an empty manufactured habitat, through real powered pumps/valves and gas custody, no free top-ups. After that: T09 power and oxygen/CO₂/water dynamics and finite 7B rocket fueling.
