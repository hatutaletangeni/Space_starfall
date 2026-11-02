# STARFALL T13 Verification Report — 2026-11-02

## Source and branch

- Baseline: verified `feature/t12-truck-field-service` at `1830ba671f0607baa2b9eb7655536a2f83aae407`; `main` remains T11.
- Branch: `feature/t13-ship-service-docking`. PR #10 targets the T12 branch as a draft. Source/standalone changes were committed in full to GitHub.
- Integration added only to the original flight state, vehicle systems, T03 ship radio, original Science Journal, engineering panel, deterministic standalone builder and test files. No new second ship inventory or spaceflight rendering engine.

## Actual test evidence

1. **PASS:** GitHub Actions Engineering Regression [run 41517293298](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41517293298), for T13 core implementation, passed JavaScript syntax, all Node model suites, rebuilt standalone parity and full inherited software-WebGL Chromium suite **including the T13 dock/observation/reload scenario**.
2. **PASS:** Latest tested manual EVA shore-start model and save-harness update, source revision `38b952044cc9404020e781cc264f012dddc1ca36`, Node/static checks and standalone parity in [run 41517932562](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41517932562).
3. **PENDING AT REPORT CREATION:** Full Chromium suite on final T13 revision (same run 41517932562); check its actual conclusion. Do not classify it as PASS until completed.
4. **PASS:** Automated standalone bundle regeneration for final T13 revision [run 41517932245](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41517932245). The bundle is `PLAY-STARFALL.html` on this feature branch.
5. An intermittent inherited **T04 test-fixture** reload failure was observed in some intermediate runs, with `outpost5.items` replaced by the original empty fixture on `file://` reload. The T13 branch minimally hardened only that test's injection guard to preserve saved outpost/radio state. Neither antenna physics nor save logic was rewritten. The final browser suite must verify this too.

## Engineering checks

- T13 model validates ship legacy emergency radio still **debits real stored battery joules**; under realistic power it fails closed on shed/disabled avionics, depleted battery or bad hull health.
- A literal same-body latched port, installed components, 0.4 m/s maximum relative speed, bounded 38-scene-unit cable, motion lock, no fake remotely deployed receiver and no free source/destination energy.
- T02 power transfer: source loss equals amount drawn, destination gain equals delivered energy, difference equals explicit conversion loss. Ship→rover preserves 2 MJ reserve; Outpost→ship physically debits the wired source. Dead-ship shore-start is allowed only from an enabled real battery with manual EVA both-end access, not a teleport recharge.
- Science observation IDs carry mounted source, actual recorded time and body-fixed location. Journal ownership remains unchanged; ship stores receipt IDs only. Duplicates are not double-debited. Deployed rover measurement remains bound to its canonical original rover record and normal T03 radio behavior.
- Source-save migration makes T13 fields optional and preserves pre-T13 flight/vehicle data.

## Manual/hardware work not verified

Physical flight through atmosphere, landing, walk down/up the exact ramp, truck X enter/exit, rough-terrain rover tow, shore cable attachment in a real long session, and GPU FPS on the player's PC are **NOT VERIFIED**. Browser tests use a controlled saved *landed* fixture: do not claim the landing or docking under thrust was simulated as a full human mission. No 6-DOF free-space docking physics, external launch fuel, inventory economy or fake interstellar comms were added.

## Rollback and release gate

Keep PR #10 **draft**. Do not merge to T12/`main` until final CI fully completes green and target-browser manual test is accepted. Recovery is by using the unmodified verified T12 feature branch; current `main` is still the previous stable T11 build.
