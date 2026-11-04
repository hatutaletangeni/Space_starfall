# STARFALL 8E — Natural silica to qualified SiO₂ (next vertical slice)

**Status:** Experimental playable source path; **not** complete industrial feedstock economy.

## The real linked route
1. Scan an 8C quartz/silica-bearing body. Mining via 8D depletes an existing finite deposit and creates a provenance-bearing `silica` lot in the truck hopper.
2. Drive and physically haul at least 20 kg to the ship material hold.
3. Under **Engineer → Refinery**, choose **Silica beneficiation**. A 20 kg batch uses 1.5 kW over 130 simulated seconds. Recovery is 82% of the measured silica mass, with a 95%-grade `silica_concentrate` lot and an explicit `silicate_tailings` lot. Matter is conserved.
4. Select **Quartz concentrate polishing**. A 4 kg batch is only allowed from an authentic preceding 8E processing lot (provenance `process:refine8e:`) with certified `grade >= 0.95`. This consumes 4.2 kW over 160 simulated seconds. It recovers 82% of source silica and yields 99%-grade `silicon_dioxide`, with a second explicit physical tailings lot.
5. A separately installed glass furnace, consuming separately metered ship power, can run the already existing atom-balanced SiO₂→glass process using real 8A stock. Choose a 25, 50 or 100 mol input batch from **Engineer → Chemical Plant Control** to match the actually available SiO₂ lot; one 4 kg polishing batch provides enough input for 25 mol of glass feed. Fixed machine time and energy per batch are simplified setup overhead, not validated proportional kinetics.
6. Products and residues remain tracked in real ship containers. The model does not create iron, aluminum, electronic silicon, silicon metal, mortar or electronics.

## Assay and mass examples
With 20 kg `silica` at 70% silica content, the first batch yields 12.0842105263 kg at 95% grade and 7.9157894737 kg tailings. Polishing a 4 kg portion of that concentrate yields 3.1474747475 kg of 99%-grade silica dioxide plus 0.8525252525 kg additional tailings. Total mass remains 20 kg across both jobs. Total battery work is 195 kJ + 672 kJ (plus any downstream glass processing).

## Important scientific limitations
The model assumes the 8C silica assay denotes a SiO₂ target mass fraction and that a simplified mechanical/polishing unit can increase grade to 99%. The source 8C survey itself estimates, not measures, mineralogy; it cannot prove exact elemental chemistry in real life. Purification yields and work budgets are **educational approximations**; they are not validated thermodynamic, metallurgical or equipment design.

99%-grade `silicon_dioxide` is **not** silicon metal; it cannot automatically become PV-grade or semiconductor-grade silicon. No acid, flux, cooling-water or reagent system is being silently conjured. Continued work must introduce genuine reagent production, safe gas handling and reduced/elementally balanced metal purification from identified ore with real heat and equipment before declaring complete end-to-end industry.

## Verification gates
- `tests/silica-chain8e.test.cjs`: sequential beneficiation → polishing → element-balanced glass furnace, exact mass conservation, real 8A provenance gate, battery work, duplicate prevention.
- `tests/refinery8e.test.cjs`: all five refinery recipes including preserved stock grades and finite energy.
- CI rebuilds a single-file standalone and checks script/stylesheet self-containment; actual WebGL2, GPU performance, old save migration and full in-game sample collection still require browser acceptance.
