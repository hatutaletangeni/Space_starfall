# Celestial Studio alpha 0.1 — test report (2026-11-11)

| Gate | Result |
|---|---|
| Local Node scene-core tests | PASS: 17/17 |
| JavaScript syntax checks | PASS |
| Editable source ↔ single-file standalone parity (local package) | PASS: SHA256 81d8c1d9d9810af3437018af74c0345071c454899d78ec0101e8ed960bce4c59 |
| Headless Chromium UI smoke (hierarchy, inspector, add, undo/redo, time controls) | PASS |
| Browser runtime exceptions | PASS: none |
| Canvas 2D perspective fallback | PASS |
| WebGL2 renderer on actual GPU | NOT VERIFIED — testing browser blocks WebGL2 |
| Raw file:// navigation in automated environment | NOT VERIFIED — administrator blocks navigation |
| Physical GPU FPS/long-running scene performance | NOT VERIFIED |
| STARFALL production runtime/save integration | NOT IMPLEMENTED |

**Boundary:** A genuine scene-authoring tool, not a complete Unity replacement and not a live game data importer. All authored data has a separate schema and local key; it never writes STARFALL's game save or bypasses Update 8 manufacturing/material custody.

Use the local package's `tests/browser-smoke.py` for browser checks if Playwright and Chromium are installed. 
