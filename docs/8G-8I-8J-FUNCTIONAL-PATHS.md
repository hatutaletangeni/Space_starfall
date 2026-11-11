# Manufactured flight, regenerative habitat and atmospheric recovery

These are playable reduced-order engineering models, not certified real-world
rocket, food-processing or planetary-climate designs. Use Engineer → Industrial
flight, regeneration & atmospheric capture. The three groups are collapsed
by default, shared by desktop and landscape mobile.

## 8G: manufactured gas-fed sounding flight

The existing 8G dry-stage bill must be completely present in its original
assembly receipt. Its actual stage, chamber, nozzle, feed, valves, avionics and
battery mass transfers from the physical 8A registry to one original native
`launch7` mission. An intact original rocket integration rig and nearby actual
rated H2 and O2 vessels are required. No payload, satellite, engine, dry mass or
fuel is synthesized by the legacy Rocket Lab.

Load 0.1–8 kg H2 and eight times its mass of O2, plus a separately debited 2%
mixture for hot-fire exhaust. The 293.15 K, 8 MPa ideal-gas volume must fit the
actual stage envelope; this further restricts the selectable load. Intake
vessels must be pure, pressure bounded, unreserved, same-world and within EVA
hose range. The ship pays 3 MJ for modeled preparation and compression.

The prototype nameplate is an illustrative 12 kN / 180 s, not a performance
measurement or hardware certificate. Liftoff TWR must exceed 1.08. The native
fixed-substep variable-mass gravity/drag solver advances the flight; impact,
propellant exhaustion and abort remain real outcomes. There is no guaranteed
orbit, cryogenic loading or free satellite deployment. This adds a functional
sounding-rocket path; a high-performance manufactured orbital launcher remains
additional engineering work. The old free design-only launcher stays blocked
in Industrial saves. Legacy rockets keep their historical 210 kg bus; this
prototype has zero fictional bus/payload mass.

## 8I: source-paid regenerative cabin

Manufacture one `habitat_recycler` (40 kg output plus tracked scrap) at the
original kit fixture. It requires steel 20, aluminum 8, copper 3, insulated wire
2, control board 1.2, glass 6 and polymer 1 kg; 1,200 W for 900 s. Installation
requires its real original 8F receipt, a commissioned physical habitat with an
installed greenhouse, 800 kJ ship work and actual EVA proximity. The 40 kg
moves from 8A stock into that original physical pressure envelope.

Biomass is modeled as carbohydrate plus retained mineral nutrient. Crew
metabolism consumes CH2O + O2 → CO2 + H2O by mass, records unmet food demand,
and returns the consumed plant nutrient to the greenhouse reservoir. The
native scrubber retains a 0.15 kPa CO2 plant-feed buffer instead of removing all
CO2 before the greenhouse can grow. The purchased optical distribution hardware expands the modeled collector
from 6 to 24 m². Native light, temperature, power and food limits still apply.
Photosynthetic O2 goes into the existing finite oxygen reserve, using 15 kJ/mol
of the remaining 120 W processing budget; it is not vented into an already
full cabin. Saturated storage stops that portion of growth. Growth uses external stellar photons; no biomass appears
without them.

Drinking water and metabolic water enter a finite wastewater reservoir. A
120 W allocation within the served 680 W bus processes at most W×s / 25 kJ/kg,
returning 98% to clean water while the remaining water stays in a reject reservoir.
Remaining 120 W work can distill that water-only reject at 2.6 MJ/kg; mineral
nutrient remains separately accounted, not created by distillation. Blackout
stops recovery. Food shortages produce a native NO_FOOD alarm. Leaks, brine,
finite initial nutrient/seed inventory and resupply requirements mean this is
NOT a promise of infinite autonomous survival or edible-food certification.
Harvest remains explicitly modeled biomass, not automatically safe food.

## 8J: physical capture, finite thermal response and presentation

Fabricate and erect a 740 kg atmospheric capture plant through the original
8F/8E kit chain. Its source-owned installation, condition and actual ship/EVA
umbilical proximity are required. The capture command recovers only a gas whose atmospheric addition is already
inventoried in the persistent 8J reservoir. Unmeasured baseline composition is
not converted into pure material. A matching real receiving pressure vessel,
free capacity, same-world EVA, landed powered ship and planetary protection
clearance are required. <=10 kg is debited from that finite planetary species
reservoir and becomes one provenance-tracked 8A lot. Work is 2 MJ/kg plus the
ideal 293.15 K trace-dilution separation energy floor nRT ln(M_atmos/M_species).
This is an explicitly ideal separator/collector model, not a hardware-resolved
intake flow or a validated trace-gas production rate. Unknown baseline capture
and large-scale carbon sequestration infrastructure remain outside this path.

Net species mass controls mean pressure using ΔP=ΔM g/(4πR²). Actual net added
CO2 also controls illustrative grey IR optical depth (0.01 m²/kg). Stellar flux,
canonical albedo and a declared 4e8 J/m²/K areal heat capacity determine gradual
thermal relaxation, with an explicit stored-heat ledger and bounded daily
substeps. These assumptions do not constitute a validated exoplanet forecast.
No oxygen, liquid oceans, vegetation or geographic changes are invented.

Native field temperature/pressure sensors read the same persisted anomaly and
pressure increment. The atmosphere shell and near-field scattering use the
same added gas column (illustrative 1e-5 m²/kg visible scattering); IR CO2
absorption is not treated as visible green fog. Small interventions remain
below sensor resolution and visually imperceptible. Large accumulated physical
changes can affect optical opacity gradually; no visual exaggeration is used.

## Evidence

`industry-completion8k.test.cjs` tests part/fuel ownership, native rocket ascent,
water/food/nutrient mass, sustained day/night operation beyond starting food, power interruptions, original T09 persistence, finite
atmospheric capture, replay rejection, thermal relaxation and stored heat.

`industry-completion8k-browser.py` is explicitly a controlled protocol fixture:
completed source hardware, gas, greenhouse and recycler evidence are supplied
to an isolated browser profile. It exercises real desktop/mobile controls,
actual native rocket ticks, source debit, physical custody and save/reload.
It is not evidence of a full no-cheat industrial expedition or real-device GPU.
