# STARFALL Update 9D — Living Creatures, Four-Sail Fauna & Active Ecosystems

## Reference and intent

The reference is the user's provided **The Aurelius System(1).html** and screenshots. The reference's source implements organism *classes* rather than simply decorative species: Aurorith (\`aur\`) absorbs light/CO2, filter feeds, evades predators and extends four membrane sails; Void Lurker (\`lur\`) hunts airborne prey; Stiltgrazer (\`grz\`) grazes, herds and flees; Ridge Stalker (\`stk\`) stalks with stamina-limited sprints; Dustworm (\`wrm\`) consumes litter and burrows; Lumen Jelly (\`jel\`) rises at night/descends by day and filter feeds; Tide Eel (\`eel\`) hunts jellyfish. Their world variants include Cloudwhale, Storm Ray, Frost Balloon, Whirl Ray and others.

9D **adapts those principles** to the existing STARFALL-native WebGL2 renderer and finite 9A biology; it does **not copy the Three.js dependency or import the Aurelius model meshes/code**. The objective is recognizable *behavioral and anatomical diversity* while keeping STARFALL as a zero-network offline game.

## New appearances

- **Aurora sailer** (\`aurora\`): translucent purple/lilac four-sail body with subdivision lattice, visible glowing struts, eight segmented luminous tail beads, beating heart and digestion sac. Sails flap in the existing GPU wing-deformation shader, now driven by real 9C aerodynamic state. This is the explicit adaptation of the first image.
- **Flying drifter** (\`flier\`): smaller two-winged aerial forager using the same force-based flight.
- **Grazer** (\`grazer\`) and **crawling grazer** (\`crawler\`): moving, gait-deforming plant consumers with visible anatomy.
- **Ridge stalker** (\`stalker\`): distinct quadrupedal animal with spines and glowing eyes; a real 9A predator.
- **Detritus worm** (\`burrower\`): segmented body/legs, animated undulation and near-ground burrowing; consumes **finite patch detritus**.
- **Luminous medusa** (\`jelly\`): pulsating bell with a dozen trailing filaments, water-column movement, heart and digestive sac; eats finite aquatic producer biomass.
- **Aquatic eel** (\`eel\`): long animated chain and dorsal fins, moves through coastal water and can hunt real filterers.
- **Microbial and spore producers**: breathe/pulse visibly while growing, without invented hearts/stomachs.

All meshes and organs are generated **once** and reused. No new image textures, remote dependencies or runtime mesh allocation are required. Existing draw caps (18 actors), distance culling (240 units), organ distance (115 units), and partially transparent skin rendering are retained.

## Behavior and environment

New \`src/ecology/locomotion9d.js\` integrates a finite 30–50ms near-field locomotion state by stable creature ID, with velocity, heading, gait and behavior. Rather than the previous extremely slow (300–450s) cosine loops, individual creatures actually travel, turn, forage and respond to their surroundings.

- Grazers seek vegetation, graze while advancing slowly, form loose herds, avoid explorers and flee stalkers.
- Stalkers patrol, seek vulnerable prey and pursue it; actual prey death and energy transfers remain decided by the finite 9A population model.
- Burrowers target litter, undulate and partially submerge while decomposing it.
- Jelly/filterers pulse through coastal water and change swimming depth with light.
- Eels hunt the finite aquatic filterer population.
- 9C flyers forage at lower altitude, climb higher when alerted and steer away from nearby explorers; aerodynamic lift/drag/thrust remains authoritative.
- Physical locomotion checks sampled local terrain/water biomes before moving; no instant relocation through a cliff, shoreline or inaccessible water.
- Stationary spore/producers visibly swell and contract.

The visual behavior state is ephemeral near-field animation. 9A living populations own real biomass, finite plant/detritus/water/CO2/O2 reservoirs, finite predator capture, birth/death, photoassimilation and energy transfer. A subset of *Aurora sailer* flyers are **mixotrophic**: they use the same 9A CO2 and water reservoirs to photosynthesize finite new organic mass that is transferred to their actual animal mass, without free mass. 9A persistence schema stays at **1**; old saves remain loadable.

The ocean is still a stylized LW04 fixed sea surface. Jelly/eel swims are below this surface and above sampled terrain. This is **not** full underwater CFD or school-level predator coordination. No fantasy species are claimed scientifically verified.

## Performance budgets and time warp

- At most 18 ecological actors visible, with one shared GPU mesh per species, shared organ meshes, and no new runtime texture uploads.
- Creature locomotion budget: at most **8 fixed 0.05s steps** per actor/frame, with a local position radius <=34 display units; movement state cache capped at 64.
- 9C aerial flight: at most 14 fixed 1/30s steps/actor/frame, state cache 36.
- On long 8s time jumps the *visual* local movement pose resets deterministically; real 9A biomass and save progression are not rolled back.
- The physics-to-visual scale remains approximate: STARFALL celestial scene units are a legacy 1000 m/unit compatibility map, whereas creature-local animation uses character-scale metres.

## QA and reproducible verification

\`\`\`sh
node --check src/ecology/locomotion9d.js
node --check src/ecology/ecology-ui.js
node --check src/ecology/living-biosphere.js
node --check src/engine.js
node tests/living-biosphere.test.cjs
node tests/aerodynamics9c.test.cjs
node tests/ecology9d.test.cjs
node tests/ecology9d-scene.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/ecology9b-browser.py
python tests/aerodynamics9c-browser.py
python tests/ecology9d-browser.py
\`\`\`

Browser tests run *real* STARFALL WebGL2 + SwiftShader using the generated desktop and landscape-mobile standalones. They capture actual skin translucency, wing-deformation, internal organ, gait and pulsing draw calls plus screenshots. These are software-rendered CI screenshots; they are **not hardware FPS validation**. Real-machine acceptance requires a foreground Windows/Android playtest at a seeded biological world, with performance and visual inspection, especially the purple sailer.

The upload is a **visual/behavior reference**, not a replacement project or authority over STARFALL's resource/planetary science models.

## Release build state

Desktop and landscape-mobile single-file standalones were regenerated from these exact source files by the 9D CI pipeline. Release acceptance additionally requires all repository regression checks against the synchronized bundle commit.
