# STARFALL Update 8B — Physical truck cargo ramp (draft)

**Base:** 8A physical custody branch. **Do not merge directly to `main` before 8A passes all gates.**

## Geometry audit
Existing four-wheel truck mesh in `src/engine.js`: approximately 11.0 scene units wide, 14.8 long and 8.75 tall, including mirrors/wheels and roof accessories. Crew rear ramp is 6.3 scene units wide at the ground contact; truck **cannot** physically fit.

A separate external starboard vehicle rack was added to the **same** ship renderer. It has a 14.5-unit-wide cargo deck at ship-local x=9.25..23.75, floor y=-1.2, overhead y=11.35, and z=-4..19; independent wide ramp ends at z=39 and y=-7.25. It leaves the original center astronaut ramp untouched. Truck footprint/clearance are checked in `cargo-bay8b.js`; initial rated limit 3500 kg / 155 cubic scene volume is **provisional engineering gameplay data**. Cargo geometry is larger than the original hull, so it requires a revised ship structural/propulsion certification pass before being considered physically realistic.

## Controls and persistence
- Use original **X** to enter and exit truck. The science rover remains non-rideable.
- **B** (remappable Cargo control) near the starboard ramp releases secured initial truck onto the deck; walk up, press **X**, hold **S** to reverse down the wider ramp.
- When truck faces **toward** the ship and is physically aligned at the wide ramp end, **W** drives it onto the dedicated rack. Park inside (at z approximately 11), **X** to exit and **B** near ramp to secure its four hold-downs.
- A loaded truck is drawn in ship-local coordinates while flying or landed. Its asset ID is unchanged. 8A changes custody from `surface` to `ship` on securing. Loaded mass contributes to Engineering Flight `dryMassKg`.
- 8B ramp phase/relative coordinates and transfer monotonic counter persist in `flightGalaxy.shipCargo8b`. Ship cannot launch during unsecured ramp occupancy.
- If the ramp does not meet nearby terrain within tolerance, deployment/loading is blocked and a flatter landing is required.

## Code changes
`src/physics/cargo-bay8b.js`, `src/engine.js`, `src/flight.js`, `src/controls/input.js`, `index.html`, `tests/cargo-bay8b.test.cjs`. The 8B branch's dedicated GitHub workflow rebuilds `PLAY-STARFALL.html` from source and tests source/standalone parity.

## Explicit limitations / acceptance gates
This is a gameplay integration candidate, NOT final physics certification. The wide ramp is mesh geometry with a parameterized, bounded truck travel solver; it is **not yet** mesh-based suspension collision, verified tire contact, or a terrain-resolved articulated deck. Loading and unloading show visible relative motion and enforce a fitted corridor, but don't simulate wheel deformation, winch cables, structural loads, friction, automatic tie-down tension, or player walking collision on elevated deck. The physical loading procedure and terrain tolerance require real 3D playtesting. The six-wheel science rover still lacks an independent cargo tie-down/loading path. Finite loss/repair on ramp collision is not modeled. Full browser/WebGL2 scenario, time-warp/save-reload stress, camera/ramp interaction, control-remapping under custom binds, and real GPU FPS remain unverified unless their CI explicitly reports success.

Manual check: start in ship with single visibly mounted truck; land A; B to release; X to enter; reverse off ramp, drive away, save/reload; align at ramp and W to drive aboard; X and B to secure; take off, travel and land B; B, X and reverse out; leave original truck on B and travel again; confirm none appears elsewhere. Independently test loading failure on steep terrain, mid-ramp takeoff block, old saves with truck on A, repair/charge and science rover visibility. Verify cockpit, original crew ramp, star map, all 2368 stars seed 742 and settings.

**Rollback:** retain existing 8A branch `feature/update-8a-physical-inventory`; this 8B feature is isolated and has not modified `main`.
