

# STARFALL ENGINEERING ENCYCLOPEDIA — Edition 1 (November 2026)

*A source-grounded, self-study engineering textbook, programming dictionary, and maintenance manual for `hatutaletangeni/Space_starfall`.*

**Audience:** the game's future solo maintainer. **Source baseline:** current `main` inspected 2026-11-08. **Purpose:** explain how the game works deeply enough to inspect, debug, extend and release it independently.

**Evidence convention.** **[SOURCE]** means a concrete file or implementation inspected; **[MODEL]** is an explanatory analogy, hypothetical experiment, Python/C/assembly translation, or historical background, not a claim that such code is currently compiled into STARFALL. **[VERIFY]** means integration or end-to-end behavior needs testing. This distinction matters: code existing does not prove an entire mission works. GitHub branches, especially Update 8K integration PR #134, can differ from `main` and must be compared before use.

**How to use this book.** Read chapters 1–5 before changing the runtime; use the source atlas and glossary as reference; work through all laboratory exercises; keep the test and conservation checklist open for every PR. Every version's line numbers drift, so **search by symbol and file path, not by fixed line number**.

**A central rule:** **do not edit `PLAY-STARFALL.html` as the master.** It is output of `tools/build-standalone.py`; the mobile playable is output of `tools/build-mobile-standalone.py`. Edit the corresponding source file and rebuild.



# 1. What the game really is — system anatomy

STARFALL is a browser game combining HTML (document structure), CSS (appearance and responsive layout), JavaScript (simulation, state, procedural content and WebGL rendering), GLSL shader source (GPU programs), and Python (offline packaging, validation and browser tests). WebGL2 is a browser graphics API, not a separate game engine. The app has no required runtime server, package manager or internet dependency for its standalone HTML build. The project's physics is deliberately hybrid: modeled Newtonian motion and orbital elements coexist with fictional warp; simplified chemistry and atmosphere models coexist with explicit material and power conservation.

**Boot path (trace this manually):**

```text
index.html
  ├── inline CSS, canvas #universe, interface panels, script ordering
  ├── src/galaxy.js → StarfallGalaxy.generateGalaxy(seed, ...)
  ├── src/engine.js → Starfall3D.Renderer and WebGL2 draw resources
  ├── source physics, inventory, vehicle, science, world and UI modules
  └── src/flight.js
        ├── new Renderer(canvas, galaxy)
        ├── SF.load() → migrate/restore saved session
        ├── StarfallPhysical8A.create(...) → unique physical assets
        ├── StarfallMaterials8A.create(...) → authoritative material lots
        ├── StarfallMining8D.prepareContainers(...) → truck and ship hold
        ├── flight motion, EVA, truck, landing, world transitions
        └── event loop → update simulation → draw → persist
  └── src/ui22-workflow.js, Engineer/Operate/Explore UI systems
tools/build-standalone.py → PLAY-STARFALL.html
tools/build-mobile-standalone.py → PLAY-STARFALL-MOBILE.html
```

The precise initialization order is the actual sequence of `<script src="...">` tags in `index.html`; do **not** treat this schematic as a complete literal call graph. Browser script order is critical because modules expose globals such as `Starfall3D`, `StarfallRuntime`, `StarfallMaterials8A`, and `StarfallManufacturing8F`.

**Why 22,000 lines?** Inlining dozens of editable source scripts and styles creates one long generated HTML file. The number is **not** 22,000 lines of one manually maintained algorithm. The bundled copy is an executable snapshot, not the place to implement lasting changes.

**Core state boundaries:**
- Render state: cameras, geometry, buffers, UI focus; transient/reconstructible.
- Physics state: positions, velocities, attitude, mission clock and environmental estimates.
- Authoritative persistent state: asset IDs, custody, saved inventories, outpost power, material debits, receipts and mission progress.
- Derived readouts: UI predictions, status reports, overlay markers, calculated pressures. A displayed number is not necessarily an authoritative save field.

The most damaging bug category is **two authorities claiming one resource** (e.g., truck cargo duplicated between UI state and original 8A ledger).



# 2. Source atlas: which file owns which problem?

| Want to change | Start at | Why |
|---|---|---|
| Stars, planets, procedural seed | `src/galaxy.js` | Seeded galaxy generation, world metadata and identifiers |
| Frame, meshes, camera, terrain, GPU | `src/engine.js` | Renderer, vectors, matrices, procedural noise and shaders |
| Ship flight, land, EVA, truck and save orchestration | `src/flight.js` | Primary running game; large, tightly coupled controller |
| HTML, styles, script order | `index.html` | Entry document and dependency order |
| Mission steps and action routing | `src/ui22-workflow.js` | Five-stage Navigate/Explore/Build/Operate/Records interface |
| Vehicle power/workbench | `src/physics/engineering-ui.js` | Electrical switch, component and part UI |
| Unique physical ships, trucks, assets | `src/physics/physical-inventory8a.js` | 8A authoritative physical asset custody |
| Lots, reservations, containers | `src/physics/material-ledger8a.js` | 8A source-owned stock transfer transactions |
| Truck cargo and mining | `src/physics/mining-hauling8d.js` | 8D 20 kg drill / 50 kg loader, 800 kg truck hopper |
| Deterministic deposits | `src/physics/planetary-resources8c.js` | Planet-fixed geological sites and depletion |
| Ship ore and ice processing | `src/physics/refinery8e.js` | Finite refinery recipes, work and residues |
| Machine recipes / bills of materials | `src/physics/manufacturing8f.js`, `src/physics/kit-recipes8f.js` | Categories, stations, recipe inputs and outputs |
| Source-backed factory jobs | `src/physics/factory8f.js` | Input grade, tool qualification, bounded energy and time |
| Physical industrial sites | `src/physics/industrial-site8e.js` | Certified kit → placed asset; clearance and energy |
| Gas pipeline | `src/physics/pressure-gas-packets8h.js`, `src/physics/pressure-pipe-live-ui8h.js` | 8H finite two-hop gas custody and pump controls |
| Surface outposts and wiring | `src/physics/outposts.js` | Body-fixed position, solar, battery, graph edges |
| Legacy habitat life support | `src/physics/habitat-t09.js` | Oxygen, nitrogen, CO₂, leaks, scrubbers, thermal and airlock |
| Update 8 model habitat | `src/physics/habitat8i.js` | Isolated first-order model, not itself full live T09 integration |
| Planet atmosphere model | `src/physics/terraform8j.js` | Conservative planet mean pressure ledger |
| Initial finite manifest (main) | `src/physics/expedition-manifest8k.js` | Preflight stock with legacy-save safeguards |
| Mobile controls | `src/mobile/landscape.js`, `landscape.css`, `landscape.html` | Touch adapters and landscape presentation |
| Desktop standalone | `tools/build-standalone.py` | Inlines local source and CSS |
| Mobile standalone | `tools/build-mobile-standalone.py` | Adds mobile HUD/CSS/JS then inlines sources |
| Invariant/regression tests | `tests/*.test.cjs`, `tests/*-browser.py` | Node unit tests and real browser/Playwright flows |
| Branch release evidence | `docs/`, `.github/workflows/` | Specs, acceptance reports and CI gates |

**Caution:** A filename containing `8I` or `8K` does not prove the corresponding stage fully works; follow all callers, save ownership, tests and actual gameplay.



# 3. JavaScript fundamentals, taught from STARFALL

**History.** JavaScript was designed by Brendan Eich at Netscape in 1995, standardized as ECMAScript in 1997, and gained modern syntax and modules under ES2015. Browsers execute JavaScript through engines with JIT compilation, garbage collection and asynchronous event loops. **It is neither Java nor a Java applet.**

1. **`const` and `let`:** block-scoped names; `const` prevents rebinding, not mutation of the object referenced. `let` allows reassignment. STARFALL uses `const V={...}` for vector utilities and `let landed=false` for mutable simulation state.
2. **`function` and arrow functions:** reusable algorithms. `const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;` is a one-expression function. Arrow functions capture their surrounding `this` instead of creating one.
3. **Objects:** records of named fields, e.g., `{id:'truck-expedition-001',massKg:1600}`. Objects are references; two names can point at the same object.
4. **Arrays:** indexable sequences, e.g. `[x,y,z]` for vectors. `.map`, `.filter`, `.reduce` are transformations and aggregations (not magic game resources).
5. **`Map` and `Set`:** keyed associative collection and unique-value collection. 8A uses `new Map()` to identify source-owned lots; flight uses `new Set()` for pressed keys. Unlike a plain object, `Map` handles non-string keys.
6. **Destructuring:** `const {Renderer,V,groundHeight}=Starfall3D;` binds selected members of an existing exported object.
7. **`?.` optional chaining:** `report?.shed` avoids throwing when a report is missing; it does not assert the report is correct.
8. **`??` nullish coalescing:** provides a fallback for `null` or `undefined`; unlike `||` it preserves valid zero.
9. **`Object.freeze`:** shallowly stops modifications to an object; does not recursively freeze children. Used on recipe and config constants.
10. **`throw Error(...)`:** immediate contract rejection; **never** replace a rejected transfer with free inventory or reset a corrupted save silently.
11. **`try/catch`:** recovery at an interface boundary. For example, `src/flight.js` catches Renderer initialization failures and displays fatal UI. Do not broadly swallow physics exceptions.
12. **`IIFE` (immediately invoked function expression):** `(function(root){'use strict'; ... })(globalThis);` keeps module-local variables private and attaches a controlled API to a known global. STARFALL uses this style because its offline build preserves simple ordered scripts.
13. **`module.exports`:** optional Node/CommonJS export in core physics files, enabling `require('../src/physics/...')` in `.cjs` tests without a browser.
14. **`JSON.parse(JSON.stringify(x))`:** simple deep-ish clone for JSON-like finite save data. It loses `Map`, `Set`, `undefined`, methods, special numeric types and circular references; use it only for validated serializable schemas.
15. **`Number.isFinite`:** guards against NaN and Infinity, which otherwise poison mass, state and GPU transforms.
16. **`Math.imul` and unsigned `>>>0`:** deterministic 32-bit integer arithmetic used by STARFALL's seeded random/hash fields.
17. **`requestAnimationFrame`:** browser asks the code to prepare the next visual frame. The call itself does not grant simulated seconds or saved energy.
18. **`addEventListener`:** browser event wiring. Touch/keyboard actions should converge on one authoritative command, not independent physics implementations.
19. **`document.getElementById`:** DOM lookup (UI). `textContent` writes plain text; untrusted dynamic markup should not go through unsanitized `innerHTML`.
20. **`new Float32Array(16)`:** contiguous 32-bit float buffer suitable for WebGL, unlike an arbitrary JSON object.
21. **`performance.now()`:** high-resolution elapsed wall time for animation; distinct from in-game `simTime`.
22. **`this`:** a method's instance/context, used in renderer classes such as `this.infrastructure`. Avoid inadvertently losing `this` in callbacks.

**Read the syntax of a typical STARFALL vector function [SOURCE, `src/engine.js`]:**
```javascript
const V = {
  add: (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  dot: (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  norm: a => {
    const m = Math.hypot(...a) || 1;
    return [a[0]/m,a[1]/m,a[2]/m];
  }
};
```
`...` spreads the array into three arguments. `||1` is a defensive denominator fallback but does not by itself prove the zero vector is a meaningful direction.

**Why these constructs?** Compact data-driven math and predictable JSON serialization work well in a dependency-free browser game. **Replacements:** TypeScript for static types, ES modules/bundler for dependency resolution, Rust/Wasm for compute-intensive kernels, a component system for complex UI. Each adds build complexity; none automatically fixes ledger correctness.



# 4. One algorithm in four languages: JavaScript → Python → C → assembly

The versions below are **pedagogical equivalents**, not four codepaths that STARFALL executes. The game currently runs JavaScript in the browser and uses Python primarily for tooling. Assembly varies by CPU architecture. Shown assembly is **illustrative x86-64 SSE scalar arithmetic**, not a tested build and not the browser's emitted JIT machine code.

**Task:** add two 3D vectors.

**JavaScript (actual STARFALL style):**
```javascript
const add = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
```
Dynamic arrays and numeric values; garbage-collected result; concise but may allocate every call.

**Python translation:**
```python
def add(a, b):
    return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
```
Readable and good for prototyping; Python loops have higher per-element overhead unless NumPy is used.

**C translation:**
```c
void add3(const double a[3], const double b[3], double out[3]) {
    for (int i = 0; i < 3; ++i) out[i] = a[i] + b[i];
}
```
Explicit destination memory, static double type, compiled ahead of time, pointers must be valid.

**x86-64 assembly-style core [MODEL]:**
```asm
; conceptual System V: rdi=&a[0], rsi=&b[0], rdx=&out[0]
movsd xmm0, [rdi]       ; a[0]
addsd xmm0, [rsi]       ; + b[0]
movsd [rdx], xmm0       ; out[0]
; repeat with byte offsets +8 and +16 for the other doubles
ret
```
Register names and ABI are platform-specific; a modern compiler might use SIMD instructions or unroll this loop.

**Task:** check a valid non-negative mass.

```javascript
// JS
const validMass = m => typeof m === 'number' && Number.isFinite(m) && m >= 0;
```
```python
# Python
import math
def valid_mass(m):
    return isinstance(m, (int, float)) and not isinstance(m, bool) and math.isfinite(m) and m >= 0
```
```c
/* C */
#include <math.h>
#include <stdbool.h>
bool valid_mass(double m) { return isfinite(m) && m >= 0.0; }
```

Assembly analogy: a floating compare checks the sign and ordered-ness (NaN makes the comparison unordered); representation and branch flags matter. Do not write a custom assembly float validator until architecture and calling convention are known.

**Task:** transactional resource move (conceptual). JS: `reserve(id, lot, dst, kg)` then `commit(id)`. Python: dict + immutable cloned state, validate before replacing. C: structs + allocation/rollback, careful ownership. Assembly: low-level loads/stores/branches/locks—**not** intrinsically atomic just because it is assembly. The authoritative commit boundary and durable save matter more than language speed.

| Concept | JavaScript | Python | C | Assembly |
|---|---|---|---|---|
| Dynamic record | object | dict/dataclass | struct | offset-based memory layout |
| Reusable code | function | def | function | call/return convention |
| Collection | Array, Map | list, dict | dynamic array/hash table library | manual pointers/data structures |
| Safety | runtime validation | runtime/type hints | compiler warnings/ownership discipline | manual memory and ABI correctness |
| 3D numeric data | Float32Array | numpy.ndarray | float[16] | SSE/AVX registers and memory |
| Async event | browser event loop | asyncio/threads | event loop/callback/threads | OS syscalls + scheduler |
| GPU program | GLSL via WebGL | OpenGL bindings | OpenGL/Vulkan clients | CPU assembly cannot replace GLSL shading directly |
| Packaging | embed scripts in HTML | Python script | linker/compiler | assembler/linker |

**C versus C++:** STARFALL has no demonstrated production C/C++ runtime. Their translations teach low-level thinking; they are not hidden source files.



# 5. Computational geometry, vectors and matrices

This chapter explains the actual mathematical vocabulary of `src/engine.js`, `src/galaxy.js`, `src/physics/outposts.js`, and `src/flight.js`.

**Vector:** \(\mathbf v=[x,y,z]\). Add positions and offsets componentwise. **Dot product** \(\mathbf a\cdot\mathbf b=\sum a_i b_i\) gives alignment, projection and angle tests. **Cross product** \(\mathbf a\times\mathbf b\) yields a perpendicular vector (right-hand orientation). **Norm** \(\|\mathbf v\|=\sqrt{x^2+y^2+z^2}\). **Unit vector** \(\hat{\mathbf v}=\mathbf v/\|\mathbf v\|\); invalid for zero norm.

**What STARFALL does [SOURCE]:** `V.dot`, `V.cross`, `V.norm`, `V.rot` appear in the renderer; outposts use normalized planet-fixed directions. **Rodrigues' rotation formula** underlies `V.rot`: \(\mathbf v'=\mathbf v\cos\theta+(\hat{\mathbf a}\times\mathbf v)\sin\theta+\hat{\mathbf a}(\hat{\mathbf a}\cdot\mathbf v)(1-\cos\theta)\). Check vector normalization before each rotation.

**Transform matrices:** a 4×4 homogeneous matrix combines translation, orientation and scale; `Float32Array(16)` stores GPU-friendly elements. `M.perspective` creates a projection; `M.look` derives the camera view axes; `M.mul` composes transforms. **Matrix multiplication is not commutative**: translating then rotating an object generally differs from rotating then translating it. Understand row vs column vectors and memory order before changing indices.

**Perspective projection:** a point in 3D is projected to clip coordinates; perspective division by `w` makes distant objects appear smaller. `near`/`far` clip planes affect both visibility and depth precision. Huge solar-system extents are numerically dangerous in Float32; retain high-precision world coordinates in JS doubles and render relative to a nearby camera/origin.

**Planet-fixed coordinates:** the surface location `[x,y,z]` is a normalized radial direction attached to a specific body, not free-floating XYZ in galaxy space. `src/physics/outposts.js` computes geodesic arc:
```javascript
const arc = (a,b,radius) =>
  Math.acos(Math.max(-1, Math.min(1, dot(norm(a),norm(b))))) * radius;
```
Distance is `radius × angular separation` in scene units. The clamp prevents NaN from slight floating-point overshoot. The body ID must also match. Never treat surface coordinates from Planet A as a valid point on Planet B.

**Real-world analogue:** robotic navigation transforms between inertial, body and sensor reference frames. **History:** analytic geometry (Descartes), vector algebra (Gibbs/Heaviside), 3D homogeneous graphics transformations (computer graphics 1960s onward). **Alternatives:** quaternion attitude for stable rotations; hierarchical local transforms; double-precision relative origins; geographic lat/lon systems; geodesic libraries.



# 6. Procedural galaxy and reproducible randomness

**[SOURCE] `src/galaxy.js`:**
```javascript
function rngFactory(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296);
}
```
This is a **linear congruential generator** (LCG) with 32-bit state. Each call advances `s = (a*s + c) mod 2^32`; division maps the integer to a floating fraction in [0,1). The seed is a reproducible start state. The sequence is **not cryptographically secure** and should never be used for passwords or security tokens.

`StarfallGalaxy.generateGalaxy(GALAXY_SEED,64)` in `src/flight.js` generates the seeded playable galaxy; default query seed is 742. Planet type, moon count, color, radius and system spacing are derived by seeded functions. A world ID must remain stable across game versions and saved discoveries: **changing the number or order of random draws can silently regenerate a player's universe**, even if you keep seed 742.

**Spatial procedural textures:** `src/engine.js` implements `hash3`, interpolated noise and multi-octave `field`. It floors coordinates, hashes corner lattice points, smoothly interpolates, then adds scaled spatial frequencies. Unlike asking RNG for a new number every frame, sampling the same coordinate must reproduce the same terrain. Collision and visual terrain must share the same authority rather than two mismatched random fields.

**History:** Lehmer proposed multiplicative random generators in 1951; Ken Perlin developed influential coherent noise for CGI in the 1980s. **Alternatives:** PCG, xoshiro, Mersenne Twister (simulation), Simplex/OpenSimplex, ridged multifractals, fixed planet cell hashes. Replacing an existing RNG in a persistent game requires explicit versioned migration, not a silent switch.

**Experiment:** log galaxy IDs and a checksum for seed 742, reload the same seed, compare; then modify only drawing and verify IDs remain identical.



# 7. WebGL2 and the GPU pipeline — from CPU data to pixels

**[SOURCE] `src/engine.js` describes itself as a library-free WebGL2 renderer rendering continuous planet terrain, ship, atmosphere and stars in the same scene.** WebGL2 is based on OpenGL ES 3.0 and exposes GPU buffer, shader, texture, uniform, vertex array and framebuffer operations through the browser.

**Mental model:**
```text
CPU JavaScript
  → build/reuse geometry vertex/index data
  → typed arrays and GPU buffers
  → vertex shader (object space → clip space)
  → primitive assembly and clipping
  → rasterization (which pixels are covered)
  → fragment shader (material/light/color)
  → depth test/blending
  → canvas framebuffer → browser compositor
```

**GLSL vertex-shader concept [MODEL]:**
```glsl
#version 300 es
in vec3 a_position;
uniform mat4 u_projection, u_view, u_model;
void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
```

**GLSL fragment-shader concept [MODEL]:**
```glsl
#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(0.28,0.62,0.85,1.0); }
```
These are educational snippets, **not copied shader sources**. Inspect actual shader template strings inside `src/engine.js` to find its real inputs, lighting and atmospheric material formulas.

**Why a mesh?** A sphere is approximated by triangles with vertices and indices. **Why LOD?** A distant planet needs fewer visible triangles than terrain directly under the ship. **Why culling?** Do not send or draw what cannot contribute to the current view. **Why buffers?** GPU uploads and allocations are expensive, so reuse geometry where possible.

**Common performance causes:** too many draw calls, expensive shaders, high-resolution atmospheric passes, allocating geometry every frame, huge transient arrays causing garbage collection, too many outpost meshes, and unbounded planet caches. **Do not conflate FPS with simulation correctness.** A beautiful 60 FPS build can still duplicate iron.

**WebGL diagnostic procedure:** check `getContext('webgl2')` success, shader compilation/link messages, `gl.getError()` sparingly, canvas dimensions/device pixel ratio, element overlay events, actual GPU timing when available. Headless Chromium with SwiftShader proves software-path execution—not consumer GPU FPS.

**History:** fixed-function 3D accelerators gave way to programmable vertex/fragment shaders; WebGL arrived in browsers around 2011; WebGL2 expanded formats and features around 2017. **Replacements:** Three.js/Babylon.js (higher-level renderers), WebGPU (modern GPU API), Godot/Unity/Unreal (full engines). A replacement renderer is a major migration, not a safe one-line optimization.



# 8. Flight simulation, numerical integration and game time

**[SOURCE] `src/flight.js` owns `simTime`, `timeScale`, `pos`, `vel`, `forward`, `up`, `landed`, `warp`, `eva`, `truckOccupied`, and initializes `new StarfallPhysics.SimulationClock(0)`.**

A numerical simulation approximates differential equations:
```text
velocity = derivative(position, time)
acceleration = net_force / mass
position_next ≈ position + velocity * dt
velocity_next ≈ velocity + acceleration * dt
```
This is an illustrative **Euler-like** step, not a guarantee that every STARFALL integrator uses Euler. Inspect `StarfallPhysics` and `StarfallFlightPhysics` for the actual solver, gravity and drag.

**Wall time vs simulated time:** `performance.now()` measures elapsed wall milliseconds. `simTime` is in-game elapsed seconds. `timeScale=10` or `100` must advance state **and resource debit** consistently, not apply a single giant unbounded frame to a machine intended to draw 2.4 kW continuously.

**Numerical stability:** a single 500-second Euler step can overshoot a collision, battery limit or reactor finish. Use fixed/bounded substeps and analytic coarse updates where mathematically justified. Test `advance(100)` versus `advance(10)` ten times for equivalent conserved results. The original finite refining/industrial systems deliberately use bounded increments.

**Landing is a state machine**, not a redirect to another page: space → approach → atmospheric flight → touchdown → EVA/ship interior. Prevent transitions when cargo is unsecured, a truck is midway down the ramp, or service ports are latched. The truck and original science rover must retain their IDs.

**Inertial and non-inertial frames:** a ship's world position, a point on a rotating planet and the character's cabin coordinates belong to different frames. Using one as the other causes floating ramps, planet jitter, misplaced truck beacons, and impossible gas-pipe ranges.

**History:** Newton's motion laws; Euler/Runge–Kutta numerical integration; fixed-timestep game loops popularized in real-time game engineering. **Alternatives:** velocity Verlet for stable conservative mechanics, RK4 for smoother accuracy, symplectic schemes for orbital dynamics, deterministic fixed simulation steps plus interpolated display. Warp is fictional: separate its gameplay contract from actual Newtonian force calculations.



# 9. State machines, interaction and the UI

**[SOURCE] `src/ui22-workflow.js` defines five stages: 01 Navigate, 02 Explore, 03 Build, 04 Operate, 05 Records.** Buttons call existing source-owned actions instead of inventing separate processing logic. `src/physics/engineering-ui.js` handles vehicle electrical power and the engineering workbench. `src/mobile/landscape.js` adapts touch actions to existing keyboard codes and checks truck/ship-bay context.

**Finite state machine:** actions are legal only in certain states. For truck:
```text
SHIP_STOWED → UNSECURED → DRIVING_ON_RAMP → SURFACE
                      ↘ DRIVING_IN_BAY → STOWED
EVA + near truck + X → TRUCK_OCCUPIED
TRUCK_OCCUPIED + safe deck or ground + X → EVA / SHIP INTERIOR
```
Diagram is explanatory. Read original `cargo-bay8b.js`, `truck-custody8b.js`, `src/flight.js` for exact guards; simply setting `truckOccupied=false` may desynchronize custody, collision and camera.

**Event bubbling:** clicking a button fires a DOM event. A controller should validate physical range and permissions before calling the actual runtime action. **Focus management:** keyboard shortcuts must not move the ship while the user types into an input. Touch overlays need `touch-action`, prevent-select CSS and pointer capture where appropriate, not a second independent movement engine.

**Separation of concerns:** UI describes/selects and dispatches; physics model validates and commits. If a gas-control button just changes a label, you have not physically pumped gas.

**History:** finite-state systems from automata theory, MVC/MVP UI patterns, event-driven GUI systems since the 1970s–80s. **Alternatives:** statecharts/XState, command bus, reducer-style events, functional UI framework. Use them only if they can preserve source-of-truth and legacy saves.



# 10. Inventory and database transactions — the most important engineering

**[SOURCE] `src/physics/material-ledger8a.js` is a stock ledger of uniquely identified lots, containers and operations; `src/physics/physical-inventory8a.js` owns persistent physical assets and their unique locations.** These are deliberately separate from GPU meshes.

**MaterialLot fields:** `id, materialId, containerId, massKg, volumeM3, provenance, grade`. **Container:** `id, ownerId, maxMassKg, maxVolumeM3`. **Asset:** `id, type, massKg, volumeM3, location, condition, provenance, components, state`. A graphical crate is not evidence of a corresponding material lot.

**Transactional transfer:**
```text
REQUEST
  → validate lot, body, positions, amount and destination
  → reserve same lot and capacity (status RESERVED)
  → physically carry/pump at a paid rate
  → commit unique operation ID exactly once (status COMMITTED)
  → durable save both original source and new destination
CANCEL → release remaining reservation, do not refund consumed power or already-processed feed
```
The real material ledger uses `reserve(id, lotId, destinationId, massKg)` and `commit(id)`. If the same committed ID is retried, it returns the committed operation rather than minting new stock. Conflicting reuse of an operation ID is rejected.

**Invariants to prove:**
```text
sum(source_lots_before) + sum(dest_lots_before)
  == sum(source_lots_after) + sum(dest_lots_after)
destination_mass <= container.maxMassKg
destination_volume <= container.maxVolumeM3
unique asset ID has exactly one owning location
no negative stock, no duplicate receipt, no cross-world teleport
```
For mass conversion, *product + residue + explicit emissions = reactant feed*, with chemical reactant molecules separately accounted. Power is Joules, not kilograms.

**ACID analogy:** Atomicity: all-or-nothing transaction; Consistency: constraints hold; Isolation: outstanding reservations don't oversell; Durability: save survives reload. These are **principles**, not proof STARFALL implements a fully ACID database. The game's JSON snapshot/save boundary needs targeted crash and replay tests.

**History:** double-entry accounting and database transaction processing; idempotent request IDs in distributed payment APIs. **Alternatives:** event-sourced journal + replay, SQLite/Wasm storage, IndexedDB transactions, Rust durable ledger module. Never introduce a second authoritative inventory merely to make UI easier.



# 11. Industry: ore → metallurgy → fabrication → machines

**[SOURCE] Update 8C–8F architecture:**

- `planetary-resources8c.js`: deterministic **potential** ore sites, planet-fixed tile keys and finite accessible deposits. Its header explicitly says it does not mint inventory.
- `mining-hauling8d.js`: physical extraction and truck/ship movement. The original drill batch is 20 kg at 2,400 W for 24 simulated seconds (57,600 J). The original loader batch is 50 kg over 16 seconds at 1,400 W. Truck hopper limit: 800 kg/1.2 m³; ship material hold: 9,000 kg/16 m³.
- `refinery8e.js`: e.g. `iron_sort` consumes 20 kg iron ore, demands 1,800 W for 100 s = 180 kJ, and creates iron concentrate plus iron tailings according to source grade and recovery. `iron_mineralogy` identifies hematite; `carbon_recovery` separates finite carbon from carbon-bearing feedstock.
- `manufacturing8f.js`: recipes for wire, mechanical components, motors, circuit boards, batteries, PV and industrial kits. Each declares station, tool, inputs, outputs, `powerW`, `seconds`, tolerance.
- `factory8f.js`: qualified installed station, input inventory and grade, reserved quantities, storage volume and available energy. A recipe's existence alone does **not** create machinery.
- `industrial-site8e.js`: one genuine manufactured kit, extra installation energy, terrain clearance and physical asset creation.

**Bill of materials (BOM)** means a structured list of required input quantities. **Yield** is produced useful mass divided by accounted feed mass. **Scrap** is the output fraction not in useful finished stock. **Provenance** tells how material entered the economy. **Grade** is the fraction or quality relevant to a specific assay; its meaning must match the process. For a mined ore `grade=0.3` does not mean 30% of the rock magically becomes pure metal without reducing chemical oxides and tracking removed oxygen.

**Example: nitrogen vessel.** The `vessel_kit_nitrogen` recipe is a 195 kg certified assembly with significant steel, aluminium, copper, refractory block, glass and insulated wire input. Manufacturing needs a fixture and additional installation work. A pressure vessel is **not** automatically nitrogen gas; actual separation must debits a finite atmospheric source.

**Chemical integrity:** idealized `2H₂O → 2H₂ + O₂`; multiply by molar masses to balance water/oxygen/hydrogen atoms. Hematite reduction needs a real reducing agent and an exhaust species. Copper, silicon and aluminium extraction are not interchangeable simple `ore → metal` recipes.

**Potential replacements:** recipe dependency graph visualizer; typed JSON schema generated from one recipe authority; actual plant conveyors/pipes; physically modeled chemistry with stoichiometric matrix; improved metallurgy simulations. Never fix production shortages by unmarked `importLot` grants.



# 12. Power, gas, thermal and habitats

**Electrical units:** Joule (J) energy; watt (W) joule per second; kilowatt-hour = 3,600,000 J. `energyJ = powerW × seconds`. A vessel, machine and battery have distinct capacities. A 420 W pipe pump running 10 s demands 4,200 J before transfer efficiency and other work.

**[SOURCE] `src/physics/outposts.js`** models body-fixed solar arrays, batteries, wiring groups and consumers. Example specs: habitat 680 W; battery 72 MJ capacity; solar array nominal 4 kW; native pressure-pipeline load 420 W; conveyor drive 250 W. Grid models consider solar illumination, night/eclipses, battery limits and circuit loads; do not assume a powered ship makes a distant surface pump connected.

**[SOURCE] `src/physics/pressure-gas-packets8h.js`:** actual two-hop transfer: rated vessel → empty physical 80 L pressure pipe → distinct rated vessel. Maximum packet is 5 kg; timed native T02 power and 8A atomic lot custody are required. Ideal-gas pressure is approximated with \(PV=nRT\), at the source's simplified 293.15 K. Pipeline interlocks protect material accounting; **not a real-life pressure installation certification**.

**[SOURCE] `src/physics/habitat-t09.js`:** an 80 m³ modeled cabin, oxygen/inert/CO₂ moles, airlock states, 680 W electrical demand, pressure/temperature bounds, scrubber and water consumption. For gas mixture \(P=(n_{O₂}+n_{N₂}+n_{CO₂})RT/V\); oxygen partial pressure is \(P_{O₂}=n_{O₂}RT/V\). A living habitat needs more than a sealed shell: source-paid O₂/N₂/water, scrubber medium, a powered bus and thermal control.

**[SOURCE] `src/physics/habitat8i.js` and `terraform8j.js`:** simplified models exist, but these files **alone** do not establish full live gameplay integration. A planet-scale uniform-atmosphere pressure approximation is \(P=Mg/(4\pi R^2)\). Changing pressure by \(\Delta P\) requires \(\Delta M\approx4\pi R^2\Delta P/g\), usually an enormous mass. A few kilograms of factory gas cannot turn a whole planet green.

**History:** Boyle/Charles ideal-gas thermodynamics; Watt/steam power systems; Rankine/HVAC and later closed ecological life support in spacecraft research. **Alternatives:** finite-volume fluid models, model-predictive control for thermal/air management, proper gas mixture EOS for extremes, electrical power load-flow solvers, higher fidelity stellar radiation balances. All require clear assumptions and tests.



# 13. Save files, schemas and backward compatibility

In `src/flight.js`, `SF.load()` obtains persisted session data, while runtime code creates authoritative 8A objects from saved snapshots and later serializes them. The save includes procedural seed/planet identity, physics state, physical assets, material containers/lots/operations, machines/receipts and many technology subsystem stores. A browser's localStorage typically stores JSON strings, not arbitrary JavaScript classes.

**Do not confuse in-memory object identity with persisted ID:** new `Map()` instances are reconstructed after reload; stable `truck-expedition-001` and saved lot IDs retain the identity.

**Schema migration recipe:**
1. Copy the original save intact; never overwrite the only user save.
2. Inspect `schema` or `version` fields.
3. For each old version, map fields explicitly and preserve old asset IDs and provenance.
4. Reject malformed quantities and unknown required owners with actionable errors.
5. Apply migration **once**; mark migrated version.
6. Save atomically and reload; compare mass, number of assets, receipts and positions.
7. Test imported/legacy extra trucks instead of deleting them to enforce a one-*initial*-truck rule.

**Why a checksum?** Detect accidental corruption before replay; it is not an authentication guarantee unless cryptographically keyed.

**History:** database migrations and backward-compatible serialized protocols. **Alternatives:** IndexedDB, browser File System Access, event logs with schema versioning and snapshots. Never try to repair an inconsistent save by resetting inventory to empty unless the player explicitly chooses a destructive recovery.



# 14. Python packaging and release engineering

Python is not currently the main gameplay language; it runs the **build**.

**[SOURCE] `tools/build-standalone.py`:**
```python
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
html = (root/'index.html').read_text(encoding='utf-8')
# Regex finds local <script src="..."></script> and stylesheet links.
# It inserts each corresponding source file directly into the HTML.
(root/'PLAY-STARFALL.html').write_text(html, encoding='utf-8')
```
The actual script also validates paths stay within the project root. Standard-library `pathlib` handles paths and `re` searches external source tags. Since it substitutes local sources **in script order**, a missing or incorrectly ordered dependency can break the single-file edition.

**[SOURCE] `tools/build-mobile-standalone.py`:** injects `src/mobile/landscape.css`, HTML HUD, and mobile JS, then inlines ordinary source scripts. Desktop and mobile share the simulation; the mobile addition should adapt input/UI, not invent another physical truck.

**Essential commands from repository root:**
```bash
python tools/build-standalone.py
python tools/build-mobile-standalone.py
python tests/standalone-parity.py
python tests/mobile-standalone-parity.py
node --check src/flight.js
node tests/expedition-manifest8k.test.cjs
node tests/factory-material-sources8f.test.cjs
```
Check the paths actually exist at your branch HEAD. For real browser tests install Playwright and Chromium as the relevant CI workflow documents; **do not claim a test passed simply because its file exists**. The original Python build uses the standard library only, which is useful for offline reproducibility.

**GitHub workflow principle:** CI should rebuild both standalones from checked-out **current main/source**, run parity and regression checks, and only then publish. Protect against concurrent bot commits and source/bundle race conditions. Keep a rollback commit/branch. The standalone is a build artifact; Git is the versioned source authority.

**History:** make/linker build systems, CI adoption (Hudson/Jenkins, later hosted Actions), reproducible builds. **Alternatives:** esbuild/Vite/Rollup for bundling, static source map builds, Python's `html.parser` for more robust HTML parsing, fully automated gated releases. Bundler changes require preserving offline file:// behavior.



# 15. Testing: prove a feature rather than believing it

**Testing pyramid:** pure logic tests → transactional tests → DOM/UI tests → browser/WebGL integration → full manual expedition → hardware GPU measurement.

**Node `.cjs` tests** can call `require` on physics modules with `module.exports`. Favor `assert.equal`, `assert.deepEqual`, `assert.throws` with small verified fixtures. They prove a model contract, **not** that players can access a machine.

**Python Playwright browser tests** open the actual compiled file (often `Path('PLAY-STARFALL.html').as_uri()`), click visible Mission/UI controls, inspect game reports, save/reload and test real keyboard/pointer actions. Headless SwiftShader is a software graphics pathway; do not assert GPU FPS on a physical machine without benchmarking one.

**For every feature ask:**
1. Is the input a physically owned lot or a test fixture?
2. Did its actual owner debit mass, time and energy?
3. Was the output installed in the actual world and connected to its machine?
4. Is the action reachable by visible keyboard/touch controls?
5. Can you save, quit and recover the same state?
6. Is duplicate-clicking/replaying the same ID harmless?
7. Does night, low power, full storage, changed world and 100× stop it correctly?
8. Does the desktop build and mobile build contain the same source logic?
9. Did baseline ship, truck, rover, stars, terrain and galaxy IDs survive?
10. What exact commands ran, on which commit, with PASS/FAIL/NOT VERIFIED?

**Property-based tests:** generate randomized but valid lots/containers; assert mass conservation for all operations, cap bounds, unique IDs. **Metamorphic tests:** split 100 seconds into 10×10 and compare to a single 100-second advance within tolerance. **Negative tests:** wrong world, gas species mismatch, zero energy, corrupted save, reclaimed same lot twice, unloading beyond range. These are especially valuable for 8K.

**History:** Turing-era proofs and debugging; modern automated regression and property testing. **Alternatives:** Vitest/Jest, Playwright Test, hypothesis (Python), fuzzers, visual pixel snapshots, GPU frame capture; do not substitute test framework branding for true coverage.



# 16. Git independence: manage your own source and releases

**Git** records commits (immutable snapshots addressed by hashes), branches (moving pointers), merges (combined histories), tags (named release points) and diffs (file-level changes). **GitHub** hosts Git and adds issues, pull requests and CI.

```bash
git clone https://github.com/hatutaletangeni/Space_starfall.git
cd Space_starfall
git checkout main
git pull --ff-only
git switch -c feature/your-change
git status
git diff -- src/flight.js
node --check src/flight.js
python tools/build-standalone.py
python tools/build-mobile-standalone.py
git add src/flight.js tests/ docs/
git commit -m "fix: describe physically valid feature"
git push -u origin feature/your-change
```

**Before merging**, compare your branch with updated `main`, resolve conflicts deliberately, run CI against the exact merged head, and preserve save migrations. Do **not** merge wholesale an older Update 8 branch over newer `main`: check overlapping `src/flight.js`, `index.html`, game state owners and both standalone builders. The repo has a history of large diverged Update 8 branches; a branch's name `release` does not establish production readiness.

**Common problems:**
- `non-fast-forward`: remote has new commits; fetch and integrate, not force push.
- `merge conflict`: two histories edited same region; compare both original intended invariants.
- `detached HEAD`: checkout of raw commit, not branch; create branch for edits.
- `standalone changed but source did not`: regenerate and compare; don't manually patch bundle.
- `tests green, gameplay broken`: fixtures or old hidden UI path, missing real Chromium scenario.
- `port works, save duplicates`: source ownership or receipt idempotency not tested.

**History:** Git created by Linus Torvalds in 2005. **Alternatives:** Mercurial; branch-based versus trunk-based development; GitHub Actions versus other CI. Version control never replaces source review or backups of user saves.



# 17. Debugging recipes: eight game-specific investigations

**A. Black canvas:** check JavaScript console error, `canvas#universe` existence, `Starfall3D.Renderer` initialization and WebGL2 availability; then shader compilation and buffer sizes.

**B. Pressing X does nothing:** inspect pressed-key `Set`, configured bindings, focused input, whether EVA/truck/ship interior is authoritative, distance to board and interaction cooldown. Follow the single command into `src/flight.js`, then its save and physics side effects. Do not just trigger UI message.

**C. Truck stuck in ocean or cargo:** check truck body ID, planet-fixed local direction, vehicle bay ramp state, water/traction interlocks and owner location (surface vs ship). Never respawn the original truck to fix a location bug; use paid movement/recovery path.

**D. Iron not processing:** check ship power switch, landed state, operator distance, source lot in `8d:ship-main:materials`, required grade/mass, output space, installed equipment, `refinery8e.active` and its energy receipt. Inspect resulting product and tailings, not just percent label.

**E. Gas vessel empty:** check `vessel_kit_nitrogen` kit actually converted into a physical `industrial_vessel`, correct gas material ID, the rated 8A container, separator proximity, modeled local atmosphere and energy. No automatic gas appears when a tank is built.

**F. Pipeline refuses to pump:** confirm two different installed same-species vessels, a manufactured empty 80 L pipe, real port installed, 420 W T02 load physically wired and served, real lot/packet <=5 kg, body-fixed distances, and pipe pressure.

**G. Standalone differs from editor:** regenerate from source; inspect injected script order; run source-parity tests; look for stale browser caching and wrong Git branch; do not re-edit 20k-line generated HTML.

**H. Save returns duplicate resources:** trace the unique committed receipt, fresh versus legacy initialization, 8A import/transfer operations, and whether reload repeats a one-time event. Compare before/after lot IDs and energy for the same operation.

**How to write a minimal bug report:** version/commit, desktop/mobile, seed, planet ID, save version, exact input sequence, observed and expected result, console error, video/screenshot, whether fresh game or migrated save, and which regression now fails.



# 18. Skills roadmap: from beginner to independent STARFALL architect

**Stage 1 — Read and run (week 1):** JavaScript functions, objects, arrays, modules, DOM events. Trace `index.html → src/galaxy.js → src/engine.js → src/flight.js`; draw the boot order. Rebuild both HTML files and observe identical core state.

**Stage 2 — Math and rendering (weeks 2–3):** vectors, dot/cross, rotation, camera view/projection, WebGL2 draw calls, shader types, procedural noise and spatial hashing. Recreate STARFALL's vector utilities in Python and C; test with known inputs.

**Stage 3 — Simulation and UI (weeks 4–5):** state machines, input mapping, `requestAnimationFrame`, simulated clock, save/load, finite timestep. Implement a *read-only* altitude/power HUD field with tests; do not manipulate inventory.

**Stage 4 — Data integrity (weeks 6–7):** 8A maps, physical assets, volume/mass constraints, reservations, idempotency, durable saving. Build a tiny standalone transfer test then explain why its invariant holds.

**Stage 5 — Industry (weeks 8–9):** trace one rock from deterministic 8C site to 8D mining, truck load, 8E refinery, 8F bill and 8G installation. Diagram all owners and receipt IDs. Include failure cases and energy in J.

**Stage 6 — Release engineer (weeks 10–11):** branch discipline, regression suites, Playwright, generated standalones, mobile control verification, Chromium vs physical GPU, exact-head CI and safe save migration.

**Stage 7 — Own a significant feature:** choose a feature with one authoritative owner; write an interface and invariants before coding; implement model first, then UI, then persistent save, then tests, then GPU visuals; merge only after evidence. Best first project: a compact *read-only* cross-module inspector. Harder project: a physically metered transfer where original T02 energy and 8A lots commit in one save boundary.

**Self-assessment challenge:** without help, explain every transformation of a 20 kg iron-ore batch, reproduce its units and receipt IDs, find its source code, run its tests, and modify its UI description without changing mass.



# 19. Quick-reference language and engineering dictionary

Each entry includes its use in STARFALL or a clear [MODEL] analogy. These are concise lookup definitions; the chapters provide the deeper explanations.

| Term | Definition / STARFALL relevance |
|---|---|
| ABI | Application binary interface; assembly/C calling and layout contract; [MODEL], not a web script API |
| API | Named operations exposed by module, e.g. `StarfallMaterials8A.create` |
| Array | Ordered JavaScript list; [x,y,z] 3D vector |
| Asset | Uniquely owned persistent physical item; vehicle, vessel, plant |
| Atomicity | All-or-nothing state transfer; critical to material+power save |
| Backface culling | GPU discards triangle faces turned away from camera |
| Battery capacity | Maximum stored electrical energy in J, not watts |
| BOM | Bill of materials defining typed mass and qualified parts |
| Body-fixed | Surface coordinate tied to one rotating celestial body |
| Branch | Git line of development; may diverge from `main` |
| Buffer | Contiguous data for GPU or storage; WebGL vertex buffers |
| Cache | Reused derived data for performance; must not become authority |
| Camera | View/projection state defining rendered perspective |
| Canvas | HTML drawable surface; `#universe` in STARFALL |
| Checkpoint | Persisted snapshot used for recovery |
| CI | Automated build/test checks executed per change |
| Class | Constructor/prototype grouping instance behavior; Renderer |
| Collision | Rules preventing geometry penetration; independent from texture |
| Commit (Git) | Immutable versioned snapshot |
| Commit (ledger) | A reserved source→destination transaction finalized exactly once |
| Concurrency | Multiple events/jobs can interact; prevent double-reservation |
| Conservation | Inputs = products + residue + accounted emissions |
| CPU | Processor runs JS simulation/control; GPU handles programmable drawing |
| Culling | Avoid processing invisible distant geometry |
| Data race | Concurrent access without correct ordering; source of custody bugs |
| Delta time | Elapsed simulation or wall interval; always check which |
| Dependency | Module or recipe requirement needed before operation |
| Deterministic | Same seed, inputs and sim-time produce same output |
| DOM | Document Object Model, browser UI tree |
| Draw call | CPU command requesting GPU rendering |
| ECS | Entity-component-system architectural alternative, not current project claim |
| Energy | Capacity/work in Joules; must be debited |
| Event loop | Browser scheduling input, timers, asynchronous tasks, renders |
| Exception | `throw Error`, signals invalid operation |
| Field | Named property in a record/object |
| Float32Array | Compact 32-bit float sequence for GPU data |
| FPS | Frames per second; measures rendering throughput, not physics honesty |
| Frame of reference | Space and orientation in which vectors are defined |
| Fragment shader | GPU program computes per-fragment pixels |
| Function | Callable reusable code; `V.dot(a,b)` |
| Garbage collection | Runtime reclaims unreachable JS objects |
| Gas pressure | Approximate `nRT/V` in STARFALL gas models |
| GLSL | OpenGL Shading Language used by WebGL shaders |
| GPU | Parallel processor for graphics geometry/raster/shading |
| Grade | Measured/modeled assay quality, depends on material process |
| Hash | Deterministic mapping of input to numeric identifier/sample |
| Heap | Dynamically managed program memory |
| HTML | Document nodes and script references; `index.html` |
| Idempotence | Repeating same committed operation does not duplicate assets |
| IIFE | Immediately invoked function expression; old-style module wrapper |
| Immutable | Unchanged after creation; `Object.freeze` is shallow |
| Index buffer | GPU list describing triangle vertex indices |
| Invariant | Property every valid state transition must preserve |
| JSON | Serializable object data representation used for saves |
| JIT | Just-in-time compilation by browser JavaScript engine |
| kWh | 3.6 MJ energy unit; not kW |
| LCG | Seeded linear congruential random generator in `src/galaxy.js` |
| LOD | Level of detail; reduces distant geometry cost |
| Lot | Identified quantity of one material with origin/custody |
| Main | Primary Git branch, not automatically verified stable release |
| Map (JS) | Key→value collection; used for 8A stock IDs |
| Mesh | Vertices/indices representing scene geometry |
| Migration | Versioned conversion of older save formats |
| Module | File/closure exposing a controlled JS API |
| NaN | Not-a-number sentinel; must be rejected from physical state |
| Node.js | JS runtime used for test scripts, not required player browser server |
| Normal vector | Unit direction perpendicular or radial to a surface |
| Numerical integration | Approximate solving motion/change over time |
| Outpost bus | Connected local electricity consumers and sources |
| Parcel / packet | Finite scheduled material transfer, e.g. 8H gas packet |
| Parity | Editable source and standalone compiled behavior agree |
| Persistence | State survives save/reload/system revisit |
| Playwright | Browser automation tool used from Python tests |
| Pressure vessel | Manufactured rated container, not an infinite gas source |
| Provenance | Recorded origin/operation history of lots and assets |
| Quaternions | Alternative compact 3D orientation representation [MODEL] |
| Rasterization | Turning projected triangles into pixel fragments |
| Recipe | Machine type, materials, power, time and outputs |
| Regression | New change breaks previously working behavior |
| Renderer | WebGL object handling geometry and drawing |
| Reservation | Held stock preventing double spending before physical delivery |
| Runtime | Live simulator and actual user actions, not merely a data model |
| Schema | Versioned serialized field contract |
| Seed | Input to deterministic procedural generation |
| Set (JS) | Collection of unique pressed keys/identifiers |
| Shader | GPU vertex/fragment program |
| Simulation clock | Authoritative in-game time, distinct from wall time |
| Snapshot | Saved copy of state at a particular transaction point |
| Source of truth | Authoritative owner, not a mirrored UI readout |
| Standalone | Self-contained offline HTML built from original files |
| State machine | Legal states and guarded transitions for ship/truck/habitat |
| Stoichiometry | Atom-balanced chemical equations |
| Terrain noise | Smooth spatial pseudo-random variation |
| Test fixture | Controlled synthetic inputs; never claim no-cheat expedition |
| Texture | Sampled image/data on geometry |
| Thermal model | Heat capacity/transfer estimates over sim time |
| Transaction | Reserved, validated and durable material/state mutation |
| Typed array | Binary packed numeric JS buffer for GPU/physics |
| UI | User interface; issues commands but does not create physics |
| Uniform | Shader constant set by CPU for one draw/program |
| Vector | Direction/magnitude triple |
| Vertex shader | GPU transform of vertices into clip coordinates |
| Volume | m³ container/asset physical occupancy |
| Warp | Fictional travel system; not a consequence of Newtonian thrust |
| WebGL2 | Browser graphics interface with OpenGL ES 3.0 lineage |
| WebGPU | Modern GPU API alternative, not currently game renderer |



# 20. Readings, standards, truthfulness and future architecture

**Primary STARFALL source reading** (actual files):
1. `index.html` and `tools/build-standalone.py` — know the source/build boundary.
2. `src/galaxy.js`, `src/engine.js`, `src/flight.js` — world, renderer, active simulator.
3. `src/physics/material-ledger8a.js`, `physical-inventory8a.js` — ownership and conservation.
4. `src/physics/planetary-resources8c.js`, `mining-hauling8d.js`, `refinery8e.js`, `factory8f.js` — industry.
5. `src/physics/pressure-gas-packets8h.js`, `habitat-t09.js`, `terraform8j.js` — gas, habitat, planet.
6. `src/ui22-workflow.js`, `src/mobile/landscape.js` — UI access.
7. `tests/`, `.github/workflows/`, `docs/UPDATE-8-ACCEPTANCE-REGISTER.md` — evidence and release gates.

**External foundational reading (educational, not evidence of repository contents):** MDN JavaScript Guide; ECMAScript language specification; Khronos WebGL2 specification and OpenGL ES Shading Language specification; Python 3 docs; C17/C23 language references; Intel/AMD or ARM architecture manuals for assembly; *Real-Time Rendering* (Akenine-Möller et al.); *Game Engine Architecture* (Gregory); *Numerical Recipes* (Press et al., with care about licenses and methods); Git Pro Git book; Playwright documentation; NASA introductory orbital mechanics and life-support resources; NIST SI unit reference.

**Future replacements, by pressure point:** static types (TypeScript), typed schemas (JSON Schema/Zod), structured state commands (Redux/XState), GPU abstraction (WebGPU/Three.js), C/Rust+Wasm compute kernels, transactional persistence (IndexedDB), build tooling (esbuild), property-based tests, stronger physics integration. Keep changes modular; no rewrite automatically improves game science or gameplay.

**Known limits [VERIFY]:** Large parts of Update 8A–8K were still under active development when this edition was compiled; a specification, isolated module, test stub, source branch or UI label is **not** proof of a full no-cheat two-world expedition. The exact current branch, tests and save format must be re-audited before changing an authoritative owner.

**Your independent-development rule:** locate the owner, write the invariant, change the smallest source module, add a reproducible negative test, run desktop/mobile parity, document exact commit+PASS/FAIL, preserve rollback and only then merge. This textbook is a map and reference—not a replacement for running the code.




---

# 21. Worked source studies — learn by tracing real operations

The following studies teach the investigative method you will use when modifying unfamiliar features. Each begins with a source excerpt or an exact API, then walks from intent through ownership and save state. If you see a literal fragment, check the named current source file before pasting it into a different branch; the code may evolve.

## Study 1: understanding seeded randomness line by line

**[SOURCE] `src/galaxy.js`** uses:

```javascript
function rngFactory(seed){
  let s=(seed>>>0)||1;
  return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);
}
```

- `seed>>>0` coerces a numeric JavaScript value into an unsigned 32-bit integer.
- `||1` substitutes 1 for zero, so the generated stream never initializes with 0. This is a design choice; zero would actually be a valid state for a typical LCG with nonzero additive increment, but this implementation explicitly chooses otherwise.
- `let s` is captured by the returned closure. Calling `rngFactory(742)` twice creates two independent generators with the same initial state.
- `Math.imul` returns 32-bit integer multiplication, avoiding floating-point rounding of a 64-bit product.
- `>>>0` normalizes the result into the unsigned range 0..4294967295.
- `/4294967296` produces an approximate uniform sample on [0,1) for procedural selection.

**Python [MODEL]:**
```python
def rng_factory(seed):
    state = (int(seed) & 0xFFFFFFFF) or 1
    def next_value():
        nonlocal state
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        return state / 4294967296.0
    return next_value
```

**C [MODEL]:**
```c
#include <stdint.h>
typedef struct { uint32_t s; } Rng;
void rng_init(Rng *r, uint32_t seed) { r->s = seed ? seed : 1; }
double rng_next(Rng *r) {
    r->s = (uint32_t)(r->s * UINT32_C(1664525) + UINT32_C(1013904223));
    return (double)r->s / 4294967296.0;
}
```

**Assembly mental model:** a register contains `state`; an integer multiply and add compute the new state modulo 2³²; a conversion to floating point and division/scale produces a fraction. Instruction names and ABI vary by CPU. **Why use this in STARFALL?** stable repeatable generation, easy procedural debugging, and small saved seed. **Replacement hazard:** new RNG changes already existing planets.

## Study 2: understanding capacity preflight

**[SOURCE] `src/physics/material-ledger8a.js`** defines a capacity check equivalent to:

```javascript
function room(id,mass,volume){
  const c=containers.get(id);
  if(!c)throw Error('Container missing: '+id);
  const u=used(id);
  if(u.massKg+mass>c.maxMassKg+EPS ||
     u.volumeM3+volume>c.maxVolumeM3+EPS)
    throw Error('Destination capacity exceeded');
}
```

The order matters: **validate before debiting source stock**. Negative mass would make the condition meaningless, so upstream `reserve` also requires positive finite mass. `EPS` tolerates tiny floating-point discrepancies, not kilogram-level fraud.

**Python [MODEL]:**
```python
def room(container, used_mass, used_volume, requested_mass, requested_volume, eps=1e-8):
    if requested_mass <= 0 or requested_volume < 0:
        raise ValueError("invalid transfer")
    if used_mass + requested_mass > container["maxMassKg"] + eps:
        raise ValueError("mass capacity exceeded")
    if used_volume + requested_volume > container["maxVolumeM3"] + eps:
        raise ValueError("volume capacity exceeded")
```

**C [MODEL]:**
```c
#include <stdbool.h>
#include <math.h>
typedef struct { double max_kg, max_m3; } Container;
bool has_room(Container c, double used_kg, double used_m3, double kg, double m3) {
    const double eps = 1e-8;
    return isfinite(kg) && isfinite(m3) && kg > 0 && m3 >= 0 &&
           used_kg + kg <= c.max_kg + eps &&
           used_m3 + m3 <= c.max_m3 + eps;
}
```

**Assembly [MODEL]:** load floating-point values, add requested quantities, compare against maximum, branch to failure. C's struct field offsets are determined by the compiler ABI. **Crucial lesson:** a low-level comparison cannot make a transaction safe if another event debits source state before capacity is validated.

## Study 3: understanding the bill of materials

**[SOURCE] `src/physics/factory8f.js`** reads a recipe from `StarfallManufacturing8F.RECIPES`, sums inputs and outputs, and computes:

```javascript
const input=Object.values(r.inputs).reduce((a,b)=>a+b,0);
const output=Object.values(r.outputs).reduce((a,b)=>a+b,0);
const scrapKg=input-output;
const energyJ=r.powerW*r.seconds;
```

**What happens conceptually?** Material `steel:10` means ten kg of an existing certified input lot. A recipe `beam:9.6` accounts for 9.6 kg product and 0.4 kg scrap. Energy budget equals powered process rate times simulated time. No unrecorded conversions from electrical J to kg are allowed.

**Python [MODEL]:**
```python
def quote(recipe):
    total_input = sum(recipe["inputs"].values())
    total_output = sum(recipe["outputs"].values())
    if total_input < total_output:
        raise ValueError("recipe creates matter")
    return {
        "scrapKg": total_input - total_output,
        "energyJ": recipe["powerW"] * recipe["seconds"],
    }
```

**C [MODEL]:** represent each ingredient as `struct Ingredient {int id; double mass_kg;};`, loop across ingredient arrays, sum masses and multiply power/time. Dynamic string-keyed recipes require a parser or generated static tables. **Assembly:** repeated memory reads and floating additions; it does not supply type safety or provenance without application checks.

**Manufacturing exercise:** choose `copper_wire` from the genuine recipe source, calculate input mass, output mass and scrap, then compare to the actual `factory8f.js` quote and saved 8A lot receipts.

## Study 4: understanding browser callbacks

**[SOURCE] `src/physics/engineering-ui.js`** includes a power-change callback on the existing electrical systems panel:

```javascript
$('systems-power').onchange=e=>{
  Store.setPower($('systems-vehicle').value,e.target.checked);
  RT.persistVehicles();
  refreshSystems();
};
```

- `$('systems-power')` finds the checkbox.
- `.onchange` installs one handler for a browser control change.
- `e.target.checked` is a Boolean.
- `Store.setPower(...)` changes the **existing vehicle power owner**.
- `RT.persistVehicles()` saves the effect.
- `refreshSystems()` reads the resulting state for display.

If you remove `persistVehicles`, the UI may switch power on but reload it back off. If you only change the checkbox without the store call, the electrical model remains off. If you call `setPower` on an unrelated vehicle, the displayed ship may disagree with the actual rover.

**Python [MODEL]:** in a desktop Qt/Tkinter app, bind a checkbox event to `model.set_power(vehicle_id, checked)`, then save and repaint. **C [MODEL]:** UI frameworks expose a callback pointer receiving a widget/state structure. **Assembly [MODEL]:** OS/window-system events cause a registered handler to run; there is no direct assembly substitute for the browser DOM.

## Study 5: understanding the original mining economy

The original `src/physics/mining-hauling8d.js` defines:

```javascript
const DRILL={
  kitId:'drill-truck-001', kgPerBatch:20,
  durationS:24, powerW:2400, minimumEnergyJ:57600
};
```

`2400 W × 24 s = 57,600 J`, a finite 20 kg batch. The active job must track elapsed simulated seconds and paid energy before it can produce the 8A lot and debit the 8C deposit. The truck hopper holds at most 800 kg and 1.2 m³. For 20 kg rock at volume model 0.00058 m³/kg, the batch uses about 0.0116 m³ of hopper capacity; actual source volume may depend on lot rules.

**Failure questions:** What if deposit remaining mass is 7 kg? What if truck battery has 4,000 J? What if output hopper has only 0.002 m³ left? What if player saves with 11 seconds remaining? The owner must either reject, safely pause, or use a documented partial job rule; never fabricate the full 20 kg.

## Study 6: understanding planet-fixed construction

`src/physics/outposts.js` normalizes the 3D surface vector, samples slope around a footprint, checks nearby structures, and checks protected vehicle boarding areas. Its `placement` returns a site only if the surface is landable and non-overlapping.

**Why normalize?** A local vector's direction identifies a point on a planet independently of its arbitrary original length. **Why sample four nearby heights?** Estimate slope along two tangent axes; a central sample alone cannot distinguish flat ground from a cliff. **Why protect ramps?** Geometry may be valid to render but impossible for players to enter/exit.

**Analogy:** robotics maps and civil site surveying. **Replacement:** signed-distance collision system or full terrain footprint collision, but only if it preserves original body-fixed anchors and save schema.

## Study 7: understanding finite gas packets

`pressure-gas-packets8h.js` uses a known set of gas molar masses and a temperature around 293.15 K, validates compatible vessel/pipe containers, then tracks two real custody hops. Distances are bounded; its 420 W powered pump must have a served native T02 report.

Given nitrogen mass `m=1 kg` and molar mass approximately 0.028014 kg/mol:

```text
n ≈ 1/0.028014 = 35.696 mol
For T=293.15 K and V=0.08 m³:
P ≈ n×8.314462618×293.15/0.08 ≈ 1.09 MPa
```

This ideal-gas computation is a **teaching approximation**; it is not authorization to build real 8 MPa gas hardware. Packet pressure, actual receiving vessel pressure, mass, flow, electrical charge and unique lot ID must all reconcile. A `PIPE PRESSURE` readout is not a new gas source.

## Study 8: understanding a planet's average atmospheric pressure

**[SOURCE] `terraform8j.js`** updates world atmosphere:

```javascript
s.atmosphereKg += deliveredGasKg - capturedGasKg - lostGasKg;
s.pressurePa = s.atmosphereKg * s.gravityMS2 /
  (4*Math.PI*s.radiusM*s.radiusM);
```

This is a reduced-order mean hydrostatic balance: atmospheric weight `M×g` divided by sphere area `4πR²`. It assumes a uniformly distributed effective surface load and a constant gravity/radius.

**Python [MODEL]:**
```python
from math import pi
def pressure_pa(atmosphere_kg, radius_m, gravity_ms2):
    assert atmosphere_kg >= 0 and radius_m > 0 and gravity_ms2 > 0
    return atmosphere_kg * gravity_ms2 / (4*pi*radius_m**2)
```

**C [MODEL]:**
```c
#include <math.h>
double pressure_pa(double mass, double radius, double gravity) {
    const double PI = 3.14159265358979323846;
    return mass * gravity / (4.0 * PI * radius * radius);
}
```

**Assembly analogy:** load mass and gravity, multiply, square radius, multiply by constant `4π`, divide. The **difficult engineering issue is not arithmetic**; it is proving that `deliveredGasKg` came from a physically transported source, not arbitrary numbers supplied by a UI.

---

# 22. Code comprehension: read a complete change safely

Suppose you want to show a ship's battery life percentage in the systems panel. **Do not** create a second stored battery counter.

1. Locate original owner using `src/physics/engineering-ui.js` and its `Store.get('ship').state.energyJ`.
2. Find rated capacity from the returned `stats.batteryCapacityJ`.
3. Compute a derived percentage: `100 * energyJ/capacityJ`; guard zero capacity.
4. Render text in `refreshSystems()`; update it whenever native power changes.
5. Add a read-only test proving you do not change `state.energyJ`.
6. Compare percentage with existing kWh battery readout.
7. Rebuild both offline editions and open each in browser.
8. Save/reload to confirm neither the battery nor capacity changes.
9. Commit only source+test and generated files as required by the repository workflow.

**JavaScript [MODEL]:**
```javascript
function batteryPercent(vehicle) {
  const capacity = vehicle.stats.batteryCapacityJ;
  if (!(Number.isFinite(capacity) && capacity > 0)) return null;
  return Math.max(0,Math.min(100,100*vehicle.state.energyJ/capacity));
}
```

**Python [MODEL]:**
```python
def battery_percent(energy_j, capacity_j):
    if capacity_j <= 0: return None
    return max(0, min(100, 100 * energy_j / capacity_j))
```

**C [MODEL]:**
```c
#include <math.h>
double battery_percent(double energy_j, double cap_j) {
    if (!isfinite(energy_j) || !isfinite(cap_j) || cap_j <= 0)
        return NAN;
    double p = 100.0 * energy_j / cap_j;
    return fmin(100.0, fmax(0.0, p));
}
```

**Assembly analogy:** loads, float divide/multiply, clamp comparisons and a return-register result. **Replacement choice:** this tiny derived function does not justify WebAssembly, Rust or a whole UI rewrite.

---

# 23. Algorithms and complexity: where performance actually goes

Algorithmic complexity tells you roughly how work grows with input size `n`.

| Pattern | Common complexity | STARFALL example | Risk |
|---|---|---|---|
| `array.find(x=>predicate(x))` | O(n) | Find particular source lot in a list | Repeated scan in every frame |
| `array.filter(...)` | O(n) + allocations | Select available installed machines | GC churn under high frequency |
| `array.map(...)` | O(n) + result allocation | Transform UI lists | Recompute unnecessarily |
| `map.get(id)` | Expected O(1) | `material-ledger8a.js` keyed lots | Hash memory overhead |
| `array.sort(...)` | Usually O(n log n) | Nearest surface infrastructure | Avoid on every frame for all worlds |
| Neighbor detection naive nested loop | O(n²) | Every placed structure vs every other | Use spatial partitioning above hundreds |
| Bounded active job step | O(1) per job, or O(active jobs) | Finite refining or pumping | Global ticking of thousands of unloaded systems |
| Matrix × matrix (4×4) | Fixed O(1) | View/model/projection | Many per-object transforms become draw-cost |
| Hash procedural surface sample | O(1) per sample | Terrain noise at a direction | High sample count × visible LOD |
| Full-world traversal | O(number of worlds) | Updating all planets each frame | Must use lazy generation/caching |

**Caching:** Store a derived mesh once and reuse it when inputs are unchanged. **Caution:** cached world information must not become a second independent planet identity or stock ledger.

**GPU and CPU are different bottlenecks.** Replacing `filter` with `Map` might reduce CPU time, but it cannot improve an expensive fragment shader, excessive transparency blending or large canvas pixel count. Always profile before optimizing.

**Memory tip:** transient `new Float32Array(16)` in a hot loop causes allocations; preallocate or reuse only after checking reentrancy. Retained GPU buffers must be explicitly deleted/evicted at suitable boundaries even though JavaScript objects are garbage collected.

---

# 24. Engineering history map — why these ideas exist

This is **external computing and engineering history**, not an assertion that STARFALL itself implements every historical technique.

| Period | Idea | STARFALL relevance |
|---|---|---|
| 17th century | Newton and Leibniz calculus; classical motion laws | Acceleration, orbital dynamics, changing state |
| 18th–19th centuries | Euler, Lagrange, Hamilton; thermodynamic laws | Numerical integration, force, energy, heat, gas |
| 19th century | Matrices, vectors, geometry | Camera orientation, surface frames, collision |
| 1930s–1940s | Turing, von Neumann stored-program computers | Code as executable instructions and stored state |
| 1950s | FORTRAN and early high-level numerical programming | Scientific equations in readable languages |
| 1960s–1970s | C, Unix and modular system software | Low-level language analogues and source organization |
| 1970s | Relational databases and transactional consistency | Durable lot/receipt conservation |
| 1980s | Procedural graphics and coherent noise | Generated terrain without huge hand-authored maps |
| 1980s–1990s | Real-time GPU raster pipelines and shaders | Visibility, meshes, projection and pixels |
| 1991 | Python created by Guido van Rossum | Readable packaging and test automation |
| 1995 | JavaScript created by Brendan Eich | Browser-based STARFALL simulation |
| 1997 onward | ECMAScript standards | Evolving portable JS language |
| 2000s | Programmable GPUs become mainstream | Modern vertex/fragment shader concepts |
| 2005 | Git created by Linus Torvalds | Branching, commits, release safety |
| 2010s | WebGL/WebGL2 and browser API evolution | Self-contained 3D game on web |
| 2020s | WebGPU and contemporary browser GPU pipelines | Potential future rendering replacement |

**Do not optimize for novelty.** A proven small source module with accurate inventory is better than a new framework with duplicated physics.

---

# 25. How to compare code replacements like an engineer

Before suggesting a replacement, compare its **correctness risk, effort, portability, offline compatibility, performance evidence and maintenance cost**.

| Existing technique | Candidate replacement | Potential benefit | Hidden cost / condition |
|---|---|---|---|
| Plain JS | TypeScript | Static checking of records, nulls, units | Compiler config and source map/build parity |
| Script-order globals | Native ES modules | Explicit imports, isolation | `file://` and script order compatibility |
| Handwritten WebGL2 | Three.js | Scene graph and shader/material tooling | Dependency bulk, possible GPU regressions |
| WebGL2 | WebGPU | Modern compute/render API | Browser support and entire renderer rewrite |
| JavaScript CPU kernels | C/Rust WebAssembly | Faster heavy numerical routines | Cross-language serialization and debugging |
| JSON object saves | IndexedDB | Larger durable storage with transactional operations | Migration, schema management, async flow |
| Single flight controller | Typed command dispatcher + subsystems | Smaller modules and clearer invariants | Large regression surface |
| Recomputed lists | Memoized selectors | Less UI CPU churn | Cache invalidation correctness |
| Naive spatial checks | Spatial hash or quadtree | Better dense placement scaling | Body-fixed spherical boundaries |
| Python regex inliner | Bundler/HTML parser | More robust packaging | Offline and reproducibility constraints |
| Manual gameplay regression | Playwright end-to-end tests | Repeatability | Browser fixtures may bypass actual in-world requirements |
| Finite-state booleans | Formal state machine | Explicit legal transitions | Requires safe migration of legacy state |

**Scientific replacement rule:** increasing apparent numerical fidelity without accounting for sources, sinks and uncertainty can **decrease** truthfulness. A high-fidelity planetary weather animation cannot compensate for gas being created from nowhere.

---

# 26. The lifetime of one material lot — full trace

Imagine the player surveys iron-bearing rock, mines it, and ends with a steel structure. This is the **intended verified path**; exact runtime availability depends on your branch and equipment.

```text
A. Stable world seed and planet ID
    ↓ src/galaxy.js + src/physics/planetary-resources8c.js
B. Finite planet-fixed ore deposit with grade and remaining quantity
    ↓ Original 8D truck on same body; drill time and battery spent
C. New 8A lot in truck hopper; 8C depletion receipt
    ↓ Physical truck movement and finite paid loader
D. Same source material, now ship-owned 8A cargo
    ↓ Refinery quote: material grade, machine/tool, input mass, power/time
E. Iron concentrate and iron tailings with actual production receipts
    ↓ Hematite identification; reagents, furnace and gas piping
F. Metallic iron and accounted oxygen-bearing chemical byproducts
    ↓ Carbon-alloy processing with real carbon
G. Certified steel output lots in actual finite hold
    ↓ 8F qualified manufacturing station and complete BOM
H. Finished part + scrap + electrical receipt
    ↓ 8G physical site installation
I. One installed asset with unique ID, actual mass and provenance
    ↓ Save/reload, travel and service
J. Same identity and stock after revisiting world
```

**At every arrow ask:** *Which source object decrements? Which destination increments? Which component stores the receipt? What exact physical/world coordinates permit the handoff? Which Joules were spent? What happens on a repeated event?*

Create a worksheet:

| Stage | Owner ID | Before kg | After kg | J spent | Receipt | Save key |
|---|---|---:|---:|---:|---|---|
| Site depletion | body/site ID | ... | ... | ... | ... | ... |
| Truck hopper | `8d:truck-expedition-001:hopper` | ... | ... | ... | ... | ... |
| Ship hold | `8d:ship-main:materials` | ... | ... | ... | ... | ... |
| Refinery | `refinery8e` | ... | ... | ... | ... | ... |
| 8F factory | `factory8f` | ... | ... | ... | ... | ... |
| Physical asset | `physical8a` | ... | ... | ... | ... | ... |

Never fill this table with guessed receipts and call it verification. Extract actual fields from a reproducible game run.

---

# 27. Independent maintenance drills with answer criteria

**Drill A — Read the code.** Locate `rngFactory`. Explain state closure, `Math.imul` and `>>>0` without opening an AI assistant. **Pass:** your Python equivalent reproduces first 10 samples for the same seed within double tolerance.

**Drill B — Stop free cargo.** Write a test that reserves 8 kg of a 10 kg lot twice under different IDs, then attempts another 5 kg reservation. **Pass:** third reservation fails and no mass changes.

**Drill C — Guard a save.** Fabricate a duplicate `truck-expedition-001` entry. **Pass:** load validation rejects duplicates without silently deleting user stock.

**Drill D — Explain pressure.** Calculate pressure from 0.5 kg nitrogen in 0.08 m³ at 293.15 K. **Pass:** units and molar mass are correct; real-gas limits acknowledged.

**Drill E — Make a real UI.** Add read-only pump watts to a panel using original T02 reports. **Pass:** no added stored energy field or `importLot` call; off/outage correctly read zero.

**Drill F — Standalone parity.** Modify one source-only UI string and rebuild both bundles. **Pass:** both source/standalone parity scripts succeed at the same commit.

**Drill G — Browser physics.** Drive the same truck from ship bay to terrain, park, exit and reload. **Pass:** source `physical8a` still contains exactly one original ID.

**Drill H — Test honest terraforming.** Try emitting gas from an empty tank. **Pass:** action rejects, atmosphere unchanged, and there is no energy debit beyond documented failed attempt behavior.

**Drill I — Commit safely.** Use a feature branch and PR for a read-only telemetry improvement. **Pass:** rollback path, clean diff, Node and browser checks, desktop/mobile sync, explicit limitation report.

---

# 28. Last-page field reference — where to go when something breaks

| Symptom | First code owner | Verification goal |
|---|---|---|
| Stars disappear / wrong count | `src/galaxy.js`, `src/engine.js` | Seed stable; objects generated vs visible distinction |
| Planet land changes between revisits | `src/engine.js`, terrain authorities | Coordinates/seed unchanged after reload |
| Ship cannot land | `src/flight.js`, physics modules | Guard conditions and elevation frame |
| Ship power OFF | `src/physics/engineering-ui.js` | Actual vehicle store enabled, persistent |
| Truck X fails | `src/flight.js`, cargo custody | Safe state transition, original ID retained |
| Mobile tap selects text | `src/mobile/landscape.css` and JS | Proper touch-action and pointer handlers |
| Resource deposit missing | `src/physics/planetary-resources8c.js` | Canonical world composition, surveyed tile |
| Truck hopper refuses ore | `src/physics/mining-hauling8d.js` | Battery, body, 800 kg / 1.2 m³ cap |
| Refinery IDLE | `src/physics/refinery8e.js` | Source lot, grade, operator, energy and time |
| Can't manufacture tank | `src/physics/factory8f.js`, `kit-recipes8f.js` | Actual certified BOM, machine tool and grade |
| Gas packet stalled | `src/physics/pressure-gas-packets8h.js` | Real T02 420W, body geometry, lot and pipe |
| Habitat has free atmosphere | `src/physics/habitat-t09.js` and 8K integration | Paid 8G envelope, source-owned consumables |
| Planet changes too quickly | `src/physics/terraform8j.js` and source integration | Planetary mass/energy, rate, climate timescale |
| Standalone stale | `tools/build-standalone.py` / mobile builder | Rebuild and parity |
| Save has duplicate assets | `material-ledger8a.js`, `physical-inventory8a.js` | One owner, one ID, one receipt |
| CI status unknown | `.github/workflows`, Actions UI | Completed exact-head successful run |

**Final principle:** a mature engineering game is an interacting set of *verified invariants*, not a large line count. By understanding each original owner and its physical constraints, you can become the sole architect of STARFALL without memorizing every line.
