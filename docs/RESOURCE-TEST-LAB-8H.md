# Resource Test Lab — Update 8 mining, fabrication, gas & physical storage

**Entry:** Operate → **Mine, Manufacture & Store Gas**, in both the desktop and landscape mobile standalone.
**Source baseline:** main at \`4edc5775b623c8bfcdea2a5899ceddd26688a195\`.
**Rollback branch:** \`backup/main-before-resource-test-20261106\`.

## Verified architecture and access

The Resource Test Lab is a read-only convenience interface. It does **not** store an alternative inventory, create machines, debit energy, advance jobs, write saves, teleport the original truck, or alter science seeds. It reads the existing \`StarfallRuntime\` source-owned 8A–8H contexts and routes to the original in-game controls.

| Workflow step | Actual original controller | In-game owner |
|---|---|---|
| Local geological survey | \`StarfallProspectingUI8C\` | \`resources8c\` |
| Real drill, hopper and ship loader | \`StarfallMiningUI8D\` | \`mining8d\`, \`materials8a\`, physical truck |
| Real ore refining | \`StarfallRefineryUI8E\` | \`refinery8e\`, ship energy and 8A ship hold |
| Manufactured stock | \`StarfallFactoryUI8F\` | \`factory8f\`, certified 8F recipes |
| Physical machine kit | \`StarfallMachineInstallUI8F\` | original 8A hardware and materials |
| Real atmosphere N₂ capture | \`StarfallAirFractionationUI8G\` | existing fractionator and rated vessel |
| Seal/gantry transport | \`StarfallGasVesselCargoUI8G\` | same rated vessel and ship |
| Pressure-rated 8H pump pipe | \`StarfallPressurePipeLiveUI8H\` | original pipe, T02 420 W grid and 8A gas lot |

## Player procedure — mining and manufacturing

1. Land on a landable body, deploy the original truck from its original spacecraft cargo if secured, and exit to EVA.
2. Explore → geological survey at a finite occurrence. This is evidence, not free ore.
3. Drive the original truck to a verified deposit. From Operate → Mine & Manufacture, open the original drill. Each qualified 24 s bore extracts at most 20 kg and needs 57.6 kJ in truck battery, plus tool condition and free hopper capacity.
4. Physically drive the truck back to the ship and use original 16 s loader: up to 50 kg of existing certified hopper lots per load; no auto teleports.
5. Engineer → refinery: select a compatible actual source lot, valid process and ship power. Inspect source and output stock, waste, job status and duration.
6. Engineer → fabrication: choose a recipe and an installed eligible machine. Missing input materials, machine tooling and energy block operations. New manufactured lots remain in the authoritative physical stock and do not imply a commissioned usable machine.
7. Save/reload and confirm source lot IDs, exact masses, original truck identity and machine receipts.

## Player procedure — gas

1. On an atmospheric, nitrogen-bearing body, manufacture complete certified 8E/8F kits and physically install a nitrogen air separator and a separate pressure-rated N₂ vessel. No kits are granted by this interface.
2. Open Engineer → finite atmospheric nitrogen; verify the existing separator/vessel selectors and battery condition. Each 20 kg air-batch costs 810 kJ and debits a modeled finite local atmospheric parcel. The returned N₂ enters that **stationary rated vessel**, not the ship.
3. Observe the original vessel ID and contained gas kilograms. Open Engineer → pressure-vessel gantry and move the entire sealed vessel between surface and ship for 90 kJ per action.
4. Advanced: manufacture/install real 8 MPa-rated 8H pipe and 420 W T02 electrical port, wire to a genuine supply, and pump a real contained gas lot across the bounded native energy and transit contract. An unconnected port or incompatible pressure vessel must hold the job.
5. Save/reload and recheck the vessel's original ID, gas kilograms and transport receipts. The guide never creates/decants gas on its own.

## Reproducible tests

\`\`\`sh
node --check src/physics/resource-test-lab-ui8h.js
node tests/mining-hauling8d.test.cjs
node tests/refinery8e.test.cjs
node tests/factory8f.test.cjs
node tests/air-fractionation8g.test.cjs
node tests/gas-vessel-cargo8g.test.cjs
node tests/mobile-vehicle-bay.test.cjs
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
python tests/resource-test-lab8h-browser.py
\`\`\`

Playwright is a **test-only** dependency; the actual STARFALL game remains self-contained and runs over \`file://\` with supported WebGL2. GitHub Actions also runs the full engineering and related industrial suites. A green single-feature suite is *not* proof of completed 8K manual multi-world playthrough or GPU FPS.

## Branch audit

Compared 77 relevant \`feature/update-8*\` branches against \`main\` on 2026-11-06. Earlier 8A/8B/8C/8D/8E and multiple 8F branches are ancestors of \`main\`; numerous 8G/8H work branches show divergent ahead/behind histories after squash/stacked PR integrations. Re-merging such branches wholesale risks reverting later source and standalone fixes. The resource lab integrates with current \`main\` modules instead. This is **not a declaration that 8I–8K are operational**.

## Release boundary

No manual no-cheat mine→ore→finished rocket→second-planet→habitat→terraforming expedition or sustained real-device GPU profiling was performed for this patch. Physical gas transfer, manufacturing job and conservation acceptance remain governed by their own dedicated tests and must be checked in actual gameplay before claiming full 8K.
