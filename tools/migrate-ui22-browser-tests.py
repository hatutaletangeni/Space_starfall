#!/usr/bin/env python3
"""Change only obsolete hidden UI21 route-clicks in DESKTOP Playwright tests.

This does not touch assertions, fixtures, runtime methods, simulation code or
test skip conditions. Browser actions continue through visible player controls.
"""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
pattern = re.compile(r"page\.locator\(['\"]#ui21-navigation button\[data-route=['\"]([A-Za-z]+)['\"]\]['\"]\)\.click\(\)")
changed = []
for path in sorted((root / "tests").glob("*-browser.py")):
    if "mobile" in path.name.lower() or "landscape" in path.name.lower():
        continue
    source = path.read_text(encoding="utf-8")
    if "#ui21-navigation button" not in source:
        continue
    routes = pattern.findall(source)
    if not routes:
        continue
    if any(route not in ("Overview","Explore","Engineer","Operate","Records") for route in routes):
        raise RuntimeError("Unmapped route in " + str(path))
    updated, count = pattern.subn(lambda m: 'open_mission_route(page, "' + m.group(1) + '")', source)
    if count != len(routes):
        raise RuntimeError("Partial conversion in " + str(path))
    if "from mission_ui22_navigation import open_mission_route" not in updated:
        lines = updated.splitlines(keepends=True)
        at = next((i for i, line in enumerate(lines) if line.startswith("from playwright.sync_api import ")), None)
        if at is None:
            raise RuntimeError("Cannot find Playwright import in " + str(path))
        lines.insert(at + 1, "from mission_ui22_navigation import open_mission_route\n")
        updated = "".join(lines)
    if updated != source:
        path.write_text(updated, encoding="utf-8")
        changed.append((path.name, count))
print("Migrated visible UI navigation:", changed)
