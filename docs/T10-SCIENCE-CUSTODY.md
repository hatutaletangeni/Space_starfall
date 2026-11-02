# STARFALL T10 — Science Chain of Custody and Powered Lab Work

**Starting source:** fully verified main commit `371ef97f5ca2986b0d387560f0a5d291a9c3702d`, which already includes T09 and all T01–T09 green CI gates.  
**Branch:** `feature/t10-science-chain-custody`, isolated from main.  
**Status:** Integrated prototype pending exact-final-commit engineering CI. Do not merge to main before tests pass.

## Contract and ownership

The original `StarfallScienceUI` journal is the sole numerical science evidence owner. The original `StarfallImagingUI7F` indexed image archive owns real Camera 7F pixels. T03 owns packets, ACK, energy and radio delivery; T08 interplanetary routes remain unchanged. The original `StarfallLaunchUI.store.rovers` owns physical rock cartridges in a new optional `sampleInventory`, and the original Outpost `store.items` owns real `storage` and `lab` resources and their `t10` state.

T10 adds no second journal, second image archive, extra planet world, new panel or fictional sample teleporter.

## Physical sampling and local transfer

When the existing physically landed 7D rover executes `SAMPLE sampler` with its actual 7D battery, terrain and instrument model, T10 adds one **model-derived 150 g regolith plug** to a maximum of **12 unique onboard rover cartridges**. The plug is **separate from** the original 7D numeric sensor reading. It holds a stable specimen ID, source measurement ID, source rover and celestial body, extracted simulation time, body-fixed surface direction, approximate sample mass and volume, contamination flag and an append-only bounded custody trail. This is a game-world regolith sampling model, **not certified lab mineralogy**.

On the same planet, approach a physically constructed `storage` module in EVA within **18 scene units**; the sample rover must also be at the module within **18 units**. The module must be powered through real T02 wiring. In **Surface Outposts → LABORATORY**, select the storage module, then click **TRANSFER NEARBY ROVER SPECIMEN**. This removes the exact specimen once from the source rover and inserts it once into the original storage item. An unavailable original rover sample, location outside range, body mismatch, no EVA, power outage or duplicate ID blocks transfer. The inventory has **60 physical slots** and **160 kg** mass budget; at capacity a new transfer is rejected with actionable feedback. No cross-planet physical sample delivery is possible through radio.

A saved specimen remains in the original `outpost5.items[].t10.samples` on reload. Custody receipts are retained on that module and original source rover cartridge inventory is persisted through the original 7B `launch7` source store.

## Laboratory science processing

Place an existing Outpost `lab`, wire it to a powered 48 V bus (existing **950 W** nameplate), then select an observation in the existing **LABORATORY** panel. Local field readings in the original journal may be analyzed on the same world. Remote readings are eligible only when original T03 delivery has supplied `receivedAtS`; remote specimens **are not** eligible for transfer. T10 creates an optional versioned `lab.t10.analysis` referencing the original observation ID, instrument, original source world/asset, modeled uncertainty, simulated start and finish times. There is no fabricated observation value or stand-in photo.

A running analysis requires **20 simulated seconds** of modeled work and a powered original laboratory. Losing real T02 power pauses the work; when the operator restores power, it resumes a full bounded processing interval. Analysis results are explicitly described as **model-derived**, not independent geology/mineralogy certification. Repeated requests for a completed source observation return the original analysis ID, never another credited record. Finite 120 processed analyses per lab; capacity overflow requires export/archive, not silent deletion.

The original 7F gallery displays real photos, and T10's existing lab tab shows only fully downlinked IDs, not invented copies of photo pixels. An overview of original T03 packet statuses helps diagnose missing data.

## Evidence loss protections

- Existing Outpost `receipts[]` will not silently `shift()` after 400; it now rejects a new delivery with an explicit error and the old 400 remain intact. Existing valid saved receipts no longer use `slice(-400)` on load.
- Dismantling a lab does not delete its historical receipts; source laboratory identity is retained. The original lab's finite 120 attached measurement ID slots remain bounded.
- `src/physics/science-field.js` previously silently shifted old journal data after 500 observations. Now it rejects new entries with a clear export/archive instruction, never destroys earned originals.
- The original T03 rover-receive adapter now gives numeric observations a true `receivedAtS` at real packet acceptance, and if the original journal cannot store them it rejects/holds packet acknowledgment. This allows a Planet-A lab to analyze successfully received Planet-B data while preventing a physical specimen from teleporting.
- Saved T09 habitat and T08 deep-space source schemas were not modified.

## Known limitations / pending follow-ups

1. The T10 numerical science journal and physical sample custody are linked through IDs, but there is **no physical sample return capsule or autonomous rover docking arm**. An operator must physically approach the source rover and storage as defined. A remote world instrument reading is only *data*, not a physical sample.
2. The existing portable 7F camera archive already includes the original real photo bytes separately; this T10 slice has **not created a single combined ZIP** bundling all scientific JSON and actual IndexedDB photo files. The user should export the existing 7F portable archive **and** the existing Science Journal/outpost receipts backups when moving devices. Do not claim one portable evidence bundle exists until verified.
3. T10 lab analysis currently produces a conservative model-derived interpretation rather than calibrated composition/instrument-scale spectrometry or independently validated chemical assay results. There is no actual wet laboratory, chromatograph or physical consumables model.
4. The browser-controlled T10 scenario uses the real original 7D sampler and T02 grid, but a controlled stationary rover source, an authorized controlled EVA posture and scripted elapsed time. No claim of fully hand-driven rover sample return or manual laptop GPU FPS.
5. Original 7E Research Bench remains the owner of its predictions and blueprints. T10 observations can be referenced by their same journal IDs, but a dedicated new research-evidence picker is not yet provided.
6. The existing T03 end-to-end multi-hop radio ACK model and T08 compressed astronomical distances remain as documented at those milestones.
7. No new assets were merged to stable. If the branch's full T01–T10 CI is not green, use the already fully verified latest `main`, not this development candidate.

## Verification

```bash
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/science-chain-t10-browser.py
# Existing CI also runs all T01–T09 real software-WebGL/Chromium test scenarios.
```

The new deterministic test `tests/science-chain-t10.test.cjs` checks actual unique specimen debit/custody and T02 power/EVA/distance/body limits, exact assay clock and power pause, original save migration and 400 historical receipt preservation. The new real `file://` browser `tests/science-chain-t10-browser.py` exercises original 7D sampler→real T02 wired storage/lab→source owner receipt→analysis→UI→reload. Neither test should be described as a physically hand-flown full interplanetary sample-return expedition.

**Rollback:** Main at `371ef97f5ca2986b0d387560f0a5d291a9c3702d` was fully verified before T10 branch creation. Use that branch if T10 QA is not green.
