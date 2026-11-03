# LW-06 — Stellar activity, supernova remnants, and cosmic weather

**Status:** Integrated development slice, stacked on LW05. Do not merge until real Chrome/Edge WebGL2, gameplay, FPS, and save restoration checks.

## Why these effects exist (source → mechanism → observation → consequence)
- **Magnetic activity:** pre-existing star classifications and the CW01 `starFor` element mass model set a seeded activity strength. A deterministic flare pulse leaves the star; its electromagnetic signal arrives after distance divided by the speed of light (299,792.458 scene units per second; one scene unit equals 1,000 m).
- **Charged stellar wind:** inverse-square geometric dilution and occasional flares produce a normalized ionization index, modeled magnetic disturbance and a radio-noise *estimate*. The model has no claimed Sievert dosage, ion-temperature collision fluid, or calibrated space-weather forecast.
- **Planetary consequences:** sunlit solar-power flux is attenuated during strong storm exposure. Existing, powered ship and rover electrical systems use `Power.step`, which charges the protective electrical load to the real existing energy source. The science-field magnetometer reflects modeled magnetic disturbance.
- **Aurora:** bounded local near-field particles appear only if a landable body has modeled atmosphere, meaningful planetary magnetism, and source-linked particle activity. There are no uncaused atmospherically generated auroras on airless moons.
- **Pulsar beams:** existing seeded pulsar types produce a narrow, rotating, double-ended beam. The visual beam orientation is tied to the same deterministic source axis used by the hazard calculation.
- **Supernova → nebula:** a pre-existing `phenomenon: 'supernova'` is modeled as a finite-age remnant; ejecta expand from the actual star-system position with a seeded age, shock speed, evolving gas/dust fractions, and qualitative oxygen/silicon/iron enrichment. A physically continuous mathematical shell replaces the arbitrary pulsating decorative supernova bubble. The remnant has its own source ID. **Existing unrelated molecular clouds remain unrelated**; it would be misleading to claim those primordial clouds were created by the supernova.
- **Engineering outcomes:** stronger modeled radiation reduces solar collection and raises equipment protection energy demand through the existing power budget; no fabricated command success, dropped packet, or damaged satellite is asserted. Field magnetometer readings and Observatory/sector status share the same space-weather model.

## Preserve compatibility
- No galaxy generation changes: seed 742, all 2,368 stars, positions, rings, belts, moons, star/body IDs, saved terrain heights, waypoints and installations stay unchanged.
- No new persistent weather state or migrations: all effects are functions of time, position, existing star-system identity and the galaxy seed. A save/reload computes the same state.
- Fleet & Asset Explorer retains LW05's removal of the entire blue Operations / Actual Status panel; asset tree, search, filters, detail and pin remain intact.
- Eight reused asteroid mesh variants, hydrosphere, weather, caves and geothermal processes retain their existing module owners. Source-linked LW06 visual effects are capped and reuse the existing GPU effects buffer.

## Known scientific/engineering limits
- This is a source-linked pedagogical model, not radiation-hydrodynamic stellar-evolution simulation. The supernova event is a seeded **existing remnant** rather than an explosion that destroys/replaces a star in the original catalog. The legacy star still exists for navigation; a full stellar lifecycle would require a save/schema and orbital migration.
- Remnant shock is a uniform expanding shell with fixed, approximate 2,800 km/s speed and no ambient-medium drag, radiative cooling, MHD shock structure, mass-conserved tracer transport or live star formation.
- Stellar mass and chemical yield priors are approximate; condensed dust fraction is a bounded interpretive estimate. The source composition affects predicted magnetic activity, but no detailed nucleosynthetic reaction network is solved.
- Magnetic storms and RF noise are estimates. They are **not** fake transmitted commands, acknowledged packets, calibrated GNSS errors, or historical space-weather observations. Existing comms owner is unchanged.
- Auroras are a capped billboard visual rather than spectral-line atmospheric radiative transfer or magnetospheric particle tracing.
- Flares use seeded periodic pulses with retarded arrival time. There is no full coronal magnetohydrodynamic CME propagation, stellar rotation/dynamo simulation or spacecraft dose integration.
- The baseline CW/LW01–LW05 browser system and all old saves require live regression testing. No claimed measured frame-rate success or browser GPU validation.

## Offline release gates
1. Checkout `feature/lw06-stellar-causality-spaceweather`, download raw `PLAY-STARFALL.html`, open in Chrome/Edge via file:// with no build tooling.
2. Explore an existing pulsar and supernova-tagged system; observe pulsar-beam orientation, expanding ejecta, and the distinct pre-existing molecular clouds.
3. Inspect Observatory's new magnetic flare, local magnetic disturbance, ionization, shock radius, dust condensation and radio-noise *estimate*. Travel nearer and farther from a star and advance 1x/10x/100x; signals must vary deterministically.
4. Run solar-powered ship and rover during higher modeled flare exposure. Verify the actual existing battery ledger is debited for protective load and the same solar system outputs fewer watts under strong exposure.
5. On a magnetized atmosphere-bearing planet near activity, look for bounded auroral curtains; on an airless moon, there must be no aurora. Verify existing magnetometer readings reflect source-linked disturbance.
6. Check Fleet & Asset Explorer directly displays asset search/tree/details with no Operations / Actual Status panel. Check previous LW05 asteroid belt collision response and LW04 swimming still work.
7. Run `node tests/space-weather-lw06.test.cjs`, all LW01–LW05 tests, CW01–CW06 tests, `python3 tools/build-standalone.py`, `python3 tests/standalone-parity.py`, and real WebGL2 offline gameplay and FPS.

## Rollback
Revert LW06 branch to LW05. No save migration necessary, and older modules do not depend on LW06. LW05 asset-only Fleet Explorer remains the correct baseline.
