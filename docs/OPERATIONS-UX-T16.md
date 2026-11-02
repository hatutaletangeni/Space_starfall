# STARFALL T16 — Compact Source-Truth Operations Interface

## Isolation / baseline

Based on verified T15 `feature/t15-asset-manager-real-configs` at `a09be277975a68cecf9669e7241342c8484d0d39`. T15, T14, T13 and T12 release candidates, plus the existing `main`, remain independently available. No changes to 3D flight, physics integration, original ramp or truck X enter/exit, ship hull or rover rendering, gameplay resource requirements, satellite ephemeris or 7F camera renderer.

T16 adds only a pure **read-only** adapter `src/physics/operations-t16.js`, a narrow UI adapter `operations-ui-t16.js`, and scoped CSS. Its data is **derived** live from the existing original module owners. There is no `SF.operationsT16` save key, no added gameplay state machine or separate ACK/photo/event store. Historical existing T00–T15 data remain readable.

## Source-to-card mapping

| Card | Actual owner | Meaning / caveats |
| --- | --- | --- |
| Spacecraft and local science rover | `StarfallVehicles` + actual T02 power solver + T15 module state | Existing battery joules, rated capacity, actual enabled bus mode, load watts, temperature and health. Legacy optional power mode is **unconfirmed**, not a measured voltage. Surface rover missing a same-world pose receives an explicit undeployed fault. |
| Expedition truck | Original `RT.truck` and T12 operations | Real truck battery, occupied/parked status. Physical X boarding/winch/field repairs remain their existing actions. |
| Deployed rover | Original `LaunchUI.store.rovers` / T06–7D + T03 | Real source charge, onboard numeric records, last remote tick, original routing/ack. Emergency STOP remains in Rocket Lab and depends on link. |
| Observatory satellite / relay | Original `LaunchUI.store.satellites[].ops7c` and T07 | Real onboard energy, sun/eclipse generation, power load, last simulated tick and 7C storage; no fabricated pass. Next passes are explicitly delegated to the existing PREDICT NEXT ORBIT command (expensive, so not called every refresh). |
| Outpost antenna / battery / lab / habitat | Original `OutpostUI.store.items` + T02 powerReports | Actual connected power, source Joules/solar and original sample records. Absence of bus report is not quietly treated as 'powered'. |
| Mission camera | Original 7F photo/job metadata + T03 ACK | Queue/capture/onboard/transmission states; source image is not viewable without original actual 7F downlink and indexed photo bytes. 7C numeric satellite terrain sensor is not a 7F image. |
| Research and Workbench | Original StarfallResearch7E Store + T15 actual vehicle modules | Status is advisory only. User actions call the original Workbench, not a second install operation. |
| Rocket Lab | Original launch7 rocket/rover/satellite records | Bounded mission readout, no assumption of receipt on remote command acceptance. |

The existing open panels now include a small source-backed operational block: Reconnaissance main panel, Rocket Lab, Satellite Operations, Outposts, Mission Photos, Field Science, Workbench, Research Bench and Asset Manager. Equipment selection routes back to **original** UI controls rather than submitting fake alternate commands. Asset selection is limited to real ship/rover/truck and actual saved launched/deployed/constructed entities. No phantom satellite is shown to a pre-launch old save.

### Four observable phases

The T16 vocabulary is `READY` → `COMMAND SENT / IN PROGRESS` → `ACTUAL COMPLETION / RESULT` → `RECOVERABLE FAILURE`.

Actual **T03 ACKED** = completed packet; `RECEIVED` still awaiting final ACK = in progress; `WAITING_FOR_ROUTE`, `OFFLINE`, `QUEUED_AT_NODE`, `TRANSMITTING`, `IN_FLIGHT` do **not** imply completed job; `FAILED/EXPIRED` become recoverable failure. Only a 7F image with `status=downlinked` and a finite original `receivedAtS` may display PHOTO RECEIVED. All other image states are queued/onboard/transferring/fault, never an image-ready claim. For the original `T03.lastLink` there may be an exact source-measured delay/bandwidth/quality, otherwise the UI explicitly displays **NOT RECORDED**; no invented RTT or interstellar route.

A card includes source ID, system/world, power and charge, supply/load power (where available), local and last remote simulation times (not guessed lag), actual ACK and packet-byte progress, photo receipt and pending count, stored observations, health, temperature, warnings and recovery advice. When route lost, advise checking actual receiver, power and LOS; when storage full, advise real export/downlink; when battery low, advise actual solar/wired charging. Simplified fictional fuel-independent generators and modeled science are marked explicitly.

The compact operational event log derives at display time from original T03 packets, 7F photos/jobs, T15 service events, T01 mission events and T10 laboratory receipts. Filter by actual asset, severity and mission where a source ID exists. **No new permanent event history** is added. Existing game save limits and owner records are not silently truncated by T16.

### Accessibility / performance

- Existing high-contrast vibrant blue visual identity and panel dimensions are retained. No global navigation rewrite, custom camera interactions or new mandatory interface.
- T16 focus handler restores focus to invoking button when possible; Tab and Shift+Tab are trapped only inside a genuinely visible modal. Escape and existing key remaps are untouched; the original flight input implementation already suppresses flight controls behind visible dialogs/text inputs.
- UI refresh is bounded to one pass at least 1.5 seconds apart, only for visible dialogs, and skips identical DOM card payloads. No high-cost orbital pass prediction, full-world rendering or photo decode is called on a timer.
- Descriptive labels and a status-only recent log remain accessible on mobile. The existing physical rover STOP / EMERGENCY STOP (route dependent) is unchanged.

## Tests and release limits

- `node tests/operations-t16.test.cjs`: all four truth phases, no zero-delay/unknown signal quality invention, ACK vs in-flight vs failed, received photo timestamp gate, no magic image, external source Joules, thermal/power/storage/route warnings, source event filtering and no source mutation.
- `python tests/operations-t16-browser.py`: actual `file://` Chromium/SwiftShader render into controlled saved landed world. New panel and all existing modals mount source status, pre-launch saved game has no deployed satellite, real original T03 packet queue produces **pending**, not ACK; log/severity filter, original Workbench button, modal focus trap and preserved emergency STOP, then reload.
- All prior T00–T15 Node and Chromium suites and strict standalone parity remain mandatory. `PLAY-STARFALL.html` is rebuilt from source by GitHub Actions.
- **Not proven:** uninterrupted manually flown Planet A → Planet B → original 7F image downlink → local T10 analysis, actual keyboard/ship ramp/truck X under player input, laptop GPU frame pacing, satellite next contact accuracy on arbitrary interstellar bodies, or real-hardware RF link metrics. These still require T18 release missions. No screenshots claimed unless a screenshot was actually captured.
- PR remains draft and unmerged until latest CI full browser proof and human manual acceptance. Rollback is the verified unchanged T15 branch; current `main` remains T11.
