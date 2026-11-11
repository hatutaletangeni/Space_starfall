# Orbital propulsion, baseline capture and coupled planetary climate

Open **Mission → Build → Open All Build Tools → Industrial flight, regeneration & atmospheric capture** in either standalone. The existing sounding flight, regenerative habitat and measured-release paths remain available.

## Source-paid orbital propulsion

Manufacture an **orbital_propulsion_kit** at the kit fixture. Its 85 kg inputs are steel 22, copper 12, aluminum 25, electric motor 10.8, control board 1.2, insulated wire 3, insulation polymer 9 and glass 2 kg. Output is 80 kg hardware plus 5 kg tracked scrap; manufacture uses 2600 W for 1800 s. The modeled kit adds the pump, injector, regenerative cooling, insulated tank lining and guidance to the original paid dry stage. It is a declared engineering approximation, not hardware certification.

Beside the original rig, stage and actual H2/O2 vessels, select a conditioning batch (0.1–8 kg H2, eight times that O2). Press **Condition orbital propellant batch**. Ship work is 3 MJ plus 15 MJ/kg H2 and 0.8 MJ/kg O2, with pressure-ratio compression work and a 2% source gas vent loss. Use small batches and recharge/refill through existing systems: a single ship battery cannot liquefy a whole orbital load. Every batch has an original material and electricity receipt. The kit is consumed once; actual module and liquid mass live in the physical stage.

The 3 m³ tank bounds the load using 70.8 kg/m³ LH2 and 1141 kg/m³ LOX. A 20 W modeled heat leak vents finite stored mixture using the declared vaporization heats, including while away; mass and cumulative vents persist. Select **Manufactured cryogenic orbital** and launch. Ignition uses all remaining conditioned propellant. Liftoff thrust and a preliminary delta-v budget reject unsuitable worlds. This small vehicle is appropriate to compatible low-gravity worlds; it is not a universal Earth-class launcher.

The native 0.2 s variable-mass solver applies the modeled 40 kN / 350 s nameplate. Guidance raises apoapsis, coasts, then physically burns to circularize. No position/velocity snap inserts an orbit. Negative orbital energy, safe periapsis and eccentricity must satisfy native acceptance. The original stage moves once into the launch mission; the achieved inertial state then propagates analytically as a visible orbiting vehicle, with remaining fuel and source receipts. No satellite, payload or radio battery is granted.

## Canonical baseline gas extraction

The capture plant now offers **Extract canonical baseline**, alongside recovery of measured releases. It obtains mole fractions from CW01's original seeded body composition, converts them to mass fractions using molecular masses, and budgets the baseline atmosphere from canonical pressure, radius and gravity. This is an inferred game inventory with high uncertainty, not a spectroscopic measurement.

Only species actually present may be extracted. Vacuum-compatible moons, absent species, protected native-life/archaeological worlds, incompatible receivers, overpressure and full storage are rejected. The manufactured 740 kg plant has a 400 m³/hour baseline intake bound. Each batch pays 2 MJ/kg plus dilution separation and ambient-to-vessel pressure-ratio work. Finite species depletion, source time, composition version and actual receiver ownership persist. Repeating a receipt or rapidly clicking without intake time cannot create gas.

Baseline extraction can make the planetary pressure delta **negative**. The same signed mass balance includes added gases, recapture, baseline removal, escape and water-vapor phase changes. Old schema-1 positive-only saves remain loadable. Pressure release after prior depletion preserves that balance.

## Coupled planetary climate

The numerical kernel has since been upgraded and benchmark-verified; see [the validation report and forecast limits](CLIMATE-VALIDATION.md).

The runtime uses 24 equal-area latitude bands with seasonal forcing, finite surface and deep-reservoir heat, conservative inter-band transport, greenhouse forcing from net CO2/CH4 changes, water-vapor/cloud feedback, ice albedo and finite liquid/ice/vapor reservoirs. Phase changes carry latent heat. Below the water triple-point pressure condensate is ice, not a newly created ocean. Accessible water is a declared upper-layer prior capped at 1000 kg/m² and the original CW01 bulk water inventory, not infinite water or an industrial stock grant.

An evolving control accompanies each intervention so zero industrial intervention produces exactly zero change to legacy temperature/pressure/cloud/ice presentation. Surface/deep sensible heat and latent heat reconcile against net radiative work. Radiative forcing constants (including 5.35 W/m² logarithmic CO2 scaling) are approximate game parameters; extrapolation to alien atmospheres is uncertain. Introduced gases can escape through a bounded Jeans-tail approximation with a separately limited stellar-XUV work budget. This is not a calibrated general circulation model or a claim of real planetary habitability.

Simulation uses <=3600 s substeps and at most four daily catch-up chunks per frame per world. Saved canonical input snapshots permit distant/cache-evicted worlds to continue without regenerating geology. Native weather and field sensors use the same persisted pressure/temperature deltas. Cloud opacity and cosmetic ice tint follow those reservoirs; haze uses the actual gas column. Collision terrain, landmarks and native ecosystems are unchanged. Tiny interventions stay visually tiny.

## Evidence and scope

`orbital-baseline-climate8k.test.cjs` checks source-paid native bound orbit, conditioning/battery/kit rollback, boiloff mass, signed baseline extraction and replay, absent gases, throughput, zero-intervention compatibility, heat/water closure, daily/hourly equivalence, save continuation, finite escape, cooling under capture and low-pressure water phase.

The desktop/mobile browser protocols exercise original UI conditioning, source custody, native orbital integration, baseline capture and reload. They explicitly supply manufactured hardware and refill/recharge fixtures; they are **not evidence of a complete unassisted expedition or physical-phone/GPU performance**.

Physical reference material, used for model structure rather than validation:

- [NASA: ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/)
- [NASA: specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/)
- [NASA: climate and Earth's energy budget](https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/)
- [NASA ISCCP: cloud, radiation and water feedback](https://isccp.giss.nasa.gov/role.html)
