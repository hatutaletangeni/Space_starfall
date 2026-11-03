# CW-06 — Composition-driven worlds integration and release report
STATUS: DRAFT — NOT RELEASED. This branch is stacked on CW01 through CW05.

## Implemented
- CW01 deterministic read-only bulk composition and atmospheric mole fractions.
- CW02 approximate blackbody stellar spectrum and illumination.
- CW03 composition-influenced lithology tone; CW06 protects existing water and ice biome palettes.
- CW04 conservative pressure-temperature volatile phase screening; no collision or water geometry edits.
- CW05 bounded-cache composition-derived sky/fog color; legacy weather unchanged.
- CW06 adds composition, radiation bands, atmospheric molar mass and uncertain water phase to existing Observatory, without new top-level controls.
- CW06 adds tests/composition-integration-cw06.test.cjs cross-module fixture.

## Known unresolved discrepancies — do not claim science completeness
1. The field spectrometer and contact sampler still use a separate generated science model, not the exact mineral region in CW03.
2. CW03 has a fallback galaxy seed of 742 when galaxySeed is not carried on the body, creating potential alternate-seed disagreement.
3. CW04 equilibrium temperature is not a ground thermometer result; liquid-possible is an uncertain screen, not proven surface liquid.
4. CW05 palette is not validated Rayleigh/Mie radiative transfer, cloud condensation or a weather chemistry model.
5. Stylized legacy star scales and moon-atmosphere compatibility remain labeled as estimates.
6. No validated standalone PLAY-STARFALL.html for this branch yet; real WebGL2 and performance checks are NOT VERIFIED.

## Mandatory release commands
node tests/composition-cw01.test.cjs
node tests/stellar-spectra-cw02.test.cjs
node tests/mineral-terrain-cw03.test.cjs
node tests/volatile-phases-cw04.test.cjs
node tests/atmosphere-optics-cw05.test.cjs
node tests/composition-integration-cw06.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py

Run all previous repository tests and browser smoke in Chrome/Edge file:// with actual WebGL2: 2368-star seed invariance, multiple classes, orbital navigation/warp, descent/landing, EVA ramp, truck, rover, UI20/UI21, T19A, rockets, satellites, engineering, old saves, 1x/10x/100x, cache eviction. Document observed FPS; do not invent metrics.

Standalone source contract: index.html is the editable source. tools/build-standalone.py inlines JS and CSS and tests/standalone-parity.py compares the exact generated HTML. Workflow .github/workflows/cw01-standalone.yml is configured to build on this branch. Existence of the workflow is not evidence that the file was rebuilt. No merge without confirmed parity and browser testing.
