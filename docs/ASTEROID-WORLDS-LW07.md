# STARFALL LW07 — Landable asteroids, finite EVA mining, impacts and solid shattered worlds

## Scope

This update adds a surface-capable class of large belt asteroids without changing the existing galaxy catalog, star IDs, planet/moon IDs, belt source arrays, or ring particles. Small rocks remain collision hazards; only deterministic major asteroids are ship-landable.

## Asteroid landing and extraction

- A major belt rock receives a stable body ID derived from its existing belt ID and rock index.
- The body uses the existing flight, surface attachment, terrain sampling and save path. It is not added as a fake star-chart planet or regenerated as a new planet.
- The 8C geology authority supplies finite composition-derived deposits on asteroid surfaces.
- EVA spectrometer readings are required before extraction.
- The EVA multitool consumes 9.6 kJ to extract a 2 kg batch over 12 simulated seconds.
- Material enters a bounded 20 kg / 0.012 m³ EVA sample pouch. It must be physically carried back within 40 scene units of the landed ship before it can be transferred to the ship's 8A material hold.
- The transfer uses the existing 8A reserve/commit ledger. No inventory is created by a UI button.
- Truck drilling and existing 8D hauling remain unchanged.

## Impacts and craters

- Static crater fields are seeded from body ID, seed, and the system's actual belt population. Systems with no belts do not receive asteroid-impact craters.
- Belt-bearing systems have low-probability deterministic impact windows. A collision produces a transient 3D meteor effect and a permanent saved crater record.
- Crater geometry is a radial heightfield depression with a raised rim. It does not remove triangles or create holes through a planet.
- The impact archive is bounded to 1,200 records. Impact event scheduling uses a deterministic 18,000-second simulation window.

## Weather visuals and shattered bodies

- The 6I flat repeating-line overlays are replaced by soft cloud/aurora/radial haze treatments.
- Active planetary events receive 3D particle volumes and trails in the existing effects buffer.
- Shattered planets and moons render as closed meshes. Their dark fractured surfaces retain seeded scars and debris rather than omitting spherical faces.

## Verification policy

The new Node model tests cover stable asteroid body identity, finite resource transactions, survey gating, save/reload, crater scheduling and no-belt exclusion. GitHub Actions PASS: all Node suites, desktop/mobile standalone parity and Chromium software-WebGL smoke passed. This browser smoke is separate from real-device GPU visual/performance verification, which remains NOT VERIFIED.


## Local verification commands

Run from the repository root:

\`\`\`bash
# Run every existing and new Node regression/model test
for test in tests/*.test.cjs; do node "$test"; done

# Rebuild both offline deliverables and verify source parity
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py

# Optional browser smoke (requires Python Playwright + Chromium)
python -m pip install playwright==1.56.0
python -m playwright install chromium
python tests/asteroid-worlds-lw07-browser.py
\`\`\`

The browser test uses software WebGL where available. It is not a substitute for checking the build on a real GPU and recording actual frame time on the target device.
