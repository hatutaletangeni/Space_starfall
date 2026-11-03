# CW-02 stellar spectrum alignment — release candidate
Based on CW-01 branch; requires CW-01 compatibility verification before merge.
## Changed
- `src/physics/stellar-spectra-cw02.js`: deterministic Planck blackbody approximations for stellar UV/visible/IR bands and CIE-like display tint. Uses existing `StarfallPhysics.starProfile` so the physics profile remains authoritative. Bound cache size 1024.
- `src/engine.js`: nearby star surface/halo and direct sunlight now consume a common spectral tint; no world positions, star IDs, star sizes or orbital elements changed.
- `index.html`: loaded new pure module after foundation.
- `tests/stellar-spectra-cw02.test.cjs`: deterministic profiles, inverse square law, sensible band trend.
- `.github/workflows/cw01-standalone.yml`: builds `PLAY-STARFALL.html` on the CW02 branch with tests and strict parity.
## Fidelity
These are spectral approximations, not calibrated stellar atmosphere solutions. No absorption-line chemistry, flares, limb darkening, true color-management pipeline or photometric magnitude conservation is claimed. CW01 metallicity remains a seeded prior, not observed. The star's existing temperature and luminosity may reflect legacy stylized scales; their limits remain documented in `src/physics/foundation.js`.
## QA and rollback
Before any stable merge: `node tests/composition-cw01.test.cjs`, `node tests/stellar-spectra-cw02.test.cjs`, pre-existing suites, `python3 tools/build-standalone.py`, `python3 tests/standalone-parity.py`, file:// Chrome/Edge inspection (stars, chart, warp, land, EVA, truck, UI21, T19A), saves and 1x/10x/100x. Confirm a fresh `PLAY-STARFALL.html` commit. Real GPU and full E2E are NOT VERIFIED until run.
Revert this CW02 branch to its CW01 parent to undo color alignment without touching any underlying galaxy data.
