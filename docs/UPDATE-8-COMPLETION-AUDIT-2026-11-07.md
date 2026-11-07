# STARFALL Update 8 — current completion audit (2026-11-07)

**Specification:** `STARFALL_UPDATE_8_MANUFACTURING_TERRAFORMING_PROMPTS.md` (user's 2026-11-03 Master 00 + 8A–8K requirements).

**Release verdict: NOT COMPLETE.** Existing modules and isolated tests are not evidence of a completed Industrial-mode expedition. No full no-cheat two-world browser/GPU 8K acceptance was run in this audit. Do not label this DONE or delete the original specification.

## Stage status and release gates

| Stage | Current source evidence | Remaining acceptance gate |
| --- | --- | --- |
| 8A | `material-ledger8a.js`, `physical-inventory8a.js`, unique original truck custody | Full real save/reload/legacy/2-world identity and mass verification |
| 8B | `cargo-bay8b.js`, `flight.js`, truck cockpit; fully-on-deck exit patch on main | Full visible drive-on/drive-off, seal, exit and boarding browser playthrough |
| 8C | `planetary-resources8c.js`, survey UI | Planet-fixed depletion and revisit/full time-warp regression |
| 8D | `mining-hauling8d.js`, original 20 kg drill and 50 kg loader | Physical source-to-ship resource operation tested end to end |
| 8E | Ship refinery and multiple chemistry/physical site modules | Reagent-correct full ore-to-metal chain and physical continuous inputs/outputs |
| 8F | `factory8f.js`, `kit-recipes8f.js`, original material ledger and tool checks | All certified advanced components obtainable without synthetic fixture; functional machine installed |
| 8G | Vessel manufacture, nitrogen separation, gas vessel cargo, vehicle/habitat assembly slices | Full legitimate operating vehicle/rocket/habitat verified; no free matter, correct propulsion |
| 8H | Genuine T02-powered pipe and conveyor packet slices, manifest and lossy tailings slices | Entire productive supply chain, offworld transport, remote-world time, leakage/waste, recycling, 1x/10x/100x |
| 8I | `habitat8i.js` contains an isolated first-order gas/thermal/water model; other 8I files must be verified individually | Actual commissioned powered habitat with water, O2, CO2, airlocks, greenhouse and failures |
| 8J | `terraform8j.js` contains a conservative mass/pressure model | Real finite physically delivered world emission/capture, climate/escape and saved rendering feedback |
| 8K | Tests and specification exist | Full uninterrupted no-cheat original truck → mine → refine → fabricate → rocket/ship → second world → sealed habitat → tiny physical terraforming intervention with real WebGL2/GPU QA |

## Changes made during 2026-11-07 audit

- Updated `src/physics/factory-ui8f.js` on main to expose actual ship-held mass and all material shortages for the selected 8F recipe, accounting for reservations. The original certified production quote, tool and energy checks remain authoritative; this screen never injects inventory.
- The truck exit patch committed earlier to `src/flight.js` permits a stopped original truck fully inside the cargo deck to exit into the ship interior, while blocking mid-ramp exits.
- A main-targeted standalone rebuilding workflow exists. Standalone blob hashes changed during this audit; this is **not** proof of source parity or a visual/WebGL gameplay pass.

## Must-pass no-cheat validation

1. Start new Industrial game with one original truck and fixed audited starter manifest. Verify ship and truck stock are finite.
2. Survey actual iron and copper sites, mine and haul original lots into ship with battery drains and saved depletion.
3. Refine ores, recover requisite reagents, fabricate steel/wire/motor/board (or legitimately finite imported parts), manufacture/erect gas vessel, air separator and native-wired pressure pipe; verify genuine gas in the original 8A vessel.
4. Assemble a real new 8G asset and transport it physically to another world, preserving custody and center of mass. Do not use debug `importLot` or fixture-only grants.
5. Build and operate a genuine pressurized 8I habitat from certified parts, water and O2/N2 source-owned vessels.
6. Run one real 8J world-level measured intervention with immutable origin/source receipts, no invented atmosphere or instant global transformation.
7. Run all exact-head Node tests, old-save migration, browser `file://` WebGL2, desktop/mobile parity, and a device GPU profile at 1x/10x/100x; record commands, outcomes, machine and commit SHA.

**Stop condition:** Any missing closed-chain material, physical carrier, electrical source, powered device, real gas/liquid input, browser behavior or save invariant keeps the whole release NOT COMPLETE. A working isolated fixture is insufficient.
