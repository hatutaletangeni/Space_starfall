# STARFALL pre-8K source-qualified electrical manufacturing bootstrap

The source-owned 8I original 48V installation requires **genuine 8F production receipts**, rather than fabricated parts in a test fixture. This release only repairs a narrowly bounded upstream materials gap for **explicit NEW** expeditions.

## Physical starting assets — premanufactured before departure
The one-time original 8A ship manifest now carries exactly one **uninstalled** 160kg extrusion machine kit, one **uninstalled** 210kg PV module laminator kit, and one **uninstalled** 260kg battery-cell assembly kit, each occupying its original rated volume (0.30/0.39/0.44m³). Each remains an 8A lot until the player physically installs it using the existing paid 8F machine-install controls; no machines or stations materialize automatically.

Two qualified PV-module bills can use 4kg imported high-purity `pv_cells`, 8kg imported glass, 1.2kg finite UV-stable encapsulant, player-fabricated 4kg aluminum frames and 1kg insulated wire. Casing blanks for eight battery cells can be made by eight low-tech hand-shear jobs (2.72kg real aluminum feed→2.4kg cases +0.32kg scrap). One 48V battery pack's eight cells still need 9.6kg of separately certified imported active electrode mix, physical separator, electrolyte and refined copper/aluminum. Advanced cell chemistry is **not** fabricated from bare iron or ordinary rock.

All imported substances use explicit `preexisting_ship_manifest8k:` provenance in the normal 8A lot ledger, and the entire manifest is source-audited against the physical 16m³ ship hold. No new player receives completed solar panels or a charged battery. Real original 8F fabrication consumes ingredient mass, work and time; installing 2×400W solar + one 9.6MJ EMPTY battery pack requires the existing real T02 8I installation commissioning. A second PV pair or second battery requires new certified raw sources/appropriate research and manufacturing.

**Limits:** This is a finite prelaunch bootstrap—not proof of in-situ silicon cleanroom manufacture, electrochemical synthesis or any fully no-cheat two-world expedition. Existing saves receive no new feedstock; only an explicit brand-new expedition can receive the amended manifest. The 8K launch gate remains blocked. No manual real-GPU FPS test is claimed.

**Acceptance model:** `node tests/pre8k-certified-power-bom.test.cjs` verifies shipped kit identity, capacity, recipe mass balance, two PV/one battery budget, and no duplicate old-save award. Gameplay browser smoke still required before declaring a complete 8F→8I closed cycle.
