# STARFALL 8E/8F — Aluminum from mined aluminosilicate and basic frames

**Status:** draft educational industrial model, NOT validated alumina metallurgy.

The next complete game-data chain uses **finite surveyed 8C aluminum_ore** from an 8D excavation, a live ship 8A hold and battery-metered processing:

1. Run Aluminum ore beneficiation on 20 kg ore. The reduced-order separator produces a 65% mineral concentrate using an 80% recovery factor and explicit tailings (2100 W × 160 s).
2. Run Identify hydrated aluminosilicate mineral on 2 kg of previous 8E concentrate at >=65% assay. The model yields a chemically named, grade-1 Al₂Si₂O₉H₄ mineral and more residue (3300 W × 240 s); unprovenanced concentrates are rejected.
3. Install a mass-bearing reduction furnace with a calcination tray and connect it to a landed powered ship. The idealized balanced equation is Al₂Si₂O₉H₄ → Al₂O₃ + 2 SiO₂ + 2 H₂O. All three products enter the real ship material hold. No atom or mass is created.
4. Provide a separate physical high-temperature cell, carbon from an actual ore extraction + recovery job, and rated CO₂ storage. Run the previously existing atom-balanced Al₂O₃ carbon-anode electrolysis to make aluminum plus captured CO₂.
5. New 8F fabrication recipes turn **2.1 kg of 8E aluminum into 2.0 kg aluminum_frame +0.1 kg tracked scrap**, or 1.0 kg aluminum into 0.95 kg aluminum_sheet +0.05 kg scrap. `aluminum_frame` is an input to the existing `solar_module` recipe, which still requires its independently sourced PV cells, encapsulants, wiring and other parts.

## Scientific fidelity limits

The stage deliberately distinguishes chemical atom balance from an *achievable industrial separation*. Real alumina production from kaolinite-like aluminosilicates cannot be done by simply calcining the mineral into isolated pure Al₂O₃ and pure SiO₂. It requires digestion/leaching, separation, thermal treatment, caustic recovery, real reagent/waste accounting, heat-transfer equipment and real phase equilibria; those systems are **not** implemented. The current 8C ore grade is a synthetic mineral abundance estimate, not a certified laboratory assay. This is an educational placeholder for a future full reagent-balanced refinery, never a verified process engineering design.

Likewise high-temperature aluminum electrolysis is a simplified material- and energy-balanced game batch, not accurate Hall–Héroult electrolytic bath physics or an anode replacement hazard model.

## Quality gates

- `tests/aluminum-chain8e.test.cjs` runs real finite 8A ore/carbon lots through both refinery stages, a physical furnace, modeled alumina and silicon dioxide, a separate high-temp cell, and captured CO₂. It verifies 30 kg total mass conserved, energy and receipt checks, missing pressure vessel and provenance rejection.
- `tests/refinery8e.test.cjs` covers 10 refinery modes.
- `tests/stock-parts8f.test.cjs` now exercises both new aluminum frame/sheet recipes alongside the 8F press toolchain, scrap and energy.
- Full GitHub Actions rebuilds one offline HTML from the current feature-branch source; interactive browser/GPU play testing and older-save migration still need separate acceptance.

The existing steel, copper, silica, industry kit and physical machine workflows are not removed. Stable main is untouched.
