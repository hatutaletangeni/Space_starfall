# STARFALL Update 8H — Original native T02 paid packet time-warp hardening

**Status:** Stacked draft. Never interpret this as complete remote 8H or
planetary engineering. User's acceptance register and issue #86 remain OPEN.
This slice changes **only a bounded original outpost power-loop adapter**.
There is no new energy source, duplicated battery, moved ship, surface
teleport, ore creation, altered galaxy seed or second T02 grid owner.

## Actual defect and narrow correction

Original outpost `StarfallOutpostUI.powerTick` consumes a requested interval
using at most **12** broad midpoint samples with approximately **600 s**
targets, suitable for solar generation and battery/habitat approximation.
Original 8H source-owned dry/gas packet observers **intentionally reject**
elapsed intervals longer than **10 simulated seconds**, to avoid counting
uncertain power/brownout events as free cargo progress.

At 100× simulation or during a short background/browser frame delay,
an original time advance of 120 s could previously generate one 120 s T02
report. The original battery paid energy but the packet held closed.
This is safe against free stock but not productive or 1×/100× consistent.

**Only when a saved, original 8H dry conveyor or 8MPa gas packet is ACTIVE**
on that body:

- Preserve original `StarfallOutpostUI.store.power(...)` as the ONLY Joule
  computation and mutation of original solar/battery sources.
- Integrate active paid native T02 reports in at most **48** substeps targeting
  **10 simulated seconds** each. This supports source-owned packet movement
  within a **480 s** observed interval with no more than 48 grid solves.
- Time-label the native report with the **end of the paid power interval**;
  the original daylight/rotation sample stays at its physical midpoint for
  reasonable quadrature accuracy. The packet's 8A material only moves after
  the exact native T02 report confirms served watts and physical wiring.
- If an interval exceeds 480 s or contains an unobserved power window,
  original 8H packet consumers remain **fail closed**: electricity can be
  billed to actual connected hardware, but material is NOT advanced using
  imaginary constant solar/pump power.
- Every site without an active 8H packet still uses precisely the ORIGINAL
  12-step/600-s policy and existing body-relative clocks.

For an interval `dt` within 480 s when a packet is active:

```
N = min(48, max(1, ceil(dt / 10 seconds)))
native_step = dt / N      [simulation seconds]
E_battery_source = integral(original T02 by-device P_served dt)
packet_step       = native T02 step only when native report and 8A custody are genuine
```

No 100× multiplication is applied twice. At 1×,10× and 100×,
`sum(P_served × native_step)` is exactly the original 250W/420W electrical
owner's `P × dt` in constant-load test fixtures. This is not a claim that
solar irradiance, sun angle, battery cutoff and actual original source power
are constant; the REAL original T02 grid independently determines those at
each midpoint, and may report unpowered, at which point the packet pauses.

## Honest outstanding limitations

The old generic outpost scheduler still caps very long remote catch-up to
one simulated day per call, with reduced sun samples. This change does NOT
turn 8H production into reliable multi-year analytic remote industry.
Hardware damage/fuse/blackout and gas leakage are separate requirements.
The original 8H gas packet model still needs true overpressure/leak
accounting and a complete no-debug two-world proof. This is a bounded,
near-real-time/100× simulation improvement, not the final 8H acceptance.

## Tests and restoration

```bash
node --test tests/active-native-substeps8h.test.cjs
node --test tests/pressure-gas-packets8h.test.cjs
node --test tests/conveyor-native-bridge8h.test.cjs
python3 tools/build-standalone.py
python3 tests/standalone-parity.py
python3 tests/active-native-substeps8h-browser.py
```

Acceptance must be recorded from exact-head original CI and browser run
results, not inferred from source text. Software WebGL2 Chromium is not
a real consumer-GPU FPS benchmark. The immutable rollback point is the
verified merged source of the preceding slice; do not merge stacked draft
work before parent #114 and #115 pass full exact-head release gates.
