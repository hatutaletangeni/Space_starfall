# STARFALL 8I–8J — conservation-first integration slice (2026-11-09)

**Decision: DRAFT / NOT RELEASED / NOT COMPLETE.** This document describes a *narrow, playable source-owned vertical slice*, not the accepted complete Update 8A–8J or Update 8K. The canonical source remains the user's Update 8 Master 00 and 8A–8K specifications. Do not merge this branch into stable before original main's exact-head regression gates and a real two-world no-cheat expedition pass.

## Code ownership and player entry

- `src/physics/manufactured-eclss8i.js` runs zero-crew, first-order ECLSS on the **same** `physical8a` manufactured `habitat_envelope` after its original finite `habitatCharge8g` receipt. It reuses the original `StarfallHabitatT09` ideal-gas/temperature model. There is no second atmosphere owner.
- `src/physics/terraform-operations8j.js` removes the real **original 8A** `carbon_dioxide` lot from an installed, rated, same-world `industrial_vessel` and records the tiny atmospheric delivery under `terraformOperations8j.worlds[originalBodyId]`. No new world IDs or terrain changes.
- `src/flight.js` owns the authoritative physical asset and material snapshots, a safe saved transaction, actual `ship-main:engineering-battery` draw, and the selected real body profile. A missing ship power source, EVA proximity or gas lot refuses the action.
- `src/physics/environment-ui8ij.js` puts local habitat and world sensor controls inside the existing UI21 **Engineer** workspace: **Mission → Build → Open all Build Tools → Local environment 8I/8J**. This is not a new top-level UI.
- A source/standalone builder rebuilds both `PLAY-STARFALL.html` and `PLAY-STARFALL-MOBILE.html` on the draft branch; do not use an older standalone for verification.

## Source-conservation models

**Habitats:** Finite 25 m³ pressure shell. At temperature T the actual stored gas partial pressures obey `p_i = n_i R T / V`, with `R = 8.314462618 J mol⁻¹ K⁻¹`. `oxygenMol × 0.031998 kg/mol`, `inertMol × 0.028014 kg/mol`, `carbonMol × 0.04401 kg/mol` and absorbed `filteredAirMol × 0.04401 kg/mol` remain mass-bearing within the real manufactured physical asset. The initial 80 kg manufactured ECLSS rack contains at most a *modeled capacity* of 60 mol CO₂ capture, not infinite replacement filters. Manufacturing or charging the shell is never silently repeated. Commissioning debits **250,000 J** from the original live ship battery. A modeled powered service interval debits **680 J/s** for T09 electrical/thermal/pump operation. The water pump measures `min(waterKg, 0.002 kg/s × dt)` circulation of already-present clean water; this is **not wastewater conversion**. Gas venting lowers actual asset mass and updates persisted cumulative vent mass. Brownout causes passive leakage without claiming power or oxygen production.

**Planet intervention:** 8J accepts only a positive pulse of **≤0.5 kg source-owned CO₂** per operation, requiring a real installed and healthy rated CO₂ vessel, matching original 8A gas lot, original world ID, EVA valve range, actual landed ship and **5,000 J** debited from the original ship battery. A unique source+world+operation receipt prevents replay. Spherical global mean pressure is `P = M g / (4πR²)`, so a new tiny gas pulse gives `ΔP = ΔM g/(4πR²)`. Baseline pressure and temperature come from the existing canonical local `StarfallMeteorologyLW03.base(body, seed)` model, which reads the CW01 composition and original field-science climate prior; body radius and surface gravity come from `StarfallPhysics.scienceProfile`. The separate stellar equilibrium-temperature estimate may disagree with modeled local field temperature because legacy visual star/orbit scales are not fully SI-compatible; the conflict is disclosed, not resolved by reseeding worlds. No new body is generated. Injected CO₂ escapes at the *fictional/simplified procedural* atmospheric e-folding time of `10^8 s` while preserving tracked injected+escaped mass. Global temperature effect is clamped to **zero** for these small releases: they do not magically green the planet or produce observable global warming. Readout has stated **±0.5 Pa pressure** and **±0.5 K thermal** uncertainty; modeled sub-resolution pressure changes are identified as such. CW01 vacuum worlds, bodies with seeded native life, known archaeological ruins and unsuitable gravity/temperature/pressure are blocked.

## Explicit scope limits and hazards

- **8I is not complete:** no occupied human-rating, food/metabolic carbon custody, greywater recovery, greenhouse crops/nutrients, independent wired outpost power or long-duration remote ECLSS clock. The ship umbilical is the original finite Joule owner; service intervals are bounded ≤3600 sim seconds and manually settled. T09 old tutorial habitat allowances are not imported into newly manufactured shells.
- **8J is not complete:** no physically commissioned dedicated global-scale terraforming plant, continuous industrial emissions, optical/cloud/albedo integration, climate response, radiation/magnetic retention model, reservoir import, biosphere protection permit interface or full atmosphere chemistry. A small genuine CO₂ vent does *not* fulfill planetary terraforming acceptance by itself.
- **8G, 8H remain blocking:** physical manufactured rocket stages still require fuel and validated launch manifests; new vehicle commissioning and second-world cargo must be proved end-to-end; production-chain remote clocks, waste/leakage and old-save exhaustiveness remain incomplete. All these continue to gate Update 8K.
- This software is an engineering *game model*, not an environmental or pressure-vessel safety specification. Real GPU performance on end-user hardware remains NOT VERIFIED.

## Reproducible verification gates

```bash
node tests/industrial-environment8ij.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/industrial-environment8ij-browser.py
```

The browser test uses real offline Chromium/SwiftShader UI22 and **negative/no-mint** player actions. Its success does NOT prove a fully played no-cheat production mission. All original Node suites, browser UI/flight, truck X/ramp, science rover, galaxy count, 1×/10×/100×, camera, satellites, old saves and consumer-GPU visual evidence must pass against the exact head before any stable release.
