# STARFALL Update 8F — physically manufactured vehicle chassis hardware

**Experimental, stacked on the real hand-wound motor PR #55. This does NOT manufacture or teleport another truck.**

## Intended real gameplay

Provide certified finished stock via existing surveying/mining/refinery and transport into the installed ship fabrication hold; pay ship battery energy while landed, with physically present machine tools. The **Engineer → Material Fabrication** selector now includes:

| Part recipe | Real input lot | Output | Retained physical scrap | Required installed station/tool | Paid energy |
|---|---|---|---|---|---|
| `chassis_rail` | 25.0 kg steel | 23.8 kg frame rail | 1.2 kg | Foundry / caster | 952 kJ |
| `wheel_rim` | 4.5 kg aluminum | 4.2 kg rigid rim | 0.3 kg | Machine / lathe | 348 kJ |
| `wheel_hub` | 3.5 kg steel | 3.2 kg rigid hub | 0.3 kg | Machine / grinder | 399 kJ |
| `axle_shaft` | 7.0 kg steel | 6.6 kg shaft blank | 0.4 kg | Machine / lathe | 455 kJ |
| `leaf_spring` | 5.0 kg steel | 4.7 kg spring blank | 0.3 kg | Physical manual press | 262.5 kJ |
| `rolling_wheel_core` | 4.2 kg wheel rim + 3.2 kg wheel hub | 7.3 kg rigid core | 0.1 kg | Ship fabrication assembly jig | 132.6 kJ |

The six-job example consumes **40.5 kg steel + 4.5 kg aluminum** and produces **42.4 kg named components plus 2.6 kg labeled manufacturing scrap** (including the intermediate rim and hub consumed into the wheel core). Total direct fabricated-job electrical work is **2.5491 MJ**; other upstream mining, refining, machine-kit fabrication and installation work is extra.

**Known science limitation:** A rim + hub is NOT a rubber pneumatic tire, a precision rolling bearing, a braking/steering assembly or a certified vehicle wheel. The leaf spring is a rough formed stock, not verified heat-treated spring steel with a fatigue/elasticity test. The chassis rail is a blank, not welded/inspected structural vehicle chassis. The game therefore does NOT commission or render a newly drivable truck from these parts.

## Quality gates

The new `tests/vehicle-parts8f.test.cjs` executes all six real factory `start → step → commit` transactions in sequence, checks the installed-tool requirement, true 8A lots, explicit scrap, 45 kg global conservation, 2.5491 MJ energy paid, and the zero-truck-created invariant. Test fixtures simulate already *legitimately installed* caster, lathe, grinder and press; actual gameplay requires real machine kit installation, and this fixture is not an initial player inventory grant.

All existing industrial, ship/Rocket Lab, source/standalone parity and Chromium/EVA/truck browser tests remain required before merge. Save migrations, long-duration vehicle physics and new 3D wheel inspection remain unverified.
