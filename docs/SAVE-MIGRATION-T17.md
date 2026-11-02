# STARFALL T17 — Offline Backups, Version Validation and Lossless Legacy Restore

**Implemented on** `feature/t17-save-integrity-and-recovery`, based on `feature/t16-operations-telemetry-ui`. Base T16 and all prior T15–T12 feature branches are left unchanged; `main` is not modified.

## What the player can do

Open **SAVE / RESTORE ▣** in the main STARFALL masthead. The panel reports whether local browser storage is actually durable. The game can operate in memory when `localStorage` is denied, but `SF.save()` now returns **false** after any failed persistent write or read-back. This means a failed save is never reported as having persisted when the browser disk is blocked.

The panel offers:

1. **EXPORT JSON SAVE (no photos)**. A standalone, offline `STARFALL_EXPEDITION_BACKUP` archive with the original `SF.load()` state and source-owned T03 radio receipts, T01 jobs, Outpost electronics, 7E plans, T15 service events, discoveries/coverage and 7F *metadata*. It includes the seed, schema, an explicit `STATE_ONLY` scope, item counts and a deterministic 32-bit accidental-corruption checksum. A state-only archive with camera records **cannot be imported** into another browser as if actual binary images were included. Export FULL MEDIA instead.
2. **EXPORT COMPLETE SAVE + REAL IMAGE BYTES**. Includes every original stored 7F photo and thumbnail from the actual existing IndexedDB `starfall-7f-images-v1/images` store. Each original media entry is named by the original metadata photo ID; export refuses if any image file is missing or malformed, rather than producing a silently incomplete 'successful' full backup. No synthetic photos, duplicate science records, extra powers or invented acknowledgement are created.
3. **VALIDATE & RESTORE BACKUP**. Parses and validates the complete source state; checks source-schema and seed identity, unique IDs, original Outpost wire connections, rover body-fixed coordinates, nonnegative Joules, valid original research references, bounded T03 bytes/timestamps, photo sizes and original source image references. The original base64 image and thumbnail also receive independent accidental-corruption checksums and are decoded as real images with dimensions matching metadata before any write. A confirm prompt is shown before replacement. Large, truncated, wrong-seed, unsupported-version, corrupt, malformed or media-incomplete imports are rejected with no change to the active save.

### Transaction and rollback

A successful full-media restore checkpoints the previous original `starfall_save` text and original IndexedDB binary records. An all-or-nothing IndexedDB **single transaction** installs the validated image set, then the existing `starfall_save` key is updated by a single localStorage write and read-back. On a failed write or verification, the exact old raw save is restored and the original binary keys/files are restored transactionally from the checkpoint. On success, the old UI autosave paths are blocked by `__STARFALL_IMPORT_PENDING` until the new page loads, preventing stale in-memory owners from overwriting the newly restored source state during `pagehide`.

**Browser restriction:** IndexedDB and localStorage are *two independent databases*, not a true cross-store atomic transaction. The fallback checkpoint protects ordinary synchronous/quota/API failures, but a hard browser crash **between** their commits may leave an inconsistent pair. A downloaded FULL MEDIA backup is the durable recovery mechanism. A failed rollback is visibly reported as `RECOVERY INCOMPLETE` and the user is told to keep the tab open. This is NOT presented as an ACID cross-store guarantee.

**Offline origin restriction:** `file://` storage origin can change when a game is moved to another folder or opened in another browser. A local file's physical location does not transfer IndexedDB or localStorage; export a full archive first and import it into the new origin after a page reload. Internet/cloud transfer is never required.

### Honest photo evidence

The original 7F Gallery now explicitly reports `T17 MISSING IMAGE FILE` when a photo has `status:'downlinked'` but its IndexedDB binary is absent. The file download control is disabled; the receipt ID remains for traceability, but a photo is never fabricated from numeric 7C values. Restoring an offline FULL MEDIA archive recovers both the original encoded pixels and thumb.

## Historical records / save cap audit

| Authoritative source | Before T17 | After T17 |
| --- | --- | --- |
| `StarfallImaging7F.restore` | `.slice(-120)` photos and `.slice(-16)` pending imaging jobs could silently drop older history | All structurally valid older metadata/jobs restored; the original 20/40/120 count and 24 MiB limits still reject *new* image writes at capacity |
| `StarfallResearch7E` | `.slice(-N)` on restore, `.shift()` of old plans/runs/blueprints at cap | Preserve original valid 7E plans, runs and blueprint references on reload; new experiment/plan/import fails visibly at capacity, preserving original evidence |
| `StarfallOutposts.Store` | Historical `.slice(0,320)` structures, 600 wires, 40 relays and 120 sample IDs per structure | Preserve all valid previous records; physical construction/wiring rules and new-record caps remain active |
| `T03 Transport` | Restore could truncate 4,000 exactly-once receipts or 240 packets | Preserve older valid packet/receipt IDs; new packet queue is refused while over its cap; existing source custody/ACK rules unchanged |
| `T01 Mission Clock` | Restore could drop jobs, event IDs and receipts beyond archive caps | Preserve previous valid clock jobs/events/receipts; new jobs/events refuse at cap |
| `7C Satellite.ensure` | Orbital observation `storage/inTransit/received` sliced on restore | Preserve older valid records and original IDs; real sensor storage capacity still limits new captures |
| `7D Remote Rover` | Old accepted packet and received IDs capped by `slice(-N)` | Accepting older saved lists preserves them; finite real onboard sample/probe and command queue limits remain |
| `6G Survey Map` | Historical coverage cells and waypoints sliced, earliest mapped world silently deleted after 40 | Preserve saved evidence; new 41st world returns explicit no-new-coverage result rather than deleting prior planet data |
| `7A engineering registry` | Derived registry event/observation projection caches are bounded | **Not changed**: their original canonical inputs are 7C/7D/T03/robotics4/T10 and registry projections are reconstructible; archive contains original saved cache but the display remains bounded |
| `6J / initial Update 7` | Specific customer original-save schema/structure may predate current owner stores | **MIGRATION NOT VERIFIED** with authentic original user fixture. Unknown keys retained in `SF.load()` where possible, no unsupported schema is silently promoted to a current owner. Import rejects a schema it cannot validate rather than inventing new equipment. |

## Testing

- `tests/expedition-archive-t17.test.cjs`: synthetic **structural fixtures only**, never labelled authentic old saves, covering 321 retained outposts, 601 wires, 41 relays, 121 7F photo metadata, 17 queued images, 51 plans/161 runs/46 blueprints, 241 T03 packets/4001 receipts, 25 T07 records, 97 T01 jobs and 501 accepted rover command IDs, along with new-full rejection and zero loss. Accidental corruption, wrong seed, bad longitude coordinates, duplicate IDs, missing wire owner, unsupported schema and denied storage return errors.
- `tests/expedition-archive-t17-browser.py`: genuine offline Chrome/Chromium `file://` using SwiftShader software WebGL. Real `StarfallRuntime.captureScienceImage` generates terrain image pixels, stored under the original 7F source image ID with the original IDB schema. Exports complete source+binary archive, rejects corrupt and wrong-seed imports without touching the save or image, then intentionally deletes media and modifies state and verifies full original bytes, original science photo metadata and saved credits recover after real reload. A manually seeded camera *metadata fixture* is distinguished from real rendered photo bytes; no fake radio downlink or proof of Planet B mission is claimed.
- The old 7E regression was updated to confirm new experiment admission **refuses** at full history instead of evicting old runs, and all prior T00–T16 regressions remain in full CI.
- `PLAY-STARFALL.html` comes from exact source via the retained standalone builder with strict parity CI.

### Known limits / release gate

**Authentic historical user saves were not supplied.** Save migrations for old Update 6J, earliest Update 7, and 7D/7E combined real-user fixtures are **NOT VERIFIED** until those actual files are provided; no fake original files are substituted. Full Chrome/Edge real GPU and actual manual ramp, truck X, ruin interiors, 100× far-away mission/packet resume and interruption at the precise cross-DB crash window remain **NOT VERIFIED**; T18 is the full release mission gate.

Files may be moved between locations only by exporting and reimporting the **full** archive; this does not upgrade an older binary build to read a newer schema. To roll back code, use T16 ZIP separately; keep the full backup with its new build. Historical content lost by an earlier shipped version cannot be recreated from a save that no longer contains it.

**Do not merge** T17 to T16 or `main` automatically. Keep a draft PR, require green latest GitHub Actions and human on-device review.
