# STARFALL T18 — Full Engineering Release Gate, Real UI Journey, Stress and Measured Browser Performance (2026-11-02)

- Created separate T18 release-verification branch based on verified T17; no changes to core 3D ship/rover rendering, physical walk-in/out ramp, truck X controls, original force-integrated rocket/antenna/Outpost radio simulation or game save schema.
- Added `tests/release-gate-t18-browser.py`: actual original offline Chromium UI journey with only a seeded initial landed world. Places eight real original Outpost items and seven original wires using the real UI, checks source physical DC network and antenna brownout/recovery, obtains a real timed science sensor reading in original Journal, safely upgrades then restores a rover component through original Workbench controls, downloads T17 state archive and checks all original IDs/energy provenance after genuine file:// reload. No synthetic radio ACK, fake power, fake remote rover, fake photo or direct source state mutation in this journey.
- Added genuine software WebGL2 `requestAnimationFrame` p50/p95/p99 and periodic JS heap measurements, and **real screenshots produced by actual CI browser only**. All screenshots/metrics live inside the `t18-real-ui-software-webgl-evidence` GitHub workflow artifact, not hardcoded in docs.
- Added **20× actual source-model** 7B force-integrated stable-orbit launches and satellite save/reload stress. Labeled MODEL-ONLY; separate human/player UI launches remain NOT VERIFIED.
- Added independent `T18 End-to-End Release Journey (Software WebGL)` workflow and full inherited T00–T17 regression, plus strict source → one-file `PLAY-STARFALL.html` synchronization and independent source-parity check. An evidence audit requires actual IDs, original DC joules, physical wires, real Journal record, original Workbench operation, frame metrics and screenshots.
- Added `reports/TECH-OPERATIONS-RELEASE-VERIFICATION.md`, `reports/POWER-AND-COMMS-LEDGER.md`, `reports/PERFORMANCE-T18.md` and machine-readable `release-gate-verdict.json`. Classifies every full-mission gate as PASS / FAIL / NOT VERIFIED with specific reproduction steps, exact fallback and severity-ranked unresolved release gaps.
- **Release candidate only** until full original UI Planet A→Planet B physically launched rover and genuine remote image/lab custody, complete orbital campaign, manual ramp/truck/ruins/touch tests, hardware GPU FPS + memory, long-run stress and authentic legacy saves are directly verified. Never present model-only or SwiftShader as real user gameplay certification.

# STARFALL T17 — Lossless Legacy Save Recovery and Full Offline Expedition Backups (2026-11-02)

- Added explicit **SAVE / RESTORE ▣** header panel for portable state-only expedition backups and complete state + genuine 7F IndexedDB image/thumbnail archives. Fully offline; no cloud, external services, or fake photos.
- Import validates exact original source owner schema/galaxy seed, physical body-fixed positions, unique IDs, camera identity/bytes, outpost wire relationships, research source references, radio packet bytes, finite clocks, data scope and accidental-corruption checksums, then asks before replacing any saved game. Invalid/oversized/wrong-seed imports never change the current expedition.
- Complete media imports decode each real image and verify dimensions, checkpoint original localStorage and IndexedDB, atomically replace image files and verify the original game save, then reload actual owners. If a normal import error occurs, restore previous source and media checkpoint; report any rollback failure rather than claiming complete safety. A browser kill between distinct databases is not ACID, so full ZIP/JSON external backup is recommended.
- The original `SF.save()` now checks persistent readback and returns `false` on a denied/quota-limited localStorage; preserves optional best-effort session memory and shows a persistent **SAVE FAILED / NONPERSISTENT** gameplay alert instead of silently pretending the expedition was saved.
- Fixed historical restore truncations for 7F image metadata and camera jobs, 7E plans/runs/blueprints, Outpost structures/wires/relays/samples, T03 radio packets/exactly-once receipts, T01 jobs/events/receipts, 7C onboard orbital science, 7D rover received/accepted IDs, and 6G planet survey coverage/waypoints. New-record capacity limits remain; 7E newly refuses additional runs rather than deleting old experiments.
- Original image gallery distinguishes valid ACKed metadata from actual missing image bytes, explicitly disables download and advises full-media restoration.
- Add synthetic-only structural over-cap migration tests and real Chromium/SwiftShader photo-binary/backup/corrupt-import/reload tests. **Authentic 6J and original Update 7 user saves were not supplied; their exact migration is NOT VERIFIED.** Full audit and rollback instructions: `docs/SAVE-MIGRATION-T17.md`.

# STARFALL T16 — Operational Telemetry, Four-Stage Command Truth and Discoverable Owner Actions (2026-11-02)

- Added a lightweight, source-derived **OPERATIONS / ACTUAL STATUS** card to existing Reconnaissance, Rocket Lab, Satellite Operations, Outposts, Mission Photos, Field Lab, Workbench, Asset Manager and Research Bench. Kept original dark-blue/vibrant science branding, all UI IDs and existing controls.
- Native equipment records supply actual selected asset and recorded parent, body and system IDs, real battery Joules, modeled watts, onboard storage, last source tick, LOS route/quality, current T03 packet bytes, ACK, real image downlink state and conservative power/fault recovery suggestions.
- Clear four stages: **READY → COMMAND SENT/IN PROGRESS → ACTUAL COMPLETION/RESULT → RECOVERABLE FAILURE**. Packet RECEIVED/in-flight is **not** ACKED; an image is not viewable until actual 7F downlink receipt. Unobserved route/remote time displays **NOT RECORDED**, not made-up delay.
- Source-backed log derived only from existing T03, 7F, T15, T01 and T10 owners, with asset, severity and mission filters. No new persistent event database, duplicate sample, radio node or save state.
- Existing actions remain exclusively implemented by existing modules: Workbench, 7C, camera gallery, Outposts, Rocket Lab. The real STOP ROVER control is highlighted but retains its original route-dependent handler, ship ramp/EVA walking and truck X unchanged.
- Source-context modal cards refresh on open. Keyboard Tab focus is confined to visible existing modals and restored to the original launcher when possible, without remapping or blocking Escape/gameplay controls; updates remain throttled and avoid high-cost orbital pass prediction.
- Added source-truth Node regression, genuine `file://` Chromium UI browser smoke, standalone deterministic build and release caveats. See `docs/OPERATIONS-UX-T16.md`.

# STARFALL T15 — Asset Manager and Real Machine Configuration (2026-11-02)

- Add **source-owned T15 service provenance/backup** linked to the original `StarfallVehicles` ship and rover definitions; Workbench replacement validates genuine installed part deltas, parked service, original asset identity and predicted mass/energy state before committing the actual vehicle. Preserves pre-T15 saves.
- Existing Asset Manager now shows original installed module owners, live model state (OPERATIONAL/MODELLED/OUT OF SERVICE), rated mass/watts, fault causes and traceable service events. Provides links to original T12 physical field repair and existing Workbench, not a new free-repair subsystem.
- Original rover battery and solar panel options continue to alter **real** capacity, generation and mass without generating stored energy; motor/wheel selection changes actual 6-wheel force/slip through original rover physics.
- Optional constrained geology/biological rover instrument suites change actual compatible sensor jobs, installed mass and power draw, while preserving the full original default suite and original T06 remote rover equipment.
- New optional extended spacecraft avionics module increases real T02 avionics consumption, ship dry mass and original T03 radio LOS/bandwidth/transmitter requirements; no magic interstellar link.
- Existing 7E blueprint apply now requires a verified original run, correct named machine ID and retained observation/photo IDs; bench-only/imported/unmodified designs cannot silently alter an unrelated vehicle or claim installation success.
- **Restore previous installed assembly** repeats parked safety checks and changes actual original store without refilling consumables. T15 event ledger refuses new entries at its cap instead of truncating older provenance.
- Adds actual T15 unit and offline Chromium Workbench/restore tests; `tests/technology-contracts.json` explicitly documents 3 new optional catalog parts, preserving the original T00 historical baseline. See `docs/ASSET-ENGINEERING-T15.md` and `reports/T15-TEST-RESULTS.md`.

# STARFALL T14 — Instrument Evidence, Scientific Map Layers and Ruin Photo Coordinates (2026-11-02)

- Added additive `StarfallScienceT14` for the existing eight original instrument ratings, calibrated-baseline diagnostics, physically limited resolution/uncertainty/temperature/health and source-owned observation provenance. Seeded values remain explicitly simulated.
- Existing local and deployed rover numeric science readings now carry T14 instrument metadata without changing sensor truth, energy cost, command/ACK route or original Science Journal ownership.
- Captured 7F rover and orbital images now retain original body-fixed camera coordinates. A TARGET mast image may reference the actually observed ruin ID; no image marker is visible until a real downlink ACK, and old photos without valid coordinates are not given invented locations.
- Added **received evidence** overlays and filters in the existing Survey Map for journal measurement, orbital swath, downlinked photo, surveyed ruins, ecology, outposts/receivers and known-location pending rover camera requests. Uses exactly T06 rover latitude/longitude, with no extra map archive.
- Existing observatory now distinguishes inferred seeded catalogue values from actually received instrument readings, including source, time and observation ID; existing Field Science controls show sensor power/range/resolution and conservative metrology quality.
- Real seeded ruins, ecology, physics/camera behavior, spacecraft ramp and truck X controls remain unchanged. Tests and manual verification limits in `docs/SCIENCE-EVIDENCE-T14.md`; no feature is silently declared physically certified.

# STARFALL T13 — Spacecraft Systems, Docking and Data Custody (2026-11-02)

- Added original-vehicle-state **ship operations** panel with actual fuel, thermal, source→sink electrical load, compatible docking, radio node readiness and software-model provenance.
- Added explicit landed **LATCH / METERED DC TRANSFER / UNDOCK** between ship and real local/deployed rover or wired 48V Outpost battery; relative-speed, same-world, position and installed-part checks, real charge debit, efficiency and heat/cooldown accounting, no teleport.
- Added source-ID hull thermistor Journal reading and exactly-once physical rover-data reference handoff; old observations, images and mission ACKs remain owned by the original stores.
- Preserved the emergency real-battery-paid legacy ship radio while enforcing physical avionics health, installed part, ship battery and the T02 served bus when realistic electrical mode is enabled.
- Blocked ship takeoff and Workbench ship reconfiguration during an attached umbilical, leaving the ship ramp, flight handling and truck X untouched.
- Added independent model and file:// software-WebGL tests, standalone bundle regeneration and explicit release caveats. See `docs/SHIP-OPERATIONS-T13.md`.

# STARFALL T12 — Expedition Truck / Rover Field Operations (2026-11-02)

- Kept physical truck boarding via **X**, anti-reboard cooldown, autonomous-only science rover and on-foot spacecraft ramp unmodified.
- Added 55-scene-unit limited incremental winch with sampled cable LOS/grade, fixed parked truck anchor, source truck battery work debit, in-progress cancellation and persisted work receipt.
- Implemented metered Outpost 48V source-to-truck and source-to-local-rover physical charging: T02 joule debits, 88% efficiency, finite 6 kW sessions, cooldown, heat and connector/circuit/range checks. Deployed rover T06 charging now additionally requires actual truck/EVA access.
- Added T12 Rover Field Service controls for installed wheels, drive motor, instruments/camera, avionics/radio and battery, documented part IDs, finite 90 kJ tool use and 30 s lockout. No new resource economy; no remote repair or instant unsafe fault reset.
- Added T12 Node energy/geometry/save regressions and headless offline Chromium UI smoke. GPU hardware driving and complete on-foot tow/charge/photo mission remain manual **NOT VERIFIED**.
- Details and rollback: `docs/FIELD-SERVICE-T12.md`. Integration branch `feature/t12-truck-field-service`; stable `main` preserved.

# STARFALL T11 — Commissioned Launch Pads & Payload Custody (2026-11-02)

- Added an optional **commissioned Foundation launch pad**, requiring a wired electrical source and 90 W of actual T02 bus load; older Foundations remain playable in Legacy Pad Mode.
- Added terrain and nearby-structure pad clearance checks, active-pad locks and visible Rocket Lab preflight diagnostics.
- Added saved payload manifests tracking mass, mission/asset IDs, route class, destination body/site and separation history, with a stable-orbit guard before release.
- Retained the 7B force-integrated multistage flight, T06 conservative rover descent, satellite ephemeris, ship boarding, truck controls and old launch saves.
- Explicitly reject newly requested same-star-system cross-planet delivery until an actual transfer solver exists; interstellar rover carriage stays labeled fictional.
- Added T11 unit/integration regressions and a deterministic standalone build workflow. See `docs/LAUNCH-PAYLOAD-T11.md` for capability boundaries and recovery.

# Combined STARFALL Update 7F — End-to-End Engineering QA & Hardening (2026-11-02)

- **Preserved** all Camera 7F rover/satellite photographic features; no revert or replacement.
- Prevented silent loss of launch history when restoring older saves; introduced explicit non-destructive creation caps.
- Fixed false payload `deployed` events when destination inventory/body is unavailable, plus duplicate payload guard.
- Strengthened cross-system save import checks for launch seed/schema/asset IDs and malformed camera/research records.
- Added repeatable 26-force-integrated-launch stress/model tests, 7 real browser panel checks, actual `file://` save validation/reload and no-network gate.
- Added measured software-WebGL diagnostic screenshot and percentile JSON artifacts in GitHub Actions (NOT hardware GPU numbers).
- Added optional **BUILD → OPERATE → MONITOR → RESEARCH** route hint, release verification gate matrix, migration, physics disclosures and severity-ranked issues.
- **Release candidate only**: full manual scenario A/B/C and named real-GPU/old 6J save tests remain NOT VERIFIED.

---

# STARFALL — Update 7F Camera Telemetry (2026-11-02)

- Added actual WebGL2 offscreen world-image capture from physical rover mast and satellite orbital cameras (including three-shot surface panorama), without HUD screenshot or network assets.
- Added science camera metadata, battery/storage budgets, delayed radio uplink/downlink, blackout queueing, received-only mission gallery, JPEG/WebP export and reusable image thumbnails.
- Added IndexedDB payload persistence (additive small photo metadata save), source/position/time/observation provenance, field photo notes, and 7E research blueprint photo references.
- Integrated gallery launch points into existing Flight Operations, Rover Missions, Satellite Operations, Field Science and 7E Research.
- Existing gameplay and saved vehicle/rocket/rover state left unchanged. Source and standalone bundling continue to use the same ordered modules.
- **Limitations:** procedural-engine photographic fidelity rather than real NASA camera realism; remote planets need loaded world and radio; real GPU FPS and full manual gameplay require verification. See `docs/IMAGING-7F.md`.

---

# STARFALL — Update 7E: Engineering Research & Blueprints (release candidate)

**2026-11-02 · Branch `feature/update-7e` · Baseline `release/update-7d`**

- Added **RESEARCH BENCH** inside the existing Vehicle Workbench, without changing the ship, EVA, rover, truck or launch controls.
- Added versioned deterministic engineering `ExperimentPlan`, `TestRun`, and `ValidatedBlueprint` storage, with bounds and safe defaults for older saves.
- Added controlled **rover traction/gearing**, **electric power/thermal**, and **force-integrated rocket ascent** experiments using the installed STARFALL models.
- Added distinct **PREDICTED** versus **SIMULATED** outcomes, side-by-side numeric comparisons, run history and explicit failure reasons. Suborbital trajectories are not marked as successful orbital insertions.
- Added blueprint JSON export/import, schema validation, provenance, safe live application only through existing vehicle safety checks, and an explicit bench-only restriction for unsupported live gearing/rocket changes.
- Kept Creative/Assisted exploration free of credits/XP/technology gates and retained previous 7D saved-game fields.
- Added Node regression tests and GitHub Actions checks; corrected the obsolete legacy launch test to exercise integrated rocket ascent and replaced hardcoded standalone parity assumptions.
- **Automated gate: PASS** (GitHub Actions run 41441439763). **Real GPU playthrough, browser cold-restart persistence and archived 7D browser suites: NOT VERIFIED**. See `reports/UPDATE-7E-TEST-RESULTS.md`.

---

# STARFALL — Update 2: Space Science & Physics

- **2A:** Introduced SI unit conversions, mass/density distributions, a deterministic simulation clock, orbital elements and optional Kepler ephemerides behind a disabled-by-default compatibility switch.
- **2B:** Added opt-in local Newtonian flight physics with fixed substeps, fuel/thrust integration, coast prediction, basic SAS and an orbital flight computer. Assisted mode remains original/default.
- **2C:** Added per-body atmosphere density, drag, orientation-dependent reference area, optional lift, rotating-air relative velocity and entry heating/cooling. Vacuum moons remain vacuum; gas giants have atmospheres but no solid landing.
- **2D:** Added Observatory with deterministic star/planet/moon science properties, equilibrium temperature, viewing geometry, model-quality labels and JSON/CSV export.
- Rebuilt a complete editable project and offline standalone from the same source; preserved the 2,368-system catalog and inherited game controls.
- Added physics unit tests, 10-orbit conservation CSV, JS mock-browser integration, source/standalone parity check, science model assumptions and a real GPU verification checklist.
- **Known limitation:** full GPU/render and manual engineering landing tests remain pending. See `reports/TEST-RESULTS.md`.

---

## Original baseline changelog

# Changes — Navigable Stars / Lightweight Explorer

- Rebuilt the player avatar as a much slimmer low-poly EVA explorer; smaller backpack, practical utility gear, articulated walk cycle, no oversized staff or long cape.
- Included a separate static GLB of the redesigned character.
- Removed 2,500 purely decorative background stars and far-planet star-point impersonators.
- Added 2,304 seeded, physical star-system locations beyond the original 64, all accessible through the existing flight engine and chart.
- Added lazy planet and moon construction, deterministic reload, and bounded distant-system caching.
- Added click-to-plot navigation for actual star points in the sky.
- Added hashed-sector lookup for local star queries, collision broad-phase, and nearby planet rendering.
- Rate-limited the sky star-point vertex buffer without removing visible twinkles.
- Preserved the previous continuous flight, moving bodies, atmosphere and moonlight, ground contact, EVA walking, ramp boarding, and rover interaction.
- Updated the editable project split and added executable procedural galaxy regression tests.

The previous game release is included in `backup/`.
