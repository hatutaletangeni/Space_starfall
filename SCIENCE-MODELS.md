# STARFALL Update 2 — Scientific model and dimensional audit

This is a **science-focused option layer** for an existing game, not a NASA-grade mission simulator. Every numeric scientific profile is procedurally **estimated**, not a real telescope measurement. New physical calculations do **not** silently replace the old world generator.

## Feature and unit boundaries

| Quantity / assumption | Internal representation | Fidelity | Compatibility limitation |
|---|---|---|---|
| Star, planet, moon positions | `Float64` JS `Number` arrays in scene coordinates | Deterministic procedural | Game distances deliberately compressed/fictional |
| Celestial radius and distance | `1 scene unit = 1,000 m` by explicit conversion | Compatibility conversion | Body appearance and vehicle/astronaut mesh size are **not** a physically coherent scale |
| Gravitational constant | `6.67430e-11 m³ kg⁻¹ s⁻²` | Physical law | Depends on estimated mass |
| Stellar mass | Seeded, star-type bounded ranges, in kilograms | Procedural approximation | Artistic star radius does not determine mass |
| Stellar luminosity | `4πR²σT⁴`, Stefan–Boltzmann blackbody | Simplified physical model | Star temperature and effective emission radius approximate; pulsars use a separate 12 km emission radius |
| Bulk density and mass | Seeded type-dependent density; `M=(4/3)πR³ρ` | Procedural approximation | Shallow real-planet diversity, not accurate interiors |
| Surface gravity | `g=GM/R²` | Physical law + approximate inputs | Different from historical in-game `gravity` HUD, which remains unchanged |
| Physical orbital period | `T=2π sqrt(a³/(μ_parent+μ_body))` | Kepler two-body law | Old hand-authored period often differs dramatically |
| Legacy orbit compatibility | `μ_compat=4π² a³/T_legacy²` | Artificial compatibility mapping | Only for *experimental visual* orbit propagation; **not** physical stellar mass |
| Kepler orbit propagation | Elliptic eccentric anomaly Newton solve, 3-D orbital elements, double precision | Analytic two-body | No N-body perturbations, moons/systems don't gravitationally interact |
| State-vector diagnostics | `ε=v²/2−μ/r`, `h=|r×v|`, `a=−μ/(2ε)` | Physical law | Orbit undefined for degenerate zero angular momentum; displays unavailable rather than NaN |
| Engineering flight dynamics | `a=−μ r/r³ + F_thrust/m + F_aero/m`, velocity Verlet | Simplified central gravity with bounded step | Closest-body patched gravity approximation, not a rigorous SOI/N-body transition |
| Engine fuel | `mdot=T/(Isp·g0)` and `Δv=Isp·g0 ln(m0/mf)` | Ideal rocket approximation | Constant thrust and Isp; generic craft mass independent of appearance |
| Warping | Original faster-than-light game mechanic | Fictional | Separately resets local physical state; never converted to kinetic energy |
| Atmosphere | `ρ(h)=ρ0 exp(−h/H)`, `p=ρ R T` at reference level | Simplified model | Types use approximate scale heights / temperature lapse; gas giants have atmosphere but no solid ground |
| Drag | `F_D=½ρ v_rel² C_D A`, opposite atmosphere-relative velocity | Approximate aerodynamics | Orientation-dependent effective area, no CFD; atmosphere rotates with planet |
| Lift | Optional `½ρv² C_L A` in transverse vehicle direction | Simplified | Default lift disabled; not full aerodynamic stability model |
| Entry heating | Proxy `∝sqrt(ρ) v³ A` | Gameplay physical correlation | **Not** actual thermal protection qualification; units model coefficient tuned for play |
| Thermal cooling | Radiative `εσA(T⁴−T_env⁴)`, heat capacity | Simplified heat balance | Default nonfatal mode, temperature capped at 5,000 K to avoid numerical overflow |
| Planet temperature | `Teq=[L(1−A)/(16πσd²)]^(1/4)` | Physical law with simplifying assumptions | Uniform redistribution, no greenhouse or detailed climate |
| Sunlight / moon phases | Existing illumination scene geometry + approximate view-angle/eclipses | Geometry-derived | New Observatory phase is spherical-line-of-sight estimate; renderer stays unchanged |

## Explicit gameplay / physical mismatches

1. The historic galaxy uses **2,368** selectable stars. Its nearest star spacing (at least 100 *larger-star diameters*) is a **gameplay rule**, not a typical astronomical separation.
2. Aesthetic planet/moon radii and orbital periods were established before any mass model existed. Changing their periods would relocate existing saved objects. For that reason old orbits remain the default; the optional Kepler visual toggle uses a compatibility gravitational parameter derived from those historical periods.
3. The science model's gravitational mass is calculated separately from the *compatibility* gravitational parameter. Do **not** quote `μ_compat` as a measured stellar mass.
4. Original ship and player meshes are not metrically scaled against planets. Engineering craft dry mass, fuel, frontal area and heat capacity are explicit **generic spacecraft assumptions**, not calculated from the displayed mesh.
5. Flight physics is optional. **Assisted** retains original controls and landings; **Engineering** uses new central-gravity integration and finite fuel. The switch is saved explicitly in `scienceSettings.schema=1`. An experimental orbit toggle is not stored across sessions.
6. At high time warp, unpowered motion in deep vacuum uses analytic Kepler coasting. Atmospheric/active-engine motion is integrated with capped substeps to avoid tunneling, so physical-time progression under high warp is **intentionally limited** in those states. This is a safety approximation, not a physically exact 100× simulation.
7. Landed surface attachment uses the original planet-local anchor and remains independent from Kepler velocity calculations.
8. Current predicted trajectory uses the active body's central gravitational field and ignores thrust, atmospheric drag and future SOI changes. The plot is approximate even when orbit invariants pass.
9. The `Hold` assist preserves the last manual attitude in a rigid-orientation model; Prograde and Retrograde steer toward current local velocity. Rotational inertia and control-wheel torque are future engineering tasks.
10. The science panel shows *estimated* biosignatures as **unconfirmed**; it does not invent discoveries.

## Source modules / feature flags

- `src/physics/foundation.js`: SI constants, deterministic celestial profiles, Kepler propagation and state-vector diagnostics, equilibrium temperature, shared clock.
- `src/physics/flight-model.js`: atmosphere, heat, fuel, drag, flight step and analytic unpowered propagation.
- `src/physics/orbit-bridge.js`: **disabled by default** experimental replacement for visual orbit positions.
- `src/physics/observatory.js`: Observatory, JSON/CSV exports, engineering flight computer and trajectory visualizer.
- `src/physics/science.css`: additive science UI styling.
- `src/flight.js`: small guarded integration hooks; original Assisted behavior is unchanged by default.

## Verification boundaries

Pure math tests cover high eccentricity (up to 0.995), zero inclination, extremely small moons, large stars, 10 unpowered numerically integrated circular orbits, angular momentum and energy conservation, thermal and aerodynamic signs, 100× deterministic time, and baseline visual-orbit flag parity.

The standalone game has been exercised using **mock WebGL**, verifying initialization, control wiring and basic Observatory interactions. That is **not a GPU-rendered visual test**. Full rendered frame rate, visual appearance, full land→EVA→rover→hatch gameplay and all desktop/mobile cases must be verified on a real WebGL 2 browser before declaring production-ready.
