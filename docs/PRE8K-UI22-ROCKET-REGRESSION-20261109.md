# Update 8 pre-8K safe integration: visible Rocket Lab repair

This is a narrow, source-owned UI/browser regression repair on the exact November 8 `main` baseline, not a claim that Update 8A–8J is completed.

## Changed player flow
- Mission → Build exposes **ROCKET LAB** as a visible action. It calls the *existing* `#launch-open` button's actual listener. No launch state, rocket fuel, propulsion or material requirements are bypassed.
- `tests/operations-t16-browser.py` follows the visible Mission → Build → ROCKET LAB path instead of attempting to click an intentionally hidden UI21 launcher. It retains modal, satellite and emergency-stop assertions.
- Desktop and landscape-mobile standalones are rebuilt from editable source by the guarded feature-branch workflow; strict parity must pass.

## Required release gates
- `python tests/standalone-parity.py` and `python tests/mobile-standalone-parity.py`
- `python tests/operations-t16-browser.py` with genuine file:// Chromium and software-WebGL2
- Entire unchanged engineering CI Node/browser matrix
- Real GPU hardware FPS and complete no-cheat industrial two-world expedition are **NOT VERIFIED** by this change.

## Branch reuse warning
Draft PR #134 (`fix/update8-release-gates-20261107`) contains much more extensive Update 8I habitat and 8J atmospheric work, including an equivalent Rocket Lab navigation fix. Review and reconcile these branches using file-level diffs rather than merging or overwriting either branch blindly. The 8I/8J source in PR #134 must not be treated as released until reconciled with current `main` and complete acceptance is verified.
