# Update 8 release-candidate verification ledger

This file deliberately does **not** claim Update 8 is complete.

## Current staged changes

- **8B:** Original expedition truck boarding uses authoritative 8A custody and can reconstruct a valid missing runtime ramp anchor. Does not permit duplicate trucks.
- **UI22 / 8G–8H tests:** All exact stale UI21 browser test route clicks are migrated by `tools/migrate-ui22-browser-tests.py` to the actual visible Mission workflow. The suite retains every physical stock, ownership, conservation and trip assertion.
- **UI22 visible Rocket Lab:** Original Rocket Lab can now be launched through Mission → Build; its old hidden quick-tools button remains owned by the existing implementation. The Chromium T16 test now uses the visible action.
- **8B truck custody regression:** Browser test opens the real Mission → Build Asset Manager action rather than the permanently hidden legacy header shortcut; the remote-world no-duplication assertions remain unchanged.
- **T16 operations regression:** Browser test opens the Overview workspace where the existing operations status card is actually mounted, then operates the real filter.
- **Mission-first navigation:** Original Rocket Lab is available through Mission → Build, Observatory through Mission → Navigate, and Save/Restore through Mission → Records. Updated T17/T18/UI20 browser tests navigate those visible actions and retain their original source-backed assertions.
- **CI packaging:** Branch-owned rebuild workflow now compiles desktop and mobile playables on integration source edits, without triggering itself on bot-authored bundle-only changes.
- **8I / 8J models:** Existing source-owned habitat gas and atmospheric pressure models are now loaded in both editable and compiled game entries. Model tests check power constraints, gas conservation, pressure equation, invalid mass requests and duplicate receipts. 8J rejects replay of a receipt ID with different mass/time parameters.
- **8I finite liquid-water service:** A player-accessible Engineer → Habitat Water Service transfers up to 50 kg at a time from source-owned 8A ship water lots into the **same** physical T09 habitat water tank; requires nearby EVA, closed airlock, landed powered ship, actual ship battery work at 25 kJ/kg and durable joint save. Water debits, T09 credit and a unique provenance receipt are tested in `tests/habitat-supply8i.test.cjs`. An isolated real file:// Chromium acceptance scenario is in `tests/habitat-supply8i-browser.py` and its workflow; do not claim PASS without completed run.
- **8J canonical feasibility:** The Engineer view derives radius, gravity, seed-baseline pressure and escape velocity from `StarfallPhysics.bodyProfile`; computes planetary pressure mass and hypothetical import duration without writing atmosphere, giving free gas or touching terrain. Native-life/ruins warnings are informational and ALL global interventions remain locked.
- **Offline parity:** Builds are generated using `python tools/build-standalone.py` and `python tools/build-mobile-standalone.py`.

## Required before merger into main

- Pass `node tests/update8ij.test.cjs`, `node tests/habitat-supply8i.test.cjs`, real Chromium `tests/habitat-supply8i-browser.py`, and all baseline node/browser suites.
- Pass `python tests/standalone-parity.py`, verify mobile standalone source parity.
- Pass real file:// Chromium browser interaction for original-truck secured → ramp → surface → return → reload with same physical ID and mass/battery.
- Pass 8H source-to-carrier-to-destination logistics, actual T02 energy debit, every target plant pipeline and 1×/10×/100× determinism.
- Extend 8I beyond the working source-paid T09 water service: integrate separately physical oxygen/scrubber replacement, CO₂ processing, true closed-loop greenhouse growth, nutrients, and corresponding persisted source/power balances; prove complete industrial life-support operation.
- Extend 8J beyond read-only **canonical physical feasibility**: implement verified source-owned planet-atmosphere mass/energy interventions, climate/loss/water reservoirs, strict planetary-protection approvals and renderer/sensor-persisted effects. The current UI expressly cannot terraform.
- Execute unassisted 8K full original-asset industrial expedition and old-save/revisit tests; report honest GPU and FPS measurements.
- Re-run baseline galaxy, warp/landing/crew ramp, science rover, outposts, UI21/UI22, saves and offline release tests.

## Release policy

No model-only function or passing unit test may be called end-to-end gameplay. Note that bot-generated commit CI runs marked `action_required` are not evidence of passing tests; require an actual completed run after a human-authored validation commit.
Do not merge on red/blocked checks; tests marked action_required are NOT PASS.
No free physical inventory or simulated electricity may enter Industrial Mode.
