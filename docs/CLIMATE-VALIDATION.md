# Climate model verification and forecast limits

The shipped climate model now uses **24 equal-area latitude bands**, a conservative spherical finite-volume transport operator, globally normalized seasonal sunlight, nonlinear Stefan–Boltzmann cooling, implicit surface/deep-reservoir heat exchange, and an enthalpy-coupled finite water cycle. Ice can sublimate and consumes the corresponding latent energy. Water saturation uses Murphy–Koop ice vapor pressure and the IAPWS liquid-water saturation correlation.

The earlier six-band thermal model used planar neighbor exchange, a non-normalized latitude sunlight multiplier and linearized cooling. Those approximations are replaced in the actual runtime, not just in a demonstration solver. Existing six-band saves split each band into four equal-area children while retaining mean anomalies, total water, recorded work and stored heat. Terrain and world composition are preserved.

## What is established

Run `node tools/validate-climate8j.cjs`. This writes machine-readable results and a Markdown table under `artifacts/climate-validation/`. The checked-in [results](climate-validation-results/climate-validation.md) and [full numbers](climate-validation-results/climate-validation.json) were generated with the same command and solver version. CI regenerates the results and fails if a stated numerical tolerance is exceeded. The checked-in report records the local reference run; harmless last-digit differences between JavaScript platforms are not treated as forecast errors.

| Check | Independent reference or requirement | Acceptance limit |
|---|---|---|
| Solar budget | Global mean incident sunlight equals stellar flux / 4 across seasons and 6/12/24 bands | 1e-10 W/m² |
| Latitude transport | Cell-averaged Legendre P2 spherical eigenmode, eigenvalue −6D | 1e-10 W/m² |
| Closed poles | Sum of transport tendencies is zero | 1e-10 W/m² |
| Two-layer response | Analytical matrix-exponential solution using published Geoffroy reference parameters; 1, 10, 50, 100, 200 years | 0.001 K surface and deep |
| Accumulated heat | Surface + deep sensible storage equals integrated radiative work | 0.01 J/m² |
| Time-step convergence | Halving the daily step halves first-order error | Ratio 2 ± 0.03 |
| Nonlinear radiation | Independently calculated blackbody equilibrium | 1e-6 K |
| Earth emission-temperature consistency | S=1360 W/m² and albedo=0.3 give an effective emitting temperature consistent with 254.5 ± 0.5 K | 0.5 K |
| Saturation properties | IAPWS thermodynamic check points and Murphy–Koop ice formula reproduction | Relative liquid error 1e-4; ice 1e-5 Pa |
| Tiny interventions | Positive 1e-20 W/m² forcing retains a positive anomaly | No artificial zero or magnification |

Additional tests cover nonlinear strong warming, invalid inputs, ice-sublimation latent energy, water conservation, conservative save migration, native runtime integration and sensor/weather agreement. Global climate intervals are bounded to daily calls and hourly internal steps, preserving background catch-up and offline save behavior.

## What is not established

These results verify numerical equations and specified reference cases. The Geoffroy case is an analytical **model benchmark**, not an independent Earth-temperature hindcast. The Earth emitting-temperature check is a top-of-atmosphere budget consistency test; it does not predict Earth's surface temperature. IAPWS points verify a thermodynamic correlation, not cloud microphysics.

Generated world inputs are still composition, temperature and water-inventory priors. Their greenhouse, cloud and exchange parameters have not been calibrated against observations. Earth-style logarithmic gas forcing is an extrapolation for CO2-rich, vacuum, very cold or otherwise alien atmospheres. The UI marks inferred inputs and out-of-benchmark regimes. Numerical verification cannot establish their planetary forecast accuracy. That requires suitable observations or independent high-fidelity comparisons, parameter estimation, held-out hindcasts and uncertainty/error evaluation for the intended planetary regime. No such observations are present in this game repository.

The model is a zonally averaged energy-balance model. It does not resolve 3D winds, individual weather fronts, spectral radiative transfer, chemistry, ocean circulation or ecological habitability. Six-to-24-band refinement improves spatial resolution without changing that model class. The disclosed bounds are retained rather than relabeling the model as a validated planetary forecasting system.

## Equations and parameter provenance

For x=sin(latitude), diffusion is D ∂x[(1−x²)∂x T], with zero flux at the poles. Face fluxes telescope so latitude exchange cannot create net heat. Daily mean insolation integrates solar hour angle over equal-area cells; quadrature is normalized to the exact spherical mean S/4.

The thermal kernel solves the implicit discrete equations Cs ΔTs + Cd ΔTd + ΔHphase = Δt(F − ΔOLR), with Cd ΔTd = Δt γ(Ts,new − Td,new). Production ΔOLR uses εσ[(Tbase+Ts,new)^4−Tbase^4], evaluated in factored form to preserve tiny anomalies. The solve enforces an energy residual tolerance. Phase enthalpy is Lv Mvapor − Lf Mice. Sublimation therefore uses Lv+Lf per kilogram, and no water phase appears without source mass and energy.

Reference-only two-layer parameters are Cs=7.3 W yr m⁻² K⁻¹, Cd=106 W yr m⁻² K⁻¹, γ=0.73 W m⁻² K⁻¹ and λ=1.13 W m⁻² K⁻¹, with 365.25-day years. The benchmark reproduces that EBM's two exponential modes. These values are not silently fitted to every game world. Production capacities and other procedural-world assumptions remain documented in the [industrial climate model](ORBITAL-BASELINE-COUPLED-CLIMATE.md).

## Primary references

- [North, Cahalan & Coakley (1981), Energy balance climate models](https://ntrs.nasa.gov/citations/19820032405), DOI 10.1029/RG019i001p00091: spherical diffusion and analytical EBM structure.
- [Geoffroy et al. (2013), Transient Climate Response in a Two-Layer Energy-Balance Model, Part I](https://doi.org/10.1175/JCLI-D-12-00195.1): analytical two-layer response and parameter calibration. Reference parameters also appear in [Fredriksen & Rypdal (2017)](https://doi.org/10.1175/JCLI-D-16-0877.1).
- [NASA CERES science and energy budget](https://ceres.larc.nasa.gov/science/): observational energy-budget context and distinctions between net radiation, heat uptake and surface temperature.
- [L'Ecuyer et al. (2015), The Observed State of the Energy Budget in the Early Twenty-First Century](https://doi.org/10.1175/JCLI-D-14-00556.1): rounded Earth effective emitting-temperature consistency target.
- [IAPWS SR1-86(1992)](https://iapws.org/relguide/Supp-sat.html): ordinary-water saturation pressure, triple-to-critical range. Below the triple point, the [Murphy & Koop (2005)](https://doi.org/10.1256/qj.04.94) ice correlation is used; its stated >=110 K domain is tracked. Above the critical point, the simple phase model is explicitly out of range.
