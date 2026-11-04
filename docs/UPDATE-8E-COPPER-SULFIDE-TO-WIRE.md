# STARFALL — Copper from sulfide ore to manufactured wire (Update 8E)

**Feature-branch implementation; simplified chemical model, not industrial process certification.**

## Path for a real expedition
1. Survey an 8C **copper_ore** deposit and extract it through 8D. Copper-bearing sulfides have a measured synthetic `grade` that represents target copper mass fraction; hauling to the main ship material container is required.
2. Under **Engineer → Refinery**, run **Copper ore concentration** on 20 kg of actual surveyed mined stock. With 5% Cu assay and 70% recovery, the simplified separator makes 2.8 kg of 25%-Cu `copper_concentrate`, with 17.2 kg accounted tailings.
3. Run **Identify copper(I) sulfide** on a 2 kg `copper_concentrate` lot with verified 8E process provenance and at least 25% copper grade. The mechanical identification model assumes Cu₂S (chalcocite). Copper recovery is 78%. It outputs approximately 0.488 kg chemically identified modeled `copper_sulfide` and the remaining mass as tailings. The product mass accounts for copper *and sulfur already present in the rock*. **Real mineral identity is not proven by the synthetic 8C assay.**
4. Construct a `plant_kit_reduction_furnace` from actual manufactured finished components. The kit includes a sulfide roaster and gas capture. Separately construct pressure-rated **oxygen**, **sulfur dioxide** and **carbon dioxide** vessels. Oxygen can be sourced via the existing water electrolyzer using recovered finite water, with physical oxygen and hydrogen tanks. This path never treats oxygen as free atmospheric stock.
5. In **Engineer → Chemical Plant Control**, choose **Copper(I) sulfide oxygen roasting**; select a batch size fitting true Cu₂S and available O₂ gas vessel stock. Reaction:
   
   `Cu₂S + 2 O₂ → 2 CuO + SO₂`
   
   Roasting consumes oxygen **directly from the installed pressure-rated gas container** and outputs copper oxide in the real ship hold and sulfur dioxide in its own rated pressure vessel. It fails closed if the oxygen source or SO₂ capture vessel is absent.
6. Use actual 8E recovered `carbon` and a separate CO₂ gas vessel to run the existing **Copper oxide reduction**:
   
   `2 CuO + C → 2 Cu + CO₂`
   
   Output `copper` is a grade-1 inventory lot and can feed the existing ship wire-drawing die (2 kg refined copper → 1.96 kg copper wire and 0.04 kg manufacturing scrap per 104 kJ). Several mining / roast / reduction batches are required to accumulate 2 kg.

## Material and environmental accounting
Each model reaction is checked element by element for Cu, S, C and O. Oxygen is provided by an existing lot, not created from a power draw. SO₂ and CO₂ exhaust gases cannot be vented for free. Gas storage includes physical tank presence, rated pressure, gas phase and mass/volume capacity. All inputs and products remain 8A lots. Spent electrical energy is debited from the existing ship battery over timed jobs. Existing 8E and 8F receipts are persisted. Legacy saves and general ship/planet physics are not redefined.

## Testing and acceptance
`tests/copper-sulfide-chain8e.test.cjs` checks actual finite mined material quantities, Fe-style provenance guards, Cu₂S copper fraction, oxygen sourcing from an existing physical pressure vessel, sulfur dioxide capture, carbon reduction, conserved global mass and idempotent receipts. The full CI suite also exercises iron/steel, silica/glass, 8E electrolysis, kit assembly, machines, vehicle material stores and standalone HTML bundling.

**Known limitations:** 8C mineral classification and Cu₂S identity are assumed rather than physically verified XRD mineralogy. No multiphase slag/flux sulfur equilibrium, heat transfer, off-gas scrubbing, industrial risk or actual oxygen flow/piping is solved. A pressure-vessel station can presently access nearby compatible rated vessels through idealized local connections (within 75 scene units). Reactions use illustrative per-cycle power/time budgets, not process-design certified thermal estimates. Standalone build checks are not a substitute for WebGL2 hardware gameplay/legacy-save tests. **No release merge to main until independent game verification.**
