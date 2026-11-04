# STARFALL Update 8E — iron oxide, carbon and steel

Release state: **feature-branch experimental processing**, not a complete verified industrial economy.

## Gameplay path
1. Survey, mine and transport iron-bearing rock (`iron_ore`) from a real finite 8C/8D deposit into the physical 8A ship hold.
2. **Engineer → Refinery → Iron ore concentration** processes a 20 kg ore lot with 180 kJ and 100 simulated seconds. Iron-bearing content determines the 60% Fe-concentrate quantity; tailings retain residual material.
3. **Engineer → Refinery → Identify and recover hematite** uses 2 kg of real, prior-8E-produced `iron_concentrate` of 60% Fe assay or better. It yields chemically identified 100%-modeled Fe₂O₃ (hematite) and `iron_mineralogy_tailings`, drawing 768 kJ over 240 seconds. Elemental Fe recovered is the input Fe mass ×80%. The output Fe₂O₃ mass is recovered Fe mass divided by Fe₂O₃'s 69.942% iron fraction. Oxygen is accounted as already contained in the original mineral; source+product+tailings bulk mass is unchanged.
4. Mine and transport separate `carbon_feed`; **Engineer → Refinery → Recover carbon from carbon-bearing rock** processes a 10 kg lot with a measured carbon grade, 80% carbon recovery, and explicit `carbon_ash_tailings`. This consumes 598 kJ over 230 seconds.
5. Physically construct a furnace with the previously defined `plant_kit_reduction_furnace`; place a distinct pressure-rated carbon monoxide vessel from `vessel_kit_carbon_monoxide`. The capture tank is not optional, because CO is toxic and atmospheric venting cannot be treated as free disposal. Both installations consume real finished kits and ship energy and have normal geometric clearance rules.
6. **Engineer → Chemical Plant Control → Hematite reduction**, select a batch size that fits actual source stock (5 mol is a practical first batch): `Fe₂O₃ + 3 C → 2 Fe + 3 CO`. The reaction validates atom balance, pure and physically held reagent masses, mounted furnace, captured CO tank volume/pressure, unique receipt and paid energy.
7. **Engineer → Chemical Plant Control → Iron-carbon alloying** runs `99 Fe + C → Fe99C` as an *idealized compositional alloy model*. Select **0.1 mol** initially if you have about 0.56 kg Fe. The same installed furnace must have its alloy crucible. It produces a certified *game inventory* steel lot, which can supply existing 8F `beam`, `gear` and other physical BOMs if the separate correct tools and enough mass are available.

## Example conservation
From 20 kg mined iron rock at 35% Fe:
- Iron concentration: 9.3333 kg of modeled Fe-concentrate at 60% Fe, 10.6667 kg iron tailings.
- Treat 2 kg of that concentrate: 2 kg ×0.60×0.80 = 0.96 kg **elemental Fe retained in hematite**. Because pure Fe₂O₃ is only ~69.94% Fe, it makes ~1.3726 kg modeled hematite and ~0.6274 kg Fe-bearing residue. That explicitly accounts for oxide oxygen; it does not magically convert 0.96 kg iron into 0.96 kg Fe₂O₃.
- Another finite 10 kg carbon-bearing rock sample at 20% C produces 1.6 kg pure modeled carbon +8.4 kg residue.
- Reducing 5 mol hematite consumes ~0.7984 kg Fe₂O₃ and ~0.1802 kg C, produces ~0.55845 kg Fe and ~0.42015 kg captured CO.
- A **0.1 mol** theoretical Fe99C alloy consumes ~0.5528655 kg Fe and ~0.0012011 kg C to yield ~0.5540666 kg steel. Some iron/carbon remains for further batches.
- **Total** persistent 8A lot mass (ship hold plus actual CO tank) stays at 30 kg, minus no free waste vent or loss.

## Scientific limits and next steps
- The 8C **iron_ore** deposit classification is a coarse synthetic survey; the model *assumes* that the iron concentrate contains hematite-compatible oxygen and rock chemistry. Real hematite versus magnetite/laterite needs mineral assays, XRD, redox and sulfur contamination data. The rock may contain iron in phases for which this assumed oxide yield is not physically justified.
- Grade, extraction energy and recovery factor are gameplay estimates. 8F “steel” is a simplified compositional inventory material; actual grade, carbon uptake, casting thermal requirements, mechanical properties, tensile strengths, heat treatment and safety equipment are NOT modeled in detail.
- Submole furnace batch options are deliberate to process finite real lot quantities without demanding tonnes. Reaction energy and duration are per setup cycle gameplay budgets and are not proportional full thermodynamics.
- The *copper* deposits are explicitly sulfide-bearing. They must **not** be silently fed into the CuO reduction reaction; copper roasting needs real oxygen and sulfur dioxide capture. That is the next metallurgical dependency.
- Every input and equipment kit remains finite and physically owned. Some furnace, gas-vessel, motor and electronics components still lack a complete mined-resource-to-component path. Browser/WebGL2/old-save verification is separate from model and CI checks.

## Regression
`tests/iron-steel-chain8e.test.cjs` runs 8D-like real shipped ore and carbon lots through both 8E refinery stages, reduction with CO capture, and steel alloying, checking 30 kg total mass, Fe recovery, realistic oxide mass, paid energy, output grade, fake-provenance rejection, absent carbon rejection, idempotent operations. `tests/refinery8e.test.cjs` now runs all seven modes; prior quartz, gas, kit and manufacturing model suites remain in GitHub Actions.
