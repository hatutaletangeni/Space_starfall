# STARFALL — SCIENCE AND INDUSTRY MODELS / UPDATE 8K AUDIT

**Purpose:** Source-derived engineering truth and release evidence. The presence of this document is NOT a claim that 8K is completed. Production inventory originates in real source-owned 8A lots, not what an interface happens to display. Last reviewed on the Update 8 integration branch, November 2026.

## 1. Authoritative ownership and conservation

| Domain | Original source owner | Physical invariant |
|---|---|---|
| Planets / ID / radial anchors | `src/galaxy.js`, CW01/03 and `src/physics/foundation.js` | Stable IDs; no changing physics scene units or terrain collisions to simulate a chemical result |
| Surface ore / depletion | `src/physics/planetary-resources8c.js` | Finite planet-fixed deposits and persisted depleted mass; no arbitrary ores everywhere |
| Physical parts / trucks / vessels | `StarfallPhysical8A`, `StarfallEngineeringVehicles`, original ship / truck ownership | One ID, one physical location/parent; initially one original rideable truck |
| Stock ownership | `src/physics/material-ledger8a.js`, `src/physics/mining-hauling8d.js` | One original container per lot; kg and m³ remain nonnegative; reserved and committed operations have unique IDs |
| Source power | T02 real battery/solar system, `StarfallOutpostUI.powerTick` and existing ship `vehicleStore` | Jobs cannot deliver electric work without a source J debit, daylight or valid served-grid report |
| Habitats | `src/physics/habitat-t09.js` / original `outpost5` | T09 cabin gas in mol, liquid water in L, T02 680 W served load, finite O₂/inert reserve, airlock and leaks |
| Planetary atmosphere | `StarfallPhysics.bodyProfile` baseline + `src/physics/atmosphere-emission8j.js` per-world delta | Global mean pressure change derives from explicitly debited and recorded gas kg |

For every source-paid release/installation: validate → clone state → enforce existing reservations and capacity → debit original source and original power owner → credit original destination → write joint durable SF.save → re-read or test reload. A false durable write causes a rollback. All test fixture stock must carry `TEST_FIXTURE_ONLY` provenance and remain in isolated browser profiles.

## 2. Measured/idealized chemistry models

The numerical chemical species model is defined in `src/physics/industrial-chemistry8e.js` using atomic molar masses H 1.008, C 12.011, O 15.999, Fe 55.845, Cu 63.546, and others. For listed reactions:

| Process | Balanced idealized equation | Physical restrictions / known limits |
|---|---|---|
| Water electrolysis | `2 H2O → 2 H2 + O2` | Water reservoir, separator, electrical job and distinct rated H₂/O₂ vessel gas stock required; not an energy generator |
| CO₂ methanation | `CO2 + 4 H2 → CH4 + 2 H2O` | Both gases must exist as real source lots; station/catalyst/energy and output capacity required |
| Hematite reduction | `Fe2O3 + 3 C → 2 Fe + 3 CO` | Requires identified hematite, finite carbon and captured CO output; ordinary Fe-bearing rock is NOT pure hematite |
| Copper(I) sulfide roasting | `Cu2S + 2 O2 → 2 CuO + SO2` | Identified ore and physically supplied oxygen; sulfur dioxide must be captured |
| Copper oxide reduction | `2 CuO + C → 2 Cu + CO2` | Actual copper oxide and carbon; CO₂ output conserved |

Chemical equations describe ideal atom balances, not validated industrial yields or automatic high-tech equipment fabrication. T08–8H plant process losses, tool conditions, throughput and reactor pumps are separate costs.

## 3. T09 / 8I finite life-support and sealed greenhouse

- Existing habitat: ideal-gas `p = n R T / V` (Pa), O₂ and CO₂ partial pressures from constituent molarity, sealed 80 m³ default, finite leak fraction per simulated second, crew O₂ uptake/CO₂ release, finite stored oxygen and scrubber capacity. T09 T02 live supply is **680 W** when served. Brownout or an open airlock can interrupt safety or life support.
- Water refill: `1 kg` physically transferred pre-existing liquid water ≈ `1 L` T09 stored water at the declared 20°C approximation. Ship energy debit **25 kJ/kg**; must be in the original ship-owned 8A water lot.
- Oxygen vessel refill: O₂ molar mass **0.031998 kg/mol**. Original rated pressure-vessel gas lot decreases by kg; T09 cylinder increases by `kg / 0.031998` mol; ship regulator energy **60 kJ/kg**. Original 8G vessel certified at 5 MPa or higher; pressure of source lot is checked against its rating.
- CO₂ sorbent replacement: `scrubber_media` manufactured at an 8F press from **1 kg zeolite + 0.1 kg insulation polymer → 1.02 kg scrubber media + 0.08 kg explicit manufacturing scrap**, at **900 W for 180 s**. Sorbent installation consumes **50 kJ/kg** ship battery, and declares a simplified usable **0.08 kg CO₂ adsorbable per kg media**. This is an illustrative adsorption capacity, not qualified sorbent performance. Sorbent mass remains physically installed inside the original habitat, while adsorbed CO₂ is accounted for by original `filteredAirMol`.
- Sealed greenhouse hardware: `glass 2 + aluminum_frame 1 + insulated_wire 0.3 + control_board 0.6 + insulation_polymer 0.1 → greenhouse_kit 3.7 kg + manufacturing_scrap 0.3 kg`; original 8F assembly station uses **1,500 W for 500 s**. Installation into original T09 requires **1 kg greenhouse_kit + 0.02 kg viable crop_seeds + 0.2 kg fertilizer**, with physical ship battery **400 kJ**.
- Greenhouse simplified photosynthetic mass balance per mol CO₂:
  `CO2 (0.04401 kg) + H2O (0.01801528 kg) → CH2O biomass (0.03002728 kg) + O2 (0.031998 kg)`.
  Additional consumed mineral nutrient remains in measured biomass, not removed from the system. No nutrient, CO₂, light, liquid water, sealed operating temperature or original **served T02 680 W** → no plant growth.
- Native greenhouse light: stellar luminosity from `StarfallPhysics.starProfile`, distance in verified **1 scene unit = 1,000 m** units, planet-fixed surface normal, star-facing daylight and native weather transmission. 6 m² collector/aperture, 2% useful sunlight conversion, 480 kJ photon-equivalent chemical budget per photosynthesized mol. This is a deliberately low-fidelity crop-response approximation. A fixed cabin crop biomass is NOT ready-to-eat food and does NOT create crew calories.
- Conversion and source media never auto-magically regenerate. Spent scrubber media, harvest / food handling, artificial photoperiod lighting and fully sealed agricultural waste recycling still require dedicated, paid equipment before claiming a closed self-sufficient colony.

## 4. 8J planetary pressure and retained gas ledger

The canonical world profile supplies `R` in meters, surface gravity `g` in m/s², seeded baseline mean surface pressure `P0` in Pa and gravitational parameter `mu`.

- Fixed-radius / fixed-gravity uniform-shell approximation: `M0 = P0 × 4πR² / g`; incremental source-paid mean pressure `ΔP = ΔM × g / (4πR²)`.
- Exoplanet-scale pressure baselines are often ~10¹⁶–10¹⁹ kg. A single 1 kg gas emission produces a sub-ULP global pressure delta; subtracting two large floating-point atmosphere masses would erase it. The **separate persisted `netAddedKg` and `pressureDeltaPa`** retain microscopic changes deterministically.
- Actual `StarfallAtmosphereEmission8J.emit` requires an original 8A rated gas vessel (O₂, N₂, CO₂, hydrogen or methane), verified source purity, real EVA and landed powered ship, up to **10 kg per operation**, **100 kJ/kg** original ship regulator work, and world ID. The actual lot is debited by exactly the credited mass, with a unique saved planet-specific receipt.
- Harmful global interventions are **locked** on identified native-life or archaeological-site worlds. Never interpret `protectedWorld:false` as an ecological clearance for other forms of harm.
- The `StarfallTerraform8J.feasibility` readout is a separate canonical planning calculator. Escape speed is `sqrt(2µ/R)`, and hypothetical years at continuous rate are `requiredImportKg / (rateKgS × 365.25 × 86400)`, not a promise to terraform in real time.
- **Not yet integrated into physically truthful planetary climate rendering:** thermal escape/UV retention, greenhouse radiative balance, seasonal water cycling, haze spectroscopy and ecosystem evolution. The pressure ledger is a mass transfer, NOT proof of a habitable planet. No terrain remorph or native species conversion is permitted.

## 5. 8K one-time prelaunch industrial manifest

`src/physics/starter-manifest8k.js` version 3 loads only after explicit
`SF.startNewExpedition(seed)`, once per expedition identity. Its **33 finite lots,
5,513.65 kg / 12.4805 m³** fit the original 9,000 kg / 16 m³ hold. This includes
sealed, uninstalled first-smelter/CO/pipe/CNC/electronics and energy-tool kits,
finite refined bootstrap metal, 1,400 kg firebrick, finite polymers and bearing
alloy, imported chips for at most 500 boards, four photovoltaic modules' active
stock and forty cells' certified electrode/chemical inputs. Neither a finished
module/cell nor an installed plant, generated local ore or replacement vehicle is
awarded. Actual 8F and 8E installers consume the precise bills and energy. Older
manifest versions and legacy saves are never replenished.

Waste storage is explicit: 8 kg steel + 2 kg polymer become a 10 kg open lined
stockpile kit; 72 kJ fabrication and 120 kJ erection are paid. A real same-world
footprint holds at most 40,000 kg / 20 m³ of existing mineral residues, with
actual lot volume still enforced. Near-field crane handling (ship <=65, EVA
<=20 scene units) moves <=500 kg per action at 5 kJ per source lot + 500 J/kg.
Original refinery provenance, reservations, dry mineral identity, ship energy
and joint durable custody are required. This is discrete handling with stored
waste, not detoxification, climate cleanup or a continuous crane solver.

Captured furnace CO (molar mass 0.028010 kg/mol) may use the same 8J rated-vessel
outlet as the other supported gases: <=10 kg, 100 kJ/kg, exact source debit and
planet-specific mass/pressure receipt. Native-life/archaeology worlds remain
locked. CO is toxic; neither oxidation to CO2 nor breathable air is modeled.
The outlet prevents mandatory infinite CO-tank construction on an eligible
sterile industrial world, without deleting a gram of the gas.

The 8K report requires actual Cu/Fe chemical outputs and recovered water,
full paid vehicle mechanical parts plus 2.5 MJ commissioning/charge, and source
receipts. The legacy Rocket Lab is design-preview only on Industrial saves:
it cannot create fuel or payloads. 8G dry rocket structures remain unqualified;
no positive manufactured rocket ignition is claimed.

The player must extract finite local resources and pay machine and processing budgets for bulk equipment; no structure or replacement vehicle may be produced from the manifest alone. The original one-truck rule persists on a fresh start. Legacy saves retain their own cargo and are not silently topped up.

## 6. Unresolved full expedition verification gates

The following is **not a PASS declaration**:

- Complete unassisted continuous browser expedition: first-truck ramp → finite ore/ice → actual hauling/refining/metallurgy → semiconductor-limited electronics → manufacturing facilities and finished vehicle → authentic off-world manifest transit to second body → installed powered T09 full closed-loop safe habitat → greenhouse harvest → sustained planetary mass/heat/climate change, then revisit old planet and restore original truck.
- Complete carbon/oxygen/water lifecycle output to proper actual waste/crop storage and powered disposal; thermal, habitat hull and agricultural leak failures.
- Materially resolved planet-wide climate feedback, source-paid atmospheric capture, non-free persistent thermal changes and renderer/sensor agreement.
- All triggered CI workflows retested green on the **final** integration commit; older green results do not certify newer code.
- Native GPU FPS, sustained frame times, dense outpost performance and unrelated galaxy/ramp/science/rocket/old-save regressions, when these checks have not been executed after new features.

**Release policy:** Mark full 8K only after actual evidence supports every critical requirement. If evidence or original source material is insufficient, keep this as an explicitly incomplete release candidate rather than silently inventing a passing expedition.

## 7. Reproduced source and browser evidence (2026-11-11)

- The complete finite specialty/tool plan includes seven original 8H gas services
  and needs 436 board batches; integer leftovers and unproducible imported
  materials are checked explicitly. Raw local Fe/Cu/Al/carbon/glass production is
  still essential. A bill closure calculation is not a completed expedition.
- A fresh source campaign on actual seed-742 Ice geology manufactures and
  commissions a new 298.69 kg rover through 311 actual factory batches, mines
  4,500 kg, pays native rated generation/ship/truck energy, stores residues,
  meters captured CO to the atmosphere and loads the new unique vehicle while
  leaving the original truck on its planet. It does not supply actual native
  gas-pump ticks or player locomotion; source snapshots are CI artifacts.
- The real Chromium flight test uses only an ordinary waypoint and G/W/Shift/C
  controls. It records continuous native flight, actual second-world touchdown
  and original-cargo persistence/reload. No position/time setter or debug
  navigation is used. Full industrial gameplay is a separate acceptance gate.
- Saves written by authentic 9536bc4, f6fa832 and 1d2b9a4 standalone versions are
  imported through the present archive UI and reloaded with source cargo,
  discoveries, credits and original truck retained. Private user saves and real
  Android/GPU hardware are not covered by those reproducible checks.

## Functional extension: manufactured flight, regeneration and capture

See [the current model and operation details](docs/8G-8I-8J-FUNCTIONAL-PATHS.md).
The source-paid gas-fed sounding path, manufactured recycler and inventoried
atmospheric-gas recovery extend the earlier limitations above. Orbital launch,
indefinite autonomous survival and unmeasured-baseline atmospheric capture are
not claimed. Climate/sensor/optical feedback uses the documented reduced-order
model and the same persisted gas mass.


## Orbital, baseline extraction and coupled climate extension

See [the current source/energy budgets, phase equations, approximations and acceptance scope](docs/ORBITAL-BASELINE-COUPLED-CLIMATE.md). This extends the earlier sounding-only and release-recovery paths. Coupled climate is a conservative coarse game simulation, not a validated GCM.
