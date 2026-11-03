# Update 8E — release gate (draft)
| Gate | State | Evidence |
| --- | --- | --- |
| 8A physical lot debit / output and tailings | PASS (isolated) | `tests/refinery8e.test.cjs`; executed V8 full-lot scenarios |
| Input grade and exact mass balance | PASS (isolated) | Four modeled recipes |
| Finite consumed ship battery | PASS (model + code inspection) | `refineryAdvance8E` explicitly debits `vehicleStore.get('ship').state.energyJ` |
| Save serialization / idempotent receipt | PASS (model), BROWSER NOT VERIFIED | `SF.save` hooks; snapshot/rebuild tests |
| UI present in editable source | PASS (source) | `refinery-ui8e.js` appended under UI21 Engineer |
| Physical operator proximity / workshop gate | CODE PRESENT, GAMEPLAY NOT VERIFIED | `refineryContext8E` |
| Full 8E chemical plant / high-temperature equipment | NOT IMPLEMENTED | Further stations, reagents, kinetics, pipes and tanks required |
| Source vs standalone offline parity | NOT VERIFIED | Standalone not yet rebuilt |
| Old saves, 1×/10×/100× actual browser | NOT VERIFIED | Actual WebGL2/browser not run |
| Regression and GPU performance | NOT VERIFIED | Existing suites and hardware checks pending |

**Release decision: DRAFT / DO NOT MERGE INTO MAIN as complete 8E.**
