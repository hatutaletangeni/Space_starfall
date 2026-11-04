# STARFALL Update 8G — Physical Pressure-Vessel Transport

## What this release implements
- An **actual installed 8E pressure vessel**, with independently maintained 8A `containerId` ownership, can be loaded into a dedicated `engineering-gas-cradle` slot of a landed ship. Its dry structural mass and gas lots are never recreated or remapped to an imaginary ship-only tank.
- The rated vessel **stays the same physical asset ID** and each filled gas lot **keeps the same unique lot ID, physical volume, grade, and provenance** across load, flight, save/reload and surface unloading.
- The ship's original unique expedition truck, science rover, manufactured frame cradle and separate gantry controls are preserved. One gas vessel occupies the independent engineering gas cradle at a time.
- Every load or unload requires an EVA operator on the surface, enabled landed ship power, close proximity, collision-free construction/unloading zones and **90 kJ of real ship-battery work**. Gas vessel structural condition must be >=80%, seal is rated to >=5 MPa, and the vessel's recorded 8A container must be dedicated to one compatible gas.
- **Combined loaded dry-vessel + gas contents** count toward the same 3,500 kg / 155 m³ shared ship freight envelope as the original truck, science rover and engineered chassis. Existing frame loading now also consults the currently stored gas mass. Ship flight physics mass includes loaded vessels' contained gas as additional mass rather than accelerating a free payload.
- A loaded surface vessel cannot be used by 8E atmospheric separation or electrolysis since those physically require the equipment's `location.kind==='surface'`.
- Each movement gets a unique 8A physical custody transfer record; both custody and gas contents persist in the same durable game save. Reusing operation IDs cannot create another vessel or gas lot.
- The Engineer tab has an actual physical vessel selector, load/unload controls, mass/charge status and clear safety constraints.

## Safe limitations still outstanding
- **This patch does not decant or transfer gas into a habitat.** Transporting a sealed pressure vessel is not a hose/valve transfer, and the existing 8G habitat-charge recipe still requires raw stock in its ship hold. The next step needs a metered and rated source-to-habitat transfer with mass remaining in either a vessel or a habitat, correct water/oxygen/nitrogen accounting, and energy/pressure constraints.
- The 8A vessel `containerId` remains the authoritative container even when aboard a spacecraft. There is deliberately no unlimited gas stock granted to `8d:ship-main:materials`.
- Simulated vessel pressure ratings, gas law and mount hardware are abstract gameplay prototypes, not real pressure-safe or flight-rated equipment certifications.
- Gas transport is a **late-8G prerequisite**, not proof that T09 life support or 7B rocket propulsion work, nor complete 8H logistics.

## Verification
```sh
node tests/gas-vessel-cargo8g.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/gas-vessel-cargo8g-browser.py
```
The browser test includes real CW01 nitrogen extraction with physical installed test-only apparatus, then filled-cylinder load → ship reload → unload → surface reload without gas lot duplication or original-truck loss. Full existing engineering, 8G industrial, Rocket Lab and original rover/truck regression gates must stay green.

## Final current-head release verification
The source and generated standalone must match exactly after the automatic 8E/8F packaging build. Review the CI results for this exact PR head, not earlier parent commits with out-of-date standalone output. Preserve the original ship/truck/rover integration regressions, including correct ship wet-cargo mass and the existing 8G frame cradle.
