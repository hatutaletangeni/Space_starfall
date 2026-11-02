# STARFALL UI20 — Contextual flight HUD and vehicle cockpit

## Why the previous hierarchy was frustrating

The original persistent 304 px reconnaissance rail, multiline instructions and dense T16 asset card covered the living scene at all times. The masthead gave six unrelated engineering actions equal visual importance. Real ship/truck cockpit state did not have a consistent visual presentation. This is a usability problem, not a request to delete engineering functions.

## References and decisions

- User-provided screenshots: spaceflight windshield with forward-star view; surface helmet HUD with environmental feedback; spacecraft/truck cabin window with an unobstructed planetary landscape and compact lower dashboard. Reference **composition, hierarchy and purpose**; do not copy trademarked texture, brand UI or other games' graphic assets.
- User-provided `UIGAMEDESIGN.pdf`, Joakim Maeda Palm (2022): page 14 lists minimal/non-intrusive interfaces, consistent visual controls, contextual help and organized minimal menus; page 32 discusses balancing aesthetics and usability; page 30 specifically describes the result of removing dense text that users were not reading.
- Apple Human Interface Guidelines: [Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games), [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): keep the scene dominant, readable contrast and actionable sizes, dynamic aspect ratios, predictable keyboard/touch controls, helpful recovery.
- [justinhartman/ui-ux-design-library](https://github.com/justinhartman/ui-ux-design-library): a **curated collection/index** of external texts on typography, usability testing, interaction design and UI, **not an executable UI framework or single prescriptive specification**. No copyrighted design assets were copied from that repository.

## Functional implementation

- **World-first game:** no changes to planetary rendering, camera matrices aside from view position when V toggles truck cab, physics, boarding, collisions, rocket, remote autonomy, save ownership, communication, solar/batteries, or player action IDs.
- **Ship:** V still toggles original chase/cockpit. In cockpit the correct real WebGL view renders behind a restrained original SVG windshield with top and side supports and a bottom dashboard; no fake readout labels.
- **Truck:** X remains physical approach/board and exit. Chase remains original default. Press V for a genuine cab-first-person camera derived from `truckWorldState().position/forward/up`, with original look pitch/yaw and a frame specific to the truck. No moved player/teleport or changed wheel dynamics. V returns to original chase, X exits physically.
- **HUD:** small current destination, one status line, existing source values mode/speed/altitude/vertical, visible waypoint and stateful warnings. Hide long instructions by default; `?` opens existing live/remapped controls and Escape closes it. All alerts, flight inputs, HUD selectors, keyboard customizations and touch controls remain.
- **Operations:** original `#panel` is now a compact translucent scrollable mission console at lower right, expands on hover/focus or new **Mission console** button. Short overview/survey/systems/explore/science anchor tabs jump to the ORIGINAL sections; no cloned data or rerouted handlers.
- **Critical reduction:** T16's long live status card was not deleted or replaced. It is moved from the top into the Systems sequence after the collapsible engineering flight computer, where its existing refresh logic and original selectors still work.
- **Header:** six original controls remain **present with identical IDs, functional click handlers and keyboard accessibility**, visually reduced to compact icon chips with clear `title` and accessibility names; Star Chart promoted to `Navigate`. `Tools` opens the icon rail on narrow viewports.
- **No hidden dead links:** the new buttons open genuine panel, help, and mobile tool actions; they never queue a rocket or fake navigation command. All original button labels/IDs remain in source.
- **Readability:** muted blue-grey rather than hundreds of bright gold outlines, consistent system font for top-level hierarchy, strong source label contrast, rounded but restrained surfaces, focus rings, 11 px minimum primary controls for desktop, reduced-motion support, safe margins and responsive viewport.

## Verification and remaining limitations

`tests/ui20-cockpit-browser.py` exercises real original game in `file://` Chromium, includes *actual rendered captures*: original chase, actual V ship cockpit, actual X truck boarding/chase, actual V truck cab, then X physical exit. It also checks native mission nav and original Rocket Lab modal; no HTTP requests. Four PNGs are uploaded by `ui20-cockpit-browser.yml` as a CI artifact only if actually captured.

The original full regression (T00–T19), including save, science, interstellar comms, T16 operations, remains required. The deterministic bundle is rebuilt by `build-ui20-standalone.yml` and verified by `tests/standalone-parity.py`. **Do not claim full pass before latest exact-commit results.** Manual physical-device FPS, human usability study, VR, actual 3D modeled cabin interiors, and full Planet A→B release scenario remain NOT VERIFIED. The cockpit framing is SVG presentation following a correct first-person camera, not a 3D physically interactable spaceship interior. That is deliberate for safe UI iteration; a real modeled interior should be a separate asset/geometry milestone.

**Rollback:** original T19 experimental branch remains intact. T18 verified rollback remains untouched; no main branch merge, never disable failing tests to claim success.
