# STARFALL — UPDATE 2: Space Science & Physics

This edition extends `STARFALL-NAVIGABLE-STARS` without replacing its procedural galaxy, spacecraft, 3D astronaut, automatic disembarkation, physical cargo-ramp boarding, rover, day/night and distant-star selection.

## Start

Open **`PLAY-STARFALL.html`** in recent Chrome or Edge with hardware acceleration. This is a standalone offline game; it includes all JavaScript/CSS. Alternatively, open `index.html` alongside the `src/` folder (or use a local HTTP server). No npm, downloads or external libraries are required to play.

### New features

- **Observatory:** press the *OBSERVATORY* control in the header. Inspect your selected star and its planets/moons; select a body in the panel. Save data as JSON or CSV. Values are labeled modeled, estimated or unconfirmed.
- **Flight computer:** expand *FLIGHT COMPUTER / ENGINEERING* near the lower end of the reconnaissance side panel. Read inertial and ground-relative speed, apoapsis/periapsis, orbital inclination, mass/fuel, delta-v, heating and predicted unpowered orbit.
- **Flight model:** the flight computer includes **Assisted** (default; original feel) and **Engineering** (experimental local gravity, real units, bounded thrust/fuel/drag/heating) modes. Engineering is entirely opt-in. The original warp remains fictional and separate.
- **Attitude assist:** Manual, Hold, Prograde, Retrograde. These are simple attitude holds, not full angular-momentum physics.
- **Kepler display:** experimental visual orbits can be enabled *explicitly* in Observatory while not landed. Because legacy periods and physical masses differ, this may change orbit positions; it is disabled by default and resets each session.

### Original controls preserved

`W/S` fly, brake, walk or drive; `A/D` turn on foot/rover; left drag steer spacecraft; right drag look; scroll camera; `M` open star chart; `G` align to selected destination; `Shift+W` warp where permitted; `T` time acceleration; `Space` launch after physically boarding via the ship's cargo ramp. All 2,368 stars are actual selectable systems.

## Scientific model

Read [SCIENCE-MODELS.md](SCIENCE-MODELS.md) for SI units, formulas, fidelity limitations, atmosphere assumptions, legacy-orbit deviations and testing boundaries. Space physics is not high-fidelity flight dynamics and cannot be used for real mission planning.

## Test and rebuild

```bash
node tests/galaxy.test.cjs
node tests/science.test.cjs
node tests/orbit-invariants.cjs
python tools/build-standalone.py
python tests/standalone-parity.py
```

Optional mocked browser integration requires Python Playwright plus installed Chromium:

```bash
python tests/mock-browser-smoke.py
```

That smoke test runs the full standalone JavaScript with a *fake* WebGL interface; it cannot visually certify GPU output. For a real rendered smoke test, open the game in a WebGL 2 browser and complete the checklist in `reports/TEST-RESULTS.md`.

## File organization

- `index.html`: editable entry with external source modules.
- `PLAY-STARFALL.html`: synchronized standalone build.
- `src/starfall-core.js`, `src/galaxy.js`, `src/engine.js`, `src/flight.js`: original core, galaxy and renderer; only `flight.js` has been integrated.
- `src/physics/`: new isolated physics + Observatory modules.
- `tests/`: inherited galaxy tests + added physics, standalone parity and browser mocks.
- `reports/orbit-invariants.csv`: sampled energy/angle conservation over 10 numerical orbits.
- `backup/STARFALL-NAVIGABLE-STARS-original.zip`: **unaltered previous release** for rollback.

## Rollback

If you encounter any game-breaking issue, **do not overwrite your old save**. Extract the original archive from `backup/` and open its `PLAY-STARFALL.html`, or switch the new Flight Model back to **Assisted**. Game saves still use the old `starfall_save` key with an additional namespaced `scienceSettings` record. No mass rewrite of old discovery or world IDs was performed.
