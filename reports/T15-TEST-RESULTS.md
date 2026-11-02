# T15 Verification and Engineering Release Record — 2026-11-02

## Branch ownership / rollback

- Source branch `feature/t15-asset-manager-real-configs`; based on verified `feature/t14-science-evidence-map`, SHA `0d0053d401d383bcd4421fa013ff3849cb654890`.
- Separate T12/T13/T14 fallback branches remain unmodified. `main` remains stable T11.
- New files: `src/physics/equipment-t15.js`, `tests/equipment-t15.test.cjs`, `tests/equipment-t15-browser.py` and additive Workbench/asset registry and 7E source metadata integration.
- Original saves without an `equipmentT15` record initialize without fabricated service history or installed parts.
- Original T00 technology-contract inventory has three newly supported optional components, with explicit historical baseline retained.

## Verified tests and outstanding gates

- `tests/equipment-t15.test.cjs`: actual original `StarfallVehicles` assembly evaluator, model park/identity guards, original battery energy preserved on larger-capacity replacement, rated solar charging changes `StarfallPower.generation`, 6-wheel force/traction reacts to real original store, installed suite changes allowed science jobs, ship avionics module alters real T03 range/bitrate and T02 bus, original fault/thermal causes and service event migration/rollback.
- `tests/equipment-t15-browser.py`: true offline Chromium / software WebGL with controlled **landed** fixture, real Workbench UI selector and part installation, original rover stats/charge/sensor/job availability, T15 source event and prior assembly, genuine `file://` page reload and energy-conserving restore. A controlled fixture is **not** a human flown landing.
- Targeted suite: `T15 Targeted Equipment Workbench Browser Contract` in `.github/workflows/t15-targeted-browser.yml`. Its workflow first rebuilds the exact latest standalone from sources, runs strict parity, then runs the real browser test.
- Full CI: `Starfall Engineering Regression` in `.github/workflows/engineering-ci.yml` runs the inherited T00–T14 tests plus T15. The T00 catalog remains enabled and must pass. The `T15 Standalone Bundle Synchronization` workflow regenerates `PLAY-STARFALL.html`.
- **Release gate:** Inspect current final branch SHA and corresponding GitHub Actions conclusions. A completed earlier test, intermediate parity failure, cancelled workflow or a pending browser smoke is **not** a PASS on a newer commit. Do not mark manual hardware GPU tested when it has not been.
- **Manual GPU and continuous mission:** NOT VERIFIED. Physical ramp walking, truck X, ruin entry/exit, returning to another planet, manual remote receiver contact near new radio range, long play session, chip power/heat with installed suite and laptop frame times have not received an actual human playthrough.
- **Unmodeled:** physical part removal animation, inventory/cost economy, physical satellite sensor replacement and a new ship hull-healing mechanic. Existing T12 repairs and T07 satellite payload operations remain the only authoritative service routes.

## Next decision

Keep candidate in a **draft pull request**, targeting T14 branch, without automatic merge to `main`. If any current CI fails, keep feature unmerged and use verified T14 baseline. Record user-driven manual checks before final release.
