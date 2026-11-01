# STARFALL — Update 2: Space Science & Physics

- **2A:** Introduced SI unit conversions, mass/density distributions, a deterministic simulation clock, orbital elements and optional Kepler ephemerides behind a disabled-by-default compatibility switch.
- **2B:** Added opt-in local Newtonian flight physics with fixed substeps, fuel/thrust integration, coast prediction, basic SAS and an orbital flight computer. Assisted mode remains original/default.
- **2C:** Added per-body atmosphere density, drag, orientation-dependent reference area, optional lift, rotating-air relative velocity and entry heating/cooling. Vacuum moons remain vacuum; gas giants have atmospheres but no solid landing.
- **2D:** Added Observatory with deterministic star/planet/moon science properties, equilibrium temperature, viewing geometry, model-quality labels and JSON/CSV export.
- Rebuilt a complete editable project and offline standalone from the same source; preserved the 2,368-system catalog and inherited game controls.
- Added physics unit tests, 10-orbit conservation CSV, JS mock-browser integration, source/standalone parity check, science model assumptions and a real GPU verification checklist.
- **Known limitation:** full GPU/render and manual engineering landing tests remain pending. See `reports/TEST-RESULTS.md`.

---

## Original baseline changelog

# Changes — Navigable Stars / Lightweight Explorer

- Rebuilt the player avatar as a much slimmer low-poly EVA explorer; smaller backpack, practical utility gear, articulated walk cycle, no oversized staff or long cape.
- Included a separate static GLB of the redesigned character.
- Removed 2,500 purely decorative background stars and far-planet star-point impersonators.
- Added 2,304 seeded, physical star-system locations beyond the original 64, all accessible through the existing flight engine and chart.
- Added lazy planet and moon construction, deterministic reload, and bounded distant-system caching.
- Added click-to-plot navigation for actual star points in the sky.
- Added hashed-sector lookup for local star queries, collision broad-phase, and nearby planet rendering.
- Rate-limited the sky star-point vertex buffer without removing visible twinkles.
- Preserved the previous continuous flight, moving bodies, atmosphere and moonlight, ground contact, EVA walking, ramp boarding, and rover interaction.
- Updated the editable project split and added executable procedural galaxy regression tests.

The previous game release is included in `backup/`.
