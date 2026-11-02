# T08 — Commissioned Interplanetary Mission Communications

**Parent:** Verified T07 `2213d180806cdc60e81080521697b222fea88fbf`  
**Branch:** `feature/t08-interplanetary-comms`  
**Original authority:** T03 packet ledger / T04 antenna owner / T02 48 V power grid / T01 celestial clock / 7D rover / 7C satellite / T05 off-world WebGL / 7F photo storage. **No additional satellite, vehicle or image inventory.**

## How to operate the real same-system link

For a rover already deployed on Planet B while your ship remains landed on Planet A:

1. Visit Planet A and **build** an Outpost `antenna`, `battery`, and/or `solar`. Join the modules through the existing 80-scene-unit cables. The high-gain upgrade is separate from its existing local 165 W radio. It requires **1,100 additional electrical watts**, which the original T02 grid must supply; a disconnected or dark flat panel cannot power it. A charged battery can buffer darkness.
2. Deploy or previously construct the equivalent **real powered antenna on Planet B**. T01 continues its outpost power even while Planet B is not loaded. No invisible station is created by the mere existence of a rover, ship, lab or simulation icon. The rover must have its **own** real battery and antenna endpoint.
3. On each planet, open **Surface Outposts → RADIO → T08 Deep-space Mission Ground Stations**, select the local antenna and select **PHYSICAL high-gain RF**. In the **Exact target station** selector choose the **specific other antenna's saved ID**; this is a two-way paired installation. Each station needs T04's ordinary local omni (or working tracked antenna mode) to reach the rover or local ship, and its dedicated T08 high-gain transceiver for the distant leg.
4. Verify both devices are shown POWERED in the UI and check route diagnostics. A local ship/rover must be within real LOS of its local antenna. The planetary line-of-sight can be blocked at any given time because both planets rotate and orbit.
5. Select Planet B's deployed rover from Rover Mission Control while staying on A. Use the existing T03-backed program, e.g. `CAPTURE forward 256` followed by `SAMPLE thermometer`. **Don't use an instant enter/exit button or teleport.** A legitimate command appears in the single T03 ledger and moves only at the negotiated limited bits/s, with time-of-flight and acknowledgment.
6. The rover independently executes the **original 7D** onboard program after a genuine T03 ACK. Camera 7F and T05 offscreen WebGL render an **actual image of Planet B**, stores original JPEG/WebP bytes in IndexedDB and queues a **photo reference** (not base64 in localStorage). At the next valid B→A contact, T03 transfers the real byte budget. The photo becomes available in the existing Mission Photos gallery only after receiving **the original T03 ACK**.
7. Save and reload. Original T02 wiring/energy, T04/T08 station commission records, T03 packet progress and T05/7F image archive remain with their original source owners. Export the **7F portable camera archive** if moving browsers. Your plain JSON save contains photo metadata, not its IndexedDB image bytes.

**No purchase, unlock, XP, mission reward, arbitrary new menu or new vehicle class.** The T08 installation is a **reversible configuration of the existing physical antenna**; disabling only the deep-space module keeps short-range radio intact.

## Electrical and RF envelope

| Hardware | Real source owner | T08 rating / safeguard |
|---|---|---|
| Regular surface antenna | `outpost5.items[].radioT04` | Original T04 omni, directional or tracking, **165 W** nominal and **250 kbit/s** rated; wired T02 supply |
| PHYSICAL high-gain upgrade | Same `item.radioT04.deepT08` | Extra **1,100 W** modeled load; **420 W TX nominal** included in that load; rated **256 kbit/s**, maximum **30 million scene units** after finite path-loss/health; requires both endpoints |
| Explicit FICTIONAL interstellar upgrade | Same `item.radioT04.deepT08` | Extra **2,200 W**, 900 W amplifier included, rated **128 kbit/s**, capped at two 2 MiB station buffers; minimum **120 simulated seconds** transfer delay; **clearly fictional** and only usable between different star systems |
| Rover radio | `launch7.rovers[].batteryJ` | Existing T03 + T04 local radio, finite charge and 7D reserve; no ability to transmit directly across planets |
| Ground ship receiver | `StarfallRuntime.vehicleStore` | Original landed ship transceiver, body/power/LOS/range limited. **Not** magically upgraded to long-range radio |
| Data custody | `commsT03` T03 ledger | Bounded 240 packets / 12 MB encodings, finite in-progress bytes, shared physical deep-space channel, STOP/control priority and ACK |
| Orbit / body positions | `T01.resolveBody`, `StarfallLaunch.orbit` | Source celestial ephemerides at each simulated tick; body-fixed ground antenna rotates with actual planet; no second invented orbit |

### Propagation, obstruction and outage

Each candidate path must include the actual **physically powered source**, local T04 hop(s) to an explicitly installed nearby deep-space antenna, one matching deep-space hop, and T04 hop(s) to the powered target. T08 searches a bounded set of up to **six nodes** with finite relay buffers; it chooses routes by physical link margin/delay and does not create free antennas, satellites, galaxies or emergency receivers.

Surface stations use actual body-fixed direction rotated into each body's moving inertial position. A geometric segment intersecting a modeled spherical planet is blocked. The deep-space link has a finite transmitter/receiver budget, health and distance margin. Local radio retains original T04 pointing rules. All link delays are **actual geometric path distance × `SCENE_METERS_PER_UNIT` / 299,792,458 m/s**. Packets only make forward progress while a complete valid powered path exists; a receiver powered off while awaiting payload must not yield a false receipt.

**Scale caution:** STARFALL's procedural stars/planet orbit scene is compressed and is **not** an actual astronomical kilometre-scale ephemeris of the solar system. The radio link accurately follows the **simulator's** source coordinate distances at speed `c`, which may be **milliseconds** for two simulated planets instead of real astronomical minutes. Do not interpret these as real NASA Earth–Mars transit distances. Interstellar scene coordinates similarly have no physically scaled star separation; ordinary RF is **not** declared viable across distinct star systems. The UI gives the conservative *at least one light-year* conceptual lower bound (one-year minimum one-way time), explicitly marked as a lower-bound illustration and **not a measured catalog distance**.

If choosing the clearly labelled **FICTIONAL interstellar data relay**, you must intentionally install and power a matching upgrade on two real existing antennas in **different star systems** and pair their exact IDs. In this mode messages take finite time and bandwidth, with original T03 electricity and custody. This is separate from T07's real orbital relay and is **not physics-accurate superluminal communication**. The user can leave the realistic ordinary interstellar RF mode selected (no viable radio route) and keep the pending packet.

## Persistent state and contracts

- **No new top-level network database.** `outpost5.items[].radioT04.deepT08` is a schema-1 optional, tightly validated record: `mode`, `peerId`, `enabled`, `health`, `commissionedAtS`, `lastContactS`, `fault`. The original T04 `repair()` and `configure()` retain it. Existing T02 loads call the existing T04 `loadW()`, now with actual extra amplifier load. Old saves default OFF; no new free power appears.
- `StarfallDeepSpaceT08.plan({packet,time,source,destination,localNodes,allStations,bodyAt,localLink,...})` returns the **same original T03 route contract**: `connected,hops,hopReports,bandwidthBps,delayS,quality,txPowerW,reason`. The existing T03 `routeFor` remains authoritative and invokes this adapter only when endpoints are actually on different celestial bodies.
- T03 `Transport` still uniquely owns `sendBytes,recvBytes,sourceCustody,custody,ACK,state` and journal/7F receipts. Same-system deep-space paths are subject to a **shared half-duplex deep-link bandwidth budget** across commands and images, not a separate unlimited throughput for each packet. Emergency STOP remains the highest-priority traffic.
- Remote source-body packets receive an extended finite mission TTL; otherwise they could expire in less than one orbital radio window. Existing same-body saves/default queues remain unchanged.
- The existing T01 mission clock advances remote grids, satellite/rover jobs and radio transport every 5 simulated seconds, with its original backlog safeguards. T08 itself creates no extra per-frame celestial solver or world render.
- Packet diagnostics show actual source→destination hop IDs, each individual hop's last rate/delay, current sent/received bytes, outages and saved station IDs. **A receiver's bare presence never creates a working route.**

## Repro and tests

```bash
node tests/interplanetary-t08.test.cjs
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/interplanetary-t08-browser.py
# Plus every existing T00–T07 model and real-browser regression gate.
```

`tests/interplanetary-t08.test.cjs` tests true loaded DC stations, save compatibility, failed or improperly pointed peers, blocked planet geometry, complete ship→tower→tower→rover path, T03 original encoded-byte ACK, finite propagation, real RF vs expressly fictional interstellar separation, and no radio when missing station.

`tests/interplanetary-t08-browser.py` uses original offline `PLAY-STARFALL.html` and a **controlled authorized equipment fixture**: real seeded Planet A and Planet B, existing `Outpost.Store.add/link` and T02 measured power, actual T04/T08 station nodes, an existing 7B rover record (not a custom third vehicle), the actual T03 route and radio ACK, real accepted 7D camera program, T05 WebGL photograph of unloaded/currently unvisited Planet B, and original 7F photo packet returning across the same real path to the gallery with reload checks. **No injected or stubbed `remoteLink`, `routeFor`, `radioLink`, `captureScience`, `SF` or T03 transport**.

### Unimplemented/limited — do not claim otherwise

1. **One-route packet custody:** T03 currently treats a fully negotiated multi-hop path as one bounded end-to-end transmission under the slowest hop, with original packet-level custody and acknowledgments. It verifies *every* intermediate node and its finite buffer, but does **not** yet persist a distinct partially delivered byte counter and ACK at **each** individual intermediate relay. Interrupted T03 transmission preserves source bytes, and loss after the last sent byte may require a complete resend. Per-hop physical data custody is a future refinement.
2. **Spacecraft high-gain payload:** T08 only commissions **existing wired ground antennas**. T07's ordinary orbital relay remains an actual same-world hop, not a free planetary-space deep-space dish. A future explicitly installed satellite high-gain package must consume real orbital energy and satisfy its own pointing to bridge a missing ground station.
3. **Interstellar RF physics:** procedural game star distances are compressed and physically uncalibrated; high-gain RF is appropriately not declared viable between star systems. A realistic years-long propagation simulation would require physically calibrated galactic coordinates and long-duration packet time-keeping beyond T01's bounded 24h operational advance.
4. **Atmospheric propagation:** geometric horizon/spherical occultation and simplified radio margin are modeled, but ionospheric attenuation, phased-array beamwidth, weather scintillation and detailed transponder noise thermal modeling are not.
5. **Human expedition:** browser fixtures start with two pre-placed powered bases and an already deployed rover. That is **not** a verification of an actual person constructing and rocket-flying every station all the way from scratch while maintaining good FPS. Earlier T06 full rocket-to-rover landing was likewise a controlled post-orbit fixture. No real hardware GPU endurance result is claimed.
6. **Remote power** assumes the existing T02 finite star/grid and T01 off-world source snapshot calculations. Additional battery wear or deep-space link heating beyond T04's original lumped component temperature are not added here.
7. All original ship ramp/EVA, truck X, non-rideable rover, planet/noise fields, 7B force physics, galaxy count and on-screen photo archive remain unchanged.

## Rollback

The verified [T07 release candidate](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t07-operational-satellite-bus) is unchanged. This T08 branch is **not merged** to stable. Export ordinary SF save and 7F portable camera archive before switching branches. Old builds ignore the additive station upgrade and retain their 7C/T03/7F source data. The branch must pass final exact-commit CI after temporary regeneration/debugging workflows are removed.
