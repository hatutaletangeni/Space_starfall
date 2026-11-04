# STARFALL 8G — finite manufactured-habitat initial charge

## What is implemented
- A **physically assembled** `habitat_envelope` from the 8G construction pad, with intact structural condition >=0.9 and a real paid construction receipt, can receive one initial atmospheric/water charge when a **powered landed ship** is within 85 scene units and the EVA operator within 20 scene units.
- The initial uncrewed cabin is **25 m³ at 293.15 K**, modeled with the existing T09 ideal-gas law. Its target partial pressures are **21 kPa O₂ and 78 kPa N₂**, total **99 kPa**. Water initially loaded: **20 kg**. All source gases and water are **real 8A ship-hold inventory lots** with grade >=0.98, physically manufactured or collected provenance, no active reservations, finite mass and volume.
- Pressure provisioning spends **1.2 MJ** of the existing ship engineering battery. Material source lots are deleted or reduced by their exact consumed mass, while **that same mass is credited to the existing physical habitat's mass**, preserving total 8A asset + lot mass and original truck identity. The habitat saves the actual consumed-lot IDs, quantities, an idempotence marker and its T09 gas state.
- The pressure preview and result call **StarfallHabitatT09**, rather than using an untracked parallel pressure equation. It explicitly starts with **zero prefilled reserve gas tanks, zero scrubber capacity, zero stored exhaust, zero occupants and no magically generated water**.
- This is an initial **pressurization/charging prototype**; `habitable=false`, `lifeSupportOnline=false`, and `awaitingReview=true`. Gas present in a pressure vessel does not make it safe or powered.
- Engineer UI shows actual shortage quantities, calculated partial pressure, total charge mass, electrical work and a clear refusal when the needed inventory or powered EVA conditions are absent.
- An isolated Chromium test creates clearly named `TEST_FIXTURE_ONLY` gas/water lots **only in the test browser profile**, then exercises the actual UI, consumption, pressure, mass, identity and reload. No production test lots or free consumables are injected.

## What is NOT yet implemented / blocked
- Nitrogen is deliberately **not silently fabricated**. The 8E industrial-chemistry chain currently supports oxygen/hydrogen electrolysis but **has no accounted nitrogen capture/fractionation workflow**. Unless the player actually possesses a physical `nitrogen` lot, this initial charge will correctly be blocked. An atmosphere sampling/separation or imported finite cargo source is needed.
- The newly manufactured habitat is **not yet registered as an actual linked T02-powered 680 W service**. No active air recycling, CO₂ scrubbing, oxygen replenishment, water reclamation, occupancy or openable airlock is enabled by this patch. T09's existing tutorial habitats have seeded gas and water; importing those defaults into this manufacturing path is forbidden.
- T09's real-time leakage and metabolism are **not yet ticked for this 8A physical asset**; enabling them requires durable, mass-balanced vent/emission and consumption ledgers to avoid gas loss or double ownership.
- Real seal/proof testing, airlock and pressure-vessel mechanical safety are still missing. `pressurePa` means a **modeled initial amount of gas**, not proof of a certified pressure vessel.

## Release checks
```sh
node tests/habitat-charge8g.test.cjs
node tests/structure-assembly8g.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/structure-assembly8g-browser.py
```
Must also pass the unmodified engineering, rover, original ship ramp, Rocket Lab and Update 8 integration regression workflows. The above gas laws are simplified engineering gameplay, not safe human-life-support design evidence.
