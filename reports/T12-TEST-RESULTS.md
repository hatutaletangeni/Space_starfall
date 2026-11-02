# T12 engineering verification report — 2026-11-02

## Implementation branch

- `feature/t12-truck-field-service` versus baseline `main` at `5a5502589e520583679b7f48e7e72ff937519b43`.
- Source additions: `src/physics/field-service-t12.js`; integration in `src/flight.js` and `src/physics/launch-ui.js`; new Rocket Lab T12 controls; offline standalone build; bounded model and Playwright browser tests.
- New APIs do not allocate new authoritative batteries, vehicle classes or inventories.

## Results recorded at report creation

- **PASS (source feature branch):** run `41513809216` engineering regression included Node, static syntax, standalone parity, and full software-WebGL browser smoke.
- **PASS (bundle workflow):** run `41514151415` regenerated standalone for latest T12 source revision.
- **PENDING at creation:** full regression for final rebuilt artifact after the regenerated standalone commit. Follow latest HEAD run in GitHub Actions; no PASS until that run actually passes.
- **NOT VERIFIED:** real GPU FPS, manual drive and X enter/exit near hillside, physical winch tow and cancel, subsequent rover charge/repair then saved photo acquisition and multiple reloads.
- Previous CI failures on rapid intermediate source commits included expected temporary standalone parity mismatches while bundle regeneration was catching up and a contested older T04 browser fixture restoration error. These are not silently reclassified as passes.

## Unit verification intent

- T12 new `field-service-t12.test.cjs`: load, terrain obstruction, cable reach, gradient, incremental movement/energy debit, no rollback after restore, power reserve, cross-world denial, T02 charging energy conservation and incompatible/missing port, cooldown/overheat, Workbench-compatible repair and refusal of crashed rover.
- Previous T00–T11 `tests/*.test.cjs` must all still pass.
- Real browser smoke: `tests/field-service-t12-browser.py`, plus all prior T01–T11 scripts in `.github/workflows/engineering-ci.yml`.

**Decision:** candidate only pending current source and standalone regression, human-driven mission and GPU validation. Keep `main` unchanged until requested and review-ready.
