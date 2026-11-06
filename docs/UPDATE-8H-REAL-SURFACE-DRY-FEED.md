# STARFALL Update 8H — Physically received dry ore and REAL surface chemical feed

**Status:** Draft source-owned 8H vertical slice, not complete 8H mission.
Issue #86 remains OPEN. Original player game, seed742, ship, original
truck, original 250W conveyor, original 8A mass and T02 Joules preserved.

## Previously missing 8H dry route

The original 8H real 250W T02-powered conveyor already moves genuine
8A dry lots depot → manufactured drive → different physical depot,
in two or more timed reserved/committed original 8A transfers. However,
the original 8E surface chemistry station still drew its solids from
the **ship cargo hold**, even after the real conveyor delivered raw
material to the **receiving surface depot**. A claim that the finished
conveyor powered a surface smelter would therefore have been false.

## Implemented in this slice

1. Erect a REAL original 8E glass furnace, reduction furnace, alumina cell,
   electrolyzer or catalytic reactor from its ACTUAL 8F manufactured,
   kit-paid, energy-paid full installation. The already-paid physical
   machine kit includes an **EMPTY** internal feed bin with original
   8A container owner `plantfeed8h:<stationId>`, physically bounded to
   **120 kg and 0.20 m³**, linked to the real station asset. No ore,
   motor, separate matter, ship battery or extra factory is gifted.
2. Actually build TWO cargo depots and at least one genuine 180 kg conveyor
   drive. Install the existing real 250 W T02 motor port, connect a real
   wire to a genuine original solar/battery/generator, and run a real
   bounded original 8A source → drive → destination dry packet under
   original native T02 power. The receiving depot MUST contain the true
   delivered `currentLotId` matching the original packet archive with
   `status=DELIVERED`.
3. The player physically walks on EVA within **20 scene units of BOTH**
   receiving depot and built factory; those stations must be within
   **32 scene units** of each other. Carry a maximum **20 kg** of real
   certified DRY stock at a time. Original 8A `reserve()` and
   `commit()` debit the receiving depot and credit that exact mass
   to the proper factory's paid internal source container. This is
   **MANUAL HANDOFF**, not a fake continuous conveyor-to-factory port.
   The transfer is durable, idempotent, body- and receipt-validated.
4. In the existing Engineer Chemical Plant console, choose **ACTUAL
   8A SURFACE PLANT FEED HOPPER** for its explicit original solid/liquid
   source instead of the default legacy **ORIGINAL SHIP HOLD**. The
   original 8E plant quote and original ship-paid chemical time/energy
   then debit actual original 8A source lot from this machine's own
   bounded hopper, not from the ship, with exact chemistry mass
   conservation and existing physically timed gas inlet/output piping.
5. Source/PLAY build parity, original browser, offline save and truck
   invariants are mandatory for this PR, not merely an invented fixture.

## Honesty and remaining work

- The final depot→machine transition here is **EVA hand-carried**, not
  a powered motorized belt connection. A fully continuous original
  250W conveyor drive endpoint on the surface refinery feed inlet is
  the next outstanding 8H requirement.
- Non-gaseous chemical outputs still go into the existing ship cargo.
  This slice does not pretend they magically move to a nearby depot.
- The surface chemical reactor still requires a landed ship, near
  original electrical umbilical and its genuine spent ship Joules.
  A fully remote solar/T02-powered autonomous factory on an unloaded
  planet is NOT implemented.
- The old already-installed stations stay ship-fed unless they have
  a real original installed source-owned hopper. No unpriced retrofit
  or automatic free storage is granted.
- The no-debug ore survey/driven truck → native powered dry route →
  8E processing→8F manufactured machines → 8G rocket → manually
  piloted offworld original ship delivery is **NOT YET VERIFIED**.
  Leaks, waste, night and battery 1×10×100×, old save/planet revisit,
  physical powered final connected feed and actual consumer GPU
  performance remain acceptance gaps.

## Focused tests

```bash
node --test tests/industrial-dry-feed8h.test.cjs
node --test tests/industrial-site8e.test.cjs
node --test tests/industrial-chemistry8e.test.cjs
node --test tests/conveyor-packets8h.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/industrial-dry-feed8h-browser.py
```

Do not merge before original exact latest source head full CI, standalone,
Chromium WebGL2, Engineering Regression, actual original truck/ship/ramp,
8H power and pressure gas safety gates ALL pass. Browser emulated WebGL2
is not evidence of actual consumer GPU FPS.
