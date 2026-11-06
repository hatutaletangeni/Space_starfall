#!/usr/bin/env python3
# Direct `python tests/...` execution starts with tests/ on sys.path.
# Resolve the actual repository root; no external packages or test bypass.
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from tools.prune_safe_merged_branches import select
main="9"*40
branches=[
 {"name":"main","commit":{"sha":main},"protected":True},
 {"name":"backup/last-tested","commit":{"sha":"a"},"protected":False},
 {"name":"release/update-7d","commit":{"sha":"b"},"protected":False},
 {"name":"feature/merged-old","commit":{"sha":"c"},"protected":False},
 {"name":"feature/draft-new","commit":{"sha":"d"},"protected":False},
 {"name":"feature/active-pr","commit":{"sha":"e"},"protected":False},
 {"name":"feature/protected","commit":{"sha":"f"},"protected":True},
 {"name":"misc/custom","commit":{"sha":"g"},"protected":False},
]
candidate,kept=select(branches,{"feature/active-pr"},lambda sha:sha in ("c","e","f","g"))
assert [x["name"] for x in candidate]==["feature/merged-old"],candidate
assert len(kept)==7
assert {x["name"]:x["reason"] for x in kept}["feature/draft-new"]=="contains commits not reachable from current main"
print("PASS branch cleanup: only exact fully merged ancestry, protect backups, active PRs, unmerged unique commits, releases")
