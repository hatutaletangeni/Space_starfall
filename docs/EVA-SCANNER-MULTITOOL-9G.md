# STARFALL 9G — Handheld Scanner Multitool

## What is actually equipped

The original 3D astronaut held a nonfunctional folded steel sampling prop in the left hand. 9G replaces its prebuilt GPU geometry with a compact cyan-aperture **scanner multitool** (grip, battery, optical head and instrument display). When scanning, the handheld and left arm raise, and the existing emissive aperture pulses. No extra model allocations or textures are needed.

## How to operate (desktop and landscape mobile)

Land on a solid world and exit the ship into EVA. A **◉ MULTITOOL** button appears on screen (including on touchscreen in mobile landscape).

- **Desktop:** press **Z** to open the multitool and **Z** again to start a timed scan. **N** cycles sensor types. Or use the on-screen button.
- **Mobile:** tap **◉ MULTITOOL**, choose sensor from the dropdown and tap **SCAN**. No keyboard is required.
- **Sensor modes:** BIOASSAY (modeled biosignature index), SPECTROMETER (modeled geology), THERMOMETER, BAROMETER and MAGNETOMETER.
- **Acquisition:** honors the original 4A source instrument duration, altitude envelope, model-derived uncertainty and powered energy cost. Starts with 35 kJ scanner charge. Successful scans write through the exact original \`StarfallScienceUI.measure\` API into the same persisted \`robotics4\` Field Science journal, annotated by the existing T14 evidence model. They are not fake HUD-only scan badges.
- **Looking at fauna:** bioassay mode identifies a living animal visually if one is within 45 scene units of the explorer and roughly within the looking direction. This is a **visual model classification** displayed separately from the site's instrument-derived biosignature index, **not scientific proof of life**.
- **Recharging:** return within 30 scene units of the landed ship, ensure ship power is on, then tap **CHARGE AT SHIP**. The scanner draws real joules from the original ship vehicle state and leaves a 15 kJ emergency reserve. No free recharge, negative battery balance or parallel unlimited energy is permitted.
- **SCIENCE JOURNAL** opens the existing 4A Field Laboratory so past scans and exports remain usable.
- Scanner closes / is disabled when the player leaves EVA; instruments never work while flying or seated inside the truck. If the explorer switches bodies or moves more than 3 scene units during an acquisition, the reading is aborted rather than invented. No charge is deducted from an aborted scan.

## Security and physics

All sensor readings remain speculative procedural estimates with nonzero uncertainties and provenance. Physical scanner costs are power W × acquisition seconds; the handheld's finite 35,000 J charge is persisted under \`multitool9g\`. The ship-to-scanner recharge function is installed inside the original \`src/flight.js\` runtime and debits the real authoritative ship battery (not a new simulated gas/resource ledger). Scan acquisition uses real-time duration, while \`timeS\` in observations is the game's simulation clock.

The scanner does **not** replace mining, specimen collection, discovery validation, laboratory procedures, or rover sensors. It does not harvest lifeforms, produce resources, award credits, or automatically confirm a biosphere.

## Code layout

- \`src/engine.js\`: low-poly scanner mesh and pointing/pulsing scan pose.
- \`src/physics/eva-multitool9g.js\`: finite battery, modes, callbacks, timed measurements, 4A journal bridge, target sighting and state guards.
- \`src/physics/eva-multitool9g.css\`: responsive mouse/touch interface and small screen readability.
- \`src/flight.js\`: source-owned ship battery recharge method exposed as \`RT.multitoolRecharge9G\`.
- \`index.html\`: screen controls and script/style loading.
- \`tests/eva-multitool9g.test.cjs\`: real time/energy/abort/evidence model tests.
- \`tests/eva-multitool9g-browser.py\`: authentic desktop/mobile standalone Chromium WebGL2 startup and scanner interface screenshots; uses an explicitly labeled artificial EVA context for the HUD inspection rather than claiming a full human playthrough.

## Acceptance tests

\`\`\`sh
node --check src/physics/eva-multitool9g.js
node --check src/engine.js
node --check src/flight.js
node tests/eva-multitool9g.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/eva-multitool9g-browser.py
\`\`\`

The GitHub workflow also verifies old ecology scenes. Browser tests require Python Playwright Chromium with SwiftShader; screenshots are CI software-rendered, not target GPU acceptance.

## Outstanding fidelity limits

While the gadget now performs real original engine scientific measurements and pays its local/ship energy costs, it is a compact multi-sensor package rather than physically simulated individual spectral optics or a laser-ray/collimation solver. Visual line-of-sight fauna classification ignores intervening walls; it is only a clearly labeled candidate and not an authoritative science measurement. Ship recharge is gated by proximity and source energy, not an animated cable/charger physical asset. Target-device screenshots/FPS still need user-hardware testing.
