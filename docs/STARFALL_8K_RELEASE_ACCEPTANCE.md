# STARFALL Update 8K — release acceptance and evidence

**Status: BLOCKED until actual gameplay, compatibility, and hardware gates pass.**
GitHub Actions green is necessary, not a full expedition acceptance certificate.
Tracker: https://github.com/hatutaletangeni/Space_starfall/issues/86

## Current source integration evidence

- PR #143: 8K tests on every main PR/main push, including desktop/mobile offline parity.
- PR #144: natural source-owned copper -> 8D mine + haul -> 8E chemistry -> 8F wire. Test has predeparture support reagents and processing fixtures.
- PR #145: finite T09 habitat supplies on 2 x 400W original receipt-paid T02 solar and initially empty 9.6MJ battery, including brownout. Original manufactured shell is a fixture.
- PR #146: 8I structural construction/charge source lot anti-replay; desktop/mobile rebuilt.
- PR #147: actual 8E electrolysis-created O2 lot -> actual original 8J rated gas release with planet mass, power and pressure conservation; certified kit and SI world fixtures.
- PR #148: actual seed-742 source world ore -> 8D source truck/ship -> 8H paid depot on distinct seeded destination world. Flight states supplied at stages, not continuous manual piloting.
- PR #149 (merged): finished 8E surface solid products held in paid bounded hopper and physically moved by original T02-powered 250W conveyor to paid depot.

These are source-module integration checks, not evidence that a single user played the entire expedition.

## Additional reproducible 2026-11-11 evidence

PR #152 adds whole-expedition specialty/tool and seven gas-service bill closure,
actual source-owned fresh mining-to-commissioned-rover/cargo acceptance, bounded
paid mineral-waste storage, captured-CO metering, full-BOM vehicle and real metal
evidence, and Industrial free-rocket rejection. Genuine historical game saves
from 9536bc4, f6fa832 and 1d2b9a4 pass the real current archive import/reload.
Native Flight.js is continuously piloted with G/W/Shift/C to a second world,
with original source cargo and real touchdown/reload. The independent source
campaign and flight checks are not one uninterrupted industrial playthrough.
Physical phone/GPU and that complete coupled expedition remain unverified.

## Progression repair

The 2026-11-11 repair fixes the first-smelter/specialty-stock deadlock, permanent
drill wear, native mining time acceleration and 8C/8D audit mismatch. See
`UPDATE-8K-PROGRESSION-READINESS.md` for exact budgets, compatibility and tests.
Expanded prelaunch equipment applies only to new expeditions; old receipts are
never replenished. Full expedition and hardware acceptance remain separate.

## Unassisted actual-game expedition acceptance

Use actual playable PLAY-STARFALL.html and PLAY-STARFALL-MOBILE.html rebuilt from the same editable source commit. Never inject test assets, cheat through local save editing, teleport flight, or replace actual Joules.

1. START: new seed 742 Industrial save; one genuine original truck and finite 8K manifest. Truck physically starts in original ship cargo; drive down ramp, disembark and re-board without duplication.
2. MINE: choose actual surveyed resources. For sustained CO discharge, establish the smelter on a genuinely unprotected world (seed-742 Kepler-742 c is an Ice-world candidate); protection locks still apply. Land as EVA. Mission > Explore > Survey geological deposit > Survey current surface sector. Select true copper or iron. Park the original truck with power and operator near surveyed occurrence. Mission > Operate > Mine, Manufacture & Store Gas > START 20 KG BORE / 24 S; check 8C depletion, battery and hopper. LOAD 50 KG INTO SHIP / 16 S while parked close to landed ship; verify the original truck decreases and ship 8A hold increases identically.
3. REFINE/BUILD: Engineer > actual 8E refinery and true certified plant machinery. Process assayed ore into required chemicals, real copper wire, electrical parts, solar modules, cells, pipes, machine kits. Require actual source lots and power/time receipts; no substituted pure copper.
4. INDUSTRIAL LOGISTICS: keep original refinery residues in a paid, bounded tailings stockpile; never silently discard them.  build paid depots and one real 180kg conveyor drive; install original 250W T02 motor port and wire to true generation/battery. Source container, 40kg tray, destination container and unique source receipt must follow actual native powered ticks; disconnection must pause. Test paid 8E surface solids output -> plant bounded hopper -> true 250W powered belt -> receiving depot. Verify storage-full and 1x/10x/100x.
5. ELECTRICITY: original manufactured/paid 400W solar and 9.6MJ empty battery wired to actual loads. No free old 4kW or 72MJ source on a fresh Industrial save; battery cannot power the habitat at night before actual charging.
6. HABITAT: manufacture 8G paid structural pressure shell, fill from real compressed atmosphere and water, unique 8I T09 commissioning. Transfer actually stored oxygen/water/manufactured sorbent. Operate 680W T09 using actual native T02; verify thermal, pressure, O2, CO2, occupants, day/night, blackouts, airlock and leak safety, no free repairs.
7. 8J: on eligible unprotected world, fill actual rated 8A vessel by real chemistry/collection. Mission > Build > VENT SOURCE-PAID GAS TO PLANET. Check 8A gas debit, installed regulator energy charge, unique 8J receipt, persist world pressure: delta P in Pa = emitted kg * gravity m/s² / (4 * pi * radius m squared). Protected world MUST reject. Do not claim instant climate or terrain visual change.
8. TWO-WORLD: pre-install a real paid destination depot on B; mine or manufacture on A; register real 8H shipment; ACTUALLY pilot original ship from A through interplanetary space to B, land, walk on EVA and unload into real B depot. Confirm RESERVED -> IN_TRANSIT -> ARRIVED -> DELIVERED with original lot provenance, ship power debit and no teleport. Return to A, revisit B and verify both world states persisted separately.
9. COMPATIBILITY: save/reload after each transaction, pause/restart, offline and time acceleration. Preserve a COPY of an actual old save; import and verify original planets, energy, truck, construction, industrial lots, chronology and original legacy T02 nameplates. New Industrial cannot inherit free old equipment.
10. MOBILE AND GPU: on actual Android/iPhone landscape device test physical controls, truck, ship, mining, touch selection, UI modals and performance. Desktop emulation is not a real-device test.

## Reproducible GPU test (real installed browser, not GitHub SwiftShader)

On Windows laptop/desktop, from repository root:

    py -m pip install playwright
    py tools/benchmark-real-gpu-8k.py --browser msedge --edition desktop --seconds 90

Or installed Google Chrome:

    python tools/benchmark-real-gpu-8k.py --browser chrome --seconds 120

Keep the game visible and actively fly/explore. The script records renderer,
WebGL2, average FPS, P50/P95/P99 frame time, and screenshot plus local JSON.
It rejects SwiftShader, llvmpipe and unknown GPU identities as hardware PASS.
Provisional acceptance threshold is 30 average FPS with P95 <= 50 ms;
actual hardware and game scene must be recorded. Repeat at cargo ship,
dense planetary terrain, and multi-plant outpost. Do not upload personal
local save data without inspecting it first.

CI headless Chromium can prove UI/render regressions under SOFTWARE WebGL,
not physical user GPU, laptop thermals, sustained FPS or Android rendering.

## Release decision

8K remains BLOCKED until:
- exact-head main CI, tested playables, native WebGL browser and mobile;
- one uninterrupted no-debug physical two-world expedition;
- paid plant solid outputs and source-owned logistics across load/unload;
- sustained powered T09 and realistic incremental 8J mass accounting;
- actual old-save import/return with no silent reset;
- real desktop GPU and physical mobile hardware evidence.

Attach exact main SHA, original 8A/8C/8D/8E/8F/8G/T02/T09/8J/8H receipts,
screen recording of controls and interplanetary flight, saved return, hardware
JSON/screenshots, and dated pass/fail to Issue #86. Never close the issue
only because unit tests are green.
