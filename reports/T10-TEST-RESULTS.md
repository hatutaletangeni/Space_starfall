# T10 Engineering QA — Original Science Journal / Physical Sample / 48V Lab

**Repository:** `hatutaletangeni/Space_starfall`  
**Parent:** verified latest main `371ef97f5ca2986b0d387560f0a5d291a9c3702d`, with T09+T01–T09 successful [GitHub Actions 41496323720](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41496323720).  
**Feature branch:** `feature/t10-science-chain-custody` — reversible, not yet merged into main.

## Evidence actually executed

- [T10 focused real-browser QA run **41506796724**](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41506796724): **SUCCESS** with all relevant Model+Playwright steps green.
- This focused run executed the original source-built `PLAY-STARFALL.html` in Chromium/SwiftShader with a **real Outpost Store**, **real 7D sampler**, **real T02 48 V source/cable network**, **real T10 physical specimen custody**, the **original Science Journal**, original Outpost **LABORATORY UI** and original save/reload.
- Original 7D `SAMPLE sampler` produced one genuinely source-modeled numeric observation **and** one separate modeled 150 g physical regolith sample. The sample was carried in the original rover `sampleInventory`.
- The test rejected a specimen transfer when EVA=false, then transferred the sample exactly once to a real nearby T02-powered sample-storage module using a controlled simulated EVA posture.
- The physical specimen's unique ID and custody receipt survived reload; rover sample count was zero after handoff (no duplication).
- A powered 950 W original lab processed the original numeric observation, paused under a simulated electrical outage, resumed under power, produced a bounded model-derived interpretation and retained the original journal's observation ID after reload.
- The existing Outpost Laboratory page rendered a coherent original observation + physical sample + completed analysis status.
- All deterministic Node tests, including `tests/science-chain-t10.test.cjs`, covered no power, wrong planet, no EVA, out of range, source mismatch, exact source debit, duplicate IDs, 12-unit original rover inventory, finite 60 physical slots and 160 kg mass envelope, assay power pause/restart, 400 original receipt cap without silent shift, lab dismantle preserving receipts, source schema migration.
- **Full T01–T10 regression status:** requires exact-head `Starfall Engineering Regression` (both offline-model and browser-smoke). An earlier full run may pass on an intermediate commit; do not substitute it for final-head release QA. Mark final commit + URL here after verifying.

## Safety / data contracts

| Responsibility | Source of truth | T10 change |
|---|---|---|
| Numeric science | `StarfallScienceUI.journal` / `robotics4` | Original source/IDs preserved, T03 delivered rover notes gain actual `receivedAtS`, overflow explicitly rejected at 500 |
| Actual photographs | `StarfallImagingUI7F` / original IndexedDB | No fake photo bytes, ACKed photo IDs visible in lab, existing portable 7F image archive unchanged |
| Original 7D rover | `launch7.rovers[].ground7d` | Sampler creates unique specimen with separate sensor observation, bounded 12 cartridges, no new vehicle owner |
| Physical specimens | `launch7.rovers[].sampleInventory` then `outpost5.items[].t10.samples` | Exact one ownership transfer on same planet within 18 scene units, with actual power/EVA gate; no radio mass transmission |
| Lab assay | `outpost5.items[].t10.analysis` | 20 sim-second bounded computation, numeric source ID, power pause/restart, model-derived interpretation only |
| Electrical supply | T02 `outpost5` graph | Existing lab 950W and storage 70W measured; never minted a new battery |
| Radio / interplanetary | T03 packet + T08 real physical route | Original 7D radio ACK unchanged except genuine receive-time journaling and no false ACK if Science Journal full |
| Original receipts | `outpost5.receipts` | No `shift()`, no `slice(-400)` on restore, no erasure when lab demolished; reject new receipts at full cap |

## Known explicit gaps — NOT verified as complete

- T10 does **not** create a physical return capsule or automated sample transportation across planets. A Planet B specimen **stays physically on B** until an actual vehicle/human transports it. Only **its remote numeric reading/photo** can radio to Planet A using the real T08 network.
- The original 7F portable camera archive exports actual image bytes. The T10 feature does **not** yet offer the master specification's **single combined ZIP** containing numeric science, original sample custody, and binary photo bytes together. Export the original Science Journal/outpost receipts and the separately existing 7F portable archive. Do not claim an integrated ZIP artifact was built.
- T10 does not add full instrument-specific physical calibration, chromatograph/biochemical/thermal wet-lab results, sample chemistry consumption or scientific-grade chemical identifications. Its interpretation deliberately refuses to claim certified independent mineralogy.
- Existing original `Research 7E` was not rewritten. Original journal IDs are available for provenance, but a new explicit science-to-blueprint association picker has not yet been built.
- This new Chromium test deliberately uses a **controlled deployed rover and controlled EVA** rather than a fully human-driven expedition. Actual off-world T08 round-trip image remains regression-tested by the existing T08 browser suite, not repeated in T10 as a new physical sample return demonstration.
- Full hardware GPU endurance tests, huge records storage migrations above already modelled caps and manual 100× warp multi-world lab operations remain outside verified scope. 
- T10 only writes to its own feature branch. The verified T09 `main` is available for immediate rollback, and no debug workflows should remain when a candidate is declared ready.

## Commands

```bash
node tests/science-chain-t10.test.cjs
for f in tests/*.test.cjs; do node "$f" || exit 1; done
python tools/build-standalone.py
python tests/standalone-parity.py
python tests/science-chain-t10-browser.py
# GitHub CI adds every existing T01–T09 full UI/browser regression.
```

The stable checkpoint is `main`, verified before T10 work began. Do not publish incomplete user-visible science as an unqualified release.
