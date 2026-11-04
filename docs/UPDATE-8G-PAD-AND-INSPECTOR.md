# STARFALL 8G — First factory infrastructure release candidate

Base: **merged Update 8B stable main**. The existing truck/rover/ship source, save schema and ramp controls are unchanged.

## Actual player interaction
1. Survey, mine, refine and fabricate finite certified materials to produce a total 760 kg of pad hardware in the ship cargo: 456 kg steel, 91.2 kg copper, 60.8 kg aluminum, 38 kg glass, 38 kg refractory block, 30.4 kg insulated wire, 30.4 kg electric motors and 15.2 kg control boards.
2. From **Engineer → Material Fabrication**, assemble `plant_kit_vehicle_assembly_pad` using the existing ship assembly fixture. Real 8F production consumes 5.472 MJ over 2,280 simulated seconds. Packed cargo volume is 2.8 m³.
3. Land, exit through normal crew ramp, stand on EVA within 40 scene units of a planned construction site and keep the site within 75 units of the ship, clear of the ramp and other equipment.
4. Use **Engineer → Physical Refinery Placement** to erect the kit; 1.8 MJ installation energy and its whole 760 kg mass are transferred to one unique 8A surface industrial asset. It has station `vehicle_assembly` and frame/wheel tooling.
5. **Engineer → 8G VEHICLE ASSEMBLY PREFLIGHT & TRUCK LOCATOR** shows the original truck custody from authoritative 8A asset inventory. It reports real available grade >=98% finished parts, reserved-lot exclusions, missing quantities and whether the facility is present. The output is strictly **read-only**.

## Explicitly not implemented
The assembly pad does NOT mint a second truck/rover or allow operation without a distinct physical chassis, wheels, drive system, cargo interface and saved unique asset mapping. The existing `StarfallAssembly8G` is an isolated, non-operational commissioning math model, not a live factory. A truck-spawn button must NOT be added until the real engine, physical contacts, X enter/exit, save migration, and ship bay interaction are tested. No extra starting resources or credit.

## Tested interfaces
`tests/vehicle-assembly-pad8g.test.cjs`: manufacturing->kit->physical installation; checks custody, ship/rover untouched, mass balance, ramp avoidance and idempotence.

`tests/assembly-inspector8g.test.cjs`: no inventory changes, requirement comparison, absent pad/energy, remote stock, incorrect grade and reserved stock. Repo-wide CI and real browser ramp smoke remain release gates.

## Known limitations
Advanced electronics, electric motors and precision parts still lack complete ore-to-product manufacturing chains. Industrial equipment is visible through generic existing industrial site geometry; dedicated vehicle pad 3D mesh is future work. Browser GPU performance and old-save compatibility require explicit acceptance before merging this 8G PR into main.
