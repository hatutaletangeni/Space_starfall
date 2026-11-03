# STARFALL T17 — Test Results and Release Gate

**Branch:** `feature/t17-save-integrity-and-recovery`, based on T16. Last known good non-T17 rollback: `feature/t16-operations-telemetry-ui`; T15 verified fallback also remains unchanged. No merge to `main`.

## Test declarations

| Test | Evidence | Status |
| --- | --- | --- |
| T17 pure archive and capacity tests | `node tests/expedition-archive-t17.test.cjs`: strict checksum/seed/coords/wires and over-cap retention across real source stores; denied persistent storage returns false. All **synthetic structural** source fixtures are explicitly marked synthetic. | PASS in intermediate CI; repeat on final SHA |
| Real original image bytes and browser import | `python tests/expedition-archive-t17-browser.py` in Chromium SwiftShader: original WebGL2 world image bytes, IDB source and thumbnail, full expedition download, corrupt checksum and wrong-seed rejection without mutation, deleted photo binary/changed credits, full transactional recovery and real reload. | PASS [targeted run 41528645372](https://github.com/hatutaletangeni/Space_starfall/actions/runs/41528645372); final SHA rerun required |
| Original T00–T16 unit suites | `tests/*.test.cjs`, including updated 7E full archive admission and retained original T03/7C power/ACK tests. | PASS in intermediate `offline-model` CI run 41529016066; final SHA rerun required |
| Original T00–T16 real browser suites | `.github/workflows/engineering-ci.yml` browser-smoke includes T17; old T15/T16 ramp/truck/mission browser suites retained. | Full latest branch CI must complete; see GitHub Actions |
| Standalone source-byte parity | `build-t17-standalone.yml`, `tools/build-standalone.py`, `tests/standalone-parity.py`. | Bundle workflow run 41529016005 green; latest SHA must be synchronized |
| Authentic 6J / earliest Update 7 migration | No genuine original customer save files were provided as fixtures. | **NOT VERIFIED** |
| Real physical GPU/manual spaceflight, two-planet photo mission, keyboard truck/ship | No actual end-to-end manual playthrough performed. | **NOT VERIFIED** |
| Cross-store power-loss crash between localStorage and IndexedDB writes | Multi-store failure cannot be made truly ACID on web platform. Original contents are recovered from external FULL MEDIA backup; code rollback covers ordinary API write/readback exceptions. | **NOT VERIFIED** under hard browser crash |

## Failure / safety policy

Wrong-seed imports, unsupported schema, broken photo source or binary, invalid body-fixed unit directions, dangling wires, bad checksums and oversized media are refused **before** any original owner state changes. An import error during the commit must attempt rollback to previous raw `starfall_save` and checkpointed image binary values. A rollback failure is displayed as `RECOVERY INCOMPLETE`. No successful save is reported if persistent storage is denied.

**IMPORTANT:** A model check is not manual game proof; software SwiftShader is not GPU device evidence; synthetic structural snapshots are not authentic historical saves. A source branch full green CI is required before any merge and T18 remains the end-to-end gate.

### How to reproduce

1. Open `PLAY-STARFALL.html` in Chrome/Edge, select **SAVE / RESTORE ▣**, download **FULL MEDIA** and verify JSON exists.
2. Build a real 7F photo in-game with original imaging UI and physical T03 ACK for legitimate science; gallery displays actual bytes only after complete receipt.
3. Change one known durable state (credits, rover positions, etc.). Restore full backup, confirm and allow reload; verify original IDs, watt-hours and image bytes.
4. Corrupt one checksum or change galaxy seed in archive and import: validation rejects without altering the current state.
5. Deny local browser storage and confirm persistent warning plus no false saved status.
6. Check original ramp/EVA physical boarding and truck X manually. **These remain NOT VERIFIED without human gameplay evidence.**
