# STARFALL Update 8 — branch reuse audit, 2026-11-07

The authoritative user specification is the 2026-11-03 Update 8A–8K Markdown. This audit compares branch code, NOT finished-game acceptance.

## Compared branches

- `release/update8k-production-on-current-main-20261106`: diverged (53 commits ahead/25 behind when compared); contained `src/physics/expedition-manifest8k.js`, manufacturing graphics and `tests/industrial-first-product8k-browser.py`. Do not merge its old `flight.js` wholesale over recent main truck fixes.
- `release/update8k-verified-first-production-20261106`: diverged (51 ahead/32 behind); similar manufacturing bootstrap and visual/test integrations. Its branch name is not proof of completed 8K.
- `feature/update8k-bootstrap-visual-fixes-20261106`: diverged (48 ahead/32 behind); candidate distinct physical factory meshes and source-backed cargo rendering. Requires targeted visual review and browser tests before port.
- `update8/integration-repair-8h-8k-20261106`: diverged (18 ahead/24 behind); primarily navigation/browser test integrations and `flight.js`.
- `update8/greenhouse-terraforming-8i-8j-20261106`: diverged (15 ahead/24 behind); inspect its standalone model acceptance before porting rendered planet changes.
- `feature/update-8e-completion-8f-workshops` and `feature/update-8e-aluminum-ore-to-metal`: both ancestors of main at comparison time (0 commits ahead). Do not restore older 8E code as a new feature.
- `feature/update-8h-bounded-native-timewarp-power`: diverged (1 ahead/112 behind); a narrow `native-power-substeps8h.js` and outpost changes. Check against current main's file before any merge.

## Safely ported from existing 8K production branch

Ported `src/physics/expedition-manifest8k.js` and `tests/expedition-manifest8k.test.cjs` without replacing newer runtime files. Loaded the manifest module before `src/flight.js`; initialized exactly once from the original authoritative 8A hold only when genuinely fresh. Legacy game sessions, saves with original materials or physical state, and already persisted flight states must not be granted additional supplies.

This is a **finite pre-manufactured preflight supply**, explicitly allowed by the original specification's Bootstrap paragraph. It is NOT proof of ore→steel/semiconductors synthesis. It includes significant certified machinery kit mass and scarce imported chips, copper and other stocks. Total packed mass and volume must fit existing original 9,000 kg / 16 m3 ship material hold and are independently tested. The loaded manifest uses stable source-owned 8A lot identities and provenance. It must never refill on landing or reload.

## Unported but potentially useful branch work

- `src/engine.js` and `src/physics/outposts-ui.js` on the 8K release branch have visual differences and source-backed machine meshes; integrate only after isolating render changes and measuring GPU/culling impact.
- `tests/industrial-first-product8k-browser.py` is a genuine browser test for first **imported** copper→bare wire with original 8F electrical receipt, 100x clock and reload, but uses a controlled landing fixture. That is NOT a complete independently flown no-cheat second-world 8K expedition.
- Old integration repair browser navigation tests may be useful after adapting them to the current mission hierarchy without loosening test assertions.

## Next release gates

1. Run the real `tests/expedition-manifest8k.test.cjs` and exact-head desktop/mobile standalone parity on GitHub CI and record results (do not claim PASS based on adding a file).
2. Inspect and test 8K physical industry meshes as an isolated patch before merging.
3. Prove actual first production run from the preflight manifest in the playable; distinguish `initial_manifest` imports from mined resources.
4. Finish the raw 8C→8D→8E→8F industrial chain, gas, operational habitat and physical terraforming receipts with full cross-world browser and GPU acceptance.

**Update 8K remains INCOMPLETE.** No full user-driven scenario or GPU benchmark has been demonstrated by this branch audit.
