# CW-01 — Celestial composition schema (candidate)
Version 1 — 2026-11-03

## Purpose and impact
Attach deterministic **modeled priors** to existing body IDs without modifying `src/galaxy.js`, orbit positions, visible terrain, old saves, or T19A/UI20/UI21. New pure model: `src/physics/celestial-composition-cw01.js`; existing `StarfallPhysics.scienceProfile(galaxy,body)` includes `composition`. `index.html` loads the model before physics. No persistent save key added; existing saves remain authoritative. This is **CW01 data foundation only**, not a material renderer or weather/geology retrofit.

## Schema, ownership and units
`StarfallCompositionCW01.SCHEMA_VERSION === 1`, `forBody(body,galaxy)`, `bodyFor(body,seed,context)`, `starFor(star,seed)`. The canonical celestial object's existing ID, kind and legacy type are preserved. `bulkComponentMassFractions` and `majorMaterialMassFractions` are dimensionless fractions of bulk mass; `atmosphereMoleFractions` is a fraction by moles (never confuse the two). `approximateDensityKgM3` is a procedural prior, **not a measurement** and not used to override the established mass/gravity model. `elementMassFractions` and stellar metallicity are mass fractions. `layers` summarize component allocations; they are not thicknesses or geophysical structure simulations. No coordinates are stored. Vacuum atmospheres use an empty table, never invented gases. `phaseAssessment` is explicitly unknown until future pressure–temperature coupling is validated.

## Determinism, priors and limitations
Seed + existing body ID + schema version + body type select a repeatable, bounded mixture. `version=1` is immutable: future distribution changes require a new version and explicit compatibility policy. Rock/metal/volatile and gas/ice/rock are broad *compositional categories*, not measured mineral inventories. Star H/He/metallicity is a seeded composition prior, not inferred from spectroscopic observations. Atmosphere priors are derived from existing legacy classifications and are **not yet** identical to the pressure/chemistry from other existing simulation modules; no one should claim atmospheric reconciliation complete. Legacy moon science reports vacuum in `foundation.js`; CW01 keeps that compatibility, even if its display metadata says trace gases. This discrepancy is recorded and awaits a future verified science adapter; do not change saved worlds silently.

## Risk and rollback
The existing physics profile fields are untouched except a new nested `composition` key. CW01 must not modify galaxy RNG, star count, orbit state, terrain geometry or save serialization. Disable by reverting the index script inclusion and the small scienceProfile additions, or revert this feature branch. Unavailable composition returns `null` via guarded adapter.

## Verification
Unit command: `node tests/composition-cw01.test.cjs`.
Mandatory before any merge: original test suites; `node --check src/physics/celestial-composition-cw01.js`; standalone builder + parity test; actual Chromium file:// with and without WebGL; old-save restoration; observatory body profile; galaxy ID snapshot; moon vacuum; 1x/10x/100x. These have **not been run** by this session. GitHub connector permits source edits, not a true in-browser test environment. No claim that standalone is synchronized or E2E passes until those checks run. Continue only after the source-to-standalone discrepancy is resolved.
