# STARFALL — Update 7D: Rover Autonomy & Ground Operations

**Baseline:** Update 7C, containing all 7B.1 hierarchical Asset Explorer, 7B force-based rocket flight, and earlier systems. **Scope:** 7D only, not 7E.

## Impact map and contracts

- **New `src/physics/ground-operations7d.js`:** `StarfallGroundOps7D` pure deterministic bounded ground controller; radial planet-fixed coordinates, explicit metres-versus-scene conversion, six-contact terrain and traction probes shared with `StarfallRoverDynamics`. Operational state is additive `rover.ground7d.schema=1`; the original launch7 save keys and rover IDs are untouched.
- **`src/physics/launch-systems.js`:** additive `Store.queueProgram`, `Store.queueStop`, extended optional `Store.tickRovers(...,groundOps)`. Old in-process `Store.command` retained for compatibility with existing direct model callers; the real game UI exclusively uses the radio-queued path.
- **`src/physics/launch-ui.js`:** same-world ground terminal and satellite-relay LOS model (both satellite radio and outpost antenna must be operational); bounded delay/queuing; mission status, energy, distance, onboard/downlinked readings. No instant interstellar network is fabricated. Remote program execution may continue during a blackout but *new* programs and emergency stop await a usable link.
- **`src/physics/robotics-ui.js`:** `StarfallScienceUI.ingestRover` publishes downlinked, once-only, saved observations to the existing science journal. Undownlinked data is not shown as received in remote telemetry.
- **`src/flight.js`:** truck winch route/energy/hazard preflight, incremental recovery with cancellation and actual battery draw; additive recovery state inside existing `flightGalaxy.truckPose`. Wired 7A charging unchanged; the truck remains rideable with explicit X; uncrewed science rover stays unrideable.
- **`index.html`/standalone:** 46 ordered script modules with offline source parity; 7D mission guidance and CANCEL WINCH.

## Gameplay

1. From Rocket Lab, deliver a robotic rover (as in Update 7); select it under **Autonomous Rover · Radio Mission Control**.
2. Queue a constrained script (`DRIVE`, `TURN`, `WAIT`, `SAMPLE`, `STOP`). The program waits when no receiver has line of sight, and delivery has a nonzero modeled radio delay. No arbitrary JavaScript or unbounded commands.
3. When the onboard program executes, each short drive segment samples the same six-contact traction model used locally, estimates climb, traction and energy, and stops on unsafe slope, depleted energy reserve, or unavailable terrain rather than teleporting.
4. Instrument observations remain onboard during blackout, downlink when a valid link returns, and publish once to the shared Field Science journal.
5. Park the truck near the ordinary surface science rover, leave the cab, open Truck Equipment in Rocket Lab and press **WINCH**. The rescue checks distance, terrain obstruction, and available energy; rover motion then progresses each simulation tick. **CANCEL WINCH** stops without refunding already consumed work.

## Engineering boundaries

- Terrain model is a reduced-order six-contact sampler and friction/grade approximation, **not** full rigid-body suspension, mud/tire deformation, or dynamic route planning for remote probes. Each remote DRIVE step is checked but a full remote A* planner is deferred.
- The local six-wheel rover retains its previous controller and validated GOTO/SCAN/IF/RETURN/DOCK programming. Remote capsules retain legacy DRIVE/TURN/WAIT/SAMPLE/STOP grammar; a single unified interpreter remains further integration work.
- The radio model requires a same-body live control endpoint and short-range path, or line-of-sight via an active satellite in the system. A global interstellar communications constellation has *not* been implemented. Programs may queue while a distant system is unloaded, and cannot magically execute until a usable link exists. Terrain can be simulated from a saved seeded body snapshot, without full distant mesh rendering.
- Remote driving computes finite grade, energy and six-contact checks with bounded steps. Remote time updates are clamped to 15 simulated seconds per tick; after very long skips it intentionally does not silently traverse an entire planet.
- The surface truck recovery range retains the legacy **55 scene-unit gameplay radius**; work, obstruction and travel progress are simplified, *not* literal kilometres of winch cable or a high-fidelity tension/rope simulation. Recovery is limited to terrain-checked segments.
- Wired 7A electrical charging, normal truck driving, rocket flight, satellite capture/downlink, exploration UI and save schema are otherwise unchanged.

## Save migration and rollback

- Load of 7C launch7 schema 1 rovers is additive. First ground operation creates `ground7d` with schema 1; stable IDs, commands, science records and original fields remain unchanged. Older save data is not overwritten with an entirely new schema.
- Future-incompatible `ground7d` data is treated as older default on access; invalid rover geometry or battery state produces a safe error.
- The complete untouched Update 7C project ZIP is preserved at `backup/STARFALL-UPDATE-7C-SATELLITE-OPERATIONS.zip`. To roll back, restore that archive and use its standalone game. Existing 7D save fields are additive and ignored by older code.

**Do not interpret mocked-WebGL interaction checks as proof of real-device GPU visuals or frame-rate performance.**