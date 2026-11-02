# STARFALL T03 — Mission Packet Transport, Real Local Radio and Store-and-Forward

**Base:** `feature/t02-unified-electrical-power` at `ed3d53a29849d2e9fb9c8f7f7640483a9f9008fa`.  
**Feature branch:** `feature/t03-mission-comms-protocol`.  
**Schema:** Optional top-level `SF.commsT03.schema=1` (same overall SF save version).

## What T03 actually changes

- `src/physics/mission-transport-t03.js`: pure seeded, fixed-step, **one packet ledger** with durable packet IDs, type, body/system/source/destination IDs, compact reference or safe command payload, byte length + 96-byte encoding overhead, priority, custody, route hop IDs, link budget, partial transmitted bytes, received bytes, retries, non-delivery reason, expiry and separate receive/ACK states. No image base64 or duplicated satellite observation payloads.
- `src/physics/mission-comms-ui-t03.js`: authoritative live adapter. It **does not create a second rover, photo or satellite**. It uses existing `StarfallOutposts.radioLink` geometric LOS, `StarfallLaunch.orbit`, existing T02 powered outpost reports and `StarfallSatelliteOps7C.relayOperational`; real ship and rover batteries are debit-capable.
- `src/physics/ground-operations7d.js`: the old `uplink/stop/tick` signatures remain. A narrow `acceptPacket()` injects a physically completed command (deduplicated by packet ID) into the **same original onboard command array**. With `transportActive`, 7D no longer bypasses T03 with immediate numeric science downlink.
- `src/physics/satellites-ui7c.js`: 7C DOWNLINK now queues real `SATELLITE_OBSERVATION` records in the packet ledger, not 7C's separate forward-timestamped arrival timer. 7C's original orbital physics/sensors/storage and numeric `camera` sensor remain unchanged.
- `src/physics/imaging7f.js` and UI: normal camera requests enter `CAMERA_REQUEST` packets and already-real encoded image **references** enter `IMAGE_REF` packets. The camera's IndexedDB bytes are never transferred into normal JSON or fabricated. Gallery `downlinked` status requires completed bytes **and ACK**. T05 isolated remote scene creation remains a separate prerequisite for photos of an unloaded planet.
- `src/physics/launch-ui.js`: the **same public** `remoteLink` now reports the T03 physical path when T03 is present; the visible Rover / Rocket Lab panel shows each packet's transmission %, exact source/route IDs, bitrate, custody, current state and fault reason. Emergency STOP runs at priority 0 ahead of photo bulk at priority 8.
- `src/physics/mission-operations-ui.js`: T01 invokes T03 at the existing **5-second operational clock** boundaries, keeping outpost power, rover terrain and satellite energy owners unchanged. No new high-frequency frame, galaxy cache or GPU work is introduced.

## Physics and safety

**Actual link prerequisites:** A landed ship transceiver, linked to the existing ship battery with a **real energy debit**; an actual nearby deployed rover mast and its onboard battery; or an enabled, condition-healthy, T02-powered existing surface antenna; optionally a physically present, active 7C satellite relay. Every hop is checked for planetary line of sight via original `StarfallOutposts.radioLink`, a bounded maximum hardware range and finite bitrate. Satellite positions are computed from the original Kepler source. Disabled/empty receivers never ACK. Same-world proximity alone grants no unpowered communication.

**Legacy ship support:** Existing ships have a built-in **emergency ground transceiver**, including for older saves with their generic `powerEnabled` flag set false. It is **not a free node**: it requires an existing ship battery with charge and consumes radio transmit *and* receive joules, without changing physical boarding or adding base-unlock requirements. When its battery is exhausted, the endpoint vanishes and packet progress stops.

**Transport:** Payload bytes plus finite 96-byte encoding overhead at a capacity in **bits per second**. For each 5 s tick, queues sharing a route compete for the same finite byte budget; lower numeric priority preempts higher while equal-priority packets share bounded deterministic bursts. Once fully transmitted, a packet waits at least one modeled light-travel propagation delay; a receiving endpoint must still be powered. Only then does the destination owner accept the command, numeric reading or photo receipt. A later acknowledgement closes the record. Paused routes preserve exact transmitted bytes and resume without inventing new science. Radio sender and receiver draw energy proportional to byte-count and link bitrate.

**Persistence:** T03 commits the packet ledger **and** matching source-owned `launch7`, `engineeringVehicles` and `imaging7f` state in one `SF.save` transaction. The original IndexedDB image binaries remain in their existing separate storage. Old 7D pending command entries and pre-existing 7C in-transit numeric observations are conservatively requeued instead of magically received. Wrong galaxy seed never imports packet data. A full ledger refuses new jobs rather than silently deleting old ACKs; `transport.archive()` explicitly returns completed records for manual export.

**No remote omniscience:** A ship on Planet A is **not** a receiver for Planet B. Without a commissioned genuine interplanetary route, a packet waits with a clear reason; no instant interstellar traffic and no unearned global-journal photograph. T08 will add finite multi-body and star-to-star routes. A distant 7F camera cannot invent an off-world render: it must await T05.

## UI: test the transport manually

1. Land ship physically on a solid planet, leave your onboard rover/ship in the original world, and use Rocket Lab to deploy a scientific probe using the original launch controls.
2. In Rocket Lab, choose the deployed rover and issue **WAIT 5 / SAMPLE thermometer / STOP**, or emergency **STOP**. Watch the **Mission radio packets** section showing ID, bytes, route, status and ACK. These are real source data, not a pre-filled demo panel.
3. Move the rover beyond the actual horizon/range, or temporarily exhaust/disable a relevant radio power source. The command should say WAITING_FOR_ROUTE/NO_POWER rather than instantly arrive. The rover can continue an already-accepted onboard program under T01 even without a link.
4. With legitimate radio restored and in-game clock advancing, the packet resumes, the real rover receives commands, and numeric observations travel back only after complete byte transfer. A real satellite DOWNLINK behaves analogously.
5. Camera 7F requests queue as small command packets and actual captured photos as binary **references**; gallery visibility must wait until full byte transfer plus acknowledgement. Never expect Planet B's image to render while standing on Planet A until T05/T08.
6. For full details run `StarfallCommsT03.status('your-rover-id')` or `StarfallCommsT03.transport.get('comms-packet-id')` in devtools. Both return copies. Use the already available save export before replacing old builds.

## T03 model fidelity, remaining limitations

- **Same-world hardware and direct/2-hop paths only.** The route diagnostic includes real physical endpoint IDs and propagation time. Detailed *per-hop* store-and-forward custody/buffer ownership and RF noise/fading for relays is deferred to T04, although per-packet route + custody and non-delivery are saved now.
- **Outpost antenna 165 W nominal draw** already occurs in T02. Additional per-packet power is debited from finite rover, satellite, ship source/receiver batteries; dynamic tower amplifier draw and per-antenna buffer allocation must be refined in T04. No extra non-existent battery is created at a tower.
- **LAB_ACK, SCIENCE_NOTE and TELEMETRY** are valid reserved types with bounded persistent schema, but their physical destination workflows are not yet commissioned: they **remain pending** rather than being marked delivered by a placeholder. T10 will finish actual lab receipts/physical samples.
- **Camera 7F remote rendering** remains unavailable while the destination planet is not the renderer's active scene. The camera command may be accepted, but photo creation must remain pending T05. The 7C numeric 'camera' observation does **not** become a JPG/WEBP in the Gallery.
- In-flight retry is at the packet level; per-chunk ACK windows and realistic coding/modulation/antenna gain/thermal network availability are explicitly out of scope. Bandwidth, light-time, priority, loss on receiver blackout and storage remain physically bounded.
- No changes to player movement, EVA, ramp boarding, terrain render or rocket flight integrator. Performance on a real GPU and a complete manually played Planet A→B expedition are **NOT VERIFIED**.

## Test gates

- `tests/mission-transport-t03.test.cjs`: 1 KiB/1 MiB duration, simultaneous emergency-priority-vs-bulk, blackout during upload, resumed partial bytes through reload, one receive callback/ACK, seed isolation, no embedded image bytes, energy debit and 24-hour backlog guard.
- `tests/mission-transport-t03-browser.py`: actual `file://` real gameplay modules with a physically landed, battery-powered ship and a nearby test-probe fixture. It **does not stub `radioLink`**. Check real LOS, send/receive and energy debit, real power blackout and saved packet resume exactly once.
- Existing `tests/imaging7f-browser.py` is an isolated original image renderer/IndexedDB regression using its historical stubbed radio fixture. It is explicitly **not** the source of proof of T03 physical links.
- Existing T00/T01/T02 Node, WebGL/Chrome and standalone equality/parity tests must also pass.

## Rollback

T03 is isolated on `feature/t03-mission-comms-protocol`. Return to [known-good T02](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t02-unified-electrical-power) or [7F hardening](https://github.com/hatutaletangeni/Space_starfall/tree/feature/update-7f-expedition-hardening) without merging or altering previous branches. Back up your active save before switching runtimes.

**Release:** Do not merge until final GitHub Actions gates and a human smoke on actual graphics hardware. T03 is transport foundation; claiming the full Planet A→B photo mission would be false.
