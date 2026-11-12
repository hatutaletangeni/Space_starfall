# STARFALL 9A — Living Biosphere (feature-branch release candidate)

This slice **extends** the existing 6H seeded ecological sites rather than replacing them.
The living solver owns local 100 m² conceptual patches, while 6H retains its stable ecology IDs,
site positions, evidence and survey journal. Existing planets, biome IDs, terrain collision,
ruins, ship, truck, greenhouse/T09 habitat and original resource inventories remain unchanged.

## Opening it in the game

Land on a biologically plausible solid world. Open **Mission → Explore → Ecology**,
select a nearby signal, and inspect its **Living Patch** readout. It displays biomass,
living grazer/predator individuals, soil fertility, water, oxygen/carbon dioxide, detritus,
births, deaths, predation and feeding totals. Advance simulation time; animals can
grow, breed, starve, age and be eaten. Model-backed individuals reuse low-poly 6H
creature meshes (including size differences) and are capped by the existing 18-draw limit.

Each patch is deterministic from the unmodified galaxy seed, body ID and ecology site ID.
When first visited, a patch begins with a finite inventory. Subsequent local evolution
advances in **fixed 600 s simulation ticks**; at most 12 steps per visible patch call,
and no more than 96 in a direct model call. Catch-up is explicit rather than silently
skipping long time intervals. Only bounded local patch deltas (max 80) are saved under
the existing \`ecology6h\` key; existing survey records and notes are preserved.

## Fidelity and limitations

- Real approximate stoichiometric local transfers: **CO2 + H2O ⇄ CH2O + O2**.
  Photosynthesis requires light, carbon dioxide and water; feeding transfers actual
  biomass; decomposers mineralize detritus, using oxygen; no free material source.
  Nutrient and fertility quality are *dimensionless proxies*, not a complete
  geochemical model. Solar energy is a free external input as it should be.
- Existing CW01 atmosphere, Field Science world profile, biome moisture and
  available star luminosity/orbit inform seeded habitability, complexity, species
  count and rare intelligence *potential*. Stellar physical units have legacy game
  compatibility limitations. Non-Earth chemistry is not biochemically validated.
- These are **local** atmospheric parcels. They **do not** debit or add globally
  tracked atmospheric mass in 8J, and do not change atmospheric pressure or
  industrial materials. A future adapter should reconcile native ecosphere flux
  with the canonical planetary atmosphere **without double-counting**.
- The 6H ecosystem sites and biomes still determine initial candidate locations.
  This does not yet populate ocean-floor or gas-giant habitats. Ice moon life
  is a rare **subsurface potential only**, not rendered on an exposed vacuum surface.
- Plant growth/death affects the living site's rendered producer mesh; older scenic
  world vegetation is still decorative and not yet bound to patch biomass.
  Creature appearance reuses 6H meshes rather than new species-specific rigged assets.
- Intelligence tier is a seeded *potential*, not emergent language, culture or
  sophisticated AI. Only local food-web behavior is simulated.
- No full GPU/desktop/mobile playtest has been completed in this environment.
  A merged release requires standalone rebuilding, real WebGL2 checks, all baseline
  tests and a save/reload walk-through on both desktop and touch.

## Tests

\`\`\`bash
node tests/living-biosphere.test.cjs
node --check src/ecology/living-biosphere.js
node --check src/ecology/ecology-ui.js
node --check src/engine.js
python tools/build-standalone.py
python tests/standalone-parity.py
\`\`\`

Model test currently confirms stable seeds, fixed-step chunk invariance, finite
inventories, approximate local mass balance and invalid-state rejection.
The new integration routes, save/load and GPU rendering remain **NOT VERIFIED**
until the repository CI/browser gates actually pass.

## Rollback

Switch back to \`main\` or revert the feature commits; the original 6H
\`ecology6h.records\` schema remains valid and undiscarded. New \`biospheres\`
are an additive field that older clients ignore.
