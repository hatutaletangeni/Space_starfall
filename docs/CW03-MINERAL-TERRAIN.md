# CW-03 — Mineral-aligned surface appearance (incremental slice)

**Scope:** seeded mineral *color interpretation* only. Existing landscape heights, terrain collisions, biomes, materials, decorative object positions, saved sites, and global galaxy generation are unchanged.

Files:
- `src/terrain/geology-cw03.js` supplies a deterministic regional lithology label and modeled iron/silicate prior, using CW-01's compositional schema when available.
- `src/terrain/biomes.js` blends mineral colors with the existing terrain palette, preserving biome/water/ice outputs and height.
- `index.html` loads geology before biomes, ensuring the normal standalone builder inlines the same code.
- `tests/mineral-terrain-cw03.test.cjs` checks deterministic tint and pass-through cases.
- `.github/workflows/cw01-standalone.yml` now includes the CW-03 branch, new test and standalone parity gate.

**Limits:** This does not yet prove a contact sample or measured spectrometer matches the visible mineral region: `StarfallFieldScience` remains an independent modeled instrument and will require an explicit compatibility adapter before this stage is claimed scientifically complete. No new 3D lithology meshes or texture passes were added. The existing CW01/CW02 parent stages and existing save compatibility must pass their own release gates first.

**Test locally:** `node tests/mineral-terrain-cw03.test.cjs` then `python3 tools/build-standalone.py` and `python3 tests/standalone-parity.py`. Open `PLAY-STARFALL.html` directly in Chrome/Edge to check landings, science, bodies, assets, FPS and UI. **WebGL end-to-end unverified.** Do not merge without the actual standalone artifact, its parity pass and gameplay regression checks.
