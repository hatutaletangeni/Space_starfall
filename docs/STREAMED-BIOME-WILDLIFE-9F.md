# STARFALL Update 9F — Streamed Biome Wildlife

**User request:** continue improving lifeforms beyond ecological survey sites, across forests, plains, waters and sky.

## What changed

The previous 9A–9E release provided persistent, chemically closed **living patches** at 6H ecological sites but large spaces between them could contain no living fauna. Update 9F adds a separate **non-harvestable, visual encounter stream** anchored to the same planet-fixed cubemap. Nearby wildlife remains consistent when the viewer changes direction or retraces their steps, and groups move using the existing 9C and 9D force/locomotion systems. This does not invent new resources or alter planetary gas, atmospheric balances, industrial inventories, or the 9A living-patch population.

### Encounters

- **Canopy, forest, shrubs and fungal biomes:** walking grazers, arthropod crawlers, occasional hunting stalkers, wandering detritivore/burrowers and translucent four-sailed aerial organisms.
- **Ocean surface and water columns:** pulse-swimming jellies and predatory eels. Only water materials allow aquatic populations.
- **Air:** flyers require sufficient ambient pressure and a biologically viable world. Flight uses the 9C lift, drag, thrust and gravity integrator; wings and bead-like tails animate on the existing WebGL shaders.
- **Inhospitable planets:** no complex wildlife if 9A reports no life, an inaccessible subterranean biosphere, or insufficient complexity. No animal spawning in dead moons, airless deserts or sterile terrain.
- **Behavior:** 9D animals seek forage, approach herds, respond to predators, avoid players and steer around terrain. Jellies change depth during day and night; fliers bank and climb. Existing real 9A food web continues independently.

## Architecture

The new `src/ecology/biome-wildlife9f.js` is a pure deterministic planet-fixed cubemap enumerator. It reuses `StarfallEcology.cell()/cellDirection()/arc()/offset()`, `StableTerrain.faceDirection()` and the actual `StarfallBiomes.classify()` function; IDs derive from the immutable body, seed, face and cell indices.

On each landed world, `StarfallEcologyUI.scene()` calls the existing living patch renderer first. If there is capacity it fills remaining slots with nearby biome organisms. The 9F candidate list is recomputed only when moving more than 24 scene units or changing planets, instead of sampling dozens of cells per animation frame. The existing total **18-living-and-ecology-actor renderer budget** applies to both systems. Encounter candidate enumeration caps at 12 individuals, and both temporary animation caches cap at 24 states. No new shaders, remote assets, textures, browser requests, or arbitrary per-frame mesh allocation are required.

A creature retains a fixed seeded cell ID as the viewer travels. Its immediate motion state is kept in memory while nearby and starts again from its deterministic seed if you leave a region for long enough. The underlying species presence/location remains planet-fixed.

The Explore → Ecology panel displays the number of nearby visual wildlife encounters **as unverified possibilities**, separate from instrument-confirmed ecological records and the finite persistent 9A living patches.

## Run the tests

```shell
node --check src/ecology/biome-wildlife9f.js
node --check src/ecology/ecology-ui.js
node tests/ecology9f.test.cjs
node tests/ecology9f-scene.test.cjs
node tests/ecology9e.test.cjs
node tests/ecology9d-scene.test.cjs
node tests/living-biosphere.test.cjs
node tests/aerodynamics9c.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/ecology9d-browser.py
```

The first test verifies land/water gating, sterile worlds, deterministic cell IDs and cubemap seams. The second executes the **actual 6H Ecology UI scene adapter** with no ecological survey sites and confirms land and water wildlife move and animate without creating a 9A persistent food ledger. The CI workflow additionally rebuilds offline desktop and landscape mobile editions and invokes real software WebGL2 browser visual tests.

## Play in STARFALL

Load `PLAY-STARFALL.html` (desktop) or `PLAY-STARFALL-MOBILE.html` (mobile landscape). Explore a tier-3 or tier-4 biologically viable planet and land outside the ship. Move through different terrain regions, including forest and shorelines, and observe animals away from specifically mapped 6H sites. In **Mission → Explore → Ecology**, check the biome wildlife count. Follow animals over several seconds to observe foraging, predator flight, body pulses, membrane flapping, turns and swimming. Return to the same region to inspect stable spawn locations.

## Important limits

The streamed encounters are **not** durable counted animals in the 9A finite material ledger. Their encounters do not award calories, generate oxygen, consume stored carbon, kill persistent 9A animals, create survey records, or provide mining resources. They are visible biome wildlife for exploration. Region migration, species-specific real-time predation mass transfer, breeding/settlement, persistent per-individual travel histories, creature interaction commands and independently simulated planetary ecosystems remain unimplemented. The original 9A local patches continue to own real conservation and life-cycle accounting. This is not an ecologically validated model or a species-level aerodynamic simulator.

CI screenshots and FPS reflect software SwiftShader, **not** a player's actual graphics hardware. Final device playtesting is still necessary.

## Backout

This is additive and does not migrate or rewrite the saved 9A / 9E ecology data. Disable 9F by omitting the `biome-wildlife9f.js` script, or revert the 9F merge; the existing 9A–9E ecological site actors remain functional.
