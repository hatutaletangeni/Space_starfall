# STARFALL — Industrial chemistry, manufacturing, and scientific integrity

Status as of 2026-11-03: **8E incomplete integration; 8F partially playable in editable source**. Never present this as an audited physical chemistry or engineering design.

## One authoritative mass ledger

Real lots are always held in serialized `materials8a` containers. Source-side product generation is forbidden. Refining jobs debit `vehicleStore.get('ship').state.energyJ` incrementally and store progress under `refinery8e`. The 8F workshop uses the same battery owner and transforms `materials8a` with one idempotent `transformations8e` receipt per completed batch. Capacity is checked against the post-debit stock. The actual vehicle flight subsystem, planet maps, truck custody and save keys are not redefined.

## Reaction equations tested for element conservation

The `StarfallIndustrialChemistry8E` library explicitly checks each element on each side, molecular mass, required equipment and process power/time. Each reaction assumes pure chemically identified inputs, not raw ore.

| Reaction | Elementally balanced modeled reaction | Required station / hazard |
|---|---|---|
| Water electrolysis | 2 H₂O → 2 H₂ + O₂ | Electrolyzer, gas separation, **separate pressure-rated hydrogen and oxygen tanks** |
| Sabatier | CO₂ + 4 H₂ → CH₄ + 2 H₂O | Catalyst-bearing chemical reactor, methane storage |
| Hematite carbothermic reduction | Fe₂O₃ + 3 C → 2 Fe + 3 CO | High-temperature reduction furnace, captured toxic CO |
| Copper oxide reduction | 2 CuO + C → 2 Cu + CO₂ | Reduction furnace, captured CO₂ |
| Alumina reduction, overall ideal | 2 Al₂O₃ + 3 C → 4 Al + 3 CO₂ | Electrolysis bath, carbon anode, gas capture; industrial process simplified |
| Silica vitrification | SiO₂(s) → SiO₂(glass) | High-temperature glass furnace and mold |

The engine tracks only selected chemical species, does not cover complete feed mineralogy, slag, catalysts spent, equilibrium, kinetics, energy release, real thermal efficiency, cooling fluids, molten phase hazards, exact electrochemical potential, gas impurities, compressor work or gas boiloff. Energy budgets are **conservative gameplay estimates only**, not externally verified engineering values. 8E **cannot be declared complete** based on these reactions alone.

The `industrial-plant8e.js` reaction backend uses actual 8A lot mass and assay purity, a registered surface station asset, a compatible tool set, a verified paid-energy receipt, and pressure/volume-limited gas vessels that themselves must correspond to existing physical assets. It returns new material and receipt snapshots; a future physical commissioning and power-network controller must save them atomically. It **cannot be activated from the current UI** because these specialized surface facilities have not been implemented as placed and rendered machinery. There is no fake fallback to make the button appear functional.

## Existing 8E ship workshop (operational in edited source, browser not verified)

The installed ship fabrication room runs first-pass assay-based mineral separation and heated ice recovery: iron concentrate, copper concentrate, silica concentrate, water and explicit residue lots. These are simplified bulk separations; they are not equivalent to pure iron, pure copper, electronic silicon, electrolytic oxygen or rocket propellant. Their recovered amount depends on the 8C assay grade of the particular mined lot. Results preserve source+residue mass. A 0%-target assay cannot start. The ship power source is finite and must be enabled. Stop conditions include absent material, invalid original lot, no worksite, full ship hold, blackout and lost physical access.

## Manufacturing 8F

`StarfallManufacturing8F.RECIPES` distinguishes structure, machine tools, wire, batteries, motors, PCBs, solar modules and cleanroom products; `StarfallFactory8F.billOfMaterials` exposes schema/version, mass of each input and output, scrap, wattage, process seconds and approximate tooling tolerance. A production job persists under `factory8f` and is completed through the SAME 8A/8E transformation ledger. The original ship fabrication module has one preexisting `wire-die` tool; producing 1.96 kg copper wire from 2.00 kg certified refined copper consumes 104 kJ over 130 simulated seconds and returns 0.04 kg recoverable scrap. It does not create silicon chips or motors.

All other recipe types demand separately installed, physically identified tools and certified feedstock. No components have yet been connected to real 7A/T15 vehicle slot installation. Mass input alone is not enough to certify photovoltaic performance or motor efficiency. Motor/PV electronics and cleanroom machinery therefore remain **gated, not playable as advanced installations**.

## Verification evidence and missing gates

- Isolated V8 model tests passed for six balanced equations, gas tanks, missing energy/tools/inputs, initial ship refinery, 8F wire drawing and cross-stage certified copper-oxide reduction → copper wire, with no net mass creation.
- JavaScript source syntax and script-order checks passed. Model testing does not verify browser rendering, full save/recovery migration, machine placement, terrain/collision or performance.
- GitHub Actions workflow `industry-8e-8f.yml` builds a candidate single-file HTML and runs the contract tests; verify its result independently before calling the standalone ready.
- Mandatory next engineering: physically assemble/install surface stations from finite kits, render their actual geometry, connect a live metered power grid and realistic heat/pressurized plumbing, implement identified ore-assay → certified reagents without falsely inferring oxide/sulfide composition, wire installed manufactured parts to T15, and test all existing controls/galaxy/GPU/old saves.
- The old `transformation8e.js` illustrative placeholder `RECIPES` are NOT thermochemical truth; use `industrial-chemistry8e.js` for verified elemental balance rather than those sample labels.
