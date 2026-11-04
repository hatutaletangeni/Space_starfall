# STARFALL 8F — physical basic stock parts and manual press

**Status:** additive experimental manufacturing on a draft feature branch. Stable `main` unchanged.

The pre-installed fabrication module contains a hand shear, sheet bending brake and glass scoring bench, and exposes six separate named bills of materials through the existing **Engineer → Material Fabrication** panel:

| Recipe | Certified inputs | Physically produced outputs | Scrap | Tool |
|---|---|---|---|---|
| `copper_busbar` | 0.50 kg copper | 0.48 kg copper busbar | 0.02 kg | hand shear |
| `copper_contact` | 0.20 kg copper | 0.19 kg copper contact | 0.01 kg | hand shear |
| `iron_bracket` | 0.50 kg iron | 0.46 kg iron bracket | 0.04 kg | bending brake |
| `steel_bracket` | 0.80 kg steel | 0.75 kg steel bracket | 0.05 kg | bending brake |
| `glass_panel` | 0.60 kg glass | 0.55 kg glass panel | 0.05 kg | glass cutter |
| `stamped_steel_plate` | 2.00 kg steel | 1.92 kg stamped plate | 0.08 kg | separately installed manual press |

All inputs must already exist in true certified physical 8A lots with grade >= 98%; raw ores and concentrates are not accepted by the bench. Each job is saved, consumes continuous finite ship battery energy, produces tagged finished parts and a real `manufacturing_scrap` lot. Products do not imply full-quality real-world structural certification.

**Manual press:** First fabricate enough brackets and panels. The ship's existing assembly jig can create `machine_kit_manual_press` from **33 kg steel + 6 kg copper + 4 kg iron brackets + 7 kg glass panels** (all finite). The 50 kg assembled unit occupies a real 0.22 m³ cargo volume and takes actual ship energy and 150 s of assembly work. Through **Engineer → Physical Machine Installation** it consumes the full kit, debits 110 kJ of installation energy and adds one persistent 50 kg `industrial_machine` asset with `station:press`, `tools:['manual-press']`. This enables `stamped_steel_plate`, which is otherwise machine-locked.

## Verified coverage

- `tests/stock-parts8f.test.cjs`: 26 timed manufacturing jobs, real certified feedstock debit, continuous power charge, explicit scrap, 50 kg kit assembly, 8A physical machine installation, tool gate, one stamped-plate job and conservation of cargo + previously existing ship mass + installed press.
- Existing industry chemistry, refinery, machine installation, kit assembly, gas processing and standalone bundling regressions remain mandatory.
- The workflow produces a self-contained HTML build artifact, not a live browser/GPU performance pass.

## Unfinished supply chain

Copper can be sourced from the new sulfide roasting workflow, iron/steel from oxide reduction, and glass from quartz. However the in-game economy does not yet produce every large quantity of certified metals, electronic boards, motors, polymers or aluminum needed for all advanced kits from natural deposits. 50 kg manual press construction is deliberately resource-expensive and can require many real mining/refining cycles. The older complex machinery stays explicitly gated. Non-trivial browser/WebGL2 testing and save migration checks are needed before merging any stacked industry branches into `main`.
