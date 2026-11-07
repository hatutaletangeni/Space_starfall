# Update 8 release-candidate verification ledger

This file deliberately does **not** claim Update 8 is complete.

## Current staged changes

- **8B:** Original expedition truck boarding uses authoritative 8A custody and can reconstruct a valid missing runtime ramp anchor. Does not permit duplicate trucks.
- **UI22 / 8G–8H tests:** All exact stale UI21 browser test route clicks are migrated by `tools/migrate-ui22-browser-tests.py` to the actual visible Mission workflow. The suite retains every physical stock, ownership, conservation and trip assertion.
- **UI22 visible Rocket Lab:** Original Rocket Lab can now be launched through Mission → Build; its old hidden quick-tools button remains owned by the existing implementation. The Chromium T16 test now uses the visible action.
- **8B truck custody regression:** Browser test opens the real Mission → Build Asset Manager action rather than the permanently hidden legacy header shortcut; the remote-world no-duplication assertions remain unchanged.
- **T16 operations regression:** Browser test opens the Overview workspace where the existing operations status card is actually mounted, then operates the real filter.
- **8I / 8J models:** Existing source-owned habitat gas and atmospheric pressure models are now loaded in both editable and compiled game entries. Model tests check power constraints, gas conservation, pressure equation, invalid mass requests and duplicate receipts. 8J rejects replay of a receipt ID with different mass/time parameters.
- **Offline parity:** Builds are generated using `python tools/build-standalone.py` and `python tools/build-mobile-standalone.py`.

## Required before merger into main

- Pass `node tests/update8ij.test.cjs` and existing node test suites.
- Pass `python tests/standalone-parity.py`, verify mobile standalone source parity.
- Pass real file:// Chromium browser interaction for original-truck secured → ramp → surface → return → reload with same physical ID and mass/battery.
- Pass 8H source-to-carrier-to-destination logistics, actual T02 energy debit, every target plant pipeline and 1×/10×/100× determinism.
- Integrate 8I with original T09 installed habitat and T02 power + 8A materials, including source-paid water, oxygen, scrubbers, greenhouse, leakage, airlock and physical controls.
- Integrate 8J with canonical world atmosphere/physics renderer, actual imported gas/energy ledger, climate/loss/feasibility/protection and persisted effects.
- Execute unassisted 8K full original-asset industrial expedition and old-save/revisit tests; report honest GPU and FPS measurements.
- Re-run baseline galaxy, warp/landing/crew ramp, science rover, outposts, UI21/UI22, saves and offline release tests.

## Release policy

No model-only function or passing unit test may be called end-to-end gameplay. Note that bot-generated commit CI runs marked `action_required` are not evidence of passing tests; require an actual completed run after a human-authored validation commit.
Do not merge on red/blocked checks; tests marked action_required are NOT PASS.
No free physical inventory or simulated electricity may enter Industrial Mode.
