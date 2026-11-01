# Update 2 — Test evidence and remaining release gates

## Executed in this environment

| Check | Result | Evidence |
|---|---|---|
| Existing galaxy determinism and catalog | **PASS** | `node tests/galaxy.test.cjs`: 2,368 systems, 2,304 streamed, separation 101.254 larger-star diameters, 1–20 / 0–7 counts |
| New science calculations | **PASS** | `node tests/science.test.cjs`: period/energy/angular momentum invariants, high e, zero i, giant stars, tiny moons, thermal and drag signs, vacuum, compatibility toggle |
| Ten numerically integrated circular orbits | **PASS** | `node tests/orbit-invariants.cjs`: 582,852 fixed steps, energy drift ≤2.24e-13, angular momentum drift ≤1.12e-13; CSV generated |
| Standalone source parity | **PASS** | `python tests/standalone-parity.py`: all eight script modules match source exactly |
| Browser JS initialization with mocked WebGL | **PASS** | `python tests/mock-browser-smoke.py`: 2,368 systems, observatory, body selection, engineering mode/SAS toggles and chart search; no uncaught errors |
| Actual GPU-rendered terrain/lighting | **NOT VERIFIED** | Browser environment prevents WebGL 2; mocked API is not a graphical renderer |
| Real 30+ FPS / GPU memory budget | **NOT VERIFIED** | No GPU benchmark or named hardware result available |
| End-to-end manual flight→land→walk→rover→board→takeoff with engineering enabled | **NOT VERIFIED** | Needs real browser gameplay; default Assisted path retains baseline logic |
| Desktop/mobile visual screen layout | **NOT VERIFIED** | Requires device testing |
| Full 100× Engineering entry under dense atmosphere | **LIMITED BY DESIGN** | Capped physics timestep protects collisions but does not claim exact 100× physical progression |

## Manual acceptance checklist still required

1. Extract ZIP, open standalone HTML in Chrome/Edge, verify loading and a real planet renders.
2. In Assisted mode perform star-chart search, click a star, align, warp and descend to touchdown.
3. Walk down the ship ramp, enter and exit the rover physically, return to the hatch and take off.
4. Test T at 1×, 10× and 100× while standing/driving. Camera must stay above the planet surface.
5. Switch to Engineering while already in safe orbit. Observe nonzero gravity, fuel draw under thrust, orbital prediction and thermal values. Return to Assisted.
6. Open Observatory, verify planet/star selection and JSON/CSV export; verify biosignatures are not fabricated.
7. Confirm night, reflected moonlight and eclipses are unchanged from baseline.
8. Measure FPS, CPU/frame timing and WebGL resource use on the same hardware as baseline; note hardware, browser and baseline numbers.

**Release assessment:** Verified math + mocked integration; real graphical acceptance pending. This is a feature-flagged experimental science edition, not a production-validated physics simulator.
