# STARFALL Update 8H — original source-owned chemical gas INLET

**Release status:** DRAFT and not yet full 8H no-cheat expedition acceptance.
Preserves the actual original STARFALL game, seed742, one initial truck,
the non-rideable science rover, normal ship and UI21, source/PLAY parity.

## Real source-backed physical path

Original chemical reactions that require a gaseous reactant (Sabatier,
oxygen roasting etc.) are no longer allowed to draw it from a gas vessel
while bypassing their manufactured inlet pump. This slice implements the
**inbound** complement to the released #118 outbound 80L gas pipe:

1. Real 8E operator selects a genuine installed chemical station. Before
   any chemical ship Joules are paid, a batch preflight checks actual 8A
   certified gas lots, 8A 8E/8F installation receipts, matching gas
   vessels, independent 320kg / 8MPa 80L 25kg pumps, <=12-scene-unit
   flanges, real original T02 420W wired pump power, and destination space.
2. Each gas input is actually **RESERVED** by its exact original 8A source
   lot ID into its own physically empty pipe container. This reservation
   and the named batch are durably saved together; nothing moves without
   electric power or elapsed physical pumping time.
3. The existing original 48V T02 grid *already* pays 420W for that pump.
   A sequence of bounded <=10s source-paid native reports gives actual
   isothermal compression work and physical distance throughput. Only
   after sufficient time AND actual served electrical work, original 8A
   `commit()` transfers real source mass from the rated vessel to its
   own finite **80L pipe**, retaining unique source-lot provenance.
4. A **second** native T02-paid operation moves the gas from that pipe
   through the physically verified <=12-unit plant flange. Gas stays as
   actual 8A pipe inventory while this step occurs; the plant cannot
   begin using its original ship chemical power before all required
   species are `READY`.
5. At the actual reaction completion, the original 8E chemical material
   owner consumes only the **exact source-pinned READY 8A pipe lot**. It
   checks the installed source vessel, pump hardware, original 8A
   stage-0 committed transfer receipt, gas-specific pipe volume/rating,
   source lot identity and minimum paid T02 work. There is no duplicated
   reactor gas tank, temporary free stock, free original battery power,
   or untracked reactor gas output.
6. Original chemical products still enter their own OUTBOUND 80L
   manufactured pipes and require a separate native T02-paid physical
   transfer to rated destination storage (#118).

All entered mass is original real 8A source stock. The actual outstanding
current-batch gas cannot be silently used by other gas streams. A real
solar outage, cut original T02 wire, damaged pump, invalid source lot or
unobserved large 100x clock gap **HOLDS** the gas without teleporting it.

## Cancellation and older saves

- Stage 0 gas is reserved at its original vessel; cancelling an active
  reactor cancels that 8A reservation without free creation.
- After stage-0 gas has actually reached the finite physical pipe,
  cancellation leaves it **in that real pipe**, no fictitious refund.
  A future explicitly powered recovery/purge action is still required
  to unblock abandoned pipe gas.
- Older saved pending chemical jobs with gas inputs lack signed paid-inlet
  stages. They HOLD; operator can cancel/restart, but already spent chemical
  energy is NOT refunded.
- Old valid chemical jobs with solid-only feed still work as previously.
- All newly saved job archive uses optional original `chemicalGasInput8h`
  source-owned schema=1 and preserves old saves with a null archive.

## What is not yet accepted

This is intentionally a time-metered 8A pipe→reactor feed, where the
**reaction itself consumes gas directly from that pipe**. It is not a
separate intermediate pressurized reactor buffer or full turbulent
continuous gas-fluid simulation, and a safe powered return/purge action
after cancellation is not yet implemented.

Other incomplete 8H acceptance: physical manufacturing stations actually
fed by locally driven truck/conveyor/depot instead of remote graph
edges, source-owned leaks/vents and waste receipts, unloaded distant
factory brownout and save/revisit tests, and one continuous player-run
ore→smelter→fabrication→rocket→piloted offworld delivery. Issue #86 must
stay OPEN. Updates 8I (local ecological habitat), 8J (planet-level
mass/energy-limited terraforming) and 8K (full two-world no-cheat
expedition) remain undone.

## Test commands

```bash
node --test tests/chemical-gas-input8h.test.cjs
node --test tests/chemical-gas-output8h.test.cjs
node --test tests/industrial-chemistry8e.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/chemical-gas-input8h-browser.py
```

The full original mandatory GitHub Actions suite must pass on the
**exact branch HEAD** before any release. Software WebGL2 cannot claim a
real consumer GPU benchmark or an uninterrupted human no-debug mission.
