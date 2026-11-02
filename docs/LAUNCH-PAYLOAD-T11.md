# T11 — Launch pad commissioning and payload handoff

**Baseline:** `feature/t10-science-chain-custody`. **Branch:** `feature/t11-launch-payload-infrastructure`.  The baseline branch remains intact as rollback. This implementation is an additive limited-scope T11 increment; it does not imply 6DOF launch, real Hohmann transfer, or fully simulated entry/descent.

## Existing-state impact map

| Owner | Before | T11 change | Backwards compatibility |
|---|---|---|---|
| `StarfallOutposts.Store.items` | Foundation, `condition`, `enabled`, wiring | Optional `foundation.padT11`: `schema:1`, legacy/commissioned, commissioning time | Old pads default to legacy; cleanItem preserves new config |
| `StarfallPowerLedgerT02.grid` | Foundation wattage zero | Commissioned pad controls add **90 W** through the real 48 V shared network | Legacy pad stays at 0 W |
| `StarfallLaunch.Store.launches` | Ascent state, fuel, stage and orbit | Optional `payloadT11` per mission with persistent mass, route, coordinates and custody state | Old missions without manifest still load |
| `Store.deploy` | Satellite or T06 rover payload | New mission requires **verified bound orbit** and exactly one attached manifest; record actual deployed asset ID and release time | Older save missions use prior release path |
| `Rocket Lab` | Foundation selection and rocket build/flight | Inspection, commissioning toggle, 90 W power/readiness, destination and payload route preview | Existing tabs and keyboard controls unchanged |

## Operational workflow

1. Land on a solid body, build a **Foundation** through Outposts and select it in **Rocket Lab**.
2. For advanced support, choose **COMMISSION PAD / 90 W**. Wire a real solar source or battery to the foundation, confirm it is powered in the Outposts electrical diagnostics, and ensure there is terrain/structure clearance.
3. Configure the existing multi-stage rocket. The payload manifest shows payload mass, connection/retention allowance, destination body and transport class.
4. Launch. The existing **7B force-integrated** solver continues to control acceleration, fuel, staging, orbit insertion and failure. The physical orbit gate controls payload separation; a failed rocket must not spawn a successful payload.
5. Satellites inherit the existing launch-derived orbital state. Rover delivery follows **T06** destination terrain sampling, entry/descent envelope and safe/unsafe touchdown checks. The manifest persists the intended target and links the deployed rover ID.
6. **LEGACY PAD MODE** restores the existing no-commissioning launch behavior on this foundation. It does not change the engine solver or mission records.

## Explicit fidelity boundaries

- **Real physical dynamics:** 7B numerical ascent with modeled gravity, thrust, fuel and atmospheric drag; finite battery energy through T02.
- **Simplified engineering:** launch pad clearance uses existing terrain sampler and a **12-scene-unit** separation from nearby outpost structures beyond their own radius; T06 capsule descent remains a bounded engineering approximation, not integrated 6DOF.
- **Fictional:** a rover sent to another star system uses the existing explicitly labeled interstellar carrier *after* a physically validated origin orbit.
- **Unsupported, intentionally blocked for new T11 missions:** transfer to a different planet **in the same star system**. STARFALL has no validated same-system transfer solver, so T11 refuses this path rather than making a rover appear at a different body without modeled travel.
- A Foundation is not physically consumed as rocket propellant and commissioned pad control load is continuous whenever its circuit is powered. Legacy pads remain playable without retroactive power gates. Rocket exhaust plume, blast shielding, fabrication and 6DOF ascent are outside this increment.

## Authoritative contracts

`StarfallPadT11`: `repair`, `configure`, `requiredWatts`, `inspect`, `validateDestination`, `validateLaunch`, `manifest`, `observe`, `canDeploy`, `release`. This file owns only pad qualification and payload custody fields. Existing 7B rocket flight state, T06 rover landing state, T02 power reports, Outposts structure ownership, T03 communications, 7C satellite operations and T10 sample records remain authoritative.

## Testing and release gates

`node tests/launch-pad-t11.test.cjs` validates real wired 90 W consumption, disconnected source rejection, pad occupancy, legacy mode, normalized target coordinates, persistent manifest and premature deployment rejection. The pre-existing regression suites must also pass. Run:

```bash
for test in tests/*.test.cjs; do node "$test" || exit 1; done
python tests/standalone-parity.py
python tools/build-standalone.py
python tests/standalone-parity.py
git diff --exit-code -- PLAY-STARFALL.html
```

Chromium/UI coverage and real-GPU playability must be reported independently. **Passing a Node test does not prove a successful interactive launch.** The existing launcher and ship-ramp/truck controls must remain unchanged.

## Rollback

Return to `feature/t10-science-chain-custody`, or disable commissioning on a Foundation through **LEGACY PAD MODE**. Save a copy of current browser data before running older builds; older source may ignore the new `padT11` and `payloadT11` fields.
