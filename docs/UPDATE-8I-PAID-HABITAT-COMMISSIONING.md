# Update 8I — Paid 8G-to-T09 habitat commissioning

The real Industrial game now has an explicit physical commissioning path:
1. Assemble one real 8G habitat_shell at a paid habitat pad using its complete 8F BOM and 4 MJ of ship work.
2. Charge that actual unpressurized 8G shell from finite 8A oxygen, nitrogen and water, including physical rated vessel hoses as applicable.
3. Approach the same shell in EVA with the landed powered ship. Under Mission → Build → Open All Build Tools choose **8I Commission Paid Habitat for T09 Life Support** and pay a further 500 kJ for pressure/leak qualification.
4. The original 8A asset retains its **dry** structural mass; the exact formerly enclosed gas/water mass is moved to one linked original \`outpost5\` T09 volume. A unique durable 8A operation receipt records gas species, water, exact source/destination, and ship energy.
5. The original T09 habitat now shows its own finite 25 m³ pressure volume. Its oxygen cylinders and CO₂ scrubber start at ZERO. Use real 8I oxygen/scrubber supply commands to fill them. There is no independent battery, solar power, food, or infinite life-support energy. The original connected 48 V T02 network must actually supply 680 W to operate enabled life support.

One physical shell may be commissioned only once. All preconditions are checked before source state changes. Source-backed stores and the power debit are persisted with the same save. The \`structure8g:N\` asset ID uses a colon and must retain it through the native outpost save/restore sanitizer. The existing original T09 UI and power solvers own subsequent state changes. The 8G shell model must not separately advance its former gas state after transition.

**Limitations:** This is a conservative 8I commissioning slice, not a certified fully closed ecosystem. Industrial solar/battery construction availability still needs end-to-end acceptance. Thermal, airlock and leak behavior remain the original simplified T09 model. The model/unit tests are isolated proofs of conservation and duplicate rejection; a full natural ore→BOM→planet→T09 browser expedition and manual GPU acceptance are NOT established by these tests.
