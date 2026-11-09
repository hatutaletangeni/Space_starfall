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


## 2026-11-09 pre-8K 8I–8J integration addendum (draft PR #135, NOT full stage acceptance)

The preceding sections reflect their original November 3 audit and must **not** be read as a claim that the currently shipped game or current draft has passed the entire 8E–8J acceptance. The following narrow conservation contracts apply only to the new `manufactured-eclss8i.js`, `terraform-operations8j.js` and their 8A/ship-battery runtime adapters. The existing `habitat8i.js` and `terraform8j.js` remain isolated pure demonstration modules; they are not substituted for actual player-owned equipment.

| Process | Initial source, debit and end state | Conservation, uncertainties and unmodeled effects |
|---|---|---|
| 8I shell commissioning | Existing `habitat_envelope` assembled from a paid 8G BOM and charged with original 8A O₂, N₂ and H₂O; 250,000 J deducted from original ship battery. | No fresh tanks or water. Manufactured existing life-support rack is granted finite **capacity** to remove 60 mol of cabin CO₂, not newly added chemical mass. Shell remains uncrewed and not human-rated. |
| 8I powered circulation | Original ship battery decreases by `680 W × Δt` joules if powered; existing cabin gas and clean water are circulated. | Gas partial pressures use `pᵢ = nᵢRT/V` with `V = 25 m³`, `R = 8.314462618 J/(mol·K)`; modeled water circulation is NOT wastewater purification. No source of new oxygen or water. |
| 8I finite CO₂ capture | Original cabin CO₂ decreases, finite `scrubberCapacityMol` is consumed, `filteredAirMol` receives the removed CO₂. | Correct retained total wet mass includes **both** airborne and captured CO₂: `mwet = .031998 nO₂ + .028014 nN₂ + .04401(nCO₂ + nCaptured) + mwater` kg. This is abstract storage, not a modeled regenerable chemical sorbent. |
| 8I pressure leak | With a bounded time interval, original O₂, N₂ and CO₂ moles decrease according to original T09 leak approximation; original physical habitat asset mass is reduced by the same quantity, recorded as atmospheric vent. | `masset,before − masset,after = mvented`, accounting for captured CO₂ and retained water. No reaction-generated mass; non-ideal flow and thermal leak geometry are not modeled. |
| 8J metered CO₂ release | Source: identified installed CO₂-rated vessel's original 8A gas lot; operation removes `0 < Δm ≤ 0.5 kg`, consumes 5,000 J from original ship battery, and persists one world-specific receipt. | `ΔP = Δm·g/(4πR²)` is the **modeled global mean** from a uniform spherical atmosphere, not a local measurable pressure spike. Actual local plume transport, chemistry and global mixing are omitted. |
| 8J long-time tracer escape | Retained anthropogenic CO₂ is modeled as `m(t) = m₀exp(−t/10⁸s)`, with the escaped amount separately recorded. | The time constant is a **fictional procedural placeholder**, not an atmospheric escape measurement. Atmosphere baseline remains pinned to the existing seeded science profile. |
| 8J atmospheric temperature | Sub-kilogram injections do not alter the whole-world temperature or visibly recolor clouds/ground. | Global `ΔT = 0 K` in this first slice. Estimated sensor uncertainties are ±0.5 Pa and ±0.5 K; typical `ΔP` is far beneath instrument resolution. Never report this as measured warming or substantial terraforming. |

**Outstanding scientific blockers:** fully connected ore → refining → certified electrical/solar part, closed air/water/greenhouse chemistry with real reagents and waste, independent wired habitat power, rocket propulsion and finite fuel qualification, atmosphere loss and multi-reservoir circulation/feedback on a feasible world, native-life/environmental approvals, visual climate mapping and real consumer GPU end-to-end evidence. The present addendum is a verified engineering *accounting model* only where actual exact-head tests have passed; see `docs/UPDATE-8IJ-INTEGRATION-2026-11-09.md`.
