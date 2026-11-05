# STARFALL Update 8H — Real original chemical gas PRODUCT pipe custody

**Status:** A source-backed draft vertical slice, not the full 8H expedition.
Main issue #86 stays OPEN. Uploaded 8A→8K specification mandates real
powered pipes and single authoritative mass, capacity, Joule and time
ownership. This implements **outbound chemical product gas staging only**.

## What changes in the real game

The existing 8E chemical plant cannot use an imaginary 75-unit remote
tank since merged PR #117. This next slice makes that actually
manufactured, source-paid gas line hold **real 8A chemical product lots**
instead of letting a completed batch instantly credit the receiving vessel.

1. Original 8E atom-balanced batch consumes its already-present genuine
   ship-held solid/liquid stock and/or genuinely stored rated-vessel gas
   reactants; original ship battery pays exact chemical electrical work
   across the existing time-based process. Existing paid 8H manifold
   requires physical two-flange station→pipe→receiver, kit receipts and
   ORIGINAL T02 420W power before it runs.
2. On completion, the ORIGINAL 8E plant makes each **gaseous output** as a
   true `chemical:chem8e:<serial>:<species>` lot **inside its own
   manufactured 80 L / 25 kg / 8 MPa pipe**. No receiving gas vessel is
   credited at batch completion. Original 8A checks pipe mass, volume,
   composition and ideal-gas pressure at 293.15 K. Non-gas products still
   enter the original ship cargo hold.
3. Only after the physical product lot and original chemical receipt exist,
   the original 8A ledger RESERVES the lot for its pre-certified matching
   output vessel. This receipt and the original pipe-owned stock are saved
   together, including the already-debited original ship battery state.
4. The ORIGINAL 48 V T02 grid (not a second energy model) samples at
   <=10 simulated seconds for active physical jobs. Once a served 420 W
   pump report and original wires, installation, pressure and geometry
   are verified on EVERY step, the reservation countdown progresses.
   At the end, the ORIGINAL 8A `commit()` debits the exact gas lot from
   the pipe and credits that same mass to the rated gas vessel.
5. Night/brownout, disconnected motor, damaged pipe, stale report,
   overloaded storage and unknown >10s gaps HOLD the physical lot in
   place. Original saved gas operation IDs and source lots prevent double
   delivery across reload, frame replay or double click.
6. Engineer→Chemical Plant now reports each physical pipe, destination
   vessel, gas species, mass, job state, remaining time and source-paid
   Joules, rather than claiming gas instantly arrived.

The source-owned 8A mass equation at every step is

```
M_before = Σ original8A_lot.massKg
M_after  = Σ original8A_lot.massKg
M_after - M_before = 0 kg   (barring an explicit chemical transformation,
                             where total original 8E inputs = outputs)
```

Electrical work is charged ONCE via the native T02 outpost store:
`J_observed = Σ 420 W × originalT02_served_interval_s` per real port
(plus original modeled wire/battery losses). The output-only transfer does
NOT independently subtract more Joules from the battery. Original ship
chemical energy remains a separate real work budget.

## Deliberately incomplete

- **INBOUND chemical gas reactants still debit the original rated input
  vessel directly at batch completion.** They pass the real physically
  connected/manufactured native T02 gate, but a staged source vessel→80L
  pipe→reactor feed mechanism is not implemented by this outbound slice.
- The intermediate chemical reaction remains an idealized balanced batch,
  not transient nonlinear thermochemistry or continuous flow control.
  Multiple production cycles cannot reuse a still-occupied output pipe.
- The native pump requires ongoing served electricity; no fake background
  power over unloaded, unobserved 100× gaps is claimed.
- Original 8H truck/depot→surface smelter physical feed, full ore-to-rocket
  player expedition, destructive pipe leaks with original 8A mass-loss
  receipts, and actual hardware GPU benchmarks remain NOT VERIFIED.
- Existing two-hop original 8H vessel-to-pipe-to-vessel gas flow stays
  unchanged. Both models share actual hardware and original single
  inventory; a pipe busy with one route must not start another process.

## Focused verification

```bash
node --test tests/chemical-gas-output8h.test.cjs
node --test tests/industrial-chemistry8e.test.cjs
node --test tests/industrial-gas-manifold8h.test.cjs
node --test tests/pressure-gas-packets8h.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/chemical-gas-output8h-browser.py
```

The exact commit of this branch must pass all original mandatory
Engineering Regression, WebGL2 Chromium, source/standalone parity and
ship/truck/8G/8H browser gates before merger into main. Source fixtures
are NOT proof of an uninterrupted human expedition. A real GPU
benchmark remains not verified.
