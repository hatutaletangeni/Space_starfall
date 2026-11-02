# STARFALL T19A — Optional RF Analyzer Test Results

## Branch, baseline and rollout

- Source branch: `feature/t19-optional-rf-link-budget`.
- Exact verified precursor T18: `df709d46f52384c2209100670feaeb8522819889`, all three CI workflows passed.
- T19A is the FIRST OPTIONAL T19 SUBFEATURE, **not full T19** and not proof that T18 Scenario 1–4 are complete.
- The original T02/T03/T04 sources and controls remain authoritative. New optional `outpost5.items[].radioT04.budgetT19` is simply a source-owned history. No alternate radio packet/ACK ledger or simulated tester source. Old saves require no migration.

## Real tests

| Gate | Evidence | Conclusion |
| --- | --- | --- |
| Real source model (actual physical T04 LOS) | `node tests/rf-analyzer-t19.test.cjs`: two installed original real Outpost station nodes, real T04 link and original T02 48 V DC served watts; provenance, no fake ACK, tracking edit preserves optional history, 48-record full refusal, explicit history clear, invalid identity and clock rejection, no phantom charge | **PASS** in independent T19A [run 41533506559](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41533506559) |
| Real UI in Chromium offline | `python tests/rf-analyzer-t19-browser.py`: only starting landed world seeded; genuine Outpost UI builds battery/solar/antenna, wires actual source, original T03 physical route available, no radio packet from inspection, breaker OFF→route offline→breaker ON, original tracking mode, user download and file:// reload of the exact T04-source nested history | **PASS** in independent [run 41533506559](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41533506559) |
| Exact source-to-single-file HTML | `tools/build-standalone.py` and `tests/standalone-parity.py`; rebuilt bundle on branch | **PASS** at [run 41533506521](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41533506521), recheck latest commit SHA |
| Full T00–T19 Node/browser engineering suite | `.github/workflows/engineering-ci.yml` full regression, including T18 user-interface expedition simulation and T19 browser | **Final exact branch SHA gate pending**; no full green claim until completed |
| Full original UI Planet A→Planet B rocket/infrastructure/image/lab workflow | No human-driven uninterrupted full mission proof; T08 uses controlled predeploy fixture | **NOT VERIFIED / T18 blocker unchanged** |
| 20 actual player-operated rocket launches, GPU 30-minute stress, ship EVA/truck X and ruins joystick/touch | Prior T18 component/browser tests; T18 no full manual hardware journey | **NOT VERIFIED / T18 blockers unchanged** |

### Real physical vs illustrative telemetry

T19 displays only original `StarfallCommsT03.routeFor` computed physical route/quality/delay/rate and the Outpost T02 source power. The **quality margin in dB** is a logarithmic visualization relative to original 0.08 quality cutoff, not actual measured SNR. The **thermal-noise floor** is an illustrative estimate with assumed temperature, noise figure, and bandwidth. No receiver spectral power sensor is modeled, so actual SNR is **NOT MODELLED**. Display refresh/trace recorder cannot send any T03 traffic; the original powered antenna draws its real operating power while enabled; the read-only assessment has no new incremental wattage.

### Failure and rollback

Failure modes: unpowered/disabled Outpost, nonexistent target, uncommissioned remote counterpart, poor LOS, relay buffer/route blockage, full 48-sample trace, invalid time/identity. All return clear diagnostics without inventing an ACK or changing another asset. Export before clearing history. If localStorage quota is denied, T17's original durable-save warning remains and T19 explicitly reports the trace could not be persisted.

Rollback: verified T18 original code branch; keep T17 FULL MEDIA backup separately when changing `file://` origins. No auto-merge to main.
