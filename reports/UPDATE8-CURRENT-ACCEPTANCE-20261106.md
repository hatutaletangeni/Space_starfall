# STARFALL Update 8: source-owned industrial chain acceptance, 2026-11-06

**Reference:** `STARFALL_UPDATE_8_MANUFACTURING_TERRAFORMING_PROMPTS.md` (Master 00 and stages 8A–8K).
**Release decision:** The initial preflight + machine-appearance integration is an individually tested slice. **The overall 8K no-cheat end-to-end expedition has NOT passed.**

## Verified installed capabilities vs acceptance requirements

| Stage | Current source evidence | Status and still missing |
|---|---|---|
| 8A | `physical-inventory8a` + `material-ledger8a`, one original truck ID and finite containers | Core source-owned custody exists. Full old-save/property tests must accompany any schema change |
| 8B | `cargo-bay8b`, `truck-custody8b`, physical wide ramp and ship hold mass | Installed. Full user flight-to-different-world cargo roundtrip **NOT VERIFIED** |
| 8C | `planetary-resources8c` finite geology and surveys from CW01 | Tested geology/depletion model. Full manual survey expedition **NOT VERIFIED** |
| 8D | `mining-hauling8d` + original truck cockpit, 20 kg bores and source-owned ship loading | Browser and Node isolated tests exist. Hand sampler and multiple extractor types from specification **NOT COMPLETE** |
| 8E | `refinery8e`, `industrial-chemistry8e`, physical `industrial-site8e` installed from finite certified kits | Real finite jobs and powered stations; not all metallurgy, gas cooling, hazardous waste, or station-level thermal/kinetics models complete |
| 8F | `factory8f`, `manufacturing8f`, `machine-install8f` and kit BOMs | Finite machine fabrication exists; not every advanced semiconductor/solar/engine production prerequisite is reachable from early-game ore |
| 8G | `structure-assembly8g`, `vehicle-activation8g`, `habitat-hose8g` | Source-owned physical assets, dry rocket/habitat and limited manufactured prototype vehicles. New truck + interplanetary loading + operational habitat scenario **NOT VERIFIED** |
| 8H | `logistics-*8h` conveyors, native T02 ports, rated gas pipes, depot and offworld manifests | Source-owned specific transfers exist. Integrated reactor solid-output → real depot shipping chain and fully autonomous transport **NOT COMPLETE**; PR #124 remains a draft with unauthenticated receipt input |
| 8I | `habitat8i.js` gas and leak pure model; T09 native habitat charge/hose | **NOT RELEASE ACCEPTED.** Full powered closed-loop greenhouse/crops, crew environmental exposure, physical ECLSS and safe airlock cycles not complete |
| 8J | `terraform8j.js` conservative mass/pressure pure model | **NOT RELEASE ACCEPTED.** No installed planetary reactor delivery authority or canonical weather/render pressure linkage |
| 8K | 8E-R UI22, full source/standalone parity browser tests; this slice adds preflight and source-backed mesh | **NOT RELEASE ACCEPTED.** Required actual start-to-finish 2-world no-cheat scenario, all old-save migrations, GPU hardware FPS and 8I→8J still outstanding |

## Implemented in this slice

- `src/physics/expedition-manifest8k.js`: fixed preflight-certified parts, furnace, separator, matched nitrogen/CO vessel, original rated pipe and limited imported chips/feedstock. First expedition only; source-owned 8A ship container, one-time stable lot IDs. No per-land refill. Mass and packaged volume checked against original 9,000 kg / 16 m³ hold and existing 8E/8F kit BOMs.
- `src/physics/outposts-ui.js` and `src/engine.js`: actual installed source-owned station selects distinct 3D shape (furnace, separator, cell, gas pipe, conveyor, depot, assembly, reactor, etc). Depot crates are visibly present **only if** its ORIGINAL physical 8A container contains real stored lots.
- `src/flight.js` + `src/engine.js`: actual ship material-hold mass controls bounded cargo pallet rendering in the walkable ship. Empty stock = no pallets. The visual pallet count is approximate packaging, NOT a new material owner.
- T13 real Chromium ship-service regression now follows the visible UI22 `MISSION → Build → OPEN ALL BUILD TOOLS` path instead of clicking a hidden UI21 tab.
- Maintains source-owned no-cheat manufacturing. A kit in cargo is NOT an installed working plant, and a visual machine is NOT proof of completed physical chemistry.

## Reproduction / QA

```sh
node tests/expedition-manifest8k.test.cjs
node tests/physical-machinery-visuals8k.test.cjs
node tests/mining-hauling8d.test.cjs
node tests/refinery8e.test.cjs
node tests/factory8f.test.cjs
node tests/industrial-site8e.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/resource-test-lab8h-browser.py
python tests/ship-service-t13-browser.py
python tests/mobile-standalone-browser.py
```

Full CI `.github/workflows/update8k-production.yml` builds both standalones in a test workspace and uses genuine software-WebGL Chrome for the browser checks. It is distinct from manual GPU/device acceptance.

## Operator path

1. Export any valued old save; explicitly choose **New Galaxy** for the one-time original preflight cargo. Opening an old save will NOT silently gift the starter kits.
2. Land on a solid mineral world; find truck in actual V01 hangar and reverse down ramp, survey, then physically drill a 20 kg bore.
3. Drive back near ship; load real ore to original ship 8A material hold. Confirm lot ID, mass, and cargo volume in Engineer / Resource Test Lab.
4. Run real ship refinery; this creates intermediate concentrate and tailings, not a finished high-tech product.
5. Exit onto EVA. Select original certified furnace/air-separator/vessel/pipe kit from ship hold; clear the footprint and erect; keep all ship power and needed genuine T02 electrical port wiring.
6. Use manufactured parts or finite imported initial electronics in the installed 8F workshop, paying real source battery and waiting simulated time.
7. Physically transport built lots with original ship or source-backed connected depot/conveyor routes. Gas must remain in pressure-rated vessels or certified pipes.
8. Do not claim the final rocket/habitat/planetary atmosphere works until their source-owned installation, thermal/power and maintenance acceptance tests pass.

## Branch hygiene

`tools/prune_safe_merged_branches.py` may delete ONLY names whose immutable head SHA is already an ancestor of `main` and which are unprotected, not current PR heads, not backups, not release branches. All other drafts remain intact for comparison, including #124. Original deleted branch names and full SHAs are kept in the cleanup workflow JSON audit artifact. Branch cleanup is not evidence for feature completeness.
