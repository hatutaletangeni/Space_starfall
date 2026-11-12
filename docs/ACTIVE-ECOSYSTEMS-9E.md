# STARFALL Update 9E — Living Ecologies / Aurelius Behavior Fidelity

The supplied **The Aurelius System(1).html** is the behavioral *reference*, not a direct third-party engine dependency. We compared the uploaded source's seven base animal families and the species-variant factory with the existing 9A–9D STARFALL systems.

## Reference comparison

The Aurelius System implemented a centrally integrated species table \`SP\`: 

| Reference class | Behavior in the uploaded file | STARFALL 9D/9E counterpart |
| --- | --- | --- |
| \`aur\` / Aurorith | Photosynthesis, sails opening with light, plankton filtering, flee from aerial hunters, chase sunrise | \`aurora\` four-sail phototrophic flier with 9A paid source CO2/water and 9C aerodynamic lift. On-lightness is styled visually; full planet-rotation migration is NOT modeled |
| \`lur\` / Void Lurker | Detect prey, dive, chase and capture | 9C flyers sense player and hungry ground hunters; fully resolved airborne prey chases remain future work |
| \`grz\` / Stiltgrazer | Herd/flee/forage, leg joints and adaptive running | \`grazer\` and \`crawler\`, now multi-direction finite obstacle probing, terrain-slope clearance and gait shader |
| \`stk\` / Ridge Stalker | Stamina, stalk, sprint, eat a physically caught grazer | \`stalker\`, finite prey energy/mass only from 9A advance, localized pursuit/flee |
| \`wrm\` / Dustworm | Seek litter, burrow, recycle waste to soil | \`burrower\`, actively seeks 9A detritus; decomposition conserves patch mass |
| \`jel\` / Lumen Jelly | Nightly rise, daily sink, filter feed and avoid eel | \`jelly\` with diel light-triggered swim, respiratory pulse and feeding |
| \`eel\` / Tide Eel | Cruise, detect prey, strike filterers | \`eel\` tracks filterers; 9A owns actual capture/death bookkeeping |

Aurelius additionally generated planet/biome variants through \`VR(...)\`, adapting size, color, climate envelope and food webs. STARFALL seeds several morphology/energy/roles from stable species IDs rather than transplanting those names or procedural species lists verbatim.

## Why stationary creatures occurred

Although STARFALL's 9D ground locomotion existed, the render adapter rejected terrain candidates where the ground height differed by >5 units from the **birth site**, even if the creature was moving across a gently sloped landscape. Its movement integrator only probed a single rotated collision direction, and if that direction was also blocked it set both velocity components to zero.

9E changes the mechanism:
1. Slope is calculated against each agent's most recently occupied ground position, with a local step/slope threshold rather than a patch-wide height plateau.
2. If the intended step is blocked, a bounded fan of left/right and partial steps probes the local walkable space; a legal alternative preserves real velocity and heading.
3. If an organism is truly enclosed by cliffs or water, it stays on the correct side of terrain and visibly turns and breathes; it does not teleport through collision geometry to satisfy a movement assertion.
4. Player proximity still makes foragers flee; hungry predators still stalk and run; herds seek other grazers, burrowers locate litter and aquatic filterers rise at night.

## Distinctive flying fauna

The translucent purple four-lobed \`aurora\` class already implemented in 9D has four latticed membranes, trailing glowing beads, heart/stomach organs and 9C flight dynamics. 9E makes its GPU animation more distinct:

- Each sail bends according to its side and chord location (instead of a uniform synchronized sine wave).
- The rear bead-tail sways independently behind the torso, with more deflection toward its tip.
- The living agent provides independent breathing pulsation and wing phase, while 9C velocity controls heading and bank.
- All geometry stays in a **shared, prebuilt WebGL mesh**, retaining the 18 living-actor render cap, distance culling, shared organ geometry, alpha blending and no network dependencies.

## Verification commands

\`\`\`bash
node tests/living-biosphere.test.cjs
node tests/aerodynamics9c.test.cjs
node tests/ecology9d.test.cjs
node tests/ecology9d-scene.test.cjs
node tests/ecology9e.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/ecology9b-browser.py
python tests/aerodynamics9c-browser.py
python tests/ecology9d-browser.py
\`\`\`

The browser scripts use real Chromium WebGL2 with software SwiftShader, and save both desktop/mobile screenshots. GPU software-render frame rates must not be passed off as performance on a player's own PC/phone.

## Honest limitations

This is a finite **local** gameplay ecosystem, not a planet-wide agent simulation. Animal hunting visuals are near-field, but population kills/feeding occur in 9A finite 600-second ticks; moment-to-moment chase displays are an approximation of physical pursuit and cannot independently kill or create resources. Aerial migration, flock formation, detailed IK foot placement, molecular biochemistry, 1:1 real-world alien fauna, and hardware FPS acceptance have not been implemented. Empty/inhospitable planets legitimately lack complex animals. Plants and fossils should not behave like walking animals.

## How to examine the changes

Open the latest **desktop** \`PLAY-STARFALL.html\` or **mobile landscape** \`PLAY-STARFALL-MOBILE.html\`; travel to a landed, warm biologically suitable world with level-3/4 ecology. In **Mission → Explore → Ecology**, select a rich living patch and approach it in EVA. Watch a grazer/predator/burrower for 10–20s: it should move, turn, graze/flee/chase, and animate limbs. Observe translucent aurora sailers at closer range to see four independently rippling sails and the trailing beads, plus pulsing heart and digestive sac.

The source and generated standalones stay synchronized by the 9E GitHub workflow. All new visual changes preserve 9A save schema.
