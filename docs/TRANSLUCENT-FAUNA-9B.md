# STARFALL 9B — Winged Fauna and Transparent Anatomy

9B enhances the existing 6H/9A local ecosystem, including both offline standalones, without changing planetary resources, established site IDs, or the 9A persistence schema.

## What a player sees

On a landed world with a tier 3–4 living biosphere, open **Mission → Explore → Ecology**. Use the local candidate list and the **Living Patch** readout to find populations. It now lists **flyers** separately from land grazers and predators. Search nearby biological sites in the open landscape: winged creatures move in three dimensions, hovering and gliding several scene units above sampled terrain while their low-poly wings flap.

Living creatures are translucent. A pulsating red/pink **heart** and amber **stomach / digestive sac** are visible inside grazers, predators/crawlers and flying foragers when viewed at close range (up to 115 scene units in the renderer). Stomach inflation is influenced by the recent feeding status. Living microbial/spore/producers are translucent but have **no animal heart or stomach**; mineral traces, nests and fossils stay opaque.

## Real ecosystem link

Flying nectar/plant foragers are a separate persisted agent role, `flier`, not merely a cosmetic mesh. If atmospheric pressure and biosphere complexity permit, seeded flier sites populate two aerial foragers; other local sites sometimes host flying visitors. Their mass, food intake, energy, aging, respiration and reproduction use the existing finite-resource 9A solver. Carnivores may also hunt flyers. Predator capture is protected against the already-killed prey being processed later in the same ecology step.

Their positions are deterministically derived from stable individual IDs and simulation time. A fixed altitude-offset with oscillations and cyclic horizontal motion is a lightweight flight approximation; these are **not** full aerodynamic, migration, AI pathfinding or behavioral flocking simulations.

## WebGL and performance

The existing mesh program accepts an opacity uniform (initialized to **1** for all normal scene geometry) and a flier-only vertex wing phase (initialized to **0**). Organ meshes are created **once** for the whole scene, not for every creature. For nearby living animals, the renderer draws the opaque organs with normal depth testing, followed by blended translucent skin with depth writes disabled, then explicitly restores depth writes and shader uniforms.

The existing **18 ecological actor** limit remains; nearby animals add at most two organ draws each. Organ drawing is culled beyond 115 scene units; actors beyond 240 units are culled. No textures, network requests, additional JavaScript dependencies or extra save-state fields are needed.

## Verification and limitations

Automated integrity: `node tests/living-biosphere.test.cjs`, `node --check` for source files, desktop and mobile standalone build/parity, plus baseline repository CI. The added assertions cover aerial forager spawning, mass conservation, deterministic restart, and persistence validation.

Visual output still requires real WebGL2 desktop/mobile checks. Since the anatomical organs are intentionally stylized, alien physiology is not claimed to be scientifically validated. A complete cross-planet migration model and realistic aerodynamics are future work.
