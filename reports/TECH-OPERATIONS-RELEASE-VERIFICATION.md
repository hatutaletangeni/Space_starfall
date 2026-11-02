# STARFALL T18 — Technology Operations Release Verification

**Candidate branch:** `feature/t18-end-to-end-release-verification`  
**Rollback baseline:** verified T17 `3090f58847a62250a0c7993a592ac47ae2ef7191` on `feature/t17-save-integrity-and-recovery`.  
**Release decision:** **RELEASE CANDIDATE ONLY**. Do not merge to `main` or mark full engineering expedition certified while critical unverified manual journeys remain. The original T11 on `main`, and T12–T17 independent branches, remain available.

## Evidence rules

| Evidence category | Meaning |
| --- | --- |
| **PASS — source/Node** | Exact original model assertion passed on the named commit; NOT proof of interactive or visually correct player experience |
| **PASS — Chromium/SwiftShader** | Real offline Chromium + software WebGL replay, original program handlers; a controlled landed starting-location fixture may be used and must be named |
| **PASS — full player/GPU** | Only after an actual on-device run with recorded steps, photo/physics proof and measurements; **none reported in this stage** |
| **FAIL** | Test was executed and did not satisfy the explicit assertion, or the exact latest CI run is red |
| **NOT VERIFIED** | No test demonstrated this complete end-to-end path; never infer PASS from nearby model suites |

### Prior stage certification

T17 completed all its automated gates at commit `3090f58847a62250a0c7993a592ac47ae2ef7191`:

- Full engineering regression: [run 41529362958](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41529362958) — PASS.
- Targeted full media/restore Chromium: [run 41529362974](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41529362974) — PASS.
- Standalone exact build: [run 41529363160](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41529363160) — PASS.

These are a stable branch **baseline**, not the current T18 release conclusion.

## T18 release matrix

| Scenario / exact assertion | Status | Evidence / limitation |
| --- | --- | --- |
| Original 3D starfield renders offline; 2,368 star systems, no HTTP(S) dependency | **PASS (inherited browser)** | Original Update7 hardening and T18 source browser baseline. Headless software WebGL only. |
| Fresh save does not create remote rovers, orbital equipment, ACKs or received photos | **Tested in T18 journey; verify latest green run** | `tests/release-gate-t18-browser.py` tests actual fresh source owners before landing fixture. |
| Eight real UI-built Outpost structures, seven legitimate original power wires, actual 48V grid and switch outage/recovery | **Tested in T18 journey; verify latest green run** | Only initial landed location seeded, not artificial assets. Real `outpost-place`, `outpost-connect` and `outpost-toggle-power` DOM event handlers. Source measurements and asset IDs in actual CI artifact. |
| Onsite physical-time field instrument and science Journal provenance | **Tested in T18 journey; verify latest green run** | Actual `field-measure` UI, finite measurement duration, real original stored Journal. |
| Valid Workbench change modifies source rover battery; undo returns original part without free energy | **Tested in T18 journey; verify latest green run** | Actual original `wb-slot-*`, `wb-apply`, `wb-restore-t15` UI; no direct `vehicleStore.apply`. |
| Outpost/wiring/science record/services survive `file://` reload and download archive | **Tested in T18 journey; verify latest green run** | Original `SF.save()`, actual localStorage and T17 export UI. |
| Planet A → Planet B predeployed real 4-hop powered route, finite data and genuine offscreen 7F Planet B photo | **PASS — controlled predeployed model integration only** | `tests/interplanetary-t08-browser.py`: real T02/T03/T04/T05/T08 route, blackout, ACK, image bytes and Journal after reload; **fixture preplaces** Planet A & B stations and deployed rover via original Store APIs, so it is **not** a completely UI-built/player-launched expedition. |
| **Scenario 1 — player builds both bases, physically delivers rover, stays on Planet A and completes distant science + genuine photo + lab receipt** | **NOT VERIFIED (release blocker)** | No test proves full original construction, physically force-integrated rocket insertion, autonomous mission control, remote photo/number reading, full downlink and source-lab custody all through UI as one uninterrupted run. No radio stubs allowed for PASS. |
| **Scenario 2 — 7B 2-stage real player-controlled orbital campaign, daylight/eclipse and source 7C + 7F imaging + receiver outage/recovery** | **NOT VERIFIED (release blocker)** | T07/orbital and 7F component/browser suites exist; no complete two-rocket UI-to-orbit-to-image-to-map mission. |
| **Scenario 3 — astronaut-executed entire base including habitat airlock, T10 physical sample and T13 ship/rover service with visit/revisit** | **PARTIAL — component tests; complete journey NOT VERIFIED** | T09 (habitat gas), T10 (lab custody), T12 (winch), T13 (ship energy) verified independently via controlled software fixtures. T18 adds original UI build/wire/measure/backup test. All operations as one astronaut journey remain unverified. |
| **Scenario 4 — ramp walking, X enter/driving/exiting truck, rover safe-stop/recovery, ruins X priorities, remapped controls, touchscreen** | **NOT VERIFIED (release blocker)** | Physical original code and earlier UI smoke exist, but no unbroken full keyboard/touch-controlled player journey. Do not infer PASS from fixture landing or button existence. |
| 20+ real UI rocket launches with actual stable orbit; heavy constellation; multiple rovers; full data/energy buffers and recovery | **NOT VERIFIED (stress blocker)** | Earlier 7B model tests do not substitute for 20 valid real UI-driven launches. New admission cap tests preserve old source records but do not prove a saturated live expedition. |
| T17 portable full camera-byte backup, corrupt/wrong seed rejected; last known good rollback | **PASS — inherited real browser, synthetic structural migrations only** | Exact T17 tested base. Authentic original 6J/Update 7 personal save fixtures unavailable, so real migration remains NOT VERIFIED. |
| Offline headless software WebGL p50/p95/p99 and JS heap observations | **Tested in T18 journey; verify artifact** | `artifacts/t18-release/release-software-webgl.json`; measured RAF wall-time, NOT hardware GPU. CI captures real screenshots only if reached. |
| Real user device Chrome/Edge GPU p50/p95/p99, VRAM trend, contextual WebGL errors and 30+ minute play | **NOT VERIFIED (release blocker)** | Hardware details and user-machine measurements not supplied; no invented FPS/VRAM results. |
| T00–T17 Node/browser inherited regression, deterministic source/one-file parity and T18 UI integration | **Latest CI gate: inspect workflow** | Full regression in `.github/workflows/engineering-ci.yml`, standalone `build-t18-standalone.yml`, independent `t18-real-ui-release.yml`. Earlier run success on a different SHA is not a pass on the newest commit. |

## Actual release evidence files

The latest successful **T18 End-to-End Release Journey (Software WebGL)** workflow generates downloadable GitHub Actions artifact **`t18-real-ui-software-webgl-evidence`** containing three actual screenshots, `release-software-webgl.json` with physical-source evidence and measured percentiles, plus `release-gate-verdict.json`. The gate `tools/audit-release-t18.py` checks source IDs, power bounds, unique placed components, wires, paid observation, after/before vehicle energy and screenshot byte existence. It **always** returns verdict `RELEASE_CANDIDATE_ONLY` while the full journey blockers above remain.

GitHub Actions HTML preview and artifact are not manufactured here; missing artifacts after a failing run are **NOT VERIFIED** rather than screenshots claimed as captured.

## Severity-ranked unresolved issues / verification gaps

**P0 — Full distant expedition gate is unproven (verification gap, not a newly observed code defect).** Reproduce by performing both UI-built power/antenna bases on separate planets, original launch-pad + 7B rocket carrying the rover to Planet B and obtaining actual orbit/capsule deployment, then remote real 7D SAMPLE/7F CAPTURE, T03 ACK and T10 lab receipt back on Planet A. Record original IDs, watts and camera binary. A controlled predeployed T08 fixture does NOT meet this condition.

**P0 — Automated control and repeated launch-stress gate is unproven (verification gap).** Reproduce by physically exiting ramp, navigating truck, boarding/exiting by X, recovering parked rover and driving back; repeat 20 physically valid original Rocket Lab launches to stable orbit. Record failures, orbits, source fuel and recovery before considering full release.

**P1 — Cross-database crash after T17 image transaction but before localStorage write remains not ACID (documented architectural limitation).** Stop/kill browser at those precise transaction boundaries. Verify external FULL MEDIA backup restores it. Automatic exception checkpoint protects ordinary errors but cannot guarantee restoration after process crash; no ungrounded 'atomic disk' claim.

**P1 — Real GPU/memory/performance long-duration data missing (verification gap).** Reproduce on user's actual hardware in Chrome/Edge with original game; record GPU driver, browser version, frame-time percentile, heap/VRAM, blank frame/context loss and camera capture latency over at least 30 minutes.

**P2 — Actual original 6J/first Update 7 user saves absent (fixture/evidence gap).** Reproduce import using **authentic** saved blobs, verify every asset ID, radio receipt and real 7F pixels after origin migration. Existing synthetics are structural model tests only.

No fabricated high-priority runtime bug is asserted without a failing reproduction. Any T18 CI failure on a specific current SHA should become an explicit **FAIL** with its associated log, not silently be called an existing unverified item.

## Suggested next order

1. Make Scenario 1 a true UI-built, non-predeployed two-planet flight/communication mission with original radio ACK + 7F real bytes; record route and energy ledger at each step.
2. Automate real rocket launches to stable orbit and all satellite/orbital image/swath/downlink invariants in one campaign, including true antenna dark/reconnect.
3. End-to-end astronaut walking/drive/ruins controls on physical browser input and separate touch checks.
4. Stress 20+ UI launches, many rovers, storage caps/remote blackouts, 100× timeline/restart and long galaxy revisit in Chrome/Edge.
5. Record actual hardware GPU benchmark and verify authentic migration files before full user-facing release.

**Final position:** T18 may be shared as a **testable release candidate**. Full STARFALL scientific/engineering operations objective remains **PARTIAL / NOT VERIFIED** until these end-to-end conditions pass. This is not a claim of a certified full game.

**Rollback & links:** Candidate source/standalone live under the T18 branch; known verified T17 source ZIP at `https://github.com/hatutaletangeni/Space_starfall/archive/refs/heads/feature/t17-save-integrity-and-recovery.zip` (plus user exported full media save). No merges into main or older branches.
