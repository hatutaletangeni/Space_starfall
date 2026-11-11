# Climate solver benchmark report

Solver version: 3. Numerical/reference checks: PASS. Planetary forecast skill: **not established**.

| Benchmark | Measured error | Acceptance limit | Result |
|---|---:|---|---|
| Spherical solar budget, all tested seasons | 1.7053e-13 | 1e-10 W/m² | PASS |
| North spherical P2 diffusion eigenmode | 2.6978e-14 | 1e-10 W/m² | PASS |
| No net energy from latitude transport | 1.3323e-15 | 1e-10 W/m² | PASS |
| Geoffroy two-layer step response, surface | 1.3653e-4 | 0.001 K | PASS |
| Geoffroy two-layer step response, deep ocean | 6.8216e-6 | 0.001 K | PASS |
| Two-layer accumulated energy closure | 8.2016e-5 | 0.01 J/m² | PASS |
| Time-step refinement | 7.6663e-4 | 0.03 ratio error | PASS |
| Nonlinear blackbody equilibrium | 2.7759e-10 | 0.000001 K | PASS |
| Earth effective emission temperature consistency | 3.1364e-2 | 0.5 K | PASS |
| Water saturation reference points | 2.3302e-5 | 0.0001 relative | PASS |
| Ice saturation at 200 K | 1.4462e-6 | 0.00001 Pa | PASS |
| Microscopic forcing retention | 0.0000e+0 | 0 failure count | PASS |

These tests verify equations, conservation and stated reference cases. They do not calibrate or validate the seeded planet inputs or establish forecast accuracy for Earth, other planets or alien atmospheres. See docs/CLIMATE-VALIDATION.md.
