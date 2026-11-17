# STARFALL repository audit — 17 November 2026

Audited source: main at 2367ac64e373bfea189feb12559127ded059e505. This is a **dated evidence report**, not a blanket claim that every feature and physical-GPU playthrough is validated.

## Inventory

| Item | Starting count | Meaning |
| --- | ---: | --- |
| Tracked blobs | 705 | Includes docs, workflows, generated standalone HTML and sources |
| Editable source files | 232 | Files under src/ (JS, CSS and mobile HTML) |
| Test files | 240 | Node, browser, parity and supporting fixtures |
| GitHub Actions workflows | 86 | Main regression plus narrow feature/release workflows |
| Remote branches | 153 | Before guarded pruning |
| Open pull requests | 47 | Before cleanup |

The desktop PLAY-STARFALL.html (about 2.35 MB) and mobile PLAY-STARFALL-MOBILE.html (about 2.37 MB) are intentionally versioned generated deliverables. They are not redundant copies to delete: offline players need them. Their source of truth is index.html plus src/ and the two builder scripts.

## Tests executed against starting main

| Check | Result | Evidence boundary |
| --- | --- | --- |
| JavaScript syntax checks | PASS — 206 JS files | Syntax only |
| All Node model/regression suites | PASS — 165 suites | Model and integration contracts asserted in the suites |
| Desktop standalone source parity | PASS | 203 script inclusions and 23 stylesheet inclusions |
| Mobile standalone parity | PASS | Source parity and mobile control/landscape contracts |
| Browser Playwright suites | BLOCKED — 66 enumerated | Local Playwright Chromium binary not installed; system Chromium socket creation denied |
| Real phone / GPU / extended expedition acceptance | NOT VERIFIED | Requires real-device evidence; never inferred from Node pass |

The engineering regression workflow now splits **all 66 checked-in browser scripts** into six deterministic shards for GitHub-hosted Chromium. Check the actual workflow run results before changing the browser status above to PASS.

## Pull requests

29 open PRs had exact head commits that were already ancestors of current main and were closed as redundant (GitHub retains their history): #2, #3, #10–17, #20–23, #33–47.

The remaining 18 open PRs had commits not reachable from main and were **preserved**, regardless of apparent overlap. They were #49, #51, #53, #62–65, #75, #124, #125, #131–133, #135, #136, #156, #164, and #168. These require an actual code review and test results before merging or closing, particularly:

- #168 — WebGL context recovery and field guides
- #164 — functional EVA scanner
- #156 — Celestial Studio engine editor alpha
- #131 — older 8K industrial integration candidate

Do not interpret a closed PR as deleted source history; do not merge old integration branches solely because their title advertises a feature.

## Branch pruning

The existing guarded pruning tool was broadened to recognize historical short-lived prefixes (feature, feat, fix, hotfix, update, ci, docs, test, maintenance and work). It may delete a branch **only** if:

1. The branch is neither default, backup, release nor protected.
2. No open PR uses that head branch.
3. The exact original head SHA is an ancestor of current main.
4. The ref still has that same SHA immediately before deletion.

The local full-history audit identified **45 eligible already-merged branch tips** before the maintenance commit, subject to GitHub's own live checks. It explicitly excludes every branch with unique commits. The GitHub workflow uploads the actual per-SHA deletion report. Backups and release refs stay even if ancestor-merged.

## Repository hygiene and follow-up boundaries

- The previous README prominently described 7E/7F release-candidate branches and an old 7D main. A current play/build/status guide now precedes that archived history.
- The engineering encyclopedia has a new baseline, feature atlas entries and a verification matrix. Older model explanations remain valuable; dated test claims are not silently promoted to real-game acceptance.
- Many workflow files are specialized and still represent unique browser/feature gates; identical naming patterns alone are not sufficient proof of redundancy. They were not bulk-deleted.
- No changes were made to the material, power, save or physics authorities without executable evidence of a defect.
- Suggested next technical review: evaluate the still-open WebGL recovery/scanner PRs on a compatible Chromium runner and an actual mobile/desktop GPU, then address only failures reproduced in those tests.

Useful entry points: [README](../README.md), [engineering CI](../.github/workflows/engineering-ci.yml), [encyclopedia](STARFALL_ENGINEERING_ENCYCLOPEDIA.md), [release acceptance](UPDATE-8-ACCEPTANCE-REGISTER.md).
