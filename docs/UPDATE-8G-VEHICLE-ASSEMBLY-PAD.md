# STARFALL Update 8G — first physical vehicle assembly facility

**Development status: testable new assembly PAD, not yet a vehicle factory or full 8G release.** Based on merged Update 8 main `9e962b5d75c4fc4e6c1c7fe2001b4ecdf30082c1`. No existing ship/planet/ramp/vehicle-control APIs are modified.

## Player instructions

1. Legitimately mine/process or transport finite, grade-certified raw steel, copper, aluminum, glass, refractory blocks, insulated wiring, electric motors and control boards. These prerequisites must already exist in the real authoritative ship hold.
2. In Engineer → Material Fabrication select `plant_kit_vehicle_assembly_pad`. Its 760 kg bill of materials is 60% steel (456 kg), 12% copper (91.2 kg), 8% aluminum (60.8 kg), 5% glass (38 kg), 5% refractory blocks (38 kg), 4% insulated wire (30.4 kg), 4% electric motors (30.4 kg), 2% control boards (15.2 kg). The assembly jig requires 2,400 W × 2,280 simulated seconds (5.472 MJ), not free starting machinery. The resulting packaged kit takes 2.8 m³ of genuine ship cargo volume.
3. Land on a suitable body and exit physically on EVA. In Engineer → Physical Refinery Placement, select the new pad kit and choose a clear construction point between roughly 45–70 scene units from the landed ship and within 40 of the EVA operator. Exact feasibility is evaluated by the world-fixed radius/clearance rules already implemented in 8E.
4. Erect the assembly pad using 1.8 MJ additional ship battery work. The entire 760 kg kit disappears from cargo and one distinct 760 kg, 2.8 m³ industrial surface asset is created with station `vehicle_assembly`, tools `frame_jig`, `wheel_fixture`, `torque_wrench`, `wheel_alignment`, persistent ID and commissioning receipt.
5. The existing 8E near-field industrial geometry renders the real surface pad as a generic physical industrial facility. Original truck and science rover remain untouched.

## Not yet done

The existing `assembly8g.js` is a **data-level** commissioning model, NOT a drivable-truck creator. No UI commission command has been connected here: clicking a menu must not make a non-rendered, non-rideable duplicate vehicle. Next work: authenticated staged parts reservation at a pad; durable formation of a second truck with a new unique ID; conversion to existing truck movement/camera/X controls; actual ride/drive/persistence/ship-cargo test and independent recovery from abandoned vehicle scenarios. There is no new truck or rover in this slice.

## Verification

`tests/vehicle-assembly-pad8g.test.cjs` runs through: finite correct 760 kg kit BOM → existing 8F factory and simulated energy → physical 8A packaged lot → 8E world placement with energy receipt → original ship/truck/rover preserved, 760 kg moved without duplication, duplicate installation ignored, missing kit denied, overlapping ship ramp rejected, absent materials refused. Existing industry tests and offline browser smoke remain release gates.

**Do not merge this new 8G branch to main until integration regression and WebGL testing have passed.**
