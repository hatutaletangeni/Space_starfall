# STARFALL Combined 7F — Save Migration, Backup & Rollback Checklist

## What this release keeps

The entire Camera 7F capability remains: rover/satellite offscreen WebGL photography, IndexedDB image bytes/thumbnails, 7C/7D radio and battery constraints, gallery, JSON metadata, science notes and 7E evidence references.

The update modifies only the launch inventory safety limits, save import validation, tests, and documentation. It does **not** reset the original 7D or 7E save schema and does not delete rover/satellite/launch records in normal migration.

## Before upgrading

1. In the current game, open **Diagnostics / System Health → Export Save Backup** and save the JSON somewhere outside the game's browser storage.
2. In **Mission Photos / Cameras**, separately export valuable *received* JPEG/WebP photographs: full image bytes are in **IndexedDB**, not in the portable JSON backup. Importing the JSON alone on another computer will **not** transport photo data.
3. Copy/retain your current `PLAY-STARFALL.html` and record whether you use the same `file://` path, browser and galaxy `?seed=` parameter. File URL storage isolation may change if you move the game to a different folder.
4. Download the pristine Camera 7F rollback ZIP: https://github.com/hatutaletangeni/Space_starfall/archive/refs/heads/feature/update-7f-imaging.zip . Also preserve 7E and the stable 7D branch.
5. Extract the combined branch ZIP to a **separate folder**; do not overwrite your known working game until you have tested the new one.

## Migration and validation

| Save source | Expected behavior | Verified status |
|---|---|---|
| Current Camera 7F schema-2 `SF` game with `imaging7f` | Additive metadata preserved; separate browser IndexedDB contains actual photo bytes | **PASS**: headless browser reload of image metadata/bytes (in existing 7F test); full cross-folder import is **NOT VERIFIED** |
| 7E research saves | `research7e` plans/runs/blueprints preserved if syntactically valid | **PASS**: model serialization regression; full player save migration **NOT VERIFIED** |
| 7D saved `launch7` inventory with over 45 launches / 70 satellites / 36 rovers | Old records retained rather than silently sliced; future inventory is capped with explicit error | **PASS**: `tests/expedition-hardening.test.cjs`, 54 launches/81 satellites/48 rovers round trip |
| Original Update 7 `launch7` save with legacy ascent states | Same ID retained; 7B restart model already provides an upgrade path instead of fake orbital insertion | **PARTIAL**: model code and tests; no attached authentic Update 7 browser save was supplied for a full import |
| Original 6J save | Validation may accept basic older version and matching seed | **NOT VERIFIED**: no authentic 6J fixture or browser persistence test supplied |
| Wrong galaxy seed | Import rejected with clear message, original stored file remains | **PASS**: actual headless browser validator and prior model seed isolation |
| Damaged/unsupported `launch7` / `imaging7f` / `research7e` | Import is rejected before writing to localStorage | **PASS**: actual offline browser validator for wrong-seed, damaged/duplicate-ID inventory and camera metadata |
| Browser denied storage / quota reached | UI import rejects unverified write; the game can run in volatile memory but persistence is not guaranteed | Source reviewed; actual denied-storage device case **NOT VERIFIED** |

## Recovery

1. Do not try to repair a corrupted backup by deleting unrelated JSON keys. Preserve an untouched copy.
2. Start a new game with the matching galaxy seed (`?seed=<original integer>`).
3. Open **Diagnostics → Import Save**; choose the backup JSON. If the validator reports damaged, wrong-seed or oversized content, *do not* overwrite your working save. Fix/restore the original backup externally, then retry.
4. Let the game reload after a successful import. Check planet ID, ship/rover, outpost positions/energy, flight status, launch/satellite/rover IDs and science journal.
5. Open Mission Photos: if metadata exists but the image file is missing in IndexedDB, restore the original browser profile or use previously exported photographs. A JSON backup cannot reconstruct lost pixels.
6. To rollback **code**, reopen the earlier Camera 7F `PLAY-STARFALL.html` or choose `feature/update-7e` / `release/update-7d`. Save a separate backup *first*: newer photo/blueprint metadata is ignored by older versions and should not be intentionally wiped.

## Inventory limits after hardening

New caps: **240 launch records, 160 satellites, 100 remote rovers**. These are creation limits; preexisting valid records are preserved even when an old archive exceeds a new cap. At capacity, starting another launch reports a clear, non-destructive error. A late deployment that discovers a full destination pool or missing body fails with an explicit event and never reports a phantom deployed payload.

The gallery still has its independent 24 MiB / 120-photo bounded archive. Asset caps are not a reason to silently destroy saved mission photos.

## Regression commands

```bash
node tests/launch7.test.cjs
node tests/expedition-hardening.test.cjs
node tests/imaging7f.test.cjs
node tests/research7e.test.cjs
node tests/galaxy.test.cjs
node tests/science.test.cjs
python tests/standalone-parity.py
python tools/build-standalone.py
python tests/standalone-parity.py
# Optional test-only Playwright+Chromium:
python tests/research7e-browser.py
python tests/imaging7f-browser.py
python tests/expedition-hardening-browser.py
```

A real player must still verify moving/copying between different `file://` folders and authentic original Update 7/6J saves. The test harness cannot certify absent historical fixtures.
