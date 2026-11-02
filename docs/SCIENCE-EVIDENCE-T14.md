# STARFALL T14 — Instrument Evidence and Planet-Fixed Survey Integration

**Engineering status:** additive science-evidence candidate. Branched from **T13** at `189d3c6a84ea72e687f66af8b966c5a761332147`. Neither `main` nor the T12/T13 rollback branches are modified. See `reports/T14-TEST-RESULTS.md`.

## Authoritative state and migration

- Existing **4A/4D local science Journal** (saved under `robotics4.journal`) remains the exclusive record holder for numeric measurements and their IDs. Existing **7D** deployed rover `records` and `queuedObservations` remain onboard until **T03** physical packet transfer and ACK; 7C owns orbital sensor jobs/readings and T07 power/attitude. A new T14 field attached to the *same observation object* carries measurement provenance and uncertainty, not a copied journal.
- Existing **7F** stores original real WebGL image bytes in IndexedDB and source metadata under `imaging7f`. T14 writes body-fixed `captureLocal` and, for real `TARGET` captures, `targetRuinId` into the already created 7F photo metadata. **No new image bytes**, synthetic photography or phantom downlink is created.
- Existing **Survey6G** owns `surveyMap6g.coverage` and waypoints. The T14 map layer is **computed live** from the exact old owner stores with no additional persistent map marker catalogue, so stale locations cannot be silently converted into evidence. No T14 save migration is needed.
- Existing **Ruins6C** records remain the only way to map archaeological sites, **Ecology6H** remains the only way to map surveyed/observed ecological signals. Existing procedural objects/interiors/movements are unchanged.
- **T10** laboratory already ingests *ACKed journal observations* with their existing IDs, requires a real powered original Outpost lab, and does not create duplicate samples. T14 reuses this instead of introducing an instant lab-receive shortcut.
- T13 ship journal/physical docking, T12 truck X/recovery/charging, boarding ramps, planet generation, astronomy and orbital rendering are unchanged.

## Actual physical/model instrument inventory

Instrument | Parameter and units | Rated power × acquisition | Range | Interpretation
---|---|---|---|---
Spectrometer | silicate fraction (fraction) | 140 W × 4 s | ≤800 m | Modeled mineral fraction, not chemical assay
Thermometer | temperature (K) | 20 W × 2 s | ≤1500 m | Seeded local atmosphere/thermal estimate
Barometer | pressure (Pa) | 22 W × 2 s | ≤1800 m | Pa with real modeled vacuum-zero path
Magnetometer | field (nT) | 55 W × 4 s | ≤1000 m | Seeded local magnetic field variation
Ground radar | ice depth (m) | 480 W × 8 s | ≤50 m | Idealized terrain-penetration model
Seismometer | vibration (mm/s) | 85 W × 10 s | ≤3 m | Contact sensor, modeled seismic level
Contact sampler | iron fraction (fraction) | 160 W × 7 s | ≤3 m | Physical 7D regolith plugs only when commanded by deployed rover; 4A numeric observations are NOT automatically physical samples
Field bioassay | biosignature (index) | 180 W × 8 s | ≤5 m | Seeded biosignature **hypothesis**, not confirmed extraterrestrial life

All eight named source definitions come from the unchanged `StarfallFieldScience.INSTRUMENTS` catalogue. T14 reads their *live* power/seconds/resolution/uncertainty/max altitude, validates positive finite specifications, and annotates the actual generated source observation. It never silently upgrades the underlying procedural truth, job timing or calibration into laboratory certainty. The existing measurement's powerJ and quantitative sample value remain identical. A T14 `effectiveUncertainty` is a diagnostic propagated uncertainty: degrades for uncalibrated mode (2.5×), hardware wear, high/low temperature and poor weather **when those inputs are available**. The original sensor uncertainty is preserved. For old saves, existing factory `calibrated:true` is marked `LEGACY_BASELINE`, not a newly certified user-run calibration. Weather is not artificially invented from the rendering engine.

Existing orbital T07 payloads remain: **camera** (modeled 185 W terrain elevation numeric swath, not a picture), **spectrometer** (240 W silicate fraction), **atmosphere radiometer** (170 W K); T07 uses real source satellite battery, pointing/sunlight gates, onboard storage/ACKs and its prior footprints. Only 7F produces actual WebGL photo bytes after a separate camera job. A T14 marker for an orbital measurement requires the **canonical received science Journal** entry.

## Survey evidence map

In the existing *Planetary Survey Map*, the new **Evidence layer** selector filters all, ship/rover route/waypoints, received measurement, received orbital swath, downlinked 7F photo, previously surveyed/investigated ruins, previously observed ecology, Outposts, powered receiver locations, or pending jobs with actual coordinates. It does not change the flight map or chart. Marker inspection shows evidence/photo ID, original source asset, finite source time, quality and the **same rover T06 `latLon` convention** in degrees. It does not automatically reveal a ruin from seeded generation or show a rover observation still onboard awaiting T03 ACK.

The old checkbox **Explored terrain only** still works as before: unchecking it deliberately previews the underlying **seeded terrain model**, not a physically surveyed pass. The coverage saved to `surveyMap6g` is still exclusively generated by actual visitor motion and already accepted orbital footprint receipts. Never interpret the procedural preview as acquired survey data or as a T07 satellite photo.

Image markers require `status:'downlinked'`, a real receive timestamp and source-captured body-fixed coordinates. Older images lacking capture-local metadata are retained as gallery images **but not given guessed map coordinates**. A real 7F `target` mast capture can carry the original surveyed ruin ID; it does not mean the photo proves that ruin is extraterrestrial. The map does not create a site or photo independently.

**Coordinate convention:** `lat = asin(y)`, `lon = atan2(x,z)` in degrees, matching T06 rover navigation and waypoint messages. `StarfallSurveyMap.fromLocal/toLocal` still owns projections and great-circle distance.

## Command → receipt → map / evidence route

1. Local science: existing Field Science/Robotics instrument uses `RT.acquireFieldReading`, original calibrated seeded `StarfallFieldScience.sample`, actual rover instrument power debit when realistic model is enabled, then canonical `StarfallScienceUI` Journal entry. T14 annotates the record before archival.
2. Deployed rover: **T06** `SAMPLE` is executed only where the rover physically travels, costs real `r.batteryJ`, and saves the T14 annotation on the original `r.records[]`. **T03** routes/queues an encoded packet and handles finite delays/LOS and ACK. Until ACK, the reading is *not* in the ship Science Journal, hence has no confirmed map marker.
3. Orbit: **7C/T07** payloads require eligible solar/attitude/battery; a received T03/T07 observation appears in the same Journal. Its original footprint controls map coverage. Selecting the satellite does not reveal an unseen planet.
4. Photo: real **7F** capture produces actual image bytes and position metadata; radio/network downlink delivers bytes. The map marker is only created once photo metadata is **DOWNLINKED**, and only if original captureLocal is present. Ruin-target shots retain the discovered ruin ID for original-site correlation.
5. Lab: T10 powered same-store lab analyzes the original observation ID after reception; neither map, journal, ruins nor T14 duplicates an assay or assumes the physical specimen traveled.

## Tests and limitations

- `tests/science-evidence-t14.test.cjs`: all 8 original sensor ratings, metadata correctness and exact value/energy preservation, deterministic quality penalties, malformed body-fixed coordinates rejection, duplicate filtering, explicit after-ACK/after-downlink truth gates, T06 lat/lon identity, coverage without entire-planet reveal and unexamined/unsurveyed ruin denial.
- `tests/science-evidence-t14-browser.py`: genuine `file://` Chromium WebGL boot into a controlled saved landed world, actual local rover sensor measurement through original field UI owner, provenance+energy and original Journal, canonical Survey6G map filter, no unreceived photo, corrupt T14 rejection and actual page reload.
- Existing T03/4/5/6/7/8/9/10/11/12/13 automated tests remain required for true *remote* packet/image delivery and science/lab. `python tools/build-standalone.py && python tests/standalone-parity.py` must retain exact one-file reproducibility.
- **Unverified or not added:** live user-controlled mission with two remote waypoints and actual ruin and satellite photo camera success in a single measured playthrough, a new physical user calibration kit/job, source-specific planet weather attenuation, photo-to-specimen evidentiary chain beyond existing references, certified chemistry, and real GPU performance. Hardware playtest / rover X / ship ramp / ancient interior interactions have not been manually retested for T14.
- Do not merge draft PR without final CI and human manual test. Rollback: T13 feature branch remains exact baseline, T12 rollback and T11 `main` unchanged.
