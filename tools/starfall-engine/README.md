# STARFALL ENGINE — Celestial Studio (Alpha 0.1)

A working **offline WebGL2 scene-authoring editor** built specifically for the STARFALL space game. This is a foundation for a Unity-like authoring experience, **not a replacement for STARFALL's runtime or a complete Unity competitor**.

## Run

Double-click `index.html` in **Chrome or Edge** with WebGL2/hardware acceleration enabled. No npm, server, internet, downloads or third-party libraries. The self-contained `PLAY-STARFALL-ENGINE.html` is also provided for one-file offline use. Standard Chrome/Edge should permit local file opening; this testing environment blocks `file://` browser navigation, so that path remains unverified here. If WebGL2 is unavailable, the editor uses a perspective Canvas 2D fallback instead of failing.

## Working tools

- Perspective 3D orbit camera: left drag = orbit, right drag / Shift+drag = pan, wheel = zoom.
- Object selection by clicking in the viewport or using the expandable hierarchy; double-click or **F** frames selection.
- Create stars, planets, moons, asteroids, ships, rovers, stations, outposts and markers.
- Inspector for object hierarchy/parent, naming, visibility, lock, local **position km**, Euler rotation, scale, radius, color, and circular-orbit preview parameters.
- Deterministic double-precision scene graph evaluated at simulation time, parent-aware orbital placement, circular-orbit tracks, and independent WebGL rendering of visible nodes.
- Play/pause and 1× / 10× / 100× **visual orbit preview**; **not** full gravitational physics, ship flight, terraforming or construction simulation.
- Undo/redo, JSON scene import/export, local editor-only autosave, STARFALL authoring manifest export, FPS/draw-call display, grid/orbit toggles, responsive layout, renderer quality settings.
- Seeded sample system for exploration. Models are preview geometry, not production ship assets or procedural planet terrain.
- WebGL2 primary renderer and Canvas 2D perspective fallback. The latter supports hierarchy, orbit preview, camera, picking, and editing on restricted devices.

## Key architectural boundary

STARFALL's current game already owns its `src/engine.js` renderer, `src/galaxy.js` seed 742's 2,368-star galaxy, `src/starfall-core.js` saves, `src/flight.js` controls and the Update 8 industry/terraforming systems. **This editor neither replaces nor modifies any of those.** Its editable scene schema is deliberately a separate authoring format (`starfall-engine-scene`, version 1). The sample scene's "Haven" bodies are **new editor-only sample objects**, not canonical STARFALL bodies.

A saved `.sfscene.json` file preserves all editor nodes and times. "Export STARFALL authoring manifest" creates a manifest for a **future carefully validated bridge**. The existing STARFALL game cannot currently import this manifest directly and the editor does **not** create actual game assets, consume resources or alter save data.

### Scene schema

`{schema:'starfall-engine-scene', version:1, name, seed, kmPerUnit, simulationSeconds, nodes:[]}`.

Every node has a stable `id`, `type`, `parentId`, `positionKm`, `rotationDeg`, `scale`, `radiusKm`, `color`, `visible`, `locked` and optional circular `orbit:{semiMajorAxisKm, periodSeconds, phaseDeg, inclinationDeg}`. Scene positions are **JavaScript double-precision kilometers**; the renderer subtracts the camera target before converting to WebGL float-space units. This is an authoring space scale: scientific STARFALL source units require a verified adapter, not an assumed `kmPerUnit` value. Circular orbit preview uses `angle(t) = phase + 2πt / period`. No Kepler elliptical propagation is claimed.

Model validation rejects duplicate stable IDs, missing/cyclic parents, invalid numbers, unsupported node types, nonpositive radii/periods, oversized scenes and invalid schemas. Deleting a parent deletes its editor children. Local autosave uses only `starfall-engine-scene-v1`, never `starfall_save`.

### Verify

```bash
node tests/core.test.cjs
node --check src/core.js
node --check src/gl.js
node --check src/editor.js
python tools/build-standalone.py
python tests/browser-smoke.py
```

The browser test uses Python Playwright + local Chromium, if installed. Software WebGL2/SwiftShader is not a hardware GPU performance validation. Browser screenshots produced during tests are evidence only for that test environment.

## Integration roadmap

1. **M1 — This working editor:** scene graph, viewport, object inspector, export/undo/preview. Independent from live STARFALL.
2. **M2 — Safe STARFALL bridge:** versioned read-only import of canonical galaxy/body IDs, runtime validation, bookmarks, annotations, scene-object templates and opt-in placement proposal API (not direct free asset spawning).
3. **M3 — Space tools:** planetary terrain chunk/biome authoring, ship room/socket layout, vehicle prefab composition, docking/airlocks and orbit visualization with proper SI conversion adapters.
4. **M4 — Engineering integration:** bind prefabs to canonical Update 8 material BOM, power, gas, rockets, manufacturing, resource custody and scene geometry; test every operation in-game.
5. **M5 — Production pipeline:** asset imports (GLB), editor gizmos, scripting inspector, play-in-editor with game bridge, portable assets, asset database, diff-friendly scene files, rollback and CI.

**Safety:** Never merge a bridge into game `main` without full old-save migration, standalone parity, cockpit/truck/rover/rocket regression, 1×/10×/100× checks and real browser performance evidence.