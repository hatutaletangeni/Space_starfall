# STARFALL T01 — Independent Off-World Engineering Clock

**Parent:** `feature/t00-technology-contract-audit` at `50086f3bd3d1fb8a42d0b018a6d7a90c350e1f5f` (7F expedition hardening + T00).  
**Branch:** `feature/t01-offworld-operations-clock`  
**Scope:** Preserve movement, physical ship ramp, truck boarding, world rendering, original 7B rocket thrust, 7C/7D operational physics and original image bytes. Introduce no new gameplay progression.

## Implemented

- **One deterministic event clock** in `src/physics/mission-operations.js`. It advances in fixed **5 simulation-second boundaries**, no more than **12 boundaries per frame**, and refuses jumps exceeding **86,400 seconds** without explicit review. This is a deliberate **bounded backlog** rather than instantly completing nonlinear operations.
- **Mission operations source-store adapter** in `mission-operations-ui.js`. The already deployed `StarfallLaunch.Store.rovers` remain the rovers; `StarfallGroundOps7D.tick` consumes their existing program, terrain safety and battery. 7C satellites remain `StarfallLaunch.Store.satellites`; `StarfallSatelliteOps7C.step` consumes the existing battery, thermal and eclipse models. No duplicated spacecraft instance, energy counter or replacement Kepler orbit is introduced.
- **Offscreen-independent body ephemeris**: for ordinary seeded bodies, the adapter re-evaluates existing orbit radius, phase, period and axial spin analytically at the requested simulation time; optional saved **host-body snapshots** let assets continue after distant catalog worlds are unloaded. New Moon assets include their parent's basic orbital snapshot. Existing unavailable legacy host information is **not fabricated**: an explicit fault is recorded and the affected asset is frozen.
- **Outpost remote energy**: the existing `StarfallOutposts.Store.power` advances at clock timestamps through a thin `StarfallOutpostUI.advancePowerTo` adapter. Saved new construction records carry their parent world state. Local and distant sites use the **same underlying group DC model**, not an independent mini power simulator. On integration exception, source state, clock cursor, reports and power timestamps roll back.
- **Durable jobs and receipts**: a versioned `missionOps` top-level save stores the cursor, bounded job metadata, and event IDs; pending jobs have asset ID, creation/eligible/expiry timestamps, priority, work units, last integration timestamp and retry/backoff fields. Events include `ASSET_EVENT`, `POWER_STATE_CHANGED`, `DATA_JOB_PROGRESSED`, `COMMAND_DELIVERED`, `OBSERVATION_RECEIVED`, `PHOTO_RECEIVED`, and `FAULT`. There is no fabricated delivery: unsupported photo/network jobs stay WAITING for later T03/T05 physical handlers.
- **Operator API**: `StarfallMissionOperations.advanceTo(seconds)`, `StarfallMissionOperations.getAssetStatus(assetId)`, and `StarfallMissionOperationsUI.clock`. The status API returns a defensive copy; models stay owned by their original stores.
- **Reproducible built artifact**: `PLAY-STARFALL.html` uses the existing Python standalone generator and includes the two new scripts; no external runtime dependencies.
- **No hidden wall-clock time**: simulation pauses while the browser is closed. On reload, resuming from saved in-game time will not invent time or free battery energy.

## Why this is a foundation, not a complete interplanetary communications upgrade

The old same-world radio rule still applies. A player standing on Planet A **cannot send a new program or retrieve a new image from a probe on Planet B yet**. T01 advances **previously delivered onboard commands** while the player is elsewhere, but T03 and T08 will implement finite routed packet transport and real ground endpoints. 7F remote actual image rendering while the destination is unloaded is deferred to T05: **no fake photo pixels or premature gallery receipts**. The 7C `camera` remains a numeric observation distinct from the 7F photographic renderer. The local science rover and deployed probe remain **non-rideable**.

## Model fidelity and numerical limits

- 7D already uses simplified six-wheel terrain traction and limited drive/WAIT/SAMPLE/STOP program steps; the clock executes that same model, not a new control law. Existing remote rover `ground7d.lastTickS` is the per-asset physical timestamp.
- 7C already uses the existing Kepler orbit and eclipse-aware simplified power/thermal model; `satellites[].ops7c.lastS` remains the per-asset physical timestamp.
- The outpost grid uses the existing group 48 V / 500 A lumped DC approximation, not a rigorous per-node SPICE solution. `outpost5.lastPoweredAt` remains the per-body physical timestamp.
- 5-second cadence is an operational approximation, not a redefinition of the player's frame-by-frame ship motion.
- Maximum of 96 live job records and 160 pending unarchived event records (4,000 receipt ID maximum); when full, **new items are rejected with an actionable archive request**, not silently deleted.
- 24h of missing simulated operation is a hard review boundary. To repair a long-old corrupted or unavailable model, restore a saved working state; do not fast-forward a failed asset.
- Galaxy LRU source snapshots are additive for **new placements/deployments** and captured opportunistically for existing active objects; an older saved object already beyond cache reach may lack the necessary parent orbital data and remain frozen until the world is visited.

## Source-owned save and rollback

`SF.version=2` is unchanged. New optional `SF.missionOps.schema=1` is additive; a missing `missionOps` initializes at the saved game simulation clock. A wrong galaxy seed isolates jobs/events and never transfers them across saves. New `bodySnapshot` fields remain in the existing `outpost5.items[]` and `launch7.satellites[]` structures. The outpost restore sanitizer now retains **validated matching body snapshots**; old saves without snapshots continue to load.

**Restore original engine:** switch back to [7F hardening branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/update-7f-expedition-hardening), or to [T00 audit branch](https://github.com/hatutaletangeni/Space_starfall/tree/feature/t00-technology-contract-audit). T01 is not merged to either.

## One-page user path

1. Open the branch's `PLAY-STARFALL.html` **locally**, or use the source project through a local static HTTP server.
2. Use the existing Rocket Lab/Foundation interface to deploy a rover or satellite. No changes to launch controls, ship ramp, truck boarding or flight HUD are required.
3. Send a safe rover program **while a real same-body radio link is available**; once onboard, the probe keeps driving/waiting/sampling when you later travel elsewhere, and a satellite continues eclipses/solar power/thermal updates.
4. Inspect `StarfallMissionOperations.getAssetStatus('probe-...')` (exact deployed probe ID from Rocket Lab) in the browser developer console. The returned `clockS`, `owner`, `jobs`, and `clockFault` fields describe the state without mutation.
5. Save/reload using the existing browser save; view unchanged originals in the Rocket Lab, Satellite Ops and Outposts panels. A queued camera request does **not** become a real photo until T05 implements actual distant 3D capture.
6. If `advanceTo(...).status` reports `CATCHING_UP`, let normal game frames consume bounded backlogged steps. If `AWAITING_REVIEW` or `FAULT`, inspect the reason; do not assume physical jobs finished.

## Verification matrix

| Check | Evidence requirement | Current coverage |
|---|---|---|
| Exact source catalogs remain unchanged | `tests/technology-contracts.test.cjs` | CI Node model suite |
| Deterministic small vs 100× advance / midpoint reload | `tests/mission-operations-t01.test.cjs` | Source model test, numeric/record equivalence |
| Real file:// browser remote rover and satellite progress / reload | `tests/mission-operations-t01-browser.py` | Headless Chromium software WebGL, not a real hardware GPU |
| No duplicate event ID, seed isolation, bounded long skip | `tests/mission-operations-t01.test.cjs` | Source model test |
| UI dialog/regression/standalone parity | Existing 7E, 7F and engineering tests | Automated regression |
| Long real expedition, physical Planet A→Planet B communications, true distant 7F photo, real GPU FPS | Manual physical gameplay / T03–T08 | **NOT VERIFIED / NOT YET IMPLEMENTED** |

### Repeat

```bash
node tests/mission-operations-t01.test.cjs
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tests/standalone-parity.py
python tests/mission-operations-t01-browser.py
python tests/expedition-hardening-browser.py
```

**Release condition:** treat this stage as a **release candidate**, not a stable game release, until its latest GitHub Actions run is green and a human manually validates a full expedition on real graphics hardware.
