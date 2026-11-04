# STARFALL 8F — a physically finite starter electric motor without circular fabrication

**Experimental, unmerged feature branch; game-grade model, NOT electrically certified motor hardware.**

## Motivation and design

Existing advanced machinery requires `electric_motor`, while assembling motors previously required an industrial motor fixture whose own kit needed `electric_motor`. This deadlocked an expedition with no preexisting motors. The new low-technology path uses finite hand-operated equipment: one 32 kg metal-and-bracket winding jig and two stage-consistent manufacturing jobs. It does **not** grant motors/chips/precision equipment without material.

### Step 1: physically manufacture the hand-winder

From true finished manufactured lots in the landed ship hold, under **Engineer → Material Fabrication**, assemble:

`machine_kit_hand_winder`, 32 kg, 0.16 m³ packaged volume:
- 18 kg **steel**
- 3 kg **copper**
- 4 kg **aluminum**
- 2 kg **glass**
- 2 kg **iron_bracket** (from the existing bench recipe)
- 3 kg **steel_bracket** (from the existing bench recipe)

The 8F kit-fixture consumes 2400 W × 96 simulated seconds = **230,400 J**. Reaching these substantial stocks requires real mining/ore processing and multiple trips.

Under **Engineer → Physical Machine Installation**, consume the certified kit and another **65,000 J** to install one persistent 32 kg physical `industrial_machine` in the ship workshop, station `bench`, tool `hand-winder`. This is not the default hand-shear bench. Installation has a unique receipt; repeating it does not create a second machine.

### Step 2: wind a ceramic-insulated field coil

`motor_field_coil` requires **0.70 kg copper + 0.10 kg glass** as modeled vitreous insulating input, outputs 0.76 kg `motor_field_coil` + 0.04 kg labeled manufacturing scrap. The installed hand-winder draws **640 W for 260 s** = 166,400 J.

Glass is a simplified dielectric feedstock model; physically achieving suitable insulated windings requires enamel, ceramic or other insulation processing not simulated in detail.

### Step 3: assemble a small brushed DC prototype

`brushed_dc_motor` requires **0.76 kg motor_field_coil, 0.80 kg steel, 0.70 kg iron, 0.40 kg aluminum, 0.24 kg copper, 0.06 kg carbon**. The same installed hand-winder/assembly bench is used, with **1100 W × 620 s** = 682,000 J.

Products: **2.70 kg of `electric_motor`** inventory-grade prototype and **0.26 kg labeled manufacturing scrap**. The rough modeled physical design uses series/wound-field copper coils, iron/steel rotor and pole pieces, segmented copper commutator, recovered carbon brushes, a metal enclosure, and simplified steel journal contact. A wound-field DC motor does **not** require preexisting permanent magnets or an inverter. Input materials are physically finite and have been refined or manufactured independently.

**Total new tasks, excluding mining/refining/bracket fabrication:** 1,143,800 J (kit fabrication, installation, coil winding and motor assembly). All matter remains in original stock, formed parts, scrap or the installed machine.

## Scientific fidelity and limitations

This produces a real finite game inventory `electric_motor` usable by existing kit bills. It does **not** validate motor torque-speed curves, output shaft geometry, bearings, electrical insulation breakdown, brush wear, commutator ripple, winding temperature or continuous rated duty. A small prototype is not certified as a high-efficiency/industrial motor. A separately installed advanced motor fixture and precision line are still required for the existing `motor` recipe.

No new resources, electronics, truck or generator are spawned. Model-grade inventory is not proof of operating motor physics. Benchmark only the inventory/manufacturing path until physical motor installations/drive laws are added.

## Verification

- `tests/motor-bootstrap8f.test.cjs` first confirms 32 kg kit BOM contains **no motor or control_board**, then processes 8F live finished stocks via factory start/step/commit, installs the exact physical hand-winder once, refuses coil winding on the wrong bench, produces a real 0.76 kg coil and 2.70 kg motor with scrap, preserves mass across cargo and installed machine, consumes finite battery energy, and does not clone the original truck.
- All previously existing 8A–8F suite tests and Chromium cargo-ramp smoke remain release gates.
- Full WebGL2 3D engineering UI interaction, long-session durability, temperature/fatigue and old-save migration are **not** proven solely by the model tests.
