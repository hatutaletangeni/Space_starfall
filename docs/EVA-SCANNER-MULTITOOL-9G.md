# STARFALL 9G — Functional EVA Scanner / Hand Multitool

## Purpose

The astronaut already held a small, inert sampling prop. 9G makes that same device a fully wired **field-science scanner** in the 3D avatar, without adding a separate free-resource generator or replacing the existing Update 4A, T14, and Ecology science systems. It can perform real simulated **local** readings, store original observations in the canonical science journal, and transfer real electricity from a nearby powered landed ship into a finite tool cell.

## How to use in gameplay

**Desktop:** Land on a solid planet, exit the ship and stand in EVA. The small **SCANNER / MULTITOOL** panel appears at the bottom-right. Press **P** to start a scan, **O** to cycle modes; you may alternatively click the on-screen buttons. During acquisition the tool visibly emits a cyan scan beam, the panel reports progress, and the avatar's scanner display illuminates. After the allotted time the resulting measurement and uncertainty appear in the scanner display and are also saved in **Mission → Explore → Field Science / Robotics → Journal**. You can choose an instrument from the panel's **SENSOR** selector.

**Mobile landscape:** No keyboard required. Tap the SCAN button and use the sensor dropdown. The HUD is touch-friendly with touch selection disabled; it hides in flight, aboard the ship, in vehicles and in interiors.

### Five scanner functions

| Mode | Original authoritative instrument | Meaning | Duration | Power |
|---|---|---|---|---|
| GEO | 4A spectrometer | local silicate fraction | 4 s | 560 J |
| LIFE | 4A bioassay | local biosignature index | 8 s | 1,440 J |
| TEMP | 4A thermometer | local ambient temperature | 2 s | 40 J |
| AIR | 4A barometer | local pressure | 2 s | 44 J |
| MAG | 4A magnetometer | local magnetic field | 4 s | 220 J |

All values retain the original 4A instrument calibration, uncertainty, range requirements, procedural provenance and observational ID. The multitool's evidence is **not a new kind of physical planetary measurement**. It calls \`StarfallScienceUI.measure(instrument,false)\` which calls the existing \`StarfallRuntime.acquireFieldReading\`, \`StarfallFieldScience.sample\` and original journal. Nothing is recorded until the timed read finishes without interruption.

### Creature targeting

When starting a **LIFE** scan, the tool attempts to sight the nearest living organism ahead of the EVA explorer within **82 scene units** and a bounded aiming cone. It reuses the *current real ecology scene objects* from 9A–9F and records that organism's rendered model ID, visible class and approximate range as **visual encounter metadata** alongside the true source-backed local biosignature reading.

**Do not confuse these two facts:** the local 4A bioassay measures a seeded biosignature index **at the astronaut's position**. Aiming the scanner at a moving grazer/flier is only a visual alignment and species-hypothesis annotation. It does NOT prove species identity, identify a genome, measure an animal's heartbeat, capture a creature, grant resources or inject a false 9A specimen ID into 4A evidence.

### Tool charge and custody

The scanner's original equipment comes with an **18,000 J starter cell** (a starting item, not a replicable resource). Each completed scan consumes exactly its original instrument's \`seconds × watts\` from this stored charge. A failed or cancelled scan consumes zero charge and writes zero evidence. The scanner preserves its battery, chosen mode and last 36 acquired receipts in the existing \`SF\` save structure.

Tap **CHARGE** while within **32 scene units** of your original **landed ship**, in EVA. The ship's stored state must have \`powerEnabled=true\`, and it must hold sufficient actual Joules. \`StarfallRuntime.rechargeHandheldScanner9G\` debits the **source-owned original ship vehicle-store energyJ** and persists that vehicle state; only the exact debited amount is credited to the hand scanner. There is no instant remote charge, indefinite passive recharge, or free power. If the ship has no battery energy or is unpowered, charging fails with a clear explanation.

The scanner mode changes and receipt log are persisted to \`multitool9g\` and do not rewrite existing save keys. It does not change any 9A biomass inventory, manufactured mining stock, gas reserves, item custody, or 4A instrument samples.

### Visible in-world changes

\`src/engine.js\` changes the original glove-held \`staff\` mesh to an actual sensor with grip, shielded power housing, screen and multi-collar sensor head. The existing original avatar ownership remains intact. \`scannerBeam\` is a single new GPU-resident mesh created once per renderer. The renderer draws this extra emissive beam **only while a real acquisition is active**, with automatic disposal on renderer cleanup. Default avatar draw calls remain **9**, active scanner **10**, with no recurring geometry/texture allocation.

### Tests and acceptance

\`\`\`sh
node tests/handheld-scanner9g.test.cjs
node tests/handheld-scanner9g-ui.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/handheld-scanner9g-browser.py
\`\`\`

The test suite verifies five original sensors, bounded battery, sample delays, cancel on departure, target-facing, canonical 4A sample IDs and permanent journal receipts, source-paid recharge, on-screen and keyboard controls, EVA gating and original standalone UI. The browser smoke uses actual desktop and mobile offline editions and Chromium WebGL2, checking that scan beam draw calls are present, source-backed readings enter the real Field Science journal, and offline operation does not call the network. Screenshots and evidence JSON are archived in \`artifacts/scanner9g/\`.

Real device GPU performance and whether the tool is aesthetically prominent on the user's individual Windows machine/phone remain hardware-playtest checks. Browser SwiftShader is software, not proof of 60 FPS on the player's hardware.

### Known boundaries

This is a hand-held **scientific sensor multitool**, not a laser miner, energy weapon, terraforming manipulator, tractor beam, scanner-based item duplicator, or surgical instrument. Those would require independent hardware resource, safety, inventory and engineering contracts and are not silently added to 9G. All temperatures, pressure, magnetic fields, biosignatures and silicates remain approximations seeded by the original STARFALL instrument model.

## Verified standalone packaging and release gates

GitHub's 9G release workflow has regenerated and committed **both** exact offline browser editions on the feature branch: `PLAY-STARFALL.html` and `PLAY-STARFALL-MOBILE.html`. The bot-generated bundle commit cannot itself trigger recursive PR workflows (it shows `action_required`, which is **not** a pass). This subsequent documentation commit is intentionally authored via the connected repository account to trigger all 9A–9G, industry, engineering and mobile release checks against the synchronized bundles. Require actual green results on this final PR head before merging. On-device graphics frame-rate acceptance remains a separate player hardware test.
