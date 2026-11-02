# STARFALL T04 — Real Surface Antenna and Relay Engineering

**Parent:** verified T03 `707a78fdfbef031ffd311d2c174d2029d0cfec8c`.  
**Branch:** `feature/t04-antenna-relay-engineering`.  
**Workstream:** Surface antenna hardware and local multi-hop comms (not interplanetary networking, which is T08).

## Code map, authoritative owners and T04 state transitions

| Source | Owner / action | Preservation |
|---|---|---|
| `src/physics/outposts.js`, `outpost5.items[].radioT04` | **The existing placed antenna** owns mode, body-fixed boresight, one tracking target ID, radio enable, bounded onboard reference inbox, last contact and fault | Original item IDs, 48V electrical bus, physical cable graph, `outpost5.schema=1`, placement and visual model unchanged |
| `src/physics/antenna-hardware-t04.js` | Pure configuration repair, two-sided signal-gain approximation, LOS, finite link bitrate, one-to-three-edge graph search, buffer diagnostics | No second satellite, antenna, power, photo or evidence store |
| `src/physics/power-ledger-t02.js` | Original 48V source-owned grid draws 165W antenna nominal, **200W in auto-track**, 12W RF-disabled standby | The same battery/solar Joules and original prioritized loads are used, not a duplicate tracking-energy account |
| `src/physics/mission-comms-ui-t03.js` | Dynamically constructs actual node IDs for ship, local/deployed rover mast, live T02-powered towers, 7C orbital relays and a *wired* lab port. Reuses T03 packet ledger and T01 clock | Original ground science receipt, rover numeric data and 7F image owner remain authoritative. Legacy ship radio is preserved but physically battery-gated |
| `src/physics/mission-transport-t03.js` | Keeps actual per-hop route metrics as a bounded packet diagnostic | Byte counters, receipts, priorities, expiry, ACK and image references remain T03-owned |
| `src/physics/outposts-ui.js`, `index.html` | Existing **Surface Outposts > Radio** panel now has equipment selector, legacy omni, fixed aim, target tracking, radio-off and safe reset plus real link/storage telemetry | No new gameplay window, no new controls for boarding/driving/rendering |

**Hardware state:** `SWITCHED_OFF` (whole DC structure isolated) or `DC_BUS_OFFLINE` (unwired/no solar or stored battery) or `RADIO_DISABLED` (12W standby, no receiver) or `HARDWARE_FAILED` (condition below threshold) or `ONLINE`. `ONLINE` is only a prerequisite: *every* actual packet hop still checks geometric LOS, range, pointing, quality, bandwidth and a real destination ID. A communication is not delivered unless T03's destination owner accepts it and the ACK finishes.

**Versioned radio record, original owner only:**
```js
outpost5.items[i].radioT04 = {
  schema: 1,
  mode: "omni" | "fixed" | "tracking",
  boresightLocal: [x,y,z], // body-fixed unit vector
  targetId: "...", // one real receiver ID, required for tracking gain
  radioEnabled: true,
  bufferCapacityBytes: 4194304,
  inbox: [{packetId, observationId, sourceId, bytes, receivedAtS}],
  lastContactS: null, lastPeerId: "", fault: ""
};
```

**Old saves:** Missing `radioT04` maps to **omni, radio enabled**, original 165W load and no inbox. Data are bounded and sanitized through the existing `Store.restore/cleanItem`. No change to existing global `SF.version`. The schematic visuals, rendered world, mobile controls and earlier antenna layout remain untouched.

## Radio engineering and approximations

- Actual ship and rover positions use original body-fixed coordinates, rotating with the active world's source-owned spin. Satellites use the **original `StarfallLaunch.orbit`** Kepler position, powered/radio-enabled `StarfallSatelliteOps7C` status and source-owned orbital battery (including eclipse effects). A disabled/empty relay cannot route.
- Every pair checks the existing `StarfallOutposts.radioLink` planetary sphere occlusion/radio horizon, with a bidirectional **geometric-mean range** representing simplified combined transmitter/receiver link budgets. It is not a full Friis/noise-temperature solver and is not a license for interstellar contact.
- Omni supports old antennas, fixed checks dot product of physically rotated boresight and receiver direction (gain threshold), tracking can follow **one specified real receiver only** and costs 35 additional watts while the whole DC source remains real. Tracking is a bounded average processor/motor power approximation: **slew-rate, backlash and actuator dynamics are not yet integrated**. No fabricated extra power source.
- Effective bit/s is reduced by range quality, hardware condition, pointing loss and the two endpoints' finite rated rates. Every hop gets actual unique endpoint IDs, distance in metres, propagation in seconds, bitrate and quality; aggregate route uses minimum hop bitrate.
- The node graph considers a powered ship, actual deployed/local rover, any installed powered tower, powered 7C relays and a lab port **only if it is wired to an online antenna in the same real DC group**. BFS is bounded to **four nodes / three links**. Intermediates are independent physical devices rather than generic 'on this planet = connected'.
- Surface towers and orbital relays reserve at most **4 MiB** per intermediate device from the single T03 packet ledger. A tower can take custody of a reference to a rover observation while the ship is blacked out, with a *separate* finite persisted antenna `inbox`. Rover science bytes remain in the original rover records; a waiting forwarding packet references their ID and cannot mark journal evidence received until the restored ship contact actually completes.
- The existing satellite 7C pass-window readout is retained in Rocket Lab. Link quality and per-hop diagnostics reside on T03 packet records, and tower buffer/ACK/heat/DC state in the Outpost Radio panel.

## One-page player workflow

1. **Physically land**, EVA, use the existing Outposts construction tool to place a solar array (needs sun), battery and radio antenna. Connect them with the *actual* 80-scene-unit-limited DC cables on the Power Grid tab. The antenna will show an actual 48V bus and its source IDs; nearby but disconnected modules are not powered.
2. Open **Outposts > Radio**, choose the actual antenna. Omni is the backward-compatible all-directions mode. Select a **real rover, ship, nearby tower or deployed satellite** and choose `FIXED` then **AIM FIXED DISH AT TARGET**, or use **TRACK** for one moving target at an extra modeled **35W**. A dish aimed at one endpoint is not guaranteed to relay to an endpoint in the opposite direction.
3. Observe the **live actual power W, DC bus, temperature, RF rating, finite buffer usage, pending ACKs and latest contact** in the same panel. Switching off a DC junction, disabling antenna RF or exhausting its connected battery makes route selection fail.
4. Issue a rover program through the existing Rocket Lab. **PACKETS** shows selected route IDs, byte/ACK state and last radio reason. A satellite can relay only when its real 7C power and orbital geometry permit two usable hops.
5. Rover numeric science whose ship link is absent may be received by a **powered line-of-sight surface tower** into a bounded 4MiB reference buffer. It is *not in the player science journal yet*. After the ship returns in range with energy, the tower sends a second real packet and journal receipt appears exactly once upon acceptance.
6. The LAB port requires that the actual lab and radio are powered and **wired together on the same electrical group**. There is no magical lab download just because the antenna icon is nearby. T10 completes full sample/lab workflows.
7. To inspect/read without mutation, use `StarfallAntennaT04.diagnostics(item,body,report,StarfallCommsT03.transport.packets,StarfallOutposts.rotate,RT.time)` or `StarfallCommsT03.status(assetId)` in developer tools. Back up your save before switching technology branches.

## Deliberate exclusions, fidelity, and remaining risks

- **No fake interplanetary relay.** T08 commissions physical Planet A→Planet B/higher-gain cross-world trunk links; today's transmitter/receiver both belong to one body.
- **No duplicate large image bytes in RF queues.** Existing 7F IndexedDB photo payloads and actual WebGL image capture are retained; T05 is still necessary to render a remote unloaded world's true scene.
- **No instantaneous worldwide broadcast.** Each valid hop has source/dest IDs, a real condition-dependent link, finite bitrate, delay and payload custody.
- **Not a complete per-hop store-and-forward multiplexing simulator:** T03 still models multi-hop routes as a bounded aggregate transfer with a per-relay byte reservation, not independently scheduled per-hop frames or interference/crosstalk across unrelated routes. T08/T16 can refine contact plans and per-hop collision slots, with regression evidence.
- **No detailed RF noise figure, atmospheric attenuation spectrum, rigid dish motor inertia, thermal connector fuse or battery ageing.** Surface wear is the existing condition model and T02 heat approximation.
- **No destructive 'purge all pending packets' button.** T03 deliberately refuses silent loss at caps; explicit archive/export remains the safe operator path. The radio-enable/disable and omni reset are real, recoverable QA fault controls.
- Real GPU FPS and human-played complete Planet A→B expeditions remain **NOT VERIFIED**, irrespective of Chromium software-WebGL test passes.

## Verification + rollback

Unit test: `node tests/antenna-hardware-t04.test.cjs` covers real T02 DC power, loss of wired power, dish mispointing, one-target tracking, extra 35W battery demand, lab socket bus mismatch, physical satellite relay visibility, finite storage and old-save migration.

Browser: `python tests/antenna-hardware-t04-browser.py` uses real Chromium `file://`, game Store construction, real LOS and power (no mocked 'connected' shortcuts), existing Outpost Radio UI, physically sampled rover reading, tower custody, saved forwarding and journal outcome. It uses controlled fixtures, **not a human expedition**.

Run all prior Node and browser regressions and exact `python tests/standalone-parity.py` before accepting the branch. Preserve the known-good [T03 milestone](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t03-mission-comms-protocol) for immediate rollback. Never merge the feature branch to stable if final CI is red.

**Release category:** Release candidate pending last full CI + manual actual-GPU smoke.
